from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum


class InputType(str, Enum):
    code = "code"
    logs = "logs"
    screenshot = "screenshot"
    error_trace = "error_trace"
    diagram = "diagram"


class TaskStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class WorkflowStatus(str, Enum):
    analyzing = "analyzing"
    completed = "completed"
    failed = "failed"


class SuggestionType(str, Enum):
    code_fix = "code_fix"
    configuration = "configuration"
    dependency = "dependency"
    architecture = "architecture"


class DebugInputCreate(BaseModel):
    type: InputType
    content: str
    metadata: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None


class DebugInput(BaseModel):
    id: str
    type: InputType
    content: Union[str, Any]  # Can be string content or file path
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime


class AIAgent(BaseModel):
    id: str
    name: str
    description: str
    capabilities: List[str]


class AgentTask(BaseModel):
    id: str
    agentId: str
    type: str
    input: Any
    status: TaskStatus
    result: Optional[Any] = None
    error: Optional[str] = None
    timestamp: datetime


class FixSuggestion(BaseModel):
    id: str
    title: str
    description: str
    confidence: float = Field(ge=0, le=100)
    type: SuggestionType
    originalCode: Optional[str] = None
    suggestedCode: Optional[str] = None
    steps: List[str] = Field(default_factory=list)
    rationale: str
    documentation: List[str] = Field(default_factory=list)
    relatedInputs: List[str] = Field(default_factory=list)
    agent: str


class AgentWorkflow(BaseModel):
    id: str
    inputs: List[DebugInput]
    tasks: List[AgentTask] = Field(default_factory=list)
    suggestions: List[FixSuggestion] = Field(default_factory=list)
    status: WorkflowStatus
    progress: float = Field(default=0, ge=0, le=100)


class AnalysisRequest(BaseModel):
    session_id: Optional[str] = None
    priority: Optional[str] = "normal"
    options: Optional[Dict[str, Any]] = None


class AnalysisResponse(BaseModel):
    success: bool
    workflow_id: str
    session_id: str
    status: str
    inputs_count: int
    message: str


class WorkflowStatusResponse(BaseModel):
    workflow_id: str
    status: WorkflowStatus
    progress: float
    tasks: List[Dict[str, Any]]
    suggestions_count: int
    completed_tasks: int
    total_tasks: int


class SuggestionsResponse(BaseModel):
    workflow_id: str
    status: WorkflowStatus
    suggestions: List[FixSuggestion]
    suggestions_count: int
    analysis_summary: Dict[str, Any]


class ApplySuggestionRequest(BaseModel):
    workflow_id: str
    suggestion_id: str


class ApplySuggestionResponse(BaseModel):
    success: bool
    suggestion_id: str
    title: str
    message: str
    applied_changes: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    error: str
    detail: str
    timestamp: datetime


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    services: Dict[str, str]


class AgentsResponse(BaseModel):
    agents: List[AIAgent]
    count: int


class FileUploadResponse(BaseModel):
    success: bool
    input_id: str
    session_id: str
    file_name: str
    input_type: InputType
    message: str


class SessionClearResponse(BaseModel):
    success: bool
    session_id: str
    message: str