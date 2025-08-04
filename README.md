# 🚀 Multimodal Code Debug Assistant

A comprehensive AI-powered debugging tool that accepts code, logs, screenshots, and error traces to suggest intelligent fixes using Large Language Models (LLMs) and agentic workflows.

## ✨ Features

### 🎯 Core Functionality
- **AI Code Analysis** - Intelligent code review with specific line-by-line suggestions
- **Multi-Agent Workflows** - Specialized AI agents for error extraction, documentation retrieval, and fix generation
- **Multimodal Support** - Process code, logs, screenshots, and error traces
- **Real-time Analysis** - Live code analysis with debounced AI suggestions
- **Persistent Storage** - Save code snippets and logs to PostgreSQL/SQLite database

### 🛠️ Technical Features
- **Authentication System** - JWT-based user authentication with signup/login
- **Code Editor** - Syntax highlighting for JavaScript and Python with execution capabilities
- **Log Management** - Advanced logging system with filtering, search, and export
- **AI Integration** - Google Gemini API for intelligent code analysis
- **Database Integration** - PostgreSQL support with SQLite fallback
- **RESTful API** - Complete FastAPI backend with comprehensive endpoints

### 🤖 AI Agents
- **Error Extraction Agent** - Identifies and categorizes code errors
- **Code Analysis Agent** - Provides detailed code quality assessments
- **Documentation Retrieval Agent** - Fetches relevant documentation
- **Fix Generation Agent** - Generates specific code improvements
- **Multimodal Analysis Agent** - Processes screenshots and UI elements

## 🏗️ Architecture

```
├── frontend/          # React TypeScript application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Auth, Logging, AI)
│   │   └── services/      # API service layers
│   └── public/
└── backend/           # FastAPI Python application
    ├── services/          # Business logic and AI agents
    ├── models/           # Pydantic schemas
    ├── database/         # SQLAlchemy models and connection
    └── middleware/       # Authentication middleware
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ and npm
- **Python** 3.9+
- **PostgreSQL** (optional - SQLite fallback available)
- **Google Gemini API Key**

### 1. Clone Repository
```bash
git clone https://github.com/manpreetlotay99/multimodal-code-debug-assist.git
cd multimodal-code-debug-assist
```

### 2. Environment Setup
Create `.env` file in backend directory:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://user:pass@localhost:5432/debug_assistant  # Optional
SECRET_KEY=your-super-secret-jwt-key
```

### 3. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 5. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs



## 📁 Project Structure

### Backend (`/backend`)
```
backend/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── database/
│   ├── connection.py       # Database setup and connection
│   └── models.py          # SQLAlchemy models
├── services/
│   ├── ai_agent_service.py # AI workflow orchestration
│   ├── auth_service.py     # Authentication logic
│   └── save_service.py     # Database operations
├── models/
│   ├── schemas.py          # API schemas
│   ├── auth_schemas.py     # Authentication schemas
│   └── save_schemas.py     # Save functionality schemas
└── middleware/
    └── auth_middleware.py  # JWT authentication
```

### Frontend (`/frontend`)
```
frontend/src/
├── App.tsx                 # Main application component
├── components/
│   ├── CodeEditor.tsx      # Code editor with AI analysis
│   ├── LogViewer.tsx       # Log management interface
│   ├── LoginPage.tsx       # Authentication UI
│   └── DebugAssistant.tsx  # Main debug interface
├── contexts/
│   ├── AuthContext.tsx     # Authentication state
│   ├── LogContext.tsx      # Logging system
│   └── AISuggestionsContext.tsx # AI analysis state
└── services/
    ├── backendApiService.ts # Backend API client
    ├── saveService.ts       # Save functionality
    └── geminiService.ts     # AI service integration
```

## 🗄️ Database Schema

### Users
- User authentication and profile information

### Saved Codes
- Code snippets with metadata, language, and tags

### Saved Logs
- Log collections with analysis metadata

### Saved Sessions
- Complete debug sessions with full context

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Gemini API key for AI analysis | Required |
| `DATABASE_URL` | PostgreSQL connection string | SQLite fallback |
| `SECRET_KEY` | JWT signing key | Generated |
| `REACT_APP_BACKEND_URL` | Backend API URL | `http://localhost:8000` |

## 🧪 Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm install
npm run start
```

### Database Management
```bash
# View SQLite database (development)
sqlite3 backend/debug_assistant.db

# Run database migrations (if using PostgreSQL)
cd backend
alembic upgrade head
```

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc



## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/docs`
- Review the setup guides in `/backend/README.md` and `/frontend/README.md`