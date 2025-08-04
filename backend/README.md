# AI Debug Assistant - Backend API

FastAPI backend for the multimodal debugging assistant with AI agents and agentic workflows.

## 🚀 Quick Start

1. **Install Python 3.8+**
2. **Start the server:**
   ```bash
   python start.py
   ```

The server will start at `http://localhost:8000` with auto-reload enabled.

## 📖 API Documentation

- **Interactive docs:** http://localhost:8000/docs
- **OpenAPI schema:** http://localhost:8000/openapi.json

## 🔧 Manual Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🔑 Environment Variables

```bash
GEMINI_API_KEY=your_gemini_api_key
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DEBUG=true
```

## 📁 API Endpoints

### Core Endpoints
- `GET /` - API information
- `GET /health` - Health check
- `GET /agents` - List AI agents

### Debug Analysis
- `POST /debug/input` - Add text input
- `POST /debug/upload` - Upload files
- `POST /debug/analyze` - Start analysis
- `GET /debug/workflow/{id}` - Get workflow status
- `GET /debug/suggestions/{id}` - Get suggestions
- `POST /debug/apply-suggestion` - Apply suggestion
- `DELETE /debug/session/{id}` - Clear session

## 🤖 AI Agents

1. **Error Extraction Agent** - Parses logs and stack traces
2. **Code Analysis Agent** - Analyzes code for bugs and issues
3. **Documentation Retrieval Agent** - Finds relevant documentation
4. **Fix Generation Agent** - Generates code fixes with rationales
5. **Multimodal Analysis Agent** - Analyzes images and diagrams

## 📊 Features

- ✅ Multimodal input support (code, logs, images, traces)
- ✅ Agentic workflows with real-time progress tracking
- ✅ File upload handling with automatic type detection
- ✅ Session management for multiple concurrent users
- ✅ Comprehensive error handling and logging
- ✅ CORS support for frontend integration
- ✅ Background task processing
- ✅ RESTful API design with OpenAPI documentation

## 🐛 Development

```bash
# Install development dependencies
pip install -r requirements.txt

# Run with auto-reload
python start.py

# Run tests (if available)
pytest

# Format code
black .
```

## 📝 Notes

- Uploaded files are stored in the `uploads/` directory
- Sessions are managed in-memory (use Redis for production)
- Workflows are stored in-memory (use database for production)
- The API supports CORS for frontend integration