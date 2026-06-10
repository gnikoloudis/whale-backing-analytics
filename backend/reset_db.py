import os
import sys

# Ensure backend package can be resolved
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db import Base, engine
# Import models to ensure they are registered with Base
from backend.models import StockMetadata, InstitutionalHolder, MutualFundHolder, TrackedSymbol

def reset_database():
    print("Resetting database schema...")
    print("1. Dropping existing tables (stock_metadata, institutional_holders, mutual_fund_holders, tracked_symbols)...")
    Base.metadata.drop_all(bind=engine)
    print("2. Recreating tables with the new schema (including timestamp columns)...")
    Base.metadata.create_all(bind=engine)
    
    # Automatically enable RLS and create public read policies on PostgreSQL
    if engine.dialect.name != 'sqlite':
        print("3. Automatically enabling RLS and creating public read policies (PostgreSQL)...")
        from sqlalchemy import text
        tables = ["stock_metadata", "institutional_holders", "mutual_fund_holders", "stock_news", "tracked_symbols"]
        with engine.connect() as conn:
            for table in tables:
                conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;"))
                conn.execute(text(f"DROP POLICY IF EXISTS \"Allow public read access\" ON {table};"))
                conn.execute(text(f"CREATE POLICY \"Allow public read access\" ON {table} FOR SELECT TO anon, authenticated USING (true);"))
            conn.commit()
            
    print("Database reset complete! You can now seed the new schema.")

if __name__ == "__main__":
    reset_database()
