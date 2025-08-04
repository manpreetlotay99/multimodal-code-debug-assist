interface BackendDebugInput {
  type: 'code' | 'logs' | 'screenshot' | 'error_trace' | 'diagram';
  content: string;
  metadata?: Record<string, any>;
  session_id?: string;
}

interface WorkflowStatus {
  workflow_id: string;
  status: 'analyzing' | 'completed' | 'failed';
  progress: number;
  tasks: Array<{
    id: string;
    agent_id: string;
    type: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    error?: string;
  }>;
  suggestions_count: number;
  completed_tasks: number;
  total_tasks: number;
}

interface BackendSuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  type: 'code_fix' | 'configuration' | 'dependency' | 'architecture';
  originalCode?: string;
  suggestedCode?: string;
  steps: string[];
  rationale: string;
  documentation: string[];
  relatedInputs: string[];
  agent: string;
}

interface SuggestionsResponse {
  workflow_id: string;
  status: string;
  suggestions: BackendSuggestion[];
  suggestions_count: number;
  analysis_summary: {
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    agents_used: string[];
  };
}

interface AnalysisRequest {
  session_id?: string;
  priority?: string;
  options?: Record<string, any>;
}

class BackendApiService {
  private baseUrl: string;
  private sessionId: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async healthCheck(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      console.error('Backend health check failed:', error);
      throw new Error('Backend service unavailable');
    }
  }

  async getAgents(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/agents`, {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get agents:', error);
      throw error;
    }
  }

  async addTextInput(type: BackendDebugInput['type'], content: string, metadata?: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/debug/input`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          type,
          content,
          metadata,
          session_id: this.sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to add text input:', error);
      throw error;
    }
  }

  async uploadFile(file: File, inputType?: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('input_type', inputType || 'auto');
      formData.append('session_id', this.sessionId);

      const response = await fetch(`${this.baseUrl}/debug/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  async startAnalysis(options?: Record<string, any>): Promise<any> {
    try {
      const request: AnalysisRequest = {
        session_id: this.sessionId,
        priority: 'normal',
        options
      };

      const response = await fetch(`${this.baseUrl}/debug/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to start analysis:', error);
      throw error;
    }
  }

  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/debug/workflow/${workflowId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      throw error;
    }
  }

  async getSuggestions(workflowId: string): Promise<SuggestionsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/debug/suggestions/${workflowId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      throw error;
    }
  }

  async applySuggestion(workflowId: string, suggestionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/debug/apply-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          suggestion_id: suggestionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      throw error;
    }
  }

  async clearSession(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/debug/session/${this.sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Generate new session ID
      this.sessionId = this.generateSessionId();

      return await response.json();
    } catch (error) {
      console.error('Failed to clear session:', error);
      throw error;
    }
  }

  // Polling utility for workflow status
  async pollWorkflowStatus(workflowId: string, onProgress?: (status: WorkflowStatus) => void): Promise<WorkflowStatus> {
    return new Promise((resolve, reject) => {
      const pollInterval = 2000; // 2 seconds
      const maxPolls = 150; // 5 minutes max
      let pollCount = 0;

      const poll = async () => {
        try {
          pollCount++;
          const status = await this.getWorkflowStatus(workflowId);
          
          if (onProgress) {
            onProgress(status);
          }

          if (status.status === 'completed' || status.status === 'failed') {
            resolve(status);
          } else if (pollCount >= maxPolls) {
            reject(new Error('Polling timeout: Analysis took too long'));
          } else {
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  getSessionId(): string {
    return this.sessionId;
  }

  resetSession(): void {
    this.sessionId = this.generateSessionId();
  }
}

export const backendApiService = new BackendApiService();
export type { BackendDebugInput, WorkflowStatus, BackendSuggestion, SuggestionsResponse };