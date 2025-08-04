import React, { useState, useRef } from 'react';
import { useDebugAssistant } from '../contexts/DebugAssistantContext';
import { DebugInput, AgentTask, FixSuggestion, AIAgent } from '../services/aiAgentService';

const MultimodalDebugAssistant: React.FC = () => {
  const {
    workflows,
    currentWorkflow,
    currentInputs,
    isAnalyzing,
    agents,
    addInput,
    startAnalysis,
    clearInputs,
    clearWorkflows,
    applySuggestion
  } = useDebugAssistant();

  const [activeTab, setActiveTab] = useState<'input' | 'workflow' | 'suggestions'>('input');
  const [inputText, setInputText] = useState('');
  const [selectedInputType, setSelectedInputType] = useState<DebugInput['type']>('code');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextInput = async () => {
    if (inputText.trim()) {
      try {
        await addInput(selectedInputType, inputText.trim());
        setInputText('');
      } catch (error) {
        console.error('Failed to add input:', error);
        // Could show a toast notification here
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      try {
        // Process files sequentially to avoid overwhelming the backend
        for (const file of Array.from(files)) {
          const inputType: DebugInput['type'] = 
            file.type.startsWith('image/') ? 'screenshot' : 
            file.name.includes('log') ? 'logs' : 
            file.name.includes('.trace') ? 'error_trace' :
            'code';
          
          await addInput(inputType, file, { 
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type 
          });
        }
      } catch (error) {
        console.error('Failed to upload files:', error);
        // Could show a toast notification here
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getInputTypeIcon = (type: DebugInput['type']): string => {
    switch (type) {
      case 'code': return '💻';
      case 'logs': return '📝';
      case 'screenshot': return '📷';
      case 'error_trace': return '🔍';
      case 'diagram': return '📊';
      default: return '📄';
    }
  };

  const getTaskStatusIcon = (status: AgentTask['status']): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getAgentIcon = (agentId: string): string => {
    switch (agentId) {
      case 'error-extractor': return '🔍';
      case 'code-analyzer': return '🧠';
      case 'doc-retriever': return '📚';
      case 'fix-generator': return '🔧';
      case 'multimodal-analyzer': return '👁️';
      default: return '🤖';
    }
  };

  const getSuggestionTypeColor = (type: FixSuggestion['type']): string => {
    switch (type) {
      case 'code_fix': return 'bg-red-50 border-red-200 text-red-800';
      case 'configuration': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'dependency': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'architecture': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };



  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🚀 Multimodal Debug Assistant</h1>
          <p className="text-sm text-gray-600">AI-powered debugging with agentic workflows</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            Active Agents: {agents.length}
          </div>
          {isAnalyzing && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Analyzing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'input', label: 'Input', icon: '📥' },
          { id: 'workflow', label: 'Agent Workflow', icon: '🔄' },
          { id: 'suggestions', label: 'AI Suggestions', icon: '💡' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'suggestions' && currentWorkflow?.suggestions.length && (
              <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                {currentWorkflow.suggestions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'input' && (
          <div className="p-6 h-full overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Input Type Selector */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Select Input Type</h3>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { type: 'code' as const, label: 'Code', icon: '💻' },
                    { type: 'logs' as const, label: 'Logs', icon: '📝' },
                    { type: 'screenshot' as const, label: 'Screenshot', icon: '📷' },
                    { type: 'error_trace' as const, label: 'Error Trace', icon: '🔍' },
                    { type: 'diagram' as const, label: 'Diagram', icon: '📊' }
                  ].map(inputType => (
                    <button
                      key={inputType.type}
                      onClick={() => setSelectedInputType(inputType.type)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        selectedInputType === inputType.type
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{inputType.icon}</div>
                      <div className="text-sm font-medium">{inputType.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {getInputTypeIcon(selectedInputType)} Enter {selectedInputType}:
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Paste your ${selectedInputType} here...`}
                  className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                />
                <button
                  onClick={handleTextInput}
                  disabled={!inputText.trim()}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Add Input
                </button>
              </div>

              {/* File Upload */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📁 Upload Files:
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="space-y-2">
                    <div className="text-4xl">📁</div>
                    <div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Click to upload files
                      </button>
                      <span className="text-gray-500"> or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Supports: Images, log files, code files, traces
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".log,.txt,.js,.ts,.py,.java,.cpp,.c,.json,.xml,.png,.jpg,.jpeg,.gif,.svg"
                  />
                </div>
              </div>

              {/* Current Inputs */}
              {currentInputs.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Current Inputs ({currentInputs.length})</h3>
                    <button
                      onClick={clearInputs}
                      className="text-sm text-gray-500 hover:text-red-600"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2">
                    {currentInputs.map((input, index) => (
                      <div key={input.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                        <span className="text-lg">{getInputTypeIcon(input.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {input.type.toUpperCase()}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {typeof input.content === 'string' 
                              ? input.content.substring(0, 100) + '...'
                              : input.metadata?.fileName || 'File upload'
                            }
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {input.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis Controls */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={startAnalysis}
                  disabled={currentInputs.length === 0 || isAnalyzing}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Analyzing...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-2">
                      <span>🚀</span>
                      <span>Start AI Analysis</span>
                    </span>
                  )}
                </button>
                {workflows.length > 0 && (
                  <button
                    onClick={clearWorkflows}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear History
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workflow' && (
          <div className="p-6 h-full overflow-auto">
            <div className="max-w-4xl mx-auto">
              {!currentWorkflow ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🤖</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Workflow</h3>
                  <p className="text-gray-500">Start an analysis to see the AI agent workflow</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Workflow Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Workflow: {currentWorkflow.id}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Status: {currentWorkflow.status} • Progress: {Math.round(currentWorkflow.progress)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {currentWorkflow.tasks.filter(t => t.status === 'completed').length} / {currentWorkflow.tasks.length} tasks complete
                        </div>
                        <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${currentWorkflow.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent Tasks */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Agent Tasks</h4>
                    {currentWorkflow.tasks.map((task, index) => {
                      const agent = agents.find(a => a.id === task.agentId);
                      return (
                        <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">{getAgentIcon(task.agentId)}</span>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {agent?.name || 'Unknown Agent'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {task.type.replace('_', ' ').toUpperCase()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getTaskStatusIcon(task.status)}</span>
                              <span className="text-sm font-medium capitalize text-gray-700">
                                {task.status}
                              </span>
                            </div>
                          </div>
                          
                          {agent && (
                            <div className="text-sm text-gray-600 mb-2">
                              {agent.description}
                            </div>
                          )}
                          
                          {task.status === 'completed' && task.result && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                              <div className="text-sm font-medium text-green-800 mb-1">Result:</div>
                              <div className="text-sm text-green-700">
                                {typeof task.result === 'string' 
                                  ? task.result.substring(0, 200) + '...'
                                  : 'Analysis completed successfully'
                                }
                              </div>
                            </div>
                          )}
                          
                          {task.status === 'failed' && task.error && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                              <div className="text-sm font-medium text-red-800 mb-1">Error:</div>
                              <div className="text-sm text-red-700">{task.error}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="p-6 h-full overflow-auto">
            <div className="max-w-4xl mx-auto">
              {!currentWorkflow || currentWorkflow.suggestions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💡</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Suggestions Yet</h3>
                  <p className="text-gray-500">
                    {!currentWorkflow 
                      ? 'Run an analysis to get AI-powered suggestions'
                      : 'Analysis is still in progress...'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      AI Suggestions ({currentWorkflow.suggestions.length})
                    </h3>
                    <div className="text-sm text-gray-500">
                      From {currentWorkflow.tasks.length} AI agents
                    </div>
                  </div>

                  <div className="space-y-4">
                    {currentWorkflow.suggestions.map((suggestion, index) => (
                      <div key={suggestion.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSuggestionTypeColor(suggestion.type)}`}>
                                  {suggestion.type.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Confidence: {suggestion.confidence}%
                                </span>
                                <span className="text-xs text-gray-500">
                                  by {suggestion.agent}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {suggestion.title}
                              </h4>
                              <p className="text-gray-600 mt-1">
                                {suggestion.description}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-lg">🎯</span>
                              </div>
                            </div>
                          </div>

                          {/* Code Diff */}
                          {suggestion.originalCode && suggestion.suggestedCode && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Code Changes:</h5>
                              <div className="bg-gray-50 rounded-lg overflow-hidden">
                                <div className="bg-red-100 text-red-800 text-sm p-3 font-mono">
                                  <div className="text-xs text-red-600 mb-1">- Before:</div>
                                  {suggestion.originalCode}
                                </div>
                                <div className="bg-green-100 text-green-800 text-sm p-3 font-mono border-t">
                                  <div className="text-xs text-green-600 mb-1">+ After:</div>
                                  {suggestion.suggestedCode}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Steps */}
                          {suggestion.steps.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Implementation Steps:</h5>
                              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                                {suggestion.steps.map((step, stepIndex) => (
                                  <li key={stepIndex}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {/* Rationale */}
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Rationale:</h5>
                            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                              {suggestion.rationale}
                            </p>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultimodalDebugAssistant;