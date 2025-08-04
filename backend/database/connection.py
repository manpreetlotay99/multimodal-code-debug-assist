import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Database configuration
# Try PostgreSQL first, fallback to SQLite for easier setup
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./debug_assistant.db"  # SQLite fallback for development
)

# For production PostgreSQL, set environment variable:
# DATABASE_URL = "postgresql://debug_user:debug_pass@localhost:5432/debug_assistant"

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(DATABASE_URL)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()