from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import Optional, List, Dict, Any, Tuple
from database.models import SavedCode, SavedLog, SavedSession, User
from models.save_schemas import SaveCodeRequest, SaveLogRequest, SaveSessionRequest
import uuid
from datetime import datetime


class SaveService:
    def __init__(self):
        pass
    
    # Code Save Operations
    def save_code(self, db: Session, user_id: str, request: SaveCodeRequest) -> SavedCode:
        """Save a code snippet to the database."""
        saved_code = SavedCode(
            id=str(uuid.uuid4()),
            title=request.title,
            description=request.description,
            code_content=request.code_content,
            language=request.language,
            tags=request.tags,
            user_id=user_id
        )
        
        db.add(saved_code)
        db.commit()
        db.refresh(saved_code)
        return saved_code
    
    def get_saved_codes(
        self, 
        db: Session, 
        user_id: str, 
        page: int = 1, 
        per_page: int = 20,
        search: Optional[str] = None,
        language: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Tuple[List[SavedCode], int]:
        """Get saved code snippets with pagination and filtering."""
        query = db.query(SavedCode).filter(SavedCode.user_id == user_id)
        
        # Apply filters
        if search:
            query = query.filter(
                or_(
                    SavedCode.title.ilike(f"%{search}%"),
                    SavedCode.description.ilike(f"%{search}%"),
                    SavedCode.code_content.ilike(f"%{search}%")
                )
            )
        
        if language:
            query = query.filter(SavedCode.language == language)
        
        if tags:
            # For JSON array contains search
            for tag in tags:
                query = query.filter(SavedCode.tags.contains([tag]))
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        offset = (page - 1) * per_page
        codes = query.order_by(desc(SavedCode.created_at)).offset(offset).limit(per_page).all()
        
        return codes, total
    
    def get_saved_code(self, db: Session, user_id: str, code_id: str) -> Optional[SavedCode]:
        """Get a specific saved code snippet."""
        return db.query(SavedCode).filter(
            and_(SavedCode.id == code_id, SavedCode.user_id == user_id)
        ).first()
    
    def delete_saved_code(self, db: Session, user_id: str, code_id: str) -> bool:
        """Delete a saved code snippet."""
        code = self.get_saved_code(db, user_id, code_id)
        if code:
            db.delete(code)
            db.commit()
            return True
        return False
    
    # Log Save Operations
    def save_log(self, db: Session, user_id: str, request: SaveLogRequest) -> SavedLog:
        """Save logs to the database."""
        saved_log = SavedLog(
            id=str(uuid.uuid4()),
            title=request.title,
            description=request.description,
            log_content=request.log_content,
            log_level=request.log_level,
            source=request.source,
            log_metadata=request.log_metadata,
            tags=request.tags,
            user_id=user_id
        )
        
        db.add(saved_log)
        db.commit()
        db.refresh(saved_log)
        return saved_log
    
    def get_saved_logs(
        self, 
        db: Session, 
        user_id: str, 
        page: int = 1, 
        per_page: int = 20,
        search: Optional[str] = None,
        log_level: Optional[str] = None,
        source: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Tuple[List[SavedLog], int]:
        """Get saved logs with pagination and filtering."""
        query = db.query(SavedLog).filter(SavedLog.user_id == user_id)
        
        # Apply filters
        if search:
            query = query.filter(
                or_(
                    SavedLog.title.ilike(f"%{search}%"),
                    SavedLog.description.ilike(f"%{search}%"),
                    SavedLog.log_content.ilike(f"%{search}%")
                )
            )
        
        if log_level:
            query = query.filter(SavedLog.log_level == log_level)
        
        if source:
            query = query.filter(SavedLog.source.ilike(f"%{source}%"))
        
        if tags:
            # For JSON array contains search
            for tag in tags:
                query = query.filter(SavedLog.tags.contains([tag]))
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        offset = (page - 1) * per_page
        logs = query.order_by(desc(SavedLog.created_at)).offset(offset).limit(per_page).all()
        
        return logs, total
    
    def get_saved_log(self, db: Session, user_id: str, log_id: str) -> Optional[SavedLog]:
        """Get a specific saved log."""
        return db.query(SavedLog).filter(
            and_(SavedLog.id == log_id, SavedLog.user_id == user_id)
        ).first()
    
    def delete_saved_log(self, db: Session, user_id: str, log_id: str) -> bool:
        """Delete a saved log."""
        log = self.get_saved_log(db, user_id, log_id)
        if log:
            db.delete(log)
            db.commit()
            return True
        return False
    
    # Session Save Operations
    def save_session(self, db: Session, user_id: str, request: SaveSessionRequest) -> SavedSession:
        """Save a complete debug session to the database."""
        saved_session = SavedSession(
            id=str(uuid.uuid4()),
            title=request.title,
            description=request.description,
            session_data=request.session_data,
            user_id=user_id
        )
        
        db.add(saved_session)
        db.commit()
        db.refresh(saved_session)
        return saved_session
    
    def get_saved_sessions(
        self, 
        db: Session, 
        user_id: str, 
        page: int = 1, 
        per_page: int = 20,
        search: Optional[str] = None
    ) -> Tuple[List[SavedSession], int]:
        """Get saved sessions with pagination and filtering."""
        query = db.query(SavedSession).filter(SavedSession.user_id == user_id)
        
        # Apply search filter
        if search:
            query = query.filter(
                or_(
                    SavedSession.title.ilike(f"%{search}%"),
                    SavedSession.description.ilike(f"%{search}%")
                )
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        offset = (page - 1) * per_page
        sessions = query.order_by(desc(SavedSession.created_at)).offset(offset).limit(per_page).all()
        
        return sessions, total
    
    def get_saved_session(self, db: Session, user_id: str, session_id: str) -> Optional[SavedSession]:
        """Get a specific saved session."""
        return db.query(SavedSession).filter(
            and_(SavedSession.id == session_id, SavedSession.user_id == user_id)
        ).first()
    
    def delete_saved_session(self, db: Session, user_id: str, session_id: str) -> bool:
        """Delete a saved session."""
        session = self.get_saved_session(db, user_id, session_id)
        if session:
            db.delete(session)
            db.commit()
            return True
        return False