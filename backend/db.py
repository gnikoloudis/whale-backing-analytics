import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Try to load environment variables from .env file in the same directory if it exists
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                if key not in os.environ:
                    os.environ[key] = val.strip()

# Database selection:
# If DATABASE_URL is provided in environment variables, connect to PostgreSQL (Supabase)
# Otherwise, fall back to a local SQLite database for local testing
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip('"\'')

if not DATABASE_URL:
    # SQLite local DB path
    DATABASE_URL = "sqlite:///./local.db"

# Create database engine
# SQLite requires different arguments (connect_args) compared to Postgres
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Postgres configuration: ensure compatibility with Supabase connection pooling (pgbouncer)
    # If connection pooling is used, it's recommended to add sslmode=require
    if "sslmode" not in DATABASE_URL and "supabase" in DATABASE_URL:
        # Check if query params already exist
        if "?" in DATABASE_URL:
            DATABASE_URL += "&sslmode=require"
        else:
            DATABASE_URL += "?sslmode=require"
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
