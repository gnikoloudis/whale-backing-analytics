import os
import sys

# Ensure backend package can be resolved
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db import Base, engine
# Import models to ensure they are registered with Base
from backend.models import StockMetadata, InstitutionalHolder, MutualFundHolder

def reset_database():
    print("Resetting database schema...")
    print("1. Dropping existing tables (stock_metadata, institutional_holders, mutual_fund_holders)...")
    Base.metadata.drop_all(bind=engine)
    print("2. Recreating tables with the new schema (including timestamp columns)...")
    Base.metadata.create_all(bind=engine)
    print("Database reset complete! You can now seed the new schema.")

if __name__ == "__main__":
    reset_database()
