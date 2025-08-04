interface AIAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

interface AgentTask {
  id: string;
  agentId: string;
  type: 'error_extraction' | 'code_analysis' | 'documentation_search' | 'fix_generation' | 'multimodal_analysis';
  input: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: Date;
}

interface DebugInput {
  id: string;
  type: 'code' | 'logs' | 'screenshot' | 'error_trace' | 'diagram';
  content: string | File;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface FixSuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  type: 'code_fix' | 'configuration' | 'dependency' | 'architecture';
  originalCode?: string;
  suggestedCode?: string;
  steps: string[];
  rationale: string;
  documentation?: string[];
  relatedInputs: string[];
  agent: string;
}

interface AgentWorkflow {
  id: string;
  inputs: DebugInput[];
  tasks: AgentTask[];
  suggestions: FixSuggestion[];
  status: 'analyzing' | 'completed' | 'failed';
  progress: number;
}

class AIAgentService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  
  private agents: AIAgent[] = [
    {
      id: 'error-extractor',
      name: 'Error Extraction Agent',
      description: 'Extracts and categorizes errors from logs and stack traces',
      capabilities: ['log_parsing', 'error_classification', 'stack_trace_analysis']
    },
    {
      id: 'code-analyzer',
      name: 'Code Analysis Agent',
      description: 'Analyzes code for bugs, performance issues, and best practices',
      capabilities: ['static_analysis', 'bug_detection', 'performance_analysis']
    },
    {
      id: 'doc-retriever',
      name: 'Documentation Retrieval Agent',
      description: 'Searches and retrieves relevant documentation and solutions',
      capabilities: ['documentation_search', 'solution_matching', 'api_reference']
    },
    {
      id: 'fix-generator',
      name: 'Fix Generation Agent',
      description: 'Generates code fixes and provides detailed rationales',
      capabilities: ['code_generation', 'fix_validation', 'explanation_generation']
    },
    {
      id: 'multimodal-analyzer',
      name: 'Multimodal Analysis Agent',
      description: 'Analyzes screenshots, diagrams, and UI elements for bugs',
      capabilities: ['image_analysis', 'ui_bug_detection', 'diagram_interpretation']
    }
  ];

  constructor() {
    this.apiKey = "AIzaSyCFde44U9vRs0vWCXKTkiHnM_sA1lGMsfM";
  }

  async startWorkflow(inputs: DebugInput[]): Promise<AgentWorkflow> {
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow: AgentWorkflow = {
      id: workflowId,
      inputs,
      tasks: [],
      suggestions: [],
      status: 'analyzing',
      progress: 0
    };

    // Plan tasks based on input types
    const tasks = this.planTasks(inputs);
    workflow.tasks = tasks;

    // Execute workflow
    await this.executeWorkflow(workflow);

    return workflow;
  }

  private planTasks(inputs: DebugInput[]): AgentTask[] {
    const tasks: AgentTask[] = [];
    let taskCounter = 1;

    inputs.forEach(input => {
      switch (input.type) {
        case 'logs':
        case 'error_trace':
          tasks.push({
            id: `task-${taskCounter++}`,
            agentId: 'error-extractor',
            type: 'error_extraction',
            input,
            status: 'pending',
            timestamp: new Date()
          });
          break;
        
        case 'code':
          tasks.push({
            id: `task-${taskCounter++}`,
            agentId: 'code-analyzer',
            type: 'code_analysis',
            input,
            status: 'pending',
            timestamp: new Date()
          });
          break;
        
        case 'screenshot':
        case 'diagram':
          tasks.push({
            id: `task-${taskCounter++}`,
            agentId: 'multimodal-analyzer',
            type: 'multimodal_analysis',
            input,
            status: 'pending',
            timestamp: new Date()
          });
          break;
      }
    });

    // Add documentation search task if we have errors or code issues
    if (tasks.length > 0) {
      tasks.push({
        id: `task-${taskCounter++}`,
        agentId: 'doc-retriever',
        type: 'documentation_search',
        input: inputs,
        status: 'pending',
        timestamp: new Date()
      });
    }

    // Add fix generation task
    tasks.push({
      id: `task-${taskCounter++}`,
      agentId: 'fix-generator',
      type: 'fix_generation',
      input: inputs,
      status: 'pending',
      timestamp: new Date()
    });

    return tasks;
  }

  private async executeWorkflow(workflow: AgentWorkflow): Promise<void> {
    const totalTasks = workflow.tasks.length;
    let completedTasks = 0;

    for (const task of workflow.tasks) {
      try {
        task.status = 'running';
        
        switch (task.type) {
          case 'error_extraction':
            task.result = await this.extractErrors(task.input);
            break;
          case 'code_analysis':
            task.result = await this.analyzeCode(task.input);
            break;
          case 'multimodal_analysis':
            task.result = await this.analyzeMultimodal(task.input);
            break;
          case 'documentation_search':
            task.result = await this.searchDocumentation(task.input);
            break;
          case 'fix_generation':
            task.result = await this.generateFixes(workflow);
            break;
        }
        
        task.status = 'completed';
        completedTasks++;
        workflow.progress = (completedTasks / totalTasks) * 100;
        
      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        completedTasks++;
        workflow.progress = (completedTasks / totalTasks) * 100;
      }
    }

    // Generate final suggestions
    workflow.suggestions = await this.compileSuggestions(workflow);
    workflow.status = 'completed';
  }

  private async extractErrors(input: DebugInput): Promise<any> {
    const prompt = `
Analyze the following ${input.type} and extract all errors, warnings, and issues:

Content:
${typeof input.content === 'string' ? input.content : '[File content]'}

Please provide a structured analysis including:
1. Error types and severity
2. Root causes
3. Affected components
4. Suggested investigation areas

Format as JSON with clear categorization.
`;

    return await this.callGeminiAPI(prompt);
  }

  private async analyzeCode(input: DebugInput): Promise<any> {
    const prompt = `
Perform a comprehensive code analysis on the following code:

${typeof input.content === 'string' ? input.content : '[Code content]'}

Analyze for:
1. Syntax errors
2. Logic errors
3. Performance issues
4. Security vulnerabilities
5. Best practice violations
6. Potential runtime errors

Provide specific line numbers and detailed explanations.
`;

    return await this.callGeminiAPI(prompt);
  }

  private async analyzeMultimodal(input: DebugInput): Promise<any> {
    // For now, return mock analysis since we'd need vision API
    return {
      type: 'multimodal_analysis',
      elements_detected: ['UI components', 'Error dialogs', 'Layout issues'],
      issues_found: [
        {
          type: 'ui_bug',
          description: 'Button alignment issue detected',
          severity: 'medium',
          location: 'top-right corner'
        }
      ],
      suggestions: [
        'Check CSS flexbox alignment',
        'Verify responsive design breakpoints'
      ]
    };
  }

  private async searchDocumentation(inputs: DebugInput[] | DebugInput): Promise<any> {
    const inputArray = Array.isArray(inputs) ? inputs : [inputs];
    const errors = inputArray.map(i => typeof i.content === 'string' ? i.content : '').join('\n');

    const prompt = `
Based on the following errors and code issues, suggest relevant documentation and resources:

Issues:
${errors}

Provide:
1. Official documentation links
2. Common solutions
3. Related Stack Overflow discussions
4. Best practices guides
5. Tutorial recommendations

Focus on actionable resources.
`;

    return await this.callGeminiAPI(prompt);
  }

  private async generateFixes(workflow: AgentWorkflow): Promise<any> {
    const analysisResults = workflow.tasks
      .filter(task => task.status === 'completed' && task.result)
      .map(task => task.result);

    const prompt = `
Based on the following analysis results, generate specific code fixes and solutions:

Analysis Results:
${JSON.stringify(analysisResults, null, 2)}

For each issue found, provide:
1. Root cause explanation
2. Step-by-step fix instructions
3. Code snippets with before/after
4. Why this fix works (rationale)
5. Potential side effects
6. Testing recommendations

Format as structured JSON with prioritized fixes.
`;

    return await this.callGeminiAPI(prompt);
  }

  private async compileSuggestions(workflow: AgentWorkflow): Promise<FixSuggestion[]> {
    const suggestions: FixSuggestion[] = [];
    let suggestionCounter = 1;

    // Extract suggestions from completed tasks
    workflow.tasks.forEach(task => {
      if (task.status === 'completed' && task.result) {
        try {
          const result = task.result;
          
          // Generate suggestions based on task type
          if (task.type === 'fix_generation' && result.fixes) {
            result.fixes.forEach((fix: any, index: number) => {
              suggestions.push({
                id: `suggestion-${suggestionCounter++}`,
                title: fix.title || `Fix ${index + 1}`,
                description: fix.description || 'No description provided',
                confidence: fix.confidence || 75,
                type: fix.type || 'code_fix',
                originalCode: fix.original_code,
                suggestedCode: fix.suggested_code,
                steps: fix.steps || [],
                rationale: fix.rationale || 'Based on analysis results',
                documentation: fix.documentation || [],
                relatedInputs: workflow.inputs.map(i => i.id),
                agent: this.agents.find(a => a.id === task.agentId)?.name || 'Unknown Agent'
              });
            });
          }
        } catch (error) {
          console.error('Error parsing task result:', error);
        }
      }
    });

    // If no suggestions generated, create default ones
    if (suggestions.length === 0) {
      suggestions.push({
        id: 'default-suggestion',
        title: 'General Code Review',
        description: 'Based on the analysis, consider reviewing the code for common issues.',
        confidence: 60,
        type: 'code_fix',
        steps: [
          'Review error logs for patterns',
          'Check variable declarations and scoping',
          'Verify function parameters and return types',
          'Test edge cases and error handling'
        ],
        rationale: 'General best practices based on provided inputs',
        documentation: [],
        relatedInputs: workflow.inputs.map(i => i.id),
        agent: 'System Default'
      });
    }

    return suggestions;
  }

  private async callGeminiAPI(prompt: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Try to parse as JSON, fallback to text
      try {
        return JSON.parse(text);
      } catch {
        return { raw_response: text };
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return { error: 'Failed to analyze input' };
    }
  }

  getAgents(): AIAgent[] {
    return this.agents;
  }

  getAgentById(id: string): AIAgent | undefined {
    return this.agents.find(agent => agent.id === id);
  }
}

export const aiAgentService = new AIAgentService();
export type { AIAgent, AgentTask, DebugInput, FixSuggestion, AgentWorkflow };