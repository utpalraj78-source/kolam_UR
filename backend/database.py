"""
Database configuration and connection setup
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL - defaults to SQLite for development
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./kolam_chat.db"  # SQLite for easy setup
)

# Create engine
# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # Production-ready: Use Connection Pooling
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,          # Handle more concurrent users
        max_overflow=10,       # Allow burst traffic
        pool_timeout=30,       # Wait 30s for a connection before failing
        pool_recycle=1800      # Recycle connections every 30 mins to prevent stale errors
    )

# Session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
