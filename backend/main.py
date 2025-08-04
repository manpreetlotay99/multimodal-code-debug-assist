from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
import uvicorn
import os
import json
import asyncio
from datetime import datetime
import uuid

from services.ai_agent_service import AIAgentService, DebugInput, AgentWorkflow
from services.multimodal_analyzer import MultimodalAnalyzer
from services.auth_service import AuthService
from services.save_service import SaveService
from middleware.auth_middleware import get_current_active_user, get_auth_service
from models.auth_schemas import UserLogin, UserCreate, AuthResponse, Token, User
from models.save_schemas import (
    SaveCodeRequest, SaveLogRequest, SaveSessionRequest,
    SavedCodeResponse, SavedLogResponse, SavedSessionResponse,
    SaveResponse, SavedItemsListResponse
)
from models.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    WorkflowStatus,
    DebugInputCreate,
    FixSuggestion
)
from database.connection import engine, get_db, Base
from database.models import User as DBUser, SavedCode, SavedLog, SavedSession
from sqlalchemy.orm import Session

# Initialize FastAPI app
app = FastAPI(
    title="AI Debug Assistant API",
    description="Multimodal debugging assistant with AI agents and agentic workflows",
    version="1.0.0"
)

# Configure CORS - Simplified approach
# Temporarily disable middleware to use manual CORS handling
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
#     allow_credentials=True,
#     allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
#     allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
#     expose_headers=["*"]
# )

# Manual CORS middleware
@app.middleware("http")
async def add_cors_headers(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "86400"
    return response

# Initialize services
ai_agent_service = AIAgentService()
multimodal_analyzer = MultimodalAnalyzer()
save_service = SaveService()

# In-memory storage for workflows (in production, use a proper database)
workflows_storage: Dict[str, AgentWorkflow] = {}
analysis_queue: Dict[str, Dict] = {}


@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup."""
    print("🚀 AI Debug Assistant API starting up...")
    
    # Create database tables
    try:
        Base.metadata.create_all(bind=engine)
        print("🗄️ Database tables created/verified")
    except Exception as e:
        print(f"⚠️ Database initialization warning: {e}")
        print("   Using in-memory storage as fallback")
    
    print("🤖 AI Agents initialized")
    print("👁️ Multimodal analyzer ready")
    print("💾 Save service ready")


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "AI Debug Assistant API",
        "version": "1.0.0",
        "status": "running",
        "agents": len(ai_agent_service.get_agents()),
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "ai_agents": "running",
            "multimodal_analyzer": "running"
        }
    }


# Authentication Endpoints
@app.post("/auth/login", response_model=AuthResponse)
async def login(login_data: UserLogin, auth_service: AuthService = Depends(get_auth_service)):
    """Login endpoint for user authentication."""
    try:
        result = auth_service.login(login_data)
        return AuthResponse(
            success=True,
            message="Login successful",
            token=Token(**result),
            user=result["user"]
        )
    except HTTPException as e:
        return AuthResponse(
            success=False,
            message=e.detail
        )
    except Exception as e:
        return AuthResponse(
            success=False,
            message=f"Login failed: {str(e)}"
        )


@app.post("/auth/signup", response_model=AuthResponse)
async def signup(user_data: UserCreate, auth_service: AuthService = Depends(get_auth_service)):
    """Signup endpoint for user registration."""
    try:
        result = auth_service.signup(user_data)
        return AuthResponse(
            success=True,
            message="Registration successful",
            token=Token(**result),
            user=result["user"]
        )
    except HTTPException as e:
        return AuthResponse(
            success=False,
            message=e.detail
        )
    except Exception as e:
        return AuthResponse(
            success=False,
            message=f"Registration failed: {str(e)}"
        )


@app.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current authenticated user information."""
    return current_user


@app.post("/auth/logout")
async def logout():
    """Logout endpoint (token invalidation handled on client side)."""
    return {
        "success": True,
        "message": "Logged out successfully"
    }


# Save Endpoints
@app.post("/save/code", response_model=SaveResponse)
async def save_code(
    request: SaveCodeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save a code snippet to the database."""
    try:
        saved_code = save_service.save_code(db, current_user.id, request)
        return SaveResponse(
            success=True,
            message="Code saved successfully",
            item_id=saved_code.id,
            item=SavedCodeResponse.from_orm(saved_code)
        )
    except Exception as e:
        print(f"Error saving code: {e}")
        return SaveResponse(
            success=False,
            message=f"Failed to save code: {str(e)}"
        )


@app.post("/save/logs", response_model=SaveResponse)
async def save_logs(
    request: SaveLogRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save logs to the database."""
    try:
        saved_log = save_service.save_log(db, current_user.id, request)
        return SaveResponse(
            success=True,
            message="Logs saved successfully",
            item_id=saved_log.id,
            item=SavedLogResponse.from_orm(saved_log)
        )
    except Exception as e:
        print(f"Error saving logs: {e}")
        return SaveResponse(
            success=False,
            message=f"Failed to save logs: {str(e)}"
        )


@app.post("/save/session", response_model=SaveResponse)
async def save_session(
    request: SaveSessionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save a complete debug session to the database."""
    try:
        saved_session = save_service.save_session(db, current_user.id, request)
        return SaveResponse(
            success=True,
            message="Session saved successfully",
            item_id=saved_session.id,
            item=SavedSessionResponse.from_orm(saved_session)
        )
    except Exception as e:
        print(f"Error saving session: {e}")
        return SaveResponse(
            success=False,
            message=f"Failed to save session: {str(e)}"
        )


@app.get("/saved/codes", response_model=SavedItemsListResponse)
async def get_saved_codes(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    language: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get saved code snippets with pagination and filtering."""
    try:
        codes, total = save_service.get_saved_codes(
            db, current_user.id, page, per_page, search, language
        )
        
        total_pages = (total + per_page - 1) // per_page
        
        return SavedItemsListResponse(
            items=[SavedCodeResponse.from_orm(code) for code in codes],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        print(f"Error getting saved codes: {e}")
        return SavedItemsListResponse(
            items=[],
            total=0,
            page=page,
            per_page=per_page,
            total_pages=0
        )


@app.get("/saved/logs", response_model=SavedItemsListResponse)
async def get_saved_logs(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    log_level: Optional[str] = None,
    source: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get saved logs with pagination and filtering."""
    try:
        logs, total = save_service.get_saved_logs(
            db, current_user.id, page, per_page, search, log_level, source
        )
        
        total_pages = (total + per_page - 1) // per_page
        
        return SavedItemsListResponse(
            items=[SavedLogResponse.from_orm(log) for log in logs],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        print(f"Error getting saved logs: {e}")
        return SavedItemsListResponse(
            items=[],
            total=0,
            page=page,
            per_page=per_page,
            total_pages=0
        )


@app.delete("/saved/code/{code_id}")
async def delete_saved_code(
    code_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a saved code snippet."""
    try:
        success = save_service.delete_saved_code(db, current_user.id, code_id)
        if success:
            return {"success": True, "message": "Code deleted successfully"}
        else:
            return {"success": False, "message": "Code not found"}
    except Exception as e:
        print(f"Error deleting code: {e}")  
        return {"success": False, "message": f"Failed to delete code: {str(e)}"}


@app.delete("/saved/log/{log_id}")
async def delete_saved_log(
    log_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a saved log."""
    try:
        success = save_service.delete_saved_log(db, current_user.id, log_id)
        if success:
            return {"success": True, "message": "Log deleted successfully"}
        else:
            return {"success": False, "message": "Log not found"}
    except Exception as e:
        print(f"Error deleting log: {e}")
        return {"success": False, "message": f"Failed to delete log: {str(e)}"}


@app.get("/agents")
async def get_agents():
    """Get list of available AI agents."""
    agents = ai_agent_service.get_agents()
    return {
        "agents": agents,
        "count": len(agents)
    }


# Global OPTIONS handler for CORS preflight
@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle all CORS preflight requests."""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin, X-Requested-With",
            "Access-Control-Max-Age": "86400"
        }
    )

@app.post("/debug/input")
async def add_debug_input(input_data: DebugInputCreate):
    """Add a text-based debug input."""
    try:
        debug_input = DebugInput(
            id=str(uuid.uuid4()),
            type=input_data.type,
            content=input_data.content,
            metadata=input_data.metadata or {},
            timestamp=datetime.now()
        )
        
        # Store in temporary session (in production, associate with user session)
        session_id = input_data.session_id or "default"
        if session_id not in analysis_queue:
            analysis_queue[session_id] = {"inputs": [], "status": "collecting"}
        
        analysis_queue[session_id]["inputs"].append(debug_input.dict())
        
        return {
            "success": True,
            "input_id": debug_input.id,
            "session_id": session_id,
            "message": f"Added {input_data.type} input successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add input: {str(e)}")


@app.post("/debug/upload")
async def upload_file(
    file: UploadFile = File(...),
    input_type: str = Form("auto"),
    session_id: Optional[str] = Form(None)
):
    """Upload a file for debug analysis."""
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save uploaded file
        file_path = os.path.join(upload_dir, f"{uuid.uuid4()}_{file.filename}")
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Determine input type if auto
        if input_type == "auto":
            input_type = determine_file_type(file.filename, file.content_type)
        
        # Create debug input
        debug_input = DebugInput(
            id=str(uuid.uuid4()),
            type=input_type,
            content=file_path,  # Store file path for files
            metadata={
                "filename": file.filename,
                "content_type": file.content_type,
                "file_size": len(content),
                "is_file": True
            },
            timestamp=datetime.now()
        )
        
        # Store in session
        session_id = session_id or "default"
        if session_id not in analysis_queue:
            analysis_queue[session_id] = {"inputs": [], "status": "collecting"}
        
        analysis_queue[session_id]["inputs"].append(debug_input.dict())
        
        return {
            "success": True,
            "input_id": debug_input.id,
            "session_id": session_id,
            "file_name": file.filename,
            "input_type": input_type,
            "message": f"Uploaded {file.filename} successfully"
        }
    except Exception as e:
        # Clean up file if it was created
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@app.post("/debug/analyze")
async def start_analysis(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks
):
    """Start AI analysis workflow."""
    try:
        session_id = request.session_id or "default"
        
        # Get inputs from session
        if session_id not in analysis_queue:
            raise HTTPException(status_code=404, detail="No inputs found for session")
        
        session_data = analysis_queue[session_id]
        if not session_data["inputs"]:
            raise HTTPException(status_code=400, detail="No inputs available for analysis")
        
        # Create workflow ID
        workflow_id = str(uuid.uuid4())
        
        # Convert stored inputs back to DebugInput objects
        inputs = []
        for input_data in session_data["inputs"]:
            inputs.append(DebugInput(**input_data))
        
        # Plan tasks upfront so they show in the UI immediately
        planned_tasks = ai_agent_service._plan_tasks(inputs)
        
        # Initialize workflow with planned tasks
        workflow = AgentWorkflow(
            id=workflow_id,
            inputs=inputs,
            tasks=planned_tasks,  # Pre-populate with planned tasks
            suggestions=[],
            status="analyzing",
            progress=0
        )
        
        workflows_storage[workflow_id] = workflow
        analysis_queue[session_id]["status"] = "analyzing"
        analysis_queue[session_id]["workflow_id"] = workflow_id
        
        # Start analysis in background
        background_tasks.add_task(run_analysis_workflow, workflow_id, inputs)
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "session_id": session_id,
            "status": "started",
            "inputs_count": len(inputs),
            "message": "Analysis started successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start analysis: {str(e)}")


@app.get("/debug/workflow/{workflow_id}")
async def get_workflow_status(workflow_id: str):
    """Get workflow status and progress."""
    if workflow_id not in workflows_storage:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow = workflows_storage[workflow_id]
    return {
        "workflow_id": workflow_id,
        "status": workflow.status,
        "progress": workflow.progress,
        "tasks": [
            {
                "id": task.id,
                "agent_id": task.agentId,
                "type": task.type,
                "status": task.status,
                "error": task.error if task.status == "failed" else None
            }
            for task in workflow.tasks
        ],
        "suggestions_count": len(workflow.suggestions),
        "completed_tasks": len([t for t in workflow.tasks if t.status == "completed"]),
        "total_tasks": len(workflow.tasks)
    }


@app.get("/debug/suggestions/{workflow_id}")
async def get_suggestions(workflow_id: str):
    """Get AI suggestions from completed workflow."""
    if workflow_id not in workflows_storage:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow = workflows_storage[workflow_id]
    
    if workflow.status != "completed":
        return {
            "workflow_id": workflow_id,
            "status": workflow.status,
            "suggestions": [],
            "message": "Analysis still in progress" if workflow.status == "analyzing" else "Analysis failed"
        }
    
    return {
        "workflow_id": workflow_id,
        "status": workflow.status,
        "suggestions": [suggestion.dict() for suggestion in workflow.suggestions],
        "suggestions_count": len(workflow.suggestions),
        "analysis_summary": {
            "total_tasks": len(workflow.tasks),
            "completed_tasks": len([t for t in workflow.tasks if t.status == "completed"]),
            "failed_tasks": len([t for t in workflow.tasks if t.status == "failed"]),
            "agents_used": list(set([t.agentId for t in workflow.tasks]))
        }
    }


@app.post("/debug/apply-suggestion")
async def apply_suggestion(
    workflow_id: str,
    suggestion_id: str
):
    """Apply a specific suggestion."""
    try:
        if workflow_id not in workflows_storage:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        workflow = workflows_storage[workflow_id]
        suggestion = next((s for s in workflow.suggestions if s.id == suggestion_id), None)
        
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        # In a real implementation, this would apply the suggestion to the actual code
        # For now, we'll just mark it as applied
        
        return {
            "success": True,
            "suggestion_id": suggestion_id,
            "title": suggestion.title,
            "message": "Suggestion applied successfully",
            "applied_changes": {
                "original_code": suggestion.originalCode,
                "suggested_code": suggestion.suggestedCode
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply suggestion: {str(e)}")


@app.delete("/debug/session/{session_id}")
async def clear_session(session_id: str):
    """Clear session data and cleanup files."""
    try:
        if session_id in analysis_queue:
            # Clean up uploaded files
            for input_data in analysis_queue[session_id].get("inputs", []):
                if input_data.get("metadata", {}).get("is_file"):
                    file_path = input_data["content"]
                    if os.path.exists(file_path):
                        os.remove(file_path)
            
            # Remove from queue
            del analysis_queue[session_id]
        
        return {
            "success": True,
            "session_id": session_id,
            "message": "Session cleared successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear session: {str(e)}")


async def run_analysis_workflow(workflow_id: str, inputs: List[DebugInput]):
    """Run the AI analysis workflow in the background."""
    try:
        workflow = workflows_storage[workflow_id]
        
        # Execute the workflow using the existing tasks
        await ai_agent_service._execute_workflow(workflow)
        
        # Update stored workflow (tasks are already updated in-place by _execute_workflow)
        workflows_storage[workflow_id] = workflow
        
    except Exception as e:
        # Mark workflow as failed
        if workflow_id in workflows_storage:
            workflow = workflows_storage[workflow_id]
            workflow.status = "failed"
            workflow.progress = 100
            workflows_storage[workflow_id] = workflow
        
        print(f"Workflow {workflow_id} failed: {str(e)}")


def determine_file_type(filename: str, content_type: str) -> str:
    """Determine the input type based on filename and content type."""
    filename_lower = filename.lower()
    
    if content_type and content_type.startswith("image/"):
        return "screenshot"
    elif any(ext in filename_lower for ext in ['.log', '.logs']):
        return "logs"
    elif any(ext in filename_lower for ext in ['.trace', '.stack']):
        return "error_trace"
    elif any(ext in filename_lower for ext in ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rb']):
        return "code"
    elif any(ext in filename_lower for ext in ['.svg', '.drawio', '.vsd']):
        return "diagram"
    else:
        return "code"  # Default to code


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )