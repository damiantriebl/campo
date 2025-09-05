/**
 * Comprehensive logging configuration for product and client creation flows
 * Provides centralized configuration and management of all logging systems
 */

import { debugLogger } from './DebugLogger';
import { errorTracker } from './ErrorTracker';
import { debugUtils } from './DebugUtils';
import { productCreationDebugger, setProductCreationDebugging } from '../debug-product-creation';

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  maxLogs: number;
  maxErrors: number;
  enableConsoleOutput: boolean;
  enableErrorTracking: boolean;
  enablePerformanceTracking: boolean;
  enableBreadcrumbs: boolean;
  autoExportOnError: boolean;
  exportThreshold: number;
}

export interface LoggingStats {
  totalLogs: number;
  totalErrors: number;
  totalOperations: number;
  sessionDuration: number;
  memoryUsage?: number;
  performanceMetrics: {
    averageLogTime: number;
    slowestLogs: Array<{ context: string; duration: number }>;
  };
}

class LoggingManager {
  private config: LoggingConfig;
  private startTime: number;
  private logTimes: number[] = [];

  constructor() {
    this.config = this.getDefaultConfig();
    this.startTime = Date.now();
    this.initialize();
  }

  private getDefaultConfig(): LoggingConfig {
    return {
      enabled: true,
      level: 'info',
      maxLogs: 1000,
      maxErrors: 500,
      enableConsoleOutput: true,
      enableErrorTracking: true,
      enablePerformanceTracking: true,
      enableBreadcrumbs: true,
      autoExportOnError: false,
      exportThreshold: 100
    };
  }

  /**
   * Initialize logging systems with current configuration
   */
  private initialize(): void {
    // Configure debug logger
    debugLogger.setEnabled(this.config.enabled);
    
    // Configure error tracker
    if (this.config.enableErrorTracking) {
      errorTracker.addBreadcrumb('Logging system initialized');
    }
    
    // Configure product creation debugger
    setProductCreationDebugging(this.config.enabled);
    
    // Initialize debug utils
    debugUtils.setDebuggingEnabled(this.config.enabled);

    console.log('[LoggingManager] Logging system initialized', this.config);
  }

  /**
   * Update logging configuration
   */
  updateConfig(newConfig: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initialize();
    
    debugLogger.info('LoggingManager', 'Configuration updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable all logging
   */
  setEnabled(enabled: boolean): void {
    this.updateConfig({ enabled });
  }

  /**
   * Set logging level
   */
  setLevel(level: LoggingConfig['level']): void {
    this.updateConfig({ level });
  }

  /**
   * Configure for development environment
   */
  configureForDevelopment(): void {
    this.updateConfig({
      enabled: true,
      level: 'debug',
      maxLogs: 2000,
      maxErrors: 1000,
      enableConsoleOutput: true,
      enableErrorTracking: true,
      enablePerformanceTracking: true,
      enableBreadcrumbs: true,
      autoExportOnError: true,
      exportThreshold: 50
    });
    
    console.log('[LoggingManager] Configured for development environment');
  }

  /**
   * Configure for production environment
   */
  configureForProduction(): void {
    this.updateConfig({
      enabled: true,
      level: 'warn',
      maxLogs: 500,
      maxErrors: 200,
      enableConsoleOutput: false,
      enableErrorTracking: true,
      enablePerformanceTracking: false,
      enableBreadcrumbs: true,
      autoExportOnError: true,
      exportThreshold: 20
    });
    
    console.log('[LoggingManager] Configured for production environment');
  }

  /**
   * Configure for testing environment
   */
  configureForTesting(): void {
    this.updateConfig({
      enabled: true,
      level: 'error',
      maxLogs: 100,
      maxErrors: 50,
      enableConsoleOutput: false,
      enableErrorTracking: true,
      enablePerformanceTracking: false,
      enableBreadcrumbs: false,
      autoExportOnError: false,
      exportThreshold: 10
    });
    
    console.log('[LoggingManager] Configured for testing environment');
  }

  /**
   * Log a timed operation
   */
  logTimedOperation<T>(
    context: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enablePerformanceTracking) {
      return fn();
    }

    const startTime = Date.now();
    const operationId = debugLogger.startOperation(context, operation);

    return fn()
      .then(result => {
        const duration = Date.now() - startTime;
        this.logTimes.push(duration);
        
        debugLogger.endOperation(context, operation, operationId, true, result, startTime);
        
        if (this.config.enableBreadcrumbs) {
          errorTracker.addBreadcrumb(`${operation} completed in ${duration}ms`);
        }
        
        return result;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        this.logTimes.push(duration);
        
        debugLogger.endOperation(context, operation, operationId, false, { error: error.message }, startTime);
        
        if (this.config.enableErrorTracking) {
          errorTracker.trackError(error, { operation, component: context });
        }
        
        if (this.config.autoExportOnError) {
          this.checkAutoExport();
        }
        
        throw error;
      });
  }

  /**
   * Check if auto-export threshold is reached
   */
  private checkAutoExport(): void {
    const errorSummary = errorTracker.getErrorSummary();
    
    if (errorSummary.totalErrors >= this.config.exportThreshold) {
      console.warn('[LoggingManager] Auto-export threshold reached, exporting debug data');
      this.exportDebugData();
    }
  }

  /**
   * Get logging statistics
   */
  getStats(): LoggingStats {
    const debugReport = debugLogger.generateReport();
    const errorSummary = errorTracker.getErrorSummary();
    const debugSummary = debugUtils.getDebugSummary();
    
    const sessionDuration = Date.now() - this.startTime;
    
    // Calculate performance metrics
    const averageLogTime = this.logTimes.length > 0 ?
      this.logTimes.reduce((sum, time) => sum + time, 0) / this.logTimes.length : 0;
    
    const slowestLogs = this.logTimes
      .map((time, index) => ({ context: `operation_${index}`, duration: time }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    // Get memory usage if available
    let memoryUsage: number | undefined;
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    return {
      totalLogs: debugReport.summary.totalLogs,
      totalErrors: errorSummary.totalErrors,
      totalOperations: debugSummary.totalOperations,
      sessionDuration,
      memoryUsage,
      performanceMetrics: {
        averageLogTime: Math.round(averageLogTime * 100) / 100,
        slowestLogs
      }
    };
  }

  /**
   * Export debug data with current configuration
   */
  exportDebugData(): string {
    const timestamp = new Date().toISOString();
    const stats = this.getStats();
    const debugData = debugUtils.exportDebugData();
    
    const exportData = {
      timestamp,
      config: this.config,
      stats,
      debugData
    };
    
    const exportString = JSON.stringify(exportData, null, 2);
    
    // Log the export
    debugLogger.info('LoggingManager', 'Debug data exported', {
      timestamp,
      dataSize: exportString.length,
      totalLogs: stats.totalLogs,
      totalErrors: stats.totalErrors
    });
    
    return exportString;
  }

  /**
   * Import and apply configuration
   */
  importConfig(configString: string): boolean {
    try {
      const importedData = JSON.parse(configString);
      
      if (importedData.config && typeof importedData.config === 'object') {
        this.updateConfig(importedData.config);
        debugLogger.info('LoggingManager', 'Configuration imported successfully');
        return true;
      } else {
        throw new Error('Invalid configuration format');
      }
    } catch (error) {
      debugLogger.error('LoggingManager', 'Failed to import configuration', {}, error as Error);
      return false;
    }
  }

  /**
   * Reset all logging data
   */
  resetAllData(): void {
    debugUtils.clearAllDebugData();
    this.logTimes = [];
    this.startTime = Date.now();
    
    debugLogger.info('LoggingManager', 'All logging data reset');
  }

  /**
   * Get system health status
   */
  getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const stats = this.getStats();
    const healthReport = debugUtils.generateSystemHealthReport();
    
    return healthReport.systemStatus;
  }

  /**
   * Generate comprehensive logging report
   */
  generateReport(): string {
    const stats = this.getStats();
    const healthReport = debugUtils.generateSystemHealthReport();
    const config = this.getConfig();
    
    return `
=== Comprehensive Logging Report ===
Generated: ${new Date().toISOString()}

CONFIGURATION:
- Enabled: ${config.enabled}
- Level: ${config.level}
- Console Output: ${config.enableConsoleOutput}
- Error Tracking: ${config.enableErrorTracking}
- Performance Tracking: ${config.enablePerformanceTracking}
- Breadcrumbs: ${config.enableBreadcrumbs}
- Auto Export: ${config.autoExportOnError}

STATISTICS:
- Total Logs: ${stats.totalLogs}
- Total Errors: ${stats.totalErrors}
- Total Operations: ${stats.totalOperations}
- Session Duration: ${Math.round(stats.sessionDuration / 1000)}s
- Memory Usage: ${stats.memoryUsage ? Math.round(stats.memoryUsage / 1024 / 1024) + 'MB' : 'N/A'}

PERFORMANCE:
- Average Log Time: ${stats.performanceMetrics.averageLogTime}ms
- Slowest Operations:
${stats.performanceMetrics.slowestLogs
  .map(log => `  - ${log.context}: ${log.duration}ms`)
  .join('\n')}

SYSTEM HEALTH: ${healthReport.systemStatus.toUpperCase()}

RECOMMENDATIONS:
${healthReport.recommendations.map(rec => `- ${rec}`).join('\n')}

ERROR SUMMARY:
- Total Errors: ${healthReport.errorSummary.totalErrors}
- Recent Errors: ${healthReport.errorSummary.recentErrors}
- Critical Errors: ${healthReport.errorSummary.criticalErrors}
- Error Rate: ${healthReport.errorSummary.errorRate.toFixed(2)}%

PERFORMANCE METRICS:
- Average Operation Time: ${healthReport.performanceMetrics.averageOperationTime}ms
- Success Rate: ${healthReport.performanceMetrics.successRate}%
`;
  }
}

// Global instance
export const loggingManager = new LoggingManager();

// Environment-specific initialization
export const initializeLogging = (environment: 'development' | 'production' | 'testing' = 'development') => {
  switch (environment) {
    case 'development':
      loggingManager.configureForDevelopment();
      break;
    case 'production':
      loggingManager.configureForProduction();
      break;
    case 'testing':
      loggingManager.configureForTesting();
      break;
  }
  
  console.log(`[LoggingConfig] Initialized for ${environment} environment`);
};

// Helper functions for common logging operations
export const withLogging = <T>(
  context: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  return loggingManager.logTimedOperation(context, operation, fn);
};

export const logProductCreation = (empresaId: string, productData: any) => {
  return withLogging('ProductService', 'createProduct', async () => {
    debugLogger.info('ProductCreation', 'Starting product creation with logging', {
      empresaId,
      productName: productData.nombre
    });
    
    errorTracker.addBreadcrumb('Product creation started with comprehensive logging', {
      empresaId,
      productName: productData.nombre
    });
  });
};

export const logClientCreation = (empresaId: string, clientData: any) => {
  return withLogging('ClientService', 'createClient', async () => {
    debugLogger.info('ClientCreation', 'Starting client creation with logging', {
      empresaId,
      clientName: clientData.nombre
    });
    
    errorTracker.addBreadcrumb('Client creation started with comprehensive logging', {
      empresaId,
      clientName: clientData.nombre
    });
  });
};

// Auto-initialize based on environment
if (typeof process !== 'undefined' && process.env) {
  const env = process.env.NODE_ENV as 'development' | 'production' | 'testing';
  initializeLogging(env || 'development');
} else {
  // Default to development if environment is not available
  initializeLogging('development');
}

export default LoggingManager;