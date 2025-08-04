import os
from jose import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from fastapi import HTTPException, status
from models.auth_schemas import User, UserCreate, UserLogin
import uuid


class AuthService:
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY", "debug-assistant-secret-key-change-in-production")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 24  # 24 hours
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        # In-memory user storage (in production, use a proper database)
        self.users_db: Dict[str, Dict[str, Any]] = {}
        
        # Create default admin user
        self._create_default_admin()
    
    def _create_default_admin(self):
        """Create default admin user with credentials admin/1234"""
        admin_id = str(uuid.uuid4())
        hashed_password = self.get_password_hash("1234")
        
        self.users_db["admin"] = {
            "id": admin_id,
            "username": "admin",
            "email": "admin@debugassistant.com",
            "hashed_password": hashed_password,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        print("🔐 Created default admin user (username: admin, password: 1234)")
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Generate password hash"""
        return self.pwd_context.hash(password)
    
    def get_user(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        return self.users_db.get(username)
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with username and password"""
        user = self.get_user(username)
        if not user:
            return None
        if not self.verify_password(password, user["hashed_password"]):
            return None
        return user
    
    def create_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """Create a new user"""
        if user_data.username in self.users_db:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        user_id = str(uuid.uuid4())
        hashed_password = self.get_password_hash(user_data.password)
        
        user_dict = {
            "id": user_id,
            "username": user_data.username,
            "email": user_data.email,
            "hashed_password": hashed_password,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        
        self.users_db[user_data.username] = user_dict
        return user_dict
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            username: str = payload.get("sub")
            if username is None:
                return None
            return {"username": username, "payload": payload}
        except jwt.PyJWTError:
            return None
    
    def get_current_user(self, token: str) -> Optional[User]:
        """Get current user from JWT token"""
        token_data = self.verify_token(token)
        if not token_data:
            return None
        
        username = token_data["username"]
        user = self.get_user(username)
        if user is None:
            return None
        
        return User(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            is_active=user["is_active"],
            created_at=user["created_at"]
        )
    
    def login(self, login_data: UserLogin) -> Dict[str, Any]:
        """Login user and return token"""
        user = self.authenticate_user(login_data.username, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=self.access_token_expire_minutes)
        access_token = self.create_access_token(
            data={"sub": user["username"]}, expires_delta=access_token_expires
        )
        
        user_obj = User(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            is_active=user["is_active"],
            created_at=user["created_at"]
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60,  # in seconds
            "user": user_obj
        }
    
    def signup(self, user_data: UserCreate) -> Dict[str, Any]:
        """Sign up new user and return token"""
        user = self.create_user(user_data)
        
        # Auto-login after signup
        access_token_expires = timedelta(minutes=self.access_token_expire_minutes)
        access_token = self.create_access_token(
            data={"sub": user["username"]}, expires_delta=access_token_expires
        )
        
        user_obj = User(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            is_active=user["is_active"],
            created_at=user["created_at"]
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60,  # in seconds
            "user": user_obj
        }