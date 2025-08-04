import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { backendApiService, BackendDebugInput, WorkflowStatus, BackendSuggestion } from '../services/backendApiService';
import { useLogger } from './LogContext';

// Define interfaces to match the backend
interface DebugInput {
  id: string;
  type: BackendDebugInput['type'];
  content: string | File;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface AIAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

interface AgentWorkflow {
  id: string;
  inputs: DebugInput[];
  tasks: any[]; // We'll get this from backend
  suggestions: BackendSuggestion[];
  status: 'analyzing' | 'completed' | 'failed';
  progress: number;
}

interface DebugAssistantContextType {
  workflows: AgentWorkflow[];
  currentWorkflow: AgentWorkflow | null;
  currentInputs: DebugInput[];
  isAnalyzing: boolean;
  agents: AIAgent[];
  addInput: (type: DebugInput['type'], content: string | File, metadata?: Record<string, any>) => void;
  startAnalysis: () => Promise<void>;
  clearInputs: () => void;
  clearWorkflows: () => void;
  getWorkflowById: (id: string) => AgentWorkflow | undefined;
  applySuggestion: (suggestionId: string) => void;
}

const DebugAssistantContext = createContext<DebugAssistantContextType | undefined>(undefined);

export const useDebugAssistant = () => {
  const context = useContext(DebugAssistantContext);
  if (!context) {
    throw new Error('useDebugAssistant must be used within DebugAssistantProvider');
  }
  return context;
};

interface DebugAssistantProviderProps {
  children: ReactNode;
}

export const DebugAssistantProvider: React.FC<DebugAssistantProviderProps> = ({ children }) => {
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<AgentWorkflow | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentInputs, setCurrentInputs] = useState<DebugInput[]>([]);
  const [agents, setAgents] = useState<AIAgent[]>([]);

  // Load agents from backend on initialization
  React.useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await backendApiService.getAgents();
        setAgents(response.agents || []);
        console.log('Loaded AI agents from backend', response.agents?.length || 0);
      } catch (error) {
        console.error('Failed to load AI agents from backend:', error);
        // Set default agents if backend is unavailable
        setAgents([
          { id: 'error-extractor', name: 'Error Extraction Agent', description: 'Extracts and categorizes errors', capabilities: [] },
          { id: 'code-analyzer', name: 'Code Analysis Agent', description: 'Analyzes code for issues', capabilities: [] },
          { id: 'doc-retriever', name: 'Documentation Agent', description: 'Finds relevant documentation', capabilities: [] },
          { id: 'fix-generator', name: 'Fix Generation Agent', description: 'Generates code fixes', capabilities: [] },
          { id: 'multimodal-analyzer', name: 'Multimodal Agent', description: 'Analyzes images and diagrams', capabilities: [] }
        ]);
      }
    };

    loadAgents();
  }, []); // No dependencies to prevent infinite loop

  const addInput = useCallback(async (
    type: DebugInput['type'], 
    content: string | File, 
    metadata?: Record<string, any>
  ) => {
    try {
      let response;
      const input: DebugInput = {
        id: `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content,
        metadata,
        timestamp: new Date()
      };

      // Send to backend API
      if (content instanceof File) {
        response = await backendApiService.uploadFile(content, type);
        console.log(`Uploaded ${type} file to backend:`, content.name);
      } else {
        response = await backendApiService.addTextInput(type, content, metadata);
        console.log(`Added ${type} text input to backend`, 'DebugAssistant', { 
          contentLength: content.length,
          inputType: type
        });
      }

      // Add to local state for UI display
      input.id = response.input_id || input.id;
      setCurrentInputs(prev => [...prev, input]);

    } catch (error) {
      console.error(`Failed to add ${type} input`, 'DebugAssistant', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }, []);

  const startAnalysis = useCallback(async () => {
    if (currentInputs.length === 0) {
      console.warn('No inputs provided for analysis', 'DebugAssistant');
      return;
    }

    setIsAnalyzing(true);
    console.log('Starting multimodal debug analysis via backend API', 'DebugAssistant', { 
      inputCount: currentInputs.length,
      inputTypes: currentInputs.map(i => i.type),
      sessionId: backendApiService.getSessionId()
    });

    try {
      // Start analysis on backend
      const response = await backendApiService.startAnalysis();
      const workflowId = response.workflow_id;
      
      console.log('Analysis started on backend', 'DebugAssistant', { 
        workflowId,
        inputsCount: response.inputs_count
      });

      // Create initial workflow object - get initial tasks from backend
      const initialStatus = await backendApiService.getWorkflowStatus(workflowId);
      const initialWorkflow: AgentWorkflow = {
        id: workflowId,
        inputs: currentInputs,
        tasks: mapBackendTasksToFrontend(initialStatus.tasks || []),
        suggestions: [],
        status: 'analyzing',
        progress: initialStatus.progress || 0
      };

      setCurrentWorkflow(initialWorkflow);
      setWorkflows(prev => [initialWorkflow, ...prev]);
      
      // Poll for status updates
      await backendApiService.pollWorkflowStatus(workflowId, (status: WorkflowStatus) => {
        // Update workflow progress in real-time
        const updatedWorkflow: AgentWorkflow = {
          id: workflowId,
          inputs: currentInputs,
          tasks: mapBackendTasksToFrontend(status.tasks || []),
          suggestions: [], // Will be loaded when completed
          status: status.status,
          progress: status.progress
        };

        setCurrentWorkflow(updatedWorkflow);
        setWorkflows(prev => prev.map(w => w.id === workflowId ? updatedWorkflow : w));
        
        console.log('Workflow progress update', 'DebugAssistant', { 
          workflowId,
          progress: status.progress,
          status: status.status,
          completedTasks: status.completed_tasks,
          totalTasks: status.total_tasks
        });
      });

      // Get final suggestions when analysis is complete
      const suggestionsResponse = await backendApiService.getSuggestions(workflowId);
      const finalStatus = await backendApiService.getWorkflowStatus(workflowId);
      
      const finalWorkflow: AgentWorkflow = {
        id: workflowId,
        inputs: currentInputs,
        tasks: mapBackendTasksToFrontend(finalStatus.tasks || []), // Get final tasks from status
        suggestions: suggestionsResponse.suggestions,
        status: suggestionsResponse.status as AgentWorkflow['status'],
        progress: 100
      };

      setCurrentWorkflow(finalWorkflow);
      setWorkflows(prev => prev.map(w => w.id === workflowId ? finalWorkflow : w));
      
      console.log('Debug analysis completed', 'DebugAssistant', { 
        workflowId,
        suggestionsCount: suggestionsResponse.suggestions.length,
        totalTasks: suggestionsResponse.analysis_summary.total_tasks,
        completedTasks: suggestionsResponse.analysis_summary.completed_tasks,
        agentsUsed: suggestionsResponse.analysis_summary.agents_used
      });
      
      // Clear current inputs after successful analysis
      setCurrentInputs([]);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Debug analysis failed', 'DebugAssistant', { 
        error: errorMessage,
        sessionId: backendApiService.getSessionId()
      });
      
      // Update workflow status to failed
      if (currentWorkflow) {
        const failedWorkflow = { ...currentWorkflow, status: 'failed' as const, progress: 100 };
        setCurrentWorkflow(failedWorkflow);
        setWorkflows(prev => prev.map(w => w.id === currentWorkflow.id ? failedWorkflow : w));
      }
      
      throw error; // Re-throw for UI handling
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentInputs, currentWorkflow]);

  // Helper function to map backend tasks to frontend format
  const mapBackendTasksToFrontend = (backendTasks: any[]): any[] => {
    return backendTasks.map(task => ({
      id: task.id,
      agentId: task.agent_id, // Map snake_case to camelCase
      type: task.type,
      status: task.status,
      error: task.error,
      input: task.input || {},
      result: task.result,
      timestamp: new Date() // Fallback timestamp
    }));
  };

  const clearInputs = useCallback(async () => {
    try {
      await backendApiService.clearSession();
      setCurrentInputs([]);
      console.log('Cleared debug inputs and backend session');
    } catch (error) {
      console.error('Failed to clear backend session:', error);
      // Still clear local inputs even if backend fails
      setCurrentInputs([]);
    }
  }, []);

  const clearWorkflows = useCallback(async () => {
    try {
      await backendApiService.clearSession();
      setWorkflows([]);
      setCurrentWorkflow(null);
      setCurrentInputs([]);
      console.log('Cleared all debug workflows and backend session', 'DebugAssistant');
    } catch (error) {
      console.error('Failed to clear backend session', 'DebugAssistant', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      // Still clear local state even if backend fails
      setWorkflows([]);
      setCurrentWorkflow(null);
      setCurrentInputs([]);
    }
  }, []);

  const getWorkflowById = useCallback((id: string): AgentWorkflow | undefined => {
    return workflows.find(workflow => workflow.id === id);
  }, [workflows]);

  const applySuggestion = useCallback(async (suggestionId: string) => {
    if (!currentWorkflow) return;

    const suggestion = currentWorkflow.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      console.warn('Suggestion not found', 'DebugAssistant', { suggestionId });
      return;
    }

    try {
      const response = await backendApiService.applySuggestion(currentWorkflow.id, suggestionId);
      
      console.log(`Applied suggestion: ${suggestion.title}`, 'DebugAssistant', { 
        suggestionId,
        suggestionType: suggestion.type,
        workflowId: currentWorkflow.id,
        appliedChanges: response.applied_changes
      });

      // Remove applied suggestion from current workflow
      const updatedWorkflow = {
        ...currentWorkflow,
        suggestions: currentWorkflow.suggestions.filter(s => s.id !== suggestionId)
      };
      
      setCurrentWorkflow(updatedWorkflow);
      setWorkflows(prev => prev.map(w => w.id === currentWorkflow.id ? updatedWorkflow : w));
      
    } catch (error) {
      console.error('Failed to apply suggestion', 'DebugAssistant', { 
        suggestionId,
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }, [currentWorkflow]);

  // Monitor workflow progress
  React.useEffect(() => {
    if (currentWorkflow && currentWorkflow.status === 'analyzing') {
      const interval = setInterval(() => {
        // In a real implementation, you might poll for updates
        // For now, we'll just check if the workflow is complete
        if (currentWorkflow.status === 'completed') {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentWorkflow]);

  const value: DebugAssistantContextType = {
    workflows,
    currentWorkflow,
    currentInputs,
    isAnalyzing,
    agents,
    addInput,
    startAnalysis,
    clearInputs,
    clearWorkflows,
    getWorkflowById,
    applySuggestion
  };

  return (
    <DebugAssistantContext.Provider value={value}>
      {children}
    </DebugAssistantContext.Provider>
  );
};