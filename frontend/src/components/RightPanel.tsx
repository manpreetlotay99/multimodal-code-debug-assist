import React, { useState } from 'react';
import { useAISuggestions } from '../contexts/AISuggestionsContext';
import { useLog, LogLevel } from '../contexts/LogContext';

interface RightPanelProps {
  onApplySuggestion: (originalCode: string, suggestedCode: string) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ onApplySuggestion }) => {
  const { suggestions, isAnalyzing, confidence, applySuggestion, explainSuggestion } = useAISuggestions();
  const { logs } = useLog();
  const [activeTab, setActiveTab] = useState<'fixes' | 'rationale'>('fixes');
  const [explanation, setExplanation] = useState<string>('');
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);

  // Get recent logs (last 5) for the mini log viewer
  const recentLogs = logs.slice(0, 5);

  const handleApplySuggestion = (suggestionId: string) => {
    applySuggestion(suggestionId, onApplySuggestion);
  };

  const handleExplainSuggestion = async (suggestionId: string) => {
    setLoadingExplanation(suggestionId);
    try {
      const explanation = await explainSuggestion(suggestionId);
      setExplanation(explanation);
      setActiveTab('rationale');
    } catch (error) {
      console.error('Error getting explanation:', error);
      setExplanation('Failed to get explanation. Please try again.');
    } finally {
      setLoadingExplanation(null);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'fix': return '🔧';
      case 'optimization': return '⚡';
      case 'refactor': return '🔄';
      default: return '💡';
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'fix': return 'bg-red-50 border-red-200';
      case 'optimization': return 'bg-yellow-50 border-yellow-200';
      case 'refactor': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getLogLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🐛';
      case 'success': return '✅';
      default: return '📝';
    }
  };

  const getLogLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'debug': return 'text-purple-600 bg-purple-50';
      case 'success': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatLogTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white">
      {/* Logs Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Recent Logs</h3>
          <span className="text-xs text-gray-500">
            {logs.length} total
          </span>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {recentLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <div className="text-2xl mb-1">📝</div>
              <p className="text-xs">No logs yet</p>
            </div>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className={`text-xs p-2 rounded border ${getLogLevelColor(log.level)} truncate`}
                title={`${formatLogTime(log.timestamp)} - ${log.message}`}
              >
                <div className="flex items-center space-x-1">
                  <span className="text-xs">{getLogLevelIcon(log.level)}</span>
                  <span className="text-xs font-mono text-gray-500">
                    {formatLogTime(log.timestamp)}
                  </span>
                  <span className="flex-1 truncate">
                    {log.message}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        {logs.length > 5 && (
          <div className="mt-2 text-center">
            <button className="text-xs text-blue-600 hover:text-blue-800 underline">
              View all logs in main panel
            </button>
          </div>
        )}
      </div>

      {/* AI Suggestions Section */}
      <div className="p-4 flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
          {confidence > 0 && (
            <span className="text-sm text-gray-500">
              Confidence: {confidence}%
            </span>
          )}
        </div>
        
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex space-x-6">
            <button 
              onClick={() => setActiveTab('fixes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'fixes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Fixes ({suggestions.length})
            </button>
            <button 
              onClick={() => setActiveTab('rationale')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'rationale'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Rationale
            </button>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'fixes' && (
            <div className="space-y-4">
              {!isAnalyzing && suggestions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">🤖</div>
                  <p className="text-sm">Start typing code to get AI suggestions</p>
                </div>
              )}

              {suggestions.map((suggestion) => (
                <div 
                  key={suggestion.id} 
                  className={`border p-3 rounded-lg ${getSuggestionColor(suggestion.type)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getSuggestionIcon(suggestion.type)}</span>
                      <div className="font-medium text-gray-900 text-sm">
                        {suggestion.title}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                      {suggestion.confidence}%
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {suggestion.description}
                  </p>

                  {suggestion.originalCode && suggestion.suggestedCode && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-1">Suggested change:</div>
                      <div className="bg-red-100 text-red-800 text-xs p-2 rounded mb-1 font-mono">
                        - {suggestion.originalCode}
                      </div>
                      <div className="bg-green-100 text-green-800 text-xs p-2 rounded font-mono">
                        + {suggestion.suggestedCode}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleApplySuggestion(suggestion.id)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Apply Fix
                    </button>
                    <button 
                      onClick={() => handleExplainSuggestion(suggestion.id)}
                      disabled={loadingExplanation === suggestion.id}
                      className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {loadingExplanation === suggestion.id ? 'Loading...' : 'Ask Why'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'rationale' && (
            <div className="space-y-4">
              {isAnalyzing && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Analyzing...</span>
                </div>
              )}
              
              {explanation ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Explanation</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {explanation}
                  </div>
                </div>
              ) : !isAnalyzing && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">💭</div>
                  <p className="text-sm">Click "Ask Why" on any suggestion to see the rationale</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RightPanel;