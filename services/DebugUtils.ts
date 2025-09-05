/**
 * Centralized debug utilities for product and client creation flows
 * Provides easy access to all debugging and logging features
 */

import { debugLogger } from './DebugLogger';
import { errorTracker } from './ErrorTracker';
import { productCreationDebugger } from '../debug-product-creation';

export interface DebugSession {
  sessionId: string;
  startTime: string;
  userId?: string;
  empresaId?: string;
  operations: Array<{
    id: string;
    type: 'product' | 'client';
    operation: string;
    status: 'started' | 'completed' | 'failed';
    startTime: string;
    endTime?: string;
    duration?: number;
    error?: string;
  }>;
}

export interface SystemHealthReport {
  timestamp: string;
  session: DebugSession;
  errorSummary: {
    totalErrors: number;
    recentErrors: number;
    criticalErrors: number;
    errorRate: number;
  };
  performanceMetrics: {
    averageOperationTime: number;
    slowestOperations: Array<{ operation: string; duration: number }>;
    successRate: number;
  };
  systemStatus: 'healthy' | 'warning' | 'critical';
  recommendations: string[];
}

class DebugUtils {
  private currentSession: DebugSession;
  private operations: Map<string, any> = new Map();

  constructor() {
    this.currentSession = this.createNewSession();
  }

  private createNewSession(): DebugSession {
    return {
      sessionId: `debug_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      startTime: new Date().toISOString(),
      operations: []
    };
  }

  /**
   * Initialize debug session with user context
   */
  initializeSession(userId?: string, empresaId?: string): void {
    this.currentSession = this.createNewSession();
    this.currentSession.userId = userId;
    this.currentSession.empresaId = empresaId;

    // Set context in all logging systems
    debugLogger.setUserContext(userId || 'anonymous', empresaId);
    errorTracker.addBreadcrumb('Debug session initialized', { userId, empresaId });

    console.log('[DebugUtils] Debug session initialized', {
      sessionId: this.currentSession.sessionId,
      userId,
      empresaId
    });
  }

  /**
   * Start tracking an operation
   */
  startOperation(type: 'product' | 'client', operation: string, data?: any): string {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const operationInfo = {
      id: operationId,
      type,
      operation,
      status: 'started' as const,
      startTime: new Date().toISOString(),
      data
    };

    this.operations.set(operationId, operationInfo);
    this.currentSession.operations.push(operationInfo);

    // Log in all systems
    debugLogger.info('DebugUtils', `Operation started: ${type}.${operation}`, { operationId, data });
    errorTracker.addBreadcrumb(`${type} ${operation} started`, { operationId });

    return operationId;
  }

  /**
   * Complete an operation
   */
  completeOperation(operationId: string, success: boolean, result?: any, error?: Error): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      console.warn('[DebugUtils] Operation not found:', operationId);
      return;
    }

    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(operation.startTime).getTime();

    operation.status = success ? 'completed' : 'failed';
    operation.endTime = endTime;
    operation.duration = duration;
    if (error) {
      operation.error = error.message;
    }

    // Log completion
    if (success) {
      debugLogger.info('DebugUtils', `Operation completed: ${operation.type}.${operation.operation}`, {
        operationId,
        duration,
        result
      });
      errorTracker.addBreadcrumb(`${operation.type} ${operation.operation} completed`, { 
        operationId, 
        duration 
      });
    } else {
      debugLogger.error('DebugUtils', `Operation failed: ${operation.type}.${operation.operation}`, {
        operationId,
        duration,
        error: error?.message
      }, error);
      errorTracker.addBreadcrumb(`${operation.type} ${operation.operation} failed`, { 
        operationId, 
        error: error?.message 
      });
    }
  }

  /**
   * Log validation results
   */
  logValidation(context: string, isValid: boolean, errors: string[], data?: any): void {
    debugLogger.logValidation(context, isValid, errors, data);
    
    if (!isValid) {
      errorTracker.addBreadcrumb(`Validation failed in ${context}`, { errors });
    } else {
      errorTracker.addBreadcrumb(`Validation passed in ${context}`);
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
    debugLogger.logFirestoreOperation(context, operation, success, data, error);
    
    if (success) {
      errorTracker.addBreadcrumb(`Firestore ${operation} succeeded in ${context}`, data);
    } else {
      errorTracker.addBreadcrumb(`Firestore ${operation} failed in ${context}`, { 
        error: error?.message 
      });
    }
  }

  /**
   * Log network status changes
   */
  logNetworkStatus(isOnline: boolean, connectionType?: string): void {
    debugLogger.logNetworkStatus(isOnline, connectionType);
    errorTracker.addBreadcrumb(`Network status: ${isOnline ? 'online' : 'offline'}`, { 
      connectionType 
    });
  }

  /**
   * Get current session info
   */
  getCurrentSession(): DebugSession {
    return { ...this.currentSession };
  }

  /**
   * Get operation history
   */
  getOperationHistory(type?: 'product' | 'client'): Array<any> {
    let operations = Array.from(this.operations.values());
    
    if (type) {
      operations = operations.filter(op => op.type === type);
    }
    
    return operations.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  /**
   * Generate comprehensive system health report
   */
  generateSystemHealthReport(): SystemHealthReport {
    const debugReport = debugLogger.generateReport();
    const errorSummary = errorTracker.getErrorSummary();
    const operations = this.getOperationHistory();

    // Calculate performance metrics
    const completedOperations = operations.filter(op => op.status === 'completed' && op.duration);
    const failedOperations = operations.filter(op => op.status === 'failed');
    
    const averageOperationTime = completedOperations.length > 0 ?
      completedOperations.reduce((sum, op) => sum + (op.duration || 0), 0) / completedOperations.length : 0;

    const slowestOperations = completedOperations
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5)
      .map(op => ({
        operation: `${op.type}.${op.operation}`,
        duration: op.duration || 0
      }));

    const successRate = operations.length > 0 ?
      ((operations.length - failedOperations.length) / operations.length * 100) : 100;

    // Determine system status
    let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (errorSummary.totalErrors > 50) {
      systemStatus = 'critical';
      recommendations.push('High error count detected. Review error patterns and fix critical issues.');
    } else if (errorSummary.totalErrors > 20) {
      systemStatus = 'warning';
      recommendations.push('Moderate error count. Monitor error trends and address recurring issues.');
    }

    if (successRate < 80) {
      systemStatus = 'critical';
      recommendations.push('Low success rate detected. Review failed operations and improve error handling.');
    } else if (successRate < 95) {
      if (systemStatus === 'healthy') systemStatus = 'warning';
      recommendations.push('Success rate could be improved. Review and optimize error-prone operations.');
    }

    if (averageOperationTime > 5000) {
      if (systemStatus === 'healthy') systemStatus = 'warning';
      recommendations.push('Operations are running slowly. Consider performance optimizations.');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating normally. Continue monitoring for any issues.');
    }

    return {
      timestamp: new Date().toISOString(),
      session: this.currentSession,
      errorSummary: {
        totalErrors: errorSummary.totalErrors,
        recentErrors: errorSummary.recentErrors.length,
        criticalErrors: errorSummary.errorsBySeverity.critical || 0,
        errorRate: operations.length > 0 ? (failedOperations.length / operations.length * 100) : 0
      },
      performanceMetrics: {
        averageOperationTime: Math.round(averageOperationTime),
        slowestOperations,
        successRate: Math.round(successRate * 100) / 100
      },
      systemStatus,
      recommendations
    };
  }

  /**
   * Export all debug data
   */
  exportDebugData(): {
    session: DebugSession;
    debugLogs: string;
    errorReport: string;
    productLogs: string;
    systemHealth: SystemHealthReport;
  } {
    return {
      session: this.getCurrentSession(),
      debugLogs: debugLogger.exportLogs(),
      errorReport: errorTracker.generateErrorReport(),
      productLogs: productCreationDebugger.exportLogs(),
      systemHealth: this.generateSystemHealthReport()
    };
  }

  /**
   * Clear all debug data
   */
  clearAllDebugData(): void {
    debugLogger.clearLogs();
    errorTracker.clearErrors();
    errorTracker.clearBreadcrumbs();
    productCreationDebugger.clearLogs();
    this.operations.clear();
    this.currentSession = this.createNewSession();

    console.log('[DebugUtils] All debug data cleared');
  }

  /**
   * Get debug summary for quick overview
   */
  getDebugSummary(): {
    sessionId: string;
    totalLogs: number;
    totalErrors: number;
    totalOperations: number;
    recentActivity: string[];
  } {
    const debugReport = debugLogger.generateReport();
    const errorSummary = errorTracker.getErrorSummary();
    const operations = this.getOperationHistory();

    // Get recent activity (last 10 items)
    const recentLogs = debugLogger.getLogs().slice(-5);
    const recentErrors = errorTracker.getErrors().slice(0, 3);
    const recentOperations = operations.slice(0, 2);

    const recentActivity: string[] = [];
    
    recentOperations.forEach(op => {
      recentActivity.push(`${op.type}.${op.operation}: ${op.status}`);
    });
    
    recentErrors.forEach(error => {
      recentActivity.push(`Error: ${error.error.message}`);
    });
    
    recentLogs.forEach(log => {
      if (log.level === 'error' || log.level === 'warn') {
        recentActivity.push(`${log.level}: ${log.message}`);
      }
    });

    return {
      sessionId: this.currentSession.sessionId,
      totalLogs: debugReport.summary.totalLogs,
      totalErrors: errorSummary.totalErrors,
      totalOperations: operations.length,
      recentActivity: recentActivity.slice(0, 10)
    };
  }

  /**
   * Enable/disable all debugging
   */
  setDebuggingEnabled(enabled: boolean): void {
    debugLogger.setEnabled(enabled);
    errorTracker['isEnabled'] = enabled;
    productCreationDebugger['isEnabled'] = enabled;

    console.log(`[DebugUtils] Debugging ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Global instance
export const debugUtils = new DebugUtils();

// Helper functions for common debugging patterns
export const debugProduct = {
  start: (empresaId: string, productData: any) => {
    const operationId = debugUtils.startOperation('product', 'create', { 
      empresaId, 
      productName: productData.nombre 
    });
    debugUtils.logValidation('ProductCreation', true, [], productData);
    return operationId;
  },
  
  complete: (operationId: string, success: boolean, productId?: string, error?: Error) => {
    debugUtils.completeOperation(operationId, success, { productId }, error);
  },
  
  firestore: (operation: string, success: boolean, data?: any, error?: Error) => {
    debugUtils.logFirestoreOperation('ProductCreation', operation, success, data, error);
  }
};

export const debugClient = {
  start: (empresaId: string, clientData: any) => {
    const operationId = debugUtils.startOperation('client', 'create', { 
      empresaId, 
      clientName: clientData.nombre 
    });
    debugUtils.logValidation('ClientCreation', true, [], clientData);
    return operationId;
  },
  
  complete: (operationId: string, success: boolean, clientId?: string, error?: Error) => {
    debugUtils.completeOperation(operationId, success, { clientId }, error);
  },
  
  firestore: (operation: string, success: boolean, data?: any, error?: Error) => {
    debugUtils.logFirestoreOperation('ClientCreation', operation, success, data, error);
  }
};

// Console commands for easy debugging (can be used in browser console)
if (typeof window !== 'undefined') {
  (window as any).debugUtils = {
    getSummary: () => debugUtils.getDebugSummary(),
    getHealthReport: () => debugUtils.generateSystemHealthReport(),
    exportData: () => debugUtils.exportDebugData(),
    clearAll: () => debugUtils.clearAllDebugData(),
    enableDebugging: () => debugUtils.setDebuggingEnabled(true),
    disableDebugging: () => debugUtils.setDebuggingEnabled(false)
  };
}

export default DebugUtils;