import os
import ftplib
import io
import time
import logging
import threading
import yaml
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy import text

from .db import engine
from .models import StockMetadata, InstitutionalHolder, MutualFundHolder

# Configure logging
logger = logging.getLogger("pipeline")
logger.setLevel(logging.INFO)

# Set path relative to backend directory
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
CONFIG_FILE = os.path.join(ROOT_DIR, "config.yaml")

def load_config():
    if not os.path.exists(CONFIG_FILE):
        raise FileNotFoundError(f"Configuration file not found at: {CONFIG_FILE}")
    with open(CONFIG_FILE, 'r') as file:
        return yaml.safe_load(file)

# Global lock for file/DB writes in thread pool
db_lock = threading.Lock()

# Global state to capture pipeline logs for UI streaming
pipeline_logs = []

def log_pipeline_info(message):
    logger.info(message)
    timestamp = time.strftime("%H:%M:%S")
    pipeline_logs.append(f"[{timestamp}] INFO: {message}")
    # Cap log size
    if len(pipeline_logs) > 200:
        pipeline_logs.pop(0)

def log_pipeline_warning(message):
    logger.warning(message)
    timestamp = time.strftime("%H:%M:%S")
    pipeline_logs.append(f"[{timestamp}] WARNING: {message}")
    if len(pipeline_logs) > 200:
        pipeline_logs.pop(0)

def log_pipeline_error(message):
    logger.error(message)
    timestamp = time.strftime("%H:%M:%S")
    pipeline_logs.append(f"[{timestamp}] ERROR: {message}")
    if len(pipeline_logs) > 200:
        pipeline_logs.pop(0)

# =====================================================================
# OFFLINE SEEDER (Seeds database from local CSV files in seconds)
# =====================================================================
def import_local_data(db: Session) -> dict:
    log_pipeline_info("Starting local data import (seeding)...")
    try:
        config = load_config()
        output_folder_name = config['storage']['output_folder']
        output_folder = os.path.join(ROOT_DIR, output_folder_name)
        
        master_file_path = os.path.join(output_folder, config['storage']['master_file'])
        inst_file_path = os.path.join(output_folder, config['storage']['institutional_file'])
        mutual_file_path = os.path.join(output_folder, config['storage']['mutualfund_file'])
        
        # 1. Clean existing tables
        log_pipeline_info("Clearing existing tables before seeding...")
        db.query(InstitutionalHolder).delete()
        db.query(MutualFundHolder).delete()
        db.query(StockMetadata).delete()
        db.commit()
        
        # 2. Ingest Stock Metadata
        if not os.path.exists(master_file_path):
            return {"status": "error", "message": f"Categorized master file not found at: {master_file_path}"}
        
        log_pipeline_info(f"Reading master categories: {master_file_path}")
        master_df = pd.read_csv(master_file_path)
        
        # Normalize columns: Symbol, MarketCap, Category, Sector, Industry, DeepDiveCaptured, Timestamp
        mapping_metadata = {
            'Symbol': 'symbol',
            'MarketCap': 'market_cap',
            'Category': 'category',
            'Sector': 'sector',
            'Industry': 'industry',
            'DeepDiveCaptured': 'deep_dive_captured',
            'Timestamp': 'timestamp'
        }
        master_df = master_df.rename(columns=mapping_metadata)
        
        # Clean data types
        master_df['market_cap'] = pd.to_numeric(master_df['market_cap'], errors='coerce')
        master_df['market_cap'] = master_df['market_cap'].astype(object).where(master_df['market_cap'].notna(), None)
        
        # Select columns matching DB schema
        metadata_cols = ['symbol', 'market_cap', 'category', 'sector', 'industry', 'deep_dive_captured', 'timestamp']
        for col in metadata_cols:
            if col not in master_df.columns:
                master_df[col] = None
        master_df = master_df[metadata_cols]
        
        # Bulk insert metadata
        log_pipeline_info(f"Seeding {len(master_df)} stock metadata records...")
        master_df.to_sql(name="stock_metadata", con=engine, if_exists='append', index=False)
        
        # 3. Ingest Institutional Holders
        if os.path.exists(inst_file_path):
            log_pipeline_info(f"Reading consolidated institutional holders: {inst_file_path}")
            inst_df = pd.read_csv(inst_file_path)
            
            mapping_inst = {
                'Ticker': 'ticker',
                'Date Reported': 'date_reported',
                'Holder': 'holder',
                'pctHeld': 'pct_held',
                'Shares': 'shares',
                'Value': 'value',
                'pctChange': 'pct_change'
            }
            inst_df = inst_df.rename(columns=mapping_inst)
            
            # Filter rows where ticker is in master_df symbol list to enforce foreign key integrity
            valid_symbols = set(master_df['symbol'].tolist())
            inst_df = inst_df[inst_df['ticker'].isin(valid_symbols)]
            
            # Clean values
            inst_df['shares'] = pd.to_numeric(inst_df['shares'], errors='coerce')
            inst_df['shares'] = inst_df['shares'].astype(object).where(inst_df['shares'].notna(), None)
            inst_df['value'] = pd.to_numeric(inst_df['value'], errors='coerce')
            inst_df['pct_held'] = pd.to_numeric(inst_df['pct_held'], errors='coerce')
            inst_df['pct_change'] = pd.to_numeric(inst_df['pct_change'], errors='coerce')
            
            inst_cols = ['ticker', 'date_reported', 'holder', 'pct_held', 'shares', 'value', 'pct_change']
            for col in inst_cols:
                if col not in inst_df.columns:
                    inst_df[col] = None
            inst_df = inst_df[inst_cols]
            
            log_pipeline_info(f"Seeding {len(inst_df)} institutional holder records...")
            inst_df.to_sql(name="institutional_holders", con=engine, if_exists='append', index=False)
        else:
            log_pipeline_warning(f"Consolidated institutional file not found: {inst_file_path}")
            
        # 4. Ingest Mutual Fund Holders
        if os.path.exists(mutual_file_path):
            log_pipeline_info(f"Reading consolidated mutual fund holders: {mutual_file_path}")
            mutual_df = pd.read_csv(mutual_file_path)
            
            mapping_mutual = {
                'Ticker': 'ticker',
                'Date Reported': 'date_reported',
                'Holder': 'holder',
                'pctHeld': 'pct_held',
                'Shares': 'shares',
                'Value': 'value',
                'pctChange': 'pct_change'
            }
            mutual_df = mutual_df.rename(columns=mapping_mutual)
            
            # Filter rows where ticker is in master_df symbol list
            valid_symbols = set(master_df['symbol'].tolist())
            mutual_df = mutual_df[mutual_df['ticker'].isin(valid_symbols)]
            
            # Clean values
            mutual_df['shares'] = pd.to_numeric(mutual_df['shares'], errors='coerce')
            mutual_df['shares'] = mutual_df['shares'].astype(object).where(mutual_df['shares'].notna(), None)
            mutual_df['value'] = pd.to_numeric(mutual_df['value'], errors='coerce')
            mutual_df['pct_held'] = pd.to_numeric(mutual_df['pct_held'], errors='coerce')
            mutual_df['pct_change'] = pd.to_numeric(mutual_df['pct_change'], errors='coerce')
            
            mutual_cols = ['ticker', 'date_reported', 'holder', 'pct_held', 'shares', 'value', 'pct_change']
            for col in mutual_cols:
                if col not in mutual_df.columns:
                    mutual_df[col] = None
            mutual_df = mutual_df[mutual_cols]
            
            log_pipeline_info(f"Seeding {len(mutual_df)} mutual fund holder records...")
            mutual_df.to_sql(name="mutual_fund_holders", con=engine, if_exists='append', index=False)
        else:
            log_pipeline_warning(f"Consolidated mutual fund file not found: {mutual_file_path}")
            
        log_pipeline_info("Local seeding completed successfully!")
        return {"status": "success", "metadata_count": len(master_df), "inst_count": len(inst_df) if os.path.exists(inst_file_path) else 0, "mutual_count": len(mutual_df) if os.path.exists(mutual_file_path) else 0}
        
    except Exception as e:
        log_pipeline_error(f"Failed to seed local data: {e}")
        return {"status": "error", "message": str(e)}

# =====================================================================
# LIVE SCRAPER AND CONSOLIDATOR (Runs scripts 1, 2.1, 2.2 workflow)
# =====================================================================
def get_nasdaq_symbols():
    log_pipeline_info("Connecting to Nasdaq FTP to fetch symbols directory...")
    try:
        ftp = ftplib.FTP("ftp.nasdaqtrader.com")
        ftp.login("anonymous", "guest")
        buffer = io.BytesIO()
        ftp.retrbinary("RETR SymbolDirectory/nasdaqlisted.txt", buffer.write)
        ftp.quit()
        
        buffer.seek(0)
        df = pd.read_csv(buffer, sep="|")
        df = df.dropna(subset=['Symbol'])
        symbols = df[df['Test Issue'] == 'N']['Symbol'].tolist()
        log_pipeline_info(f"Successfully retrieved {len(symbols)} active symbols from Nasdaq.")
        return symbols
    except Exception as e:
        log_pipeline_error(f"Failed to fetch symbols from FTP: {e}")
        raise

def save_deep_data(data, folder_path, filename):
    if data is None:
        return
    file_path = os.path.join(folder_path, f"{filename}.csv")
    try:
        if isinstance(data, pd.DataFrame):
            if not data.empty:
                data.to_csv(file_path, index=True)
        elif isinstance(data, pd.Series):
            data.to_csv(file_path, header=True)
        elif isinstance(data, dict):
            if data:
                pd.DataFrame([data]).to_csv(file_path, index=False)
    except Exception as e:
        log_pipeline_warning(f"Could not write deep data file '{filename}': {e}")

def process_single_ticker(symbol, config, db: Session, max_retries=3):
    rps = config['performance']['requests_per_second']
    brackets = config['brackets']
    target_categories = config['target_categories']
    output_folder = os.path.join(ROOT_DIR, config['storage']['output_folder'])
    
    time.sleep(1.0 / rps)
    ticker_dir = os.path.join(output_folder, symbol)
    attempt = 0
    backoff = 2
    
    while attempt < max_retries:
        try:
            stock = yf.Ticker(symbol)
            info = stock.info
            cap = info.get('marketCap', None)
            sector = info.get('sector', 'Unknown')
            industry = info.get('industry', 'Unknown')
            
            if cap and not pd.isna(cap):
                billions = cap / 1e9
                if billions >= brackets['mega_cap']: cat = "Mega-Cap"
                elif brackets['large_cap'] <= billions < brackets['mega_cap']: cat = "Large-Cap"
                elif brackets['mid_cap'] <= billions < brackets['large_cap']: cat = "Mid-Cap"
                elif brackets['small_cap'] <= billions < brackets['mid_cap']: cat = "Small-Cap"
                else: cat = "Micro-Cap"
            else:
                cap, cat = None, "Unknown"
            
            deep_dive_captured = "No"
            if cat in target_categories:
                deep_dive_captured = "Yes"
                os.makedirs(ticker_dir, exist_ok=True)
                # Save locally as CSVs (for consistency with user's local usage workflow)
                try: save_deep_data(info, ticker_dir, "info")
                except: pass
                try: save_deep_data(stock.institutional_holders, ticker_dir, "institutional_holders")
                except: pass
                try: save_deep_data(stock.mutualfund_holders, ticker_dir, "mutualfund_holders")
                except: pass
                # Other deep dive extractions can be done here if needed
            
            # Save/Update in database
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            with db_lock:
                # Upsert metadata
                existing = db.query(StockMetadata).filter_by(symbol=symbol).first()
                if existing:
                    existing.market_cap = cap
                    existing.category = cat
                    existing.sector = sector
                    existing.industry = industry
                    existing.deep_dive_captured = deep_dive_captured
                    existing.timestamp = timestamp
                else:
                    db.add(StockMetadata(
                        symbol=symbol,
                        market_cap=cap,
                        category=cat,
                        sector=sector,
                        industry=industry,
                        deep_dive_captured=deep_dive_captured,
                        timestamp=timestamp
                    ))
                db.commit()
                
            return {"symbol": symbol, "category": cat, "deep_dive": deep_dive_captured}
            
        except Exception as e:
            attempt += 1
            time.sleep(backoff)
            backoff *= 2
            
    # Fallback permanent failure entry
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with db_lock:
        existing = db.query(StockMetadata).filter_by(symbol=symbol).first()
        if not existing:
            db.add(StockMetadata(
                symbol=symbol,
                market_cap=None,
                category="Failed",
                sector="Failed",
                industry="Failed",
                deep_dive_captured="Failed",
                timestamp=timestamp
            ))
            db.commit()
    return {"symbol": symbol, "category": "Failed", "deep_dive": "Failed"}

def run_scraping_pipeline(db: Session, max_limit: int = 20):
    """
    Runs live scraper (Script 1) for a limit of symbols (default 20 for quick testing)
    and then triggers the database consolidation (Scripts 2.1 & 2.2).
    """
    global pipeline_logs
    pipeline_logs = []
    
    log_pipeline_info("Initializing live scraping pipeline...")
    
    try:
        config = load_config()
        output_folder_path = os.path.join(ROOT_DIR, config['storage']['output_folder'])
        os.makedirs(output_folder_path, exist_ok=True)
        
        # 1. Fetch Nasdaq Symbols
        all_symbols = get_nasdaq_symbols()
        
        # Limit symbols to process to prevent hitting yfinance limits or freezing
        symbols_to_process = all_symbols[:max_limit]
        log_pipeline_info(f"Processing queue capped at {len(symbols_to_process)} tickers for development testing.")
        
        max_workers = config['performance']['max_workers']
        completed_count = 0
        
        # 2. Run Scraping & Category Insertion (Script 1)
        with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="ScreenerWorker") as executor:
            future_to_ticker = {
                executor.submit(process_single_ticker, sym, config, db): sym 
                for sym in symbols_to_process
            }
            
            for future in as_completed(future_to_ticker):
                sym = future_to_ticker[future]
                try:
                    result = future.result()
                    completed_count += 1
                    log_pipeline_info(f"[{completed_count}/{len(symbols_to_process)}] Processed {sym} -> Category: {result['category']}, Deep Dive: {result['deep_dive']}")
                except Exception as exc:
                    log_pipeline_error(f"Worker thread exception for {sym}: {exc}")
        
        # 3. Consolidation Steps (Scripts 2.1 and 2.2 adapted to Database)
        log_pipeline_info("Running database consolidation for institutional and mutual fund holders...")
        
        # Query target symbols from DB
        target_categories = config['target_categories']
        target_stocks = db.query(StockMetadata).filter(
            StockMetadata.category.in_(target_categories),
            StockMetadata.deep_dive_captured == "Yes"
        ).all()
        
        target_symbols = [s.symbol for s in target_stocks]
        log_pipeline_info(f"Found {len(target_symbols)} symbols matching categories {target_categories} for holder consolidation.")
        
        # Clean holders for target symbols to prevent duplicates
        db.query(InstitutionalHolder).filter(InstitutionalHolder.ticker.in_(target_symbols)).delete(synchronize_session=False)
        db.query(MutualFundHolder).filter(MutualFundHolder.ticker.in_(target_symbols)).delete(synchronize_session=False)
        db.commit()
        
        inst_records_count = 0
        mutual_records_count = 0
        
        for symbol in target_symbols:
            ticker_folder = os.path.join(output_folder_path, symbol)
            
            # Consolidate Institutional Holders
            inst_path = os.path.join(ticker_folder, "institutional_holders.csv")
            if os.path.exists(inst_path):
                try:
                    df = pd.read_csv(inst_path)
                    if not df.empty:
                        mapping = {
                            'Date Reported': 'date_reported',
                            'Holder': 'holder',
                            'pctHeld': 'pct_held',
                            'Shares': 'shares',
                            'Value': 'value',
                            'pctChange': 'pct_change',
                            '% Out': 'pct_held',
                            'Change': 'pct_change'
                        }
                        df = df.rename(columns=mapping)
                        df['ticker'] = symbol
                        
                        # Set default values for missing columns
                        cols = ['ticker', 'date_reported', 'holder', 'pct_held', 'shares', 'value', 'pct_change']
                        for col in cols:
                            if col not in df.columns:
                                df[col] = None
                        df = df[cols]
                        
                        # Ingest
                        df.to_sql(name="institutional_holders", con=engine, if_exists="append", index=False)
                        inst_records_count += len(df)
                except Exception as e:
                    log_pipeline_warning(f"Error reading institutional holders CSV for {symbol}: {e}")
            
            # Consolidate Mutual Fund Holders
            mf_path = os.path.join(ticker_folder, "mutualfund_holders.csv")
            if os.path.exists(mf_path):
                try:
                    df = pd.read_csv(mf_path)
                    if not df.empty:
                        mapping = {
                            'Date Reported': 'date_reported',
                            'Holder': 'holder',
                            'pctHeld': 'pct_held',
                            'Shares': 'shares',
                            'Value': 'value',
                            'pctChange': 'pct_change',
                            '% Out': 'pct_held',
                            'Change': 'pct_change'
                        }
                        df = df.rename(columns=mapping)
                        df['ticker'] = symbol
                        
                        cols = ['ticker', 'date_reported', 'holder', 'pct_held', 'shares', 'value', 'pct_change']
                        for col in cols:
                            if col not in df.columns:
                                df[col] = None
                        df = df[cols]
                        
                        # Ingest
                        df.to_sql(name="mutual_fund_holders", con=engine, if_exists="append", index=False)
                        mutual_records_count += len(df)
                except Exception as e:
                    log_pipeline_warning(f"Error reading mutual fund holders CSV for {symbol}: {e}")
        
        log_pipeline_info(f"Scraper & Consolidation pipeline finished successfully!")
        log_pipeline_info(f"Loaded {completed_count} stock metadata entries, {inst_records_count} institutional records, and {mutual_records_count} mutual fund records.")
        return {"status": "success", "stocks_scraped": completed_count, "inst_records": inst_records_count, "mutual_records": mutual_records_count}
        
    except Exception as e:
        log_pipeline_error(f"Pipeline crashed: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)
    
    # Import SessionLocal, Base and engine relative to package
    try:
        from .db import SessionLocal, Base, engine
    except ImportError:
        # Fallback if run directly
        from db import SessionLocal, Base, engine

    # Deploy the schemas automatically (ensures Supabase tables exist before scraping)
    print("Deploying database schemas...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("--- STARTING SCHEDULER PIPELINE SCRAPE ---")
        limit = 50
        if len(sys.argv) > 1:
            try:
                limit = int(sys.argv[1])
            except ValueError:
                pass
        
        result = run_scraping_pipeline(db, max_limit=limit)
        print(f"--- PIPELINE COMPLETED ---")
        print(f"Scrape Status: {result.get('status')}")
        print(f"Stocks Scraped: {result.get('stocks_scraped')}")
        print(f"Institutional Rows: {result.get('inst_records')}")
        print(f"Mutual Fund Rows: {result.get('mutual_records')}")
    except Exception as e:
        print(f"Pipeline Execution Failed: {e}", file=sys.stderr)
    finally:
        db.close()
