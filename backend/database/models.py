from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base
import uuid


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(String(10), default="true")  # Store as string for consistency
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    saved_codes = relationship("SavedCode", back_populates="user", cascade="all, delete-orphan")
    saved_logs = relationship("SavedLog", back_populates="user", cascade="all, delete-orphan")


class SavedCode(Base):
    __tablename__ = "saved_codes"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    code_content = Column(Text, nullable=False)
    language = Column(String(50), nullable=True)  # e.g., 'javascript', 'python', 'java'
    tags = Column(JSON, nullable=True)  # Array of tags for categorization
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="saved_codes")
    
    # Index for faster searching
    __table_args__ = (
        Index('idx_saved_codes_user_created', 'user_id', 'created_at'),
        Index('idx_saved_codes_language', 'language'),
    )


class SavedLog(Base):
    __tablename__ = "saved_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    log_content = Column(Text, nullable=False)
    log_level = Column(String(20), nullable=True)  # e.g., 'error', 'warning', 'info'
    source = Column(String(100), nullable=True)   # Where the log came from
    log_metadata = Column(JSON, nullable=True)     # Additional log metadata
    tags = Column(JSON, nullable=True)             # Array of tags for categorization
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="saved_logs")
    
    # Index for faster searching
    __table_args__ = (
        Index('idx_saved_logs_user_created', 'user_id', 'created_at'),
        Index('idx_saved_logs_level', 'log_level'),
        Index('idx_saved_logs_source', 'source'),
    )


class SavedSession(Base):
    __tablename__ = "saved_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    session_data = Column(JSON, nullable=False)  # Complete session state
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    
    # Index for faster searching
    __table_args__ = (
        Index('idx_saved_sessions_user_created', 'user_id', 'created_at'),
    )