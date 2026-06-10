import os
import ftplib
import io
import time
import logging
import threading
import yaml
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc

from .db import engine
from .models import StockMetadata, InstitutionalHolder, MutualFundHolder, StockNews, TrackedSymbol

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
        storage_config = config.get('storage')
        if not storage_config:
            log_pipeline_warning("No 'storage' configuration section in config.yaml. Skipping offline seeding.")
            return {"status": "skipped", "message": "Storage config missing"}
            
        output_folder_name = storage_config.get('output_folder', 'market_data')
        output_folder = os.path.join(ROOT_DIR, output_folder_name)
        
        master_file_path = os.path.join(output_folder, storage_config.get('master_file', 'mega_large_nasdaq_categorized.csv'))
        inst_file_path = os.path.join(output_folder, storage_config.get('institutional_file', ''))
        mutual_file_path = os.path.join(output_folder, storage_config.get('mutualfund_file', ''))
        
        # Check if master file exists
        if not os.path.exists(master_file_path):
            log_pipeline_warning(f"Master seeder file not found at: {master_file_path}. Skipping offline seeding.")
            return {"status": "skipped", "message": f"Master seeder file not found: {master_file_path}"}
            
        # 1. Clean existing tables
        log_pipeline_info("Clearing existing tables before seeding...")
        db.query(InstitutionalHolder).delete()
        db.query(MutualFundHolder).delete()
        db.query(StockMetadata).delete()
        db.commit()
        
        log_pipeline_info(f"Reading master categories: {master_file_path}")
        master_df = pd.read_csv(master_file_path)
        
        # Get default timestamp from master file if it exists, else default
        default_timestamp = "2026-06-05 13:30:00"
        if not master_df.empty and 'Timestamp' in master_df.columns:
            non_null_ts = master_df['Timestamp'].dropna()
            if not non_null_ts.empty:
                default_timestamp = str(non_null_ts.iloc[0])
        
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
        
        # Override the stock metadata timestamps to use the unified default_timestamp
        # so that all seeded tables share the exact same queryable timestamp!
        master_df['timestamp'] = default_timestamp
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
            
            inst_df['timestamp'] = default_timestamp
            inst_cols = ['ticker', 'date_reported', 'holder', 'pct_held', 'shares', 'value', 'pct_change', 'timestamp']
            for col in inst_cols:
                if col not in inst_df.columns:
                    inst_df[col] = None
            inst_df = inst_df[inst_cols]
            
            log_pipeline_info(f"Seeding {len(inst_df)} institutional holder records with timestamp {default_timestamp}...")
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
            
            mutual_df['timestamp'] = default_timestamp
            mutual_cols = ['ticker', 'date_reported', 'holder', 'pct_held', 'shares', 'value', 'pct_change', 'timestamp']
            for col in mutual_cols:
                if col not in mutual_df.columns:
                    mutual_df[col] = None
            mutual_df = mutual_df[mutual_cols]
            
            log_pipeline_info(f"Seeding {len(mutual_df)} mutual fund holder records with timestamp {default_timestamp}...")
            mutual_df.to_sql(name="mutual_fund_holders", con=engine, if_exists='append', index=False)
        # 5. Ingest Stock News (Optional local seeding)
        news_file_name = storage_config.get('news_file', 'mega_large_nasdaq_news_consolidated.csv')
        news_file_path = os.path.join(output_folder, news_file_name)
        news_df = pd.DataFrame()
        if os.path.exists(news_file_path):
            log_pipeline_info(f"Reading consolidated news file: {news_file_path}")
            try:
                news_df = pd.read_csv(news_file_path)
                if not news_df.empty:
                    mapping_news = {
                        'Ticker': 'ticker',
                        'Title': 'title',
                        'Publisher': 'publisher',
                        'Link': 'link',
                        'PublishTime': 'publish_time',
                        'Timestamp': 'timestamp'
                    }
                    news_df = news_df.rename(columns=mapping_news)
                    
                    # Ensure symbol constraint
                    valid_symbols = set(master_df['symbol'].tolist())
                    news_df = news_df[news_df['ticker'].isin(valid_symbols)]
                    
                    news_df['timestamp'] = default_timestamp
                    news_cols = ['ticker', 'title', 'publisher', 'link', 'publish_time', 'timestamp']
                    for col in news_cols:
                        if col not in news_df.columns:
                            news_df[col] = None
                    news_df = news_df[news_cols]
                    
                    log_pipeline_info(f"Seeding {len(news_df)} stock news records with timestamp {default_timestamp}...")
                    news_df.to_sql(name="stock_news", con=engine, if_exists='append', index=False)
            except Exception as e:
                log_pipeline_warning(f"Failed to seed news data: {e}")
        else:
            log_pipeline_info("No consolidated news file found. Skipping news seeding (normal behavior).")
            
        log_pipeline_info("Local seeding completed successfully!")
        return {"status": "success", "metadata_count": len(master_df), "inst_count": len(inst_df) if os.path.exists(inst_file_path) else 0, "mutual_count": len(mutual_df) if os.path.exists(mutual_file_path) else 0, "news_count": len(news_df) if not news_df.empty else 0}
        
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

def process_single_ticker(symbol, config, db: Session, run_time: str, max_retries=3):
    rps = config['performance']['requests_per_second']
    brackets = config['brackets']
    target_categories = config['target_categories']
    
    time.sleep(1.0 / rps)
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
                
                # 1. Institutional Holders (Upsert logic: update existing or append new)
                try:
                    inst_df = stock.institutional_holders
                    if inst_df is not None and not inst_df.empty:
                        mapping_inst = {
                            'Date Reported': 'date_reported',
                            'Holder': 'holder',
                            'pctHeld': 'pct_held',
                            'Shares': 'shares',
                            'Value': 'value',
                            'pctChange': 'pct_change',
                            '% Out': 'pct_held',
                            'Change': 'pct_change'
                        }
                        inst_df = inst_df.rename(columns=mapping_inst)
                        inst_df['shares'] = pd.to_numeric(inst_df['shares'], errors='coerce')
                        inst_df['value'] = pd.to_numeric(inst_df['value'], errors='coerce')
                        inst_df['pct_held'] = pd.to_numeric(inst_df['pct_held'], errors='coerce')
                        inst_df['pct_change'] = pd.to_numeric(inst_df['pct_change'], errors='coerce')
                        
                        with db_lock:
                            for _, row in inst_df.iterrows():
                                if pd.isna(row.get('holder')) or not row.get('holder'):
                                    continue
                                holder_name = str(row['holder'])
                                existing_holder = db.query(InstitutionalHolder).filter_by(ticker=symbol, holder=holder_name).first()
                                
                                date_val = str(row['date_reported']) if not pd.isna(row.get('date_reported')) else None
                                pct_held_val = float(row['pct_held']) if not pd.isna(row.get('pct_held')) else None
                                shares_val = int(row['shares']) if not pd.isna(row.get('shares')) else None
                                value_val = float(row['value']) if not pd.isna(row.get('value')) else None
                                pct_change_val = float(row['pct_change']) if not pd.isna(row.get('pct_change')) else None
                                
                                if existing_holder:
                                    existing_holder.date_reported = date_val
                                    existing_holder.pct_held = pct_held_val
                                    existing_holder.shares = shares_val
                                    existing_holder.value = value_val
                                    existing_holder.pct_change = pct_change_val
                                    existing_holder.timestamp = run_time
                                else:
                                    db.add(InstitutionalHolder(
                                        ticker=symbol,
                                        date_reported=date_val,
                                        holder=holder_name,
                                        pct_held=pct_held_val,
                                        shares=shares_val,
                                        value=value_val,
                                        pct_change=pct_change_val,
                                        timestamp=run_time
                                    ))
                            db.commit()
                except Exception as e:
                    log_pipeline_warning(f"Could not scrape/save institutional holders for {symbol}: {e}")
                
                # 2. Mutual Fund Holders (Upsert logic: update existing or append new)
                try:
                    mf_df = stock.mutualfund_holders
                    if mf_df is not None and not mf_df.empty:
                        mapping_mf = {
                            'Date Reported': 'date_reported',
                            'Holder': 'holder',
                            'pctHeld': 'pct_held',
                            'Shares': 'shares',
                            'Value': 'value',
                            'pctChange': 'pct_change',
                            '% Out': 'pct_held',
                            'Change': 'pct_change'
                        }
                        mf_df = mf_df.rename(columns=mapping_mf)
                        mf_df['shares'] = pd.to_numeric(mf_df['shares'], errors='coerce')
                        mf_df['value'] = pd.to_numeric(mf_df['value'], errors='coerce')
                        mf_df['pct_held'] = pd.to_numeric(mf_df['pct_held'], errors='coerce')
                        mf_df['pct_change'] = pd.to_numeric(mf_df['pct_change'], errors='coerce')
                        
                        with db_lock:
                            for _, row in mf_df.iterrows():
                                if pd.isna(row.get('holder')) or not row.get('holder'):
                                    continue
                                holder_name = str(row['holder'])
                                existing_holder = db.query(MutualFundHolder).filter_by(ticker=symbol, holder=holder_name).first()
                                
                                date_val = str(row['date_reported']) if not pd.isna(row.get('date_reported')) else None
                                pct_held_val = float(row['pct_held']) if not pd.isna(row.get('pct_held')) else None
                                shares_val = int(row['shares']) if not pd.isna(row.get('shares')) else None
                                value_val = float(row['value']) if not pd.isna(row.get('value')) else None
                                pct_change_val = float(row['pct_change']) if not pd.isna(row.get('pct_change')) else None
                                
                                if existing_holder:
                                    existing_holder.date_reported = date_val
                                    existing_holder.pct_held = pct_held_val
                                    existing_holder.shares = shares_val
                                    existing_holder.value = value_val
                                    existing_holder.pct_change = pct_change_val
                                    existing_holder.timestamp = run_time
                                else:
                                    db.add(MutualFundHolder(
                                        ticker=symbol,
                                        date_reported=date_val,
                                        holder=holder_name,
                                        pct_held=pct_held_val,
                                        shares=shares_val,
                                        value=value_val,
                                        pct_change=pct_change_val,
                                        timestamp=run_time
                                    ))
                            db.commit()
                except Exception as e:
                    log_pipeline_warning(f"Could not scrape/save mutual fund holders for {symbol}: {e}")
                
                # 3. Stock News (Append and keep 10 latest)
                try:
                    news_data = stock.news
                    if news_data:
                        articles = []
                        for article in news_data[:5]:
                            content = article.get('content', {})
                            if content:
                                title = content.get('title')
                                publisher = content.get('provider', {}).get('displayName', 'Yahoo Finance')
                                link = content.get('canonicalUrl', {}).get('url')
                                pub_date_str = content.get('pubDate')
                                publish_time = None
                                if pub_date_str:
                                    try:
                                        cleaned_date = pub_date_str.replace('Z', '')
                                        dt = datetime.fromisoformat(cleaned_date)
                                        publish_time = int(dt.timestamp())
                                    except Exception:
                                        publish_time = int(time.time())
                                if title:
                                    articles.append({
                                        'title': title,
                                        'publisher': publisher,
                                        'link': link,
                                        'publish_time': publish_time
                                    })
                            else:
                                title = article.get('title')
                                publisher = article.get('publisher', 'Yahoo Finance')
                                link = article.get('link')
                                publish_time = article.get('providerPublishTime')
                                if title:
                                    articles.append({
                                        'title': title,
                                        'publisher': publisher,
                                        'link': link,
                                        'publish_time': publish_time
                                    })
                        if articles:
                            with db_lock:
                                for article in articles:
                                    # Avoid duplicate articles based on ticker and link
                                    exists = db.query(StockNews).filter_by(ticker=symbol, link=article['link']).first()
                                    if not exists:
                                        db.add(StockNews(
                                            ticker=symbol,
                                            title=article['title'],
                                            publisher=article['publisher'],
                                            link=article['link'],
                                            publish_time=article['publish_time'],
                                            timestamp=run_time
                                        ))
                                db.commit()
                                
                                # Enforce maximum of 10 latest news items for this ticker
                                all_news = db.query(StockNews).filter_by(ticker=symbol).order_by(desc(StockNews.publish_time)).all()
                                if len(all_news) > 10:
                                    for old_art in all_news[10:]:
                                        db.delete(old_art)
                                    db.commit()
                except Exception as e:
                    log_pipeline_warning(f"Could not scrape/save news for {symbol}: {e}")
            
            # Save/Update in database
            timestamp = run_time
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
                
                # Append/upsert to tracked_symbols table if it satisfies target categories
                if cat in target_categories:
                    existing_tracked = db.query(TrackedSymbol).filter_by(symbol=symbol).first()
                    if not existing_tracked:
                        db.add(TrackedSymbol(symbol=symbol, category=cat))
                    else:
                        existing_tracked.category = cat
                        
                db.commit()
                
            return {"symbol": symbol, "category": cat, "deep_dive": deep_dive_captured}
            
        except Exception as e:
            attempt += 1
            time.sleep(backoff)
            backoff *= 2
            
    # Fallback permanent failure entry
    timestamp = run_time
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

def run_scraping_pipeline(db: Session, max_limit: int = 20, mode: str = "weekly"):
    """
    Runs live scraper for a limit of symbols (default 20 for quick testing)
    and saves categories, holders and news directly into the database in real-time.
    Supports 'weekly' mode (queries Nasdaq FTP, updates tracked_symbols table)
    and 'daily' mode (only processes symbols already in the tracked_symbols table).
    """
    global pipeline_logs
    pipeline_logs = []
    
    run_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_pipeline_info(f"Initializing live scraping pipeline ({mode.upper()} mode, Run Timestamp: {run_time})...")
    
    try:
        config = load_config()
        
        # 1. Fetch Symbols to process.
        if mode == "daily":
            all_symbols = [s.symbol for s in db.query(TrackedSymbol.symbol).all()]
            log_pipeline_info(f"Daily Mode: Loaded {len(all_symbols)} tracked symbols from the database.")
        else:
            # Weekly Mode: Discover new/existing symbols
            target_categories = config.get('target_categories', ["Mega-Cap", "Large-Cap"])
            target_db_symbols = []
            try:
                target_db_symbols = [s.symbol for s in db.query(StockMetadata.symbol).filter(
                    StockMetadata.category.in_(target_categories)
                ).all()]
            except Exception as e:
                log_pipeline_warning(f"Could not read target symbols from database: {e}")
                
            nasdaq_symbols = []
            try:
                nasdaq_symbols = get_nasdaq_symbols()
            except Exception as e:
                log_pipeline_warning(f"Could not connect to Nasdaq FTP: {e}. Using empty list.")
                
            db_all_symbols = set()
            try:
                db_all_symbols = set(s.symbol for s in db.query(StockMetadata.symbol).all())
            except Exception as e:
                log_pipeline_warning(f"Could not query all database symbols: {e}")
                
            new_symbols = [s for s in nasdaq_symbols if s not in db_all_symbols]
            if new_symbols:
                log_pipeline_info(f"Discovered {len(new_symbols)} new symbols from Nasdaq FTP that are not in the database.")
                
            # Combine target existing symbols and new FTP symbols
            all_symbols = list(dict.fromkeys(target_db_symbols + new_symbols))
            
            if not all_symbols:
                # Fallback if database is completely empty and FTP failed
                all_symbols = get_nasdaq_symbols()
            
        # Limit symbols to process to prevent hitting yfinance limits or freezing
        if max_limit is not None and max_limit > 0:
            symbols_to_process = all_symbols[:max_limit]
            log_pipeline_info(f"Processing queue capped at {len(symbols_to_process)} tickers for scraping.")
        else:
            symbols_to_process = all_symbols
            log_pipeline_info(f"Processing queue of {len(symbols_to_process)} tickers for scraping.")
        
        max_workers = config.get('performance', {}).get('max_workers', 5)
        completed_count = 0
        
        # 2. Run Scraping & Real-Time Ingestion
        with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="ScreenerWorker") as executor:
            future_to_ticker = {
                executor.submit(process_single_ticker, sym, config, db, run_time): sym 
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
        
        # 3. Aggregation/Summary stats
        log_pipeline_info("Direct database ingestion complete, aggregating stats...")
        try:
            inst_records_count = db.query(func.count(InstitutionalHolder.id)).filter(InstitutionalHolder.timestamp == run_time).scalar() or 0
            mutual_records_count = db.query(func.count(MutualFundHolder.id)).filter(MutualFundHolder.timestamp == run_time).scalar() or 0
            news_records_count = db.query(func.count(StockNews.id)).filter(StockNews.timestamp == run_time).scalar() or 0
        except Exception as e:
            log_pipeline_warning(f"Failed to query stats from database: {e}")
            inst_records_count = 0
            mutual_records_count = 0
            news_records_count = 0
            
        log_pipeline_info("Scraper pipeline finished successfully!")
        log_pipeline_info(f"Ingested {completed_count} stock metadata entries, {inst_records_count} institutional records, {mutual_records_count} mutual fund records, and {news_records_count} news records.")
        return {"status": "success", "stocks_scraped": completed_count, "inst_records": inst_records_count, "mutual_records": mutual_records_count, "news_records": news_records_count}
        
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
        mode = "weekly"
        
        for arg in sys.argv[1:]:
            arg_clean = arg.strip().lower()
            if arg_clean in ["daily", "weekly"]:
                mode = arg_clean
            elif arg_clean == "all":
                limit = None
            else:
                try:
                    limit = int(arg_clean)
                except ValueError:
                    pass
        
        print(f"Running pipeline with limit={limit}, mode={mode}...")
        result = run_scraping_pipeline(db, max_limit=limit, mode=mode)
        print(f"--- PIPELINE COMPLETED ---")
        print(f"Scrape Status: {result.get('status')}")
        print(f"Stocks Scraped: {result.get('stocks_scraped')}")
        print(f"Institutional Rows: {result.get('inst_records')}")
        print(f"Mutual Fund Rows: {result.get('mutual_records')}")
    except Exception as e:
        print(f"Pipeline Execution Failed: {e}", file=sys.stderr)
    finally:
        db.close()
