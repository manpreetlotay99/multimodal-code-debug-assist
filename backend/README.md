# 🔧 Backend Setup - AI Debug Assistant API

FastAPI-based backend service with PostgreSQL database, JWT authentication, and AI agent workflows.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration
Create `.env` file in the backend directory:
```env
# Required - Get from Google AI Studio
GOOGLE_API_KEY=your_gemini_api_key_here

# Optional - Database (defaults to SQLite)
DATABASE_URL=postgresql://username:password@localhost:5432/debug_assistant

# Optional - JWT Secret (auto-generated if not provided)
SECRET_KEY=your-super-secret-jwt-key-change-in-production

# Optional - Server Configuration
HOST=0.0.0.0
PORT=8000
```

### 3. Database Setup

#### Option A: SQLite (Default - No Setup Required)
The application will automatically create `debug_assistant.db` in the backend directory.

#### Option B: PostgreSQL (Recommended for Production)
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database and user
psql postgres
CREATE DATABASE debug_assistant;
CREATE USER debug_user WITH ENCRYPTED PASSWORD 'debug_pass';
GRANT ALL PRIVILEGES ON DATABASE debug_assistant TO debug_user;
\q

# Set environment variable
export DATABASE_URL="postgresql://debug_user:debug_pass@localhost:5432/debug_assistant"
```

### 4. Start the Server
```bash
# Development (with auto-reload)
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 5. Verify Installation
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/
- Alternative Docs: http://localhost:8000/redoc

## 📦 Dependencies

### Core Dependencies
```
fastapi==0.104.1         # Web framework
uvicorn[standard]==0.24.0 # ASGI server
pydantic==2.5.0          # Data validation
python-multipart==0.0.6  # File upload support
```

### Database Dependencies
```
sqlalchemy==2.0.23       # ORM
psycopg2-binary==2.9.9   # PostgreSQL adapter
alembic==1.12.1          # Database migrations
```

### Authentication Dependencies
```
python-jose[cryptography]==3.3.0  # JWT handling
passlib[bcrypt]==1.7.4            # Password hashing
```

### AI/ML Dependencies
```
aiohttp==3.9.1           # Async HTTP client
google-generativeai      # Gemini API (install separately)
```

### Utility Dependencies
```
python-dotenv==1.0.0     # Environment variables
python-dateutil==2.8.2   # Date utilities
aiofiles==23.2.1         # Async file operations
Pillow==10.1.0           # Image processing
```

## 🏗️ Project Structure

```
backend/
├── main.py                      # FastAPI application entry point
├── requirements.txt             # Python dependencies
├── .env                        # Environment variables (create this)
├── debug_assistant.db          # SQLite database (auto-created)
├── database/
│   ├── __init__.py
│   ├── connection.py           # Database connection and session management
│   └── models.py              # SQLAlchemy database models
├── services/
│   ├── __init__.py
│   ├── ai_agent_service.py     # AI workflow orchestration and agents
│   ├── auth_service.py         # User authentication and JWT handling
│   ├── save_service.py         # Database CRUD operations
│   └── multimodal_analyzer.py  # Image/screenshot analysis
├── models/
│   ├── __init__.py
│   ├── schemas.py              # Core API request/response schemas
│   ├── auth_schemas.py         # Authentication-related schemas
│   └── save_schemas.py         # Save functionality schemas
└── middleware/
    ├── __init__.py
    └── auth_middleware.py      # JWT authentication middleware
```

## 🗄️ Database Models

### Users Table
```sql
- id: String (UUID, Primary Key)
- username: String (Unique, Index)
- email: String (Optional, Index)
- hashed_password: String
- is_active: String (default: "true")
- created_at: DateTime
- updated_at: DateTime
```

### Saved Codes Table
```sql
- id: String (UUID, Primary Key)
- title: String (Required)
- description: Text (Optional)
- code_content: Text (Required)
- language: String (Optional)
- tags: JSON Array (Optional)
- user_id: String (Foreign Key)
- created_at: DateTime
- updated_at: DateTime
```

### Saved Logs Table
```sql
- id: String (UUID, Primary Key)
- title: String (Required)
- description: Text (Optional)
- log_content: Text (Required)
- log_level: String (Optional)
- source: String (Optional)
- log_metadata: JSON (Optional)
- tags: JSON Array (Optional)
- user_id: String (Foreign Key)
- created_at: DateTime
- updated_at: DateTime
```

## 🔐 Authentication System

### Default Admin User
- **Username**: `admin`
- **Password**: `1234`
- Automatically created on first startup

### JWT Configuration
- **Algorithm**: HS256
- **Expiration**: 30 minutes
- **Token Type**: Bearer

### Creating New Users
```bash
# Via API (POST /auth/signup)
curl -X POST "http://localhost:8000/auth/signup" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "newuser",
       "password": "securepassword",
       "email": "user@example.com",
       "full_name": "New User"
     }'
```

## 🤖 AI Agents Configuration

### Gemini API Setup
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` file: `GOOGLE_API_KEY=your_key_here`

### Available Agents
- **Error Extraction Agent**: Identifies and categorizes errors
- **Code Analysis Agent**: Provides code quality assessment
- **Documentation Retrieval Agent**: Fetches relevant documentation
- **Fix Generation Agent**: Generates specific code improvements
- **Multimodal Analysis Agent**: Processes screenshots and images

## 📡 API Endpoints

### Authentication Endpoints
```
POST   /auth/login     # User login
POST   /auth/signup    # User registration
GET    /auth/me        # Current user info
POST   /auth/logout    # User logout
```

### Debug Assistant Endpoints
```
GET    /agents                    # List available AI agents
POST   /debug/input              # Add text input to session
POST   /debug/upload             # Upload file to session
POST   /debug/analyze            # Start AI analysis workflow
GET    /debug/workflow/{id}      # Get workflow status
GET    /debug/suggestions/{id}   # Get analysis suggestions
POST   /debug/apply-suggestion   # Apply a suggested fix
DELETE /debug/session/{id}       # Clear debug session
```

### Save Functionality Endpoints
```
POST   /save/code                # Save code snippet
POST   /save/logs                # Save log collection
POST   /save/session             # Save complete debug session
GET    /saved/codes              # List saved code snippets
GET    /saved/logs               # List saved log collections
DELETE /saved/code/{id}          # Delete saved code
DELETE /saved/log/{id}           # Delete saved log
```

### System Endpoints
```
GET    /                         # Health check
GET    /docs                     # Swagger UI documentation
GET    /redoc                    # ReDoc documentation
```

## 🔧 Development Tools

### Database Management
```bash
# View SQLite database
sqlite3 debug_assistant.db
.tables
.schema users
SELECT * FROM saved_codes;

# PostgreSQL access
psql -h localhost -U debug_user -d debug_assistant
\dt
\d+ users
```

### API Testing
```bash
# Health check
curl http://localhost:8000/

# Login
curl -X POST "http://localhost:8000/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "1234"}'

# Test with authentication
export TOKEN="your_jwt_token_here"
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/agents
```

### Server Monitoring
```bash
# Check if server is running
ps aux | grep uvicorn

# View server logs
tail -f uvicorn.log

# Check port usage
lsof -i :8000
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Module Not Found Errors
```bash
# Ensure you're in the backend directory
cd backend

# Install missing dependencies
pip install -r requirements.txt

# Check Python path
python -c "import sys; print(sys.path)"
```

#### 2. Database Connection Issues
```bash
# SQLite permissions
chmod 664 debug_assistant.db

# PostgreSQL connection
pg_isready -h localhost -p 5432
```

#### 3. Gemini API Errors
```bash
# Verify API key
echo $GOOGLE_API_KEY

# Test API key
python -c "
import os
from google.generativeai import configure, GenerativeModel
configure(api_key=os.getenv('GOOGLE_API_KEY'))
model = GenerativeModel('gemini-1.5-flash')
print('API key is valid')
"
```

#### 4. Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Use different port
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

### Performance Optimization

#### 1. Database Indexing
The application includes optimized indexes for:
- User queries on username/email
- Saved codes by user and creation date
- Saved logs by level and source

#### 2. API Rate Limiting
Consider implementing rate limiting for production:
```bash
pip install slowapi
```

#### 3. Caching
For production, consider adding Redis caching:
```bash
pip install redis aioredis
```

## 🌐 Production Deployment

### Environment Variables for Production
```env
# Security
SECRET_KEY=your-super-long-random-secret-key-for-production
DATABASE_URL=postgresql://user:pass@prod-db:5432/debug_assistant

# Performance
WORKERS=4
HOST=0.0.0.0
PORT=8000

# Logging
LOG_LEVEL=INFO
```

### Docker Deployment
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Systemd Service
```ini
[Unit]
Description=AI Debug Assistant API
After=network.target

[Service]
Type=simple
User=api
WorkingDirectory=/opt/debug-assistant/backend
Environment=PATH=/opt/debug-assistant/venv/bin
ExecStart=/opt/debug-assistant/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

