import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Safety: capture whether DATABASE_URL was already set in the system environment
# BEFORE loading .env. This distinguishes between:
# - GitHub Actions (DATABASE_URL set via secrets -> use it)
# - Local dev with .env (DATABASE_URL in .env only -> require USE_PRODUCTION_DB flag)
_system_has_database_url = "DATABASE_URL" in os.environ

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
# 1. If DATABASE_URL was in the system environment (e.g. GitHub Actions), always use it.
# 2. If DATABASE_URL comes from .env only, require USE_PRODUCTION_DB=true to use it.
#    This prevents local operations (seed, reset) from accidentally wiping production.
# 3. Otherwise, fall back to local SQLite.
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip('"\'')

use_production = os.environ.get("USE_PRODUCTION_DB", "").lower() in ("true", "1", "yes")

if DATABASE_URL and not _system_has_database_url and not use_production:
    # DATABASE_URL came from .env but USE_PRODUCTION_DB is not set -> use local SQLite
    print("[db.py] WARNING: DATABASE_URL found in .env but USE_PRODUCTION_DB is not set.")
    print("[db.py]          Defaulting to local SQLite to protect production data.")
    print("[db.py]          Set USE_PRODUCTION_DB=true to connect to Supabase.")
    DATABASE_URL = None

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
    from sqlalchemy.pool import NullPool
    engine = create_engine(DATABASE_URL, poolclass=NullPool)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
