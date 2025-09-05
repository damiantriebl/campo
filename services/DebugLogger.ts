/**
 * Comprehensive error logging and debugging service
 * Provides structured logging for product and client creation flows
 */

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  context: string;
  message: string;
  data?: any;
  userId?: string;
  empresaId?: string;
  sessionId?: string;
  stackTrace?: string;
  errorCode?: string;
  retryAttempt?: number;
  duration?: number;
}

export interface LogFilter {
  level?: LogEntry['level'][];
  context?: string[];
  startTime?: Date;
  endTime?: Date;
  userId?: string;
  empresaId?: string;
  errorCode?: string;
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  contexts: string[];
  firstSeen: string;
  lastSeen: string;
  examples: LogEntry[];
}

export interface DebugReport {
  summary: {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    successRate: number;
    timeRange: { start: string; end: string };
  };
  errorPatterns: ErrorPattern[];
  contextBreakdown: Record<string, { total: number; errors: number; warnings: number }>;
  recentErrors: LogEntry[];
  performanceMetrics: {
    averageDuration: number;
    slowestOperations: Array<{ context: string; duration: number; timestamp: string }>;
  };
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private sessionId: string;
  private isEnabled: boolean = true;
  private currentUserId?: string;
  private currentEmpresaId?: string;

  constructor(maxLogs: number = 1000) {
    this.maxLogs = maxLogs;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Set current user context for all subsequent logs
   */
  setUserContext(userId: string, empresaId?: string): void {
    this.currentUserId = userId;
    this.currentEmpresaId = empresaId;
    this.info('DebugLogger', 'User context updated', { userId, empresaId });
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    this.info('DebugLogger', 'User context cleared', { 
      previousUserId: this.currentUserId,
      previousEmpresaId: this.currentEmpresaId 
    });
    this.currentUserId = undefined;
    this.currentEmpresaId = undefined;
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      console.log('[DebugLogger] Logging enabled');
    } else {
      console.log('[DebugLogger] Logging disabled');
    }
  }

  /**
   * Add a log entry
   */
  private addLog(
    level: LogEntry['level'],
    context: string,
    message: string,
    data?: any,
    options?: {
      errorCode?: string;
      retryAttempt?: number;
      duration?: number;
      stackTrace?: string;
    }
  ): void {
    if (!this.isEnabled) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data: data ? this.sanitizeData(data) : undefined,
      userId: this.currentUserId,
      empresaId: this.currentEmpresaId,
      sessionId: this.sessionId,
      stackTrace: options?.stackTrace,
      errorCode: options?.errorCode,
      retryAttempt: options?.retryAttempt,
      duration: options?.duration
    };

    this.logs.push(logEntry);

    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with appropriate level
    this.outputToConsole(logEntry);
  }

  /**
   * Sanitize data to prevent circular references and sensitive info
   */
  private sanitizeData(data: any): any {
    try {
      // Create a deep copy and remove sensitive fields
      const sanitized = JSON.parse(JSON.stringify(data, (key, value) => {
        // Remove sensitive fields
        if (typeof key === 'string' && (
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('key')
        )) {
          return '[REDACTED]';
        }
        
        // Handle circular references
        if (typeof value === 'object' && value !== null) {
          if (value.constructor && value.constructor.name === 'Error') {
            return {
              name: value.name,
              message: value.message,
              code: value.code,
              stack: value.stack
            };
          }
        }
        
        return value;
      }));
      
      return sanitized;
    } catch (error) {
      return { error: 'Failed to sanitize data', originalType: typeof data };
    }
  }

  /**
   * Output log to console with appropriate formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.context}:`;
    const message = entry.message;
    const data = entry.data ? entry.data : '';

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, message, data);
        break;
      case 'info':
        console.log(prefix, message, data);
        break;
      case 'warn':
        console.warn(prefix, message, data);
        break;
      case 'error':
      case 'fatal':
        console.error(prefix, message, data);
        if (entry.stackTrace) {
          console.error('Stack trace:', entry.stackTrace);
        }
        break;
    }
  }

  /**
   * Debug level logging
   */
  debug(context: string, message: string, data?: any): void {
    this.addLog('debug', context, message, data);
  }

  /**
   * Info level logging
   */
  info(context: string, message: string, data?: any): void {
    this.addLog('info', context, message, data);
  }

  /**
   * Warning level logging
   */
  warn(context: string, message: string, data?: any): void {
    this.addLog('warn', context, message, data);
  }

  /**
   * Error level logging
   */
  error(context: string, message: string, data?: any, error?: Error): void {
    this.addLog('error', context, message, data, {
      stackTrace: error?.stack,
      errorCode: (error as any)?.code
    });
  }

  /**
   * Fatal error logging
   */
  fatal(context: string, message: string, data?: any, error?: Error): void {
    this.addLog('fatal', context, message, data, {
      stackTrace: error?.stack,
      errorCode: (error as any)?.code
    });
  }

  /**
   * Log operation start with timing
   */
  startOperation(context: string, operation: string, data?: any): string {
    const operationId = this.generateLogId();
    this.info(context, `Starting operation: ${operation}`, {
      operationId,
      operation,
      ...data
    });
    return operationId;
  }

  /**
   * Log operation completion with timing
   */
  endOperation(
    context: string, 
    operation: string, 
    operationId: string, 
    success: boolean, 
    data?: any,
    startTime?: number
  ): void {
    const duration = startTime ? Date.now() - startTime : undefined;
    
    if (success) {
      this.info(context, `Operation completed: ${operation}`, {
        operationId,
        operation,
        success: true,
        duration,
        ...data
      });
    } else {
      this.error(context, `Operation failed: ${operation}`, {
        operationId,
        operation,
        success: false,
        duration,
        ...data
      });
    }
  }

  /**
   * Log retry attempt
   */
  logRetry(context: string, operation: string, attempt: number, maxAttempts: number, error?: Error): void {
    this.addLog('warn', context, `Retry attempt ${attempt}/${maxAttempts} for ${operation}`, {
      operation,
      attempt,
      maxAttempts,
      error: error ? {
        name: error.name,
        message: error.message,
        code: (error as any).code
      } : undefined
    }, {
      retryAttempt: attempt,
      errorCode: (error as any)?.code
    });
  }

  /**
   * Log validation results
   */
  logValidation(context: string, isValid: boolean, errors: string[], data?: any): void {
    if (isValid) {
      this.info(context, 'Validation passed', { isValid, data });
    } else {
      this.error(context, 'Validation failed', { isValid, errors, data });
    }
  }

  /**
   * Log Firestore operations
   */
  logFirestoreOperation(
    context: string, 
    operation: string, 
    success: boolean, 
    data?: any, 
    error?: Error
  ): void {
    if (success) {
      this.info(context, `Firestore ${operation} succeeded`, data);
    } else {
      this.error(context, `Firestore ${operation} failed`, data, error);
    }
  }

  /**
   * Log service responses
   */
  logServiceResponse(
    context: string, 
    service: string, 
    method: string, 
    response: any
  ): void {
    if (response.success) {
      this.info(context, `${service}.${method} succeeded`, {
        service,
        method,
        hasData: !!response.data,
        dataType: response.data ? typeof response.data : undefined
      });
    } else {
      this.error(context, `${service}.${method} failed`, {
        service,
        method,
        errors: response.errors,
        errorType: response.errorType,
        retryable: response.retryable
      });
    }
  }

  /**
   * Log network status changes
   */
  logNetworkStatus(isOnline: boolean, connectionType?: string): void {
    this.info('NetworkStatus', `Network status changed: ${isOnline ? 'online' : 'offline'}`, {
      isOnline,
      connectionType
    });
  }

  /**
   * Log authentication events
   */
  logAuthEvent(event: string, success: boolean, data?: any): void {
    if (success) {
      this.info('Authentication', `Auth event: ${event}`, data);
    } else {
      this.error('Authentication', `Auth event failed: ${event}`, data);
    }
  }

  /**
   * Get filtered logs
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level && filter.level.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level));
      }

      if (filter.context && filter.context.length > 0) {
        filteredLogs = filteredLogs.filter(log => 
          filter.context!.some(ctx => log.context.includes(ctx))
        );
      }

      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= filter.startTime!
        );
      }

      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= filter.endTime!
        );
      }

      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
      }

      if (filter.empresaId) {
        filteredLogs = filteredLogs.filter(log => log.empresaId === filter.empresaId);
      }

      if (filter.errorCode) {
        filteredLogs = filteredLogs.filter(log => log.errorCode === filter.errorCode);
      }
    }

    return filteredLogs;
  }

  /**
   * Get error patterns analysis
   */
  getErrorPatterns(): ErrorPattern[] {
    const errorLogs = this.logs.filter(log => log.level === 'error' || log.level === 'fatal');
    const patterns: Record<string, ErrorPattern> = {};

    errorLogs.forEach(log => {
      const key = `${log.context}:${log.message}`;
      
      if (!patterns[key]) {
        patterns[key] = {
          pattern: key,
          count: 0,
          contexts: [],
          firstSeen: log.timestamp,
          lastSeen: log.timestamp,
          examples: []
        };
      }

      patterns[key].count++;
      patterns[key].lastSeen = log.timestamp;
      
      if (!patterns[key].contexts.includes(log.context)) {
        patterns[key].contexts.push(log.context);
      }
      
      if (patterns[key].examples.length < 3) {
        patterns[key].examples.push(log);
      }
    });

    return Object.values(patterns).sort((a, b) => b.count - a.count);
  }

  /**
   * Generate comprehensive debug report
   */
  generateReport(): DebugReport {
    const allLogs = this.logs;
    const errorLogs = allLogs.filter(log => log.level === 'error' || log.level === 'fatal');
    const warningLogs = allLogs.filter(log => log.level === 'warn');
    
    // Calculate success rate
    const totalOperations = allLogs.filter(log => 
      log.message.includes('succeeded') || log.message.includes('failed')
    ).length;
    const failedOperations = allLogs.filter(log => 
      log.message.includes('failed') || log.level === 'error'
    ).length;
    const successRate = totalOperations > 0 ? 
      ((totalOperations - failedOperations) / totalOperations * 100) : 100;

    // Context breakdown
    const contextBreakdown: Record<string, { total: number; errors: number; warnings: number }> = {};
    allLogs.forEach(log => {
      if (!contextBreakdown[log.context]) {
        contextBreakdown[log.context] = { total: 0, errors: 0, warnings: 0 };
      }
      contextBreakdown[log.context].total++;
      if (log.level === 'error' || log.level === 'fatal') {
        contextBreakdown[log.context].errors++;
      }
      if (log.level === 'warn') {
        contextBreakdown[log.context].warnings++;
      }
    });

    // Performance metrics
    const operationsWithDuration = allLogs.filter(log => log.duration !== undefined);
    const averageDuration = operationsWithDuration.length > 0 ?
      operationsWithDuration.reduce((sum, log) => sum + (log.duration || 0), 0) / operationsWithDuration.length : 0;
    
    const slowestOperations = operationsWithDuration
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5)
      .map(log => ({
        context: log.context,
        duration: log.duration || 0,
        timestamp: log.timestamp
      }));

    // Time range
    const timestamps = allLogs.map(log => log.timestamp).sort();
    const timeRange = {
      start: timestamps[0] || new Date().toISOString(),
      end: timestamps[timestamps.length - 1] || new Date().toISOString()
    };

    return {
      summary: {
        totalLogs: allLogs.length,
        errorCount: errorLogs.length,
        warningCount: warningLogs.length,
        successRate: Math.round(successRate * 100) / 100,
        timeRange
      },
      errorPatterns: this.getErrorPatterns(),
      contextBreakdown,
      recentErrors: errorLogs.slice(-10),
      performanceMetrics: {
        averageDuration: Math.round(averageDuration * 100) / 100,
        slowestOperations
      }
    };
  }

  /**
   * Export logs as JSON
   */
  exportLogs(filter?: LogFilter): string {
    const logs = filter ? this.getLogs(filter) : this.logs;
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportLogsAsCSV(filter?: LogFilter): string {
    const logs = filter ? this.getLogs(filter) : this.logs;
    
    if (logs.length === 0) {
      return 'No logs to export';
    }

    const headers = ['timestamp', 'level', 'context', 'message', 'userId', 'empresaId', 'errorCode', 'duration'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.timestamp,
        log.level,
        log.context,
        `"${log.message.replace(/"/g, '""')}"`, // Escape quotes in message
        log.userId || '',
        log.empresaId || '',
        log.errorCode || '',
        log.duration?.toString() || ''
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    const previousCount = this.logs.length;
    this.logs = [];
    console.log(`[DebugLogger] Cleared ${previousCount} log entries`);
  }

  /**
   * Get current session info
   */
  getSessionInfo(): { sessionId: string; userId?: string; empresaId?: string; logCount: number } {
    return {
      sessionId: this.sessionId,
      userId: this.currentUserId,
      empresaId: this.currentEmpresaId,
      logCount: this.logs.length
    };
  }
}

// Global instance
export const debugLogger = new DebugLogger();

// Helper functions for common logging patterns
export const logProductCreation = {
  start: (empresaId: string, productData: any) => {
    debugLogger.info('ProductCreation', 'Starting product creation', {
      empresaId,
      productName: productData.nombre,
      hasUltimoCosto: productData.ultimoCosto !== undefined,
      hasUltimaGanancia: productData.ultimaGanancia !== undefined
    });
  },
  
  validation: (isValid: boolean, errors: string[]) => {
    debugLogger.logValidation('ProductCreation', isValid, errors);
  },
  
  firestore: (operation: string, success: boolean, data?: any, error?: Error) => {
    debugLogger.logFirestoreOperation('ProductCreation', operation, success, data, error);
  },
  
  complete: (success: boolean, productId?: string, error?: Error) => {
    if (success) {
      debugLogger.info('ProductCreation', 'Product creation completed successfully', { productId });
    } else {
      debugLogger.error('ProductCreation', 'Product creation failed', { productId }, error);
    }
  }
};

export const logClientCreation = {
  start: (empresaId: string, clientData: any) => {
    debugLogger.info('ClientCreation', 'Starting client creation', {
      empresaId,
      clientName: clientData.nombre,
      hasNotas: !!clientData.notas,
      hasFechaImportante: !!clientData.fechaImportante
    });
  },
  
  validation: (isValid: boolean, errors: string[]) => {
    debugLogger.logValidation('ClientCreation', isValid, errors);
  },
  
  firestore: (operation: string, success: boolean, data?: any, error?: Error) => {
    debugLogger.logFirestoreOperation('ClientCreation', operation, success, data, error);
  },
  
  complete: (success: boolean, clientId?: string, error?: Error) => {
    if (success) {
      debugLogger.info('ClientCreation', 'Client creation completed successfully', { clientId });
    } else {
      debugLogger.error('ClientCreation', 'Client creation failed', { clientId }, error);
    }
  }
};

export default DebugLogger;