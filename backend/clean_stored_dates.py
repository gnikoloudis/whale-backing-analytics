import os
import sys
from sqlalchemy import create_engine, text

def clean_database(database_url, name):
    print(f"\n==================================================")
    print(f"Cleaning database: {name}")
    print(f"Connection URL: {database_url.split('@')[-1] if '@' in database_url else database_url}")
    print(f"==================================================")
    
    is_sqlite = database_url.startswith("sqlite")
    
    try:
        if "sslmode" not in database_url and "supabase" in database_url:
            if "?" in database_url:
                database_url += "&sslmode=require"
            else:
                database_url += "?sslmode=require"
                
        engine = create_engine(database_url)
        
        with engine.begin() as conn:
            # Check if tables exist
            table_check = conn.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name IN ('institutional_holders', 'mutual_fund_holders')
            """)) if not is_sqlite else conn.execute(text("""
                SELECT name FROM sqlite_master WHERE type='table' AND name IN ('institutional_holders', 'mutual_fund_holders')
            """))
            
            existing_tables = [row[0] for row in table_check]
            if len(existing_tables) < 2:
                print(f"Required tables ('institutional_holders', 'mutual_fund_holders') not found. Skipping. (Found: {existing_tables})")
                return

            inst_count = conn.execute(text("SELECT COUNT(*) FROM institutional_holders WHERE LENGTH(date_reported) > 10")).scalar() or 0
            mf_count = conn.execute(text("SELECT COUNT(*) FROM mutual_fund_holders WHERE LENGTH(date_reported) > 10")).scalar() or 0
            print(f"Pre-existing rows with date_reported > 10 chars:")
            print(f"  institutional_holders: {inst_count}")
            print(f"  mutual_fund_holders: {mf_count}")
            
            if inst_count > 0 or mf_count > 0:
                if is_sqlite:
                    inst_sql = "UPDATE institutional_holders SET date_reported = SUBSTR(date_reported, 1, 10) WHERE LENGTH(date_reported) > 10"
                    mf_sql = "UPDATE mutual_fund_holders SET date_reported = SUBSTR(date_reported, 1, 10) WHERE LENGTH(date_reported) > 10"
                else:
                    inst_sql = "UPDATE institutional_holders SET date_reported = SUBSTRING(date_reported, 1, 10) WHERE LENGTH(date_reported) > 10"
                    mf_sql = "UPDATE mutual_fund_holders SET date_reported = SUBSTRING(date_reported, 1, 10) WHERE LENGTH(date_reported) > 10"
                
                if inst_count > 0:
                    print("Updating institutional_holders...")
                    conn.execute(text(inst_sql))
                if mf_count > 0:
                    print("Updating mutual_fund_holders...")
                    conn.execute(text(mf_sql))
                
                print("Updates applied successfully!")
            else:
                print("No rows need updating.")
                
            # Verify after update
            inst_after = conn.execute(text("SELECT COUNT(*) FROM institutional_holders WHERE LENGTH(date_reported) > 10")).scalar() or 0
            mf_after = conn.execute(text("SELECT COUNT(*) FROM mutual_fund_holders WHERE LENGTH(date_reported) > 10")).scalar() or 0
            print(f"Remaining rows with date_reported > 10 chars:")
            print(f"  institutional_holders: {inst_after}")
            print(f"  mutual_fund_holders: {mf_after}")
                
    except Exception as e:
        print(f"Failed to connect to database {name}: {e}")

def main():
    # 1. Load .env variables
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    if key not in os.environ:
                        os.environ[key] = val.strip()

    # Determine which databases to run against
    # Always clean local sqlite db files if they exist
    root_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    
    local_db_path = os.path.join(root_dir, "local.db")
    if os.path.exists(local_db_path):
        clean_database(f"sqlite:///{local_db_path}", "local.db (SQLite)")
        
    local_test_db_path = os.path.join(root_dir, "local_test.db")
    if os.path.exists(local_test_db_path):
        clean_database(f"sqlite:///{local_test_db_path}", "local_test.db (SQLite)")

    # Clean production database (Supabase)
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        clean_database(database_url.strip('"\''), "Supabase Production DB (PostgreSQL)")
    else:
        print("\nWARNING: DATABASE_URL is not set. Supabase production database was not cleaned.")

if __name__ == "__main__":
    main()
