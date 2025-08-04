from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Code Save Schemas
class SaveCodeRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    code_content: str = Field(..., min_length=1)
    language: Optional[str] = None
    tags: Optional[List[str]] = None


class SavedCodeResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    code_content: str
    language: Optional[str]
    tags: Optional[List[str]]
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Log Save Schemas
class SaveLogRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    log_content: str = Field(..., min_length=1)
    log_level: Optional[str] = None
    source: Optional[str] = None
    log_metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


class SavedLogResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    log_content: str
    log_level: Optional[str]
    source: Optional[str]
    log_metadata: Optional[Dict[str, Any]]
    tags: Optional[List[str]]
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Session Save Schemas
class SaveSessionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    session_data: Dict[str, Any] = Field(..., description="Complete session state including code, logs, and analysis results")


class SavedSessionResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    session_data: Dict[str, Any]
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# List/Search Schemas
class SavedItemsListResponse(BaseModel):
    items: List[Any]  # Will be either SavedCodeResponse or SavedLogResponse
    total: int
    page: int
    per_page: int
    total_pages: int


class SaveResponse(BaseModel):
    success: bool
    message: str
    item_id: Optional[str] = None
    item: Optional[Any] = None  # The saved item