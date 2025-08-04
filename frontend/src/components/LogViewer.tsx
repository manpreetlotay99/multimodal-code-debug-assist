import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLog, LogLevel, LogEntry } from '../contexts/LogContext';
import saveService from '../services/saveService';

const LogViewer: React.FC = () => {
  const { logs, clearLogs, getLogCounts } = useLog();
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logCounts = getLogCounts();

  // Get unique sources from logs
  const sources = useMemo(() => {
    const sourceSet = new Set<string>();
    logs.forEach(log => {
      if (log.source) sourceSet.add(log.source);
    });
    return Array.from(sourceSet).sort();
  }, [logs]);

  // Filter logs based on selected criteria
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Level filter
      if (selectedLevel !== 'all' && log.level !== selectedLevel) return false;
      
      // Source filter
      if (selectedSource !== 'all' && log.source !== selectedSource) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return log.message.toLowerCase().includes(query) ||
               (log.source && log.source.toLowerCase().includes(query)) ||
               (log.details && JSON.stringify(log.details).toLowerCase().includes(query));
      }
      
      return true;
    });
  }, [logs, selectedLevel, selectedSource, searchQuery]);

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const getLevelIcon = (level: LogLevel): string => {
    switch (level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🐛';
      case 'success': return '✅';
      default: return '📝';
    }
  };

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'debug': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const exportLogs = () => {
    const logData = filteredLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      source: log.source || 'unknown',
      message: log.message,
      details: log.details,
      stackTrace: log.stackTrace
    }));

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveLogs = async () => {
    if (filteredLogs.length === 0) {
      alert('No logs to save');
      return;
    }

    setIsSaving(true);
    try {
      const title = prompt('Enter a title for this log collection:');
      if (!title) {
        setIsSaving(false);
        return;
      }

      const description = prompt('Enter a description (optional):') || undefined;

      // Create a comprehensive log content string
      const logContent = filteredLogs.map(log => {
        let logLine = `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}`;
        if (log.source) logLine += ` (${log.source})`;
        logLine += `: ${log.message}`;
        
        if (log.details) {
          logLine += `\nDetails: ${JSON.stringify(log.details, null, 2)}`;
        }
        
        if (log.stackTrace) {
          logLine += `\nStack Trace: ${log.stackTrace}`;
        }
        
        return logLine;
      }).join('\n\n');

      // Determine the most common log level and source for metadata
      const levelCounts = filteredLogs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommonLevel = Object.entries(levelCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0];

      const sourceCounts = filteredLogs.reduce((acc, log) => {
        if (log.source) acc[log.source] = (acc[log.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommonSource = Object.entries(sourceCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0];

      const result = await saveService.saveLogs({
        title,
        description,
        log_content: logContent,
        log_level: mostCommonLevel,
        source: mostCommonSource,
        log_metadata: {
          total_logs: filteredLogs.length,
          level_counts: levelCounts,
          source_counts: sourceCounts,
          time_range: {
            start: filteredLogs[0]?.timestamp.toISOString(),
            end: filteredLogs[filteredLogs.length - 1]?.timestamp.toISOString()
          }
        },
        tags: ['debug-session', 'log-collection', ...(mostCommonLevel ? [mostCommonLevel] : [])]
      });

      if (result.success) {
        alert('Logs saved successfully!');
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Failed to save logs:', err);
      alert('Failed to save logs. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Header with controls */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Application Logs</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              📤 Export
            </button>
            <button
              onClick={saveLogs}
              disabled={isSaving || filteredLogs.length === 0}
              className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : '💾 Save'}
            </button>
            <button
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Level filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Level:</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as LogLevel | 'all')}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All ({logs.length})</option>
              <option value="error">❌ Error ({logCounts.error})</option>
              <option value="warning">⚠️ Warning ({logCounts.warning})</option>
              <option value="info">ℹ️ Info ({logCounts.info})</option>
              <option value="debug">🐛 Debug ({logCounts.debug})</option>
              <option value="success">✅ Success ({logCounts.success})</option>
            </select>
          </div>

          {/* Source filter */}
          {sources.length > 0 && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Source:</label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sources</option>
                {sources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
          )}

          {/* Search */}
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Auto-scroll toggle */}
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-700">Auto-scroll</span>
          </label>
        </div>

        {/* Results count */}
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
        )}
      </div>

      {/* Logs container */}
      <div className="flex-1 overflow-auto p-2">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm">
                {logs.length === 0 ? 'No logs yet' : 'No logs match your filters'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`border rounded-lg p-3 ${getLevelColor(log.level)} transition-all duration-200`}
              >
                <div 
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleLogExpansion(log.id)}
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">{getLevelIcon(log.level)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        {log.source && (
                          <span className="text-xs bg-white px-2 py-0.5 rounded border">
                            {log.source}
                          </span>
                        )}
                        <span className="text-xs font-semibold uppercase">
                          {log.level}
                        </span>
                      </div>
                      <div className="text-sm font-medium break-words">
                        {log.message}
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">
                    {expandedLogs.has(log.id) ? '▼' : '▶'}
                  </button>
                </div>

                {/* Expanded details */}
                {expandedLogs.has(log.id) && (log.details || log.stackTrace) && (
                  <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                    {log.details && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Details:</div>
                        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                          {typeof log.details === 'string' 
                            ? log.details 
                            : JSON.stringify(log.details, null, 2)
                          }
                        </pre>
                      </div>
                    )}
                    {log.stackTrace && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">Stack Trace:</div>
                        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto font-mono">
                          {log.stackTrace}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;