import os
from sqlalchemy import create_engine, text

def inspect():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is not set!")
        return

    print("Connecting to database...")
    # Add sslmode=require if it's Supabase
    if "sslmode" not in database_url and "supabase" in database_url:
        if "?" in database_url:
            database_url += "&sslmode=require"
        else:
            database_url += "?sslmode=require"
            
    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        print("Connection successful!")
        
        # Check tables list
        print("\n--- TABLES IN DB ---")
        res = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        tables = [row[0] for row in res]
        print(f"Tables: {tables}")
        
        for table in tables:
            try:
                count_res = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = count_res.scalar()
                print(f"Table '{table}' has {count} rows.")
            except Exception as e:
                print(f"Failed to count '{table}': {e}")
                
        # Print Tracked Symbols
        if "tracked_symbols" in tables:
            print("\n--- CONTENT OF tracked_symbols ---")
            try:
                symbols_res = conn.execute(text("SELECT symbol, category FROM tracked_symbols"))
                for row in symbols_res:
                    print(f"  Symbol: {row[0]}, Category: {row[1]}")
            except Exception as e:
                print(f"Failed to query tracked_symbols: {e}")

        # Print some stock metadata
        if "stock_metadata" in tables:
            print("\n--- SOME STOCK METADATA ---")
            try:
                meta_res = conn.execute(text("SELECT symbol, category, sector, deep_dive_captured FROM stock_metadata LIMIT 10"))
                for row in meta_res:
                    print(f"  Symbol: {row[0]}, Category: {row[1]}, Sector: {row[2]}, Deep Dive: {row[3]}")
            except Exception as e:
                print(f"Failed to query stock_metadata: {e}")

if __name__ == "__main__":
    inspect()
