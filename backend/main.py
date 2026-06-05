import os
from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from .db import engine, Base, get_db
from .models import StockMetadata, InstitutionalHolder, MutualFundHolder
from . import pipeline

# Create tables in SQLite or PostgreSQL
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Stock Categories & Holder Analytics API",
    description="Backend service to scrape, consolidate and query institutional and mutual fund stock holders",
    version="1.0.0"
)

# Enable CORS for frontend local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local testing and easy deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Stock Categories & Holder Analytics API",
        "status": "online",
        "endpoints": {
            "status": "/api/status",
            "stocks": "/api/stocks",
            "holder_stats": "/api/holders/stats",
            "ticker_holders": "/api/holders/{ticker}",
            "run_pipeline": "/api/pipeline/run",
            "seed_pipeline": "/api/pipeline/seed"
        },
        "docs": "/docs"
    }

# Global status tracker for pipeline execution
is_pipeline_running = False
pipeline_execution_result = None

def run_pipeline_task(db_session_factory, limit: int):
    global is_pipeline_running, pipeline_execution_result
    is_pipeline_running = True
    pipeline.log_pipeline_info(f"Background scraper worker started. Processing {limit} symbols...")
    
    # We create a new DB session inside the background thread to avoid multithreading conflicts
    db = db_session_factory()
    try:
        pipeline_execution_result = pipeline.run_scraping_pipeline(db, max_limit=limit)
        pipeline.log_pipeline_info("Background scraper worker finished successfully!")
    except Exception as e:
        pipeline_execution_result = {"status": "error", "message": str(e)}
        pipeline.log_pipeline_error(f"Background scraper worker crashed: {e}")
    finally:
        db.close()
        is_pipeline_running = False

@app.get("/api/status")
def get_status(db: Session = Depends(get_db)):
    db_type = "SQLite" if engine.url.drivername == "sqlite" else "PostgreSQL"
    try:
        stocks_count = db.query(func.count(StockMetadata.symbol)).scalar()
        inst_count = db.query(func.count(InstitutionalHolder.id)).scalar()
        mutual_count = db.query(func.count(MutualFundHolder.id)).scalar()
        return {
            "status": "online",
            "database_type": db_type,
            "pipeline_running": is_pipeline_running,
            "counts": {
                "stocks": stocks_count,
                "institutional_holders": inst_count,
                "mutual_fund_holders": mutual_count
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "database_type": db_type,
            "message": f"Database connection issue: {str(e)}"
        }

@app.post("/api/pipeline/seed")
def seed_database(db: Session = Depends(get_db)):
    global is_pipeline_running
    if is_pipeline_running:
        raise HTTPException(status_code=400, detail="Cannot seed while live pipeline is running")
    
    result = pipeline.import_local_data(db)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@app.post("/api/pipeline/run")
def trigger_pipeline(
    background_tasks: BackgroundTasks, 
    limit: int = Query(20, description="Limit of symbols to scrape for quick testing"),
    db_session_factory = Depends(get_db)
):
    global is_pipeline_running
    if is_pipeline_running:
        return {"status": "already_running", "message": "Scraper pipeline is already running in background."}
    
    # Trigger background execution
    # To get db session factory, we pass SessionLocal bind
    from .db import SessionLocal
    background_tasks.add_task(run_pipeline_task, SessionLocal, limit)
    return {"status": "started", "message": f"Scraper pipeline kicked off in background (capped at {limit} symbols)."}

@app.get("/api/pipeline/logs")
def get_pipeline_logs():
    return {
        "running": is_pipeline_running,
        "result": pipeline_execution_result,
        "logs": pipeline.pipeline_logs
    }

@app.get("/api/stocks")
def list_stocks(
    db: Session = Depends(get_db),
    search: str = Query(None, description="Search by symbol or category"),
    category: str = Query(None, description="Filter by Category"),
    sector: str = Query(None, description="Filter by Sector")
):
    query = db.query(StockMetadata)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            StockMetadata.symbol.ilike(search_filter) | 
            StockMetadata.sector.ilike(search_filter) |
            StockMetadata.industry.ilike(search_filter)
        )
    
    if category:
        query = query.filter(StockMetadata.category == category)
        
    if sector:
        query = query.filter(StockMetadata.sector == sector)
        
    stocks = query.order_by(StockMetadata.symbol).all()
    return stocks

@app.get("/api/holders/stats")
def get_holders_stats(db: Session = Depends(get_db)):
    """
    Returns aggregated holder analytics:
    - Top stocks by institutional backing value
    - Top stocks by mutual fund backing value
    - Top overall holding entities (whales)
    - Sector distributions based on whale holdings
    """
    # 1. Top stocks by institutional backing value
    top_inst_stocks = db.query(
        InstitutionalHolder.ticker,
        func.sum(InstitutionalHolder.value).label("total_value"),
        func.avg(InstitutionalHolder.pct_held).label("avg_pct_held")
    ).group_by(InstitutionalHolder.ticker).order_by(desc("total_value")).limit(10).all()
    
    # 2. Top stocks by mutual fund backing value
    top_mf_stocks = db.query(
        MutualFundHolder.ticker,
        func.sum(MutualFundHolder.value).label("total_value"),
        func.avg(MutualFundHolder.pct_held).label("avg_pct_held")
    ).group_by(MutualFundHolder.ticker).order_by(desc("total_value")).limit(10).all()
    
    # 3. Top overall holder entities (Whales) across all stocks
    # Let's combine both institutional and mutual fund records to find who has the most dollar backing
    inst_whales = db.query(
        InstitutionalHolder.holder,
        func.sum(InstitutionalHolder.value).label("total_value")
    ).group_by(InstitutionalHolder.holder).all()
    
    mf_whales = db.query(
        MutualFundHolder.holder,
        func.sum(MutualFundHolder.value).label("total_value")
    ).group_by(MutualFundHolder.holder).all()
    
    # Aggregate in python
    whale_totals = {}
    for holder, val in inst_whales:
        if holder:
            whale_totals[holder] = whale_totals.get(holder, 0.0) + (val or 0.0)
    for holder, val in mf_whales:
        if holder:
            whale_totals[holder] = whale_totals.get(holder, 0.0) + (val or 0.0)
            
    sorted_whales = sorted(whale_totals.items(), key=lambda x: x[1], reverse=True)[:10]
    top_whales_list = [{"holder": name, "total_value": val} for name, val in sorted_whales]
    
    # 4. Sector distributions
    # Join StockMetadata to sum institutional/mutual fund values per Sector
    sector_inst = db.query(
        StockMetadata.sector,
        func.sum(InstitutionalHolder.value).label("total_value")
    ).join(InstitutionalHolder, StockMetadata.symbol == InstitutionalHolder.ticker).group_by(StockMetadata.sector).all()
    
    sector_mf = db.query(
        StockMetadata.sector,
        func.sum(MutualFundHolder.value).label("total_value")
    ).join(MutualFundHolder, StockMetadata.symbol == MutualFundHolder.ticker).group_by(StockMetadata.sector).all()
    
    sector_totals = {}
    for sector, val in sector_inst:
        if sector and sector != "Unknown" and sector != "Failed":
            sector_totals[sector] = sector_totals.get(sector, 0.0) + (val or 0.0)
    for sector, val in sector_mf:
        if sector and sector != "Unknown" and sector != "Failed":
            sector_totals[sector] = sector_totals.get(sector, 0.0) + (val or 0.0)
            
    sorted_sectors = sorted(sector_totals.items(), key=lambda x: x[1], reverse=True)
    sector_list = [{"sector": sect, "total_value": val} for sect, val in sorted_sectors]
    
    # 5. Summary metrics
    total_inst_value = db.query(func.sum(InstitutionalHolder.value)).scalar() or 0.0
    total_mf_value = db.query(func.sum(MutualFundHolder.value)).scalar() or 0.0
    
    return {
        "summary": {
            "total_institutional_value": total_inst_value,
            "total_mutual_fund_value": total_mf_value,
            "total_combined_whale_value": total_inst_value + total_mf_value
        },
        "top_institutional_stocks": [{"ticker": t, "value": v, "avg_pct_held": p} for t, v, p in top_inst_stocks],
        "top_mutual_fund_stocks": [{"ticker": t, "value": v, "avg_pct_held": p} for t, v, p in top_mf_stocks],
        "top_overall_whales": top_whales_list,
        "sector_whale_backing": sector_list
    }

@app.get("/api/holders/{ticker}")
def get_ticker_holders(ticker: str, db: Session = Depends(get_db)):
    """Returns top institutional and mutual fund holders for a single ticker"""
    # Verify stock exists
    stock = db.query(StockMetadata).filter_by(symbol=ticker.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
        
    inst_holders = db.query(InstitutionalHolder).filter_by(ticker=ticker.upper()).order_by(desc(InstitutionalHolder.value)).all()
    mf_holders = db.query(MutualFundHolder).filter_by(ticker=ticker.upper()).order_by(desc(MutualFundHolder.value)).all()
    
    return {
        "stock": {
            "symbol": stock.symbol,
            "market_cap": stock.market_cap,
            "category": stock.category,
            "sector": stock.sector,
            "industry": stock.industry
        },
        "institutional_holders": inst_holders,
        "mutual_fund_holders": mf_holders
    }
