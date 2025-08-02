import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type LogLevel = 'error' | 'warning' | 'info' | 'debug' | 'success';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source?: string;
  details?: any;
  stackTrace?: string;
}

interface LogContextType {
  logs: LogEntry[];
  addLog: (level: LogLevel, message: string, source?: string, details?: any, stackTrace?: string) => void;
  clearLogs: () => void;
  filterLogs: (level?: LogLevel, source?: string) => LogEntry[];
  getLogCounts: () => Record<LogLevel, number>;
  maxLogs: number;
  setMaxLogs: (count: number) => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export const useLog = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLog must be used within LogProvider');
  }
  return context;
};

interface LogProviderProps {
  children: ReactNode;
  maxLogs?: number;
}

export const LogProvider: React.FC<LogProviderProps> = ({ children, maxLogs: initialMaxLogs = 1000 }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [maxLogs, setMaxLogs] = useState(initialMaxLogs);

  const addLog = useCallback((
    level: LogLevel,
    message: string,
    source?: string,
    details?: any,
    stackTrace?: string
  ) => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      source,
      details,
      stackTrace
    };

    setLogs(prevLogs => {
      const updatedLogs = [newLog, ...prevLogs];
      // Keep only the most recent logs up to maxLogs
      return updatedLogs.slice(0, maxLogs);
    });
  }, [maxLogs]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const filterLogs = useCallback((level?: LogLevel, source?: string): LogEntry[] => {
    return logs.filter(log => {
      if (level && log.level !== level) return false;
      if (source && log.source !== source) return false;
      return true;
    });
  }, [logs]);

  const getLogCounts = useCallback((): Record<LogLevel, number> => {
    const counts: Record<LogLevel, number> = {
      error: 0,
      warning: 0,
      info: 0,
      debug: 0,
      success: 0
    };

    logs.forEach(log => {
      counts[log.level]++;
    });

    return counts;
  }, [logs]);

  // Helper functions to make logging easier
  const logError = useCallback((message: string, source?: string, details?: any, stackTrace?: string) => {
    addLog('error', message, source, details, stackTrace);
  }, [addLog]);

  const logWarning = useCallback((message: string, source?: string, details?: any) => {
    addLog('warning', message, source, details);
  }, [addLog]);

  const logInfo = useCallback((message: string, source?: string, details?: any) => {
    addLog('info', message, source, details);
  }, [addLog]);

  const logDebug = useCallback((message: string, source?: string, details?: any) => {
    addLog('debug', message, source, details);
  }, [addLog]);

  const logSuccess = useCallback((message: string, source?: string, details?: any) => {
    addLog('success', message, source, details);
  }, [addLog]);

  const value: LogContextType = {
    logs,
    addLog,
    clearLogs,
    filterLogs,
    getLogCounts,
    maxLogs,
    setMaxLogs
  };

  // Expose helper functions via context
  const extendedValue = {
    ...value,
    logError,
    logWarning,
    logInfo,
    logDebug,
    logSuccess
  };

  return (
    <LogContext.Provider value={value}>
      {children}
    </LogContext.Provider>
  );
};

// Hook for easy access to logging functions
export const useLogger = () => {
  const { addLog } = useLog();
  
  return {
    error: (message: string, source?: string, details?: any, stackTrace?: string) => 
      addLog('error', message, source, details, stackTrace),
    warning: (message: string, source?: string, details?: any) => 
      addLog('warning', message, source, details),
    info: (message: string, source?: string, details?: any) => 
      addLog('info', message, source, details),
    debug: (message: string, source?: string, details?: any) => 
      addLog('debug', message, source, details),
    success: (message: string, source?: string, details?: any) => 
      addLog('success', message, source, details)
  };
};