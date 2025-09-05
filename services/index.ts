/**
 * Centralized exports for all logging and debugging services
 * Provides easy access to comprehensive error logging and debugging capabilities
 */

import { loggingManager } from './LoggingConfig';
import { debugUtils } from './DebugUtils';
import { errorTracker } from './ErrorTracker';
import { logClientCreation, logProductCreation } from './DebugLogger';

// Core logging services
export { debugLogger, logProductCreation, logClientCreation } from './DebugLogger';
export { errorTracker, trackProductError, trackClientError, trackValidationError, trackFirestoreError, trackNetworkError } from './ErrorTracker';
export { debugUtils, debugProduct, debugClient } from './DebugUtils';
export { loggingManager, initializeLogging, withLogging } from './LoggingConfig';
export { creationFlowLogger, logProductCreationFlow, logClientCreationFlow } from './CreationFlowLogger';
export { consoleDebugger } from './ConsoleDebugger';

// Legacy debugger (for backward compatibility)
export { productCreationDebugger, setProductCreationDebugging } from '../debug-product-creation';

// Error handling service
export { default as ErrorHandlingService } from './ErrorHandlingService';

// Service classes
export { ProductService } from './ProductService';
export { ClientService } from './ClientService';
export { CompanyService, companyService } from './CompanyService';

// Types and interfaces
export type {
  LogEntry,
  LogFilter,
  ErrorPattern,
  DebugReport
} from './DebugLogger';

export type {
  ErrorContext,
  TrackedError,
  ErrorSummary,
  ErrorFilter as ErrorTrackerFilter
} from './ErrorTracker';

export type {
  DebugSession,
  SystemHealthReport
} from './DebugUtils';

export type {
  LoggingConfig,
  LoggingStats
} from './LoggingConfig';

// Convenience functions for common logging patterns
export const createProductLogger = (empresaId: string) => ({
  start: (productData: any) => {
    const operationId = debugUtils.startOperation('product', 'create', {
      empresaId,
      productName: productData.nombre
    });
    logProductCreation.start(empresaId, productData);
    return operationId;
  },
  
  validation: (isValid: boolean, errors: string[]) => {
    logProductCreation.validation(isValid, errors);
    debugUtils.logValidation('ProductCreation', isValid, errors);
  },
  
  firestore: (operation: string, success: boolean, data?: any, error?: Error) => {
    logProductCreation.firestore(operation, success, data, error);
    debugUtils.logFirestoreOperation('ProductCreation', operation, success, data, error);
  },
  
  complete: (operationId: string, success: boolean, productId?: string, error?: Error) => {
    logProductCreation.complete(success, productId, error);
    debugUtils.completeOperation(operationId, success, { productId }, error);
  }
});

export const createClientLogger = (empresaId: string) => ({
  start: (clientData: any) => {
    const operationId = debugUtils.startOperation('client', 'create', {
      empresaId,
      clientName: clientData.nombre
    });
    logClientCreation.start(empresaId, clientData);
    return operationId;
  },
  
  validation: (isValid: boolean, errors: string[]) => {
    logClientCreation.validation(isValid, errors);
    debugUtils.logValidation('ClientCreation', isValid, errors);
  },
  
  firestore: (operation: string, success: boolean, data?: any, error?: Error) => {
    logClientCreation.firestore(operation, success, data, error);
    debugUtils.logFirestoreOperation('ClientCreation', operation, success, data, error);
  },
  
  complete: (operationId: string, success: boolean, clientId?: string, error?: Error) => {
    logClientCreation.complete(success, clientId, error);
    debugUtils.completeOperation(operationId, success, { clientId }, error);
  }
});

// Quick setup functions
export const setupProductLogging = (empresaId: string, userId?: string) => {
  debugUtils.initializeSession(userId, empresaId);
  return createProductLogger(empresaId);
};

export const setupClientLogging = (empresaId: string, userId?: string) => {
  debugUtils.initializeSession(userId, empresaId);
  return createClientLogger(empresaId);
};

// Debug utilities for console access
export const getDebugSummary = () => debugUtils.getDebugSummary();
export const getSystemHealth = () => debugUtils.generateSystemHealthReport();
export const exportAllLogs = () => debugUtils.exportDebugData();
export const clearAllLogs = () => debugUtils.clearAllDebugData();

// Configuration helpers
export const enableDebugMode = () => {
  loggingManager.configureForDevelopment();
  console.log('🐛 Debug mode enabled - comprehensive logging active');
};

export const enableProductionMode = () => {
  loggingManager.configureForProduction();
  console.log('🚀 Production mode enabled - optimized logging active');
};

export const disableLogging = () => {
  loggingManager.setEnabled(false);
  console.log('🔇 Logging disabled');
};

// Error analysis helpers
export const analyzeErrors = () => {
  const errorSummary = errorTracker.getErrorSummary();
  const systemHealth = debugUtils.generateSystemHealthReport();
  
  console.group('📊 Error Analysis');
  console.log('Total Errors:', errorSummary.totalErrors);
  console.log('Error Categories:', errorSummary.errorsByCategory);
  console.log('System Status:', systemHealth.systemStatus);
  console.log('Recommendations:', systemHealth.recommendations);
  console.groupEnd();
  
  return { errorSummary, systemHealth };
};

// Performance analysis helpers
export const analyzePerformance = () => {
  const stats = loggingManager.getStats();
  const systemHealth = debugUtils.generateSystemHealthReport();
  
  console.group('⚡ Performance Analysis');
  console.log('Average Log Time:', stats.performanceMetrics.averageLogTime + 'ms');
  console.log('Slowest Operations:', stats.performanceMetrics.slowestLogs);
  console.log('Success Rate:', systemHealth.performanceMetrics.successRate + '%');
  console.log('Average Operation Time:', systemHealth.performanceMetrics.averageOperationTime + 'ms');
  console.groupEnd();
  
  return { stats, systemHealth };
};

// Global console helpers (available in browser console)
if (typeof window !== 'undefined') {
  (window as any).debugHelpers = {
    summary: getDebugSummary,
    health: getSystemHealth,
    export: exportAllLogs,
    clear: clearAllLogs,
    enableDebug: enableDebugMode,
    enableProduction: enableProductionMode,
    disable: disableLogging,
    analyzeErrors,
    analyzePerformance,
    report: () => loggingManager.generateReport()
  };
  
  console.log('🛠️  Debug helpers available: window.debugHelpers');
}