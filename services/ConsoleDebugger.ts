/**
 * Console debugging utility for easy access to all logging systems
 * Provides developer-friendly console commands for debugging product and client creation issues
 */

import { 
  debugLogger, 
  errorTracker, 
  debugUtils, 
  loggingManager,
  creationFlowLogger
} from './index';

export interface ConsoleDebugCommands {
  // Quick status commands
  status(): void;
  health(): void;
  summary(): void;
  
  // Logging control
  enable(): void;
  disable(): void;
  clear(): void;
  
  // Data export
  export(): string;
  exportLogs(): string;
  exportErrors(): string;
  exportFlows(): string;
  
  // Analysis commands
  errors(): void;
  performance(): void;
  flows(): void;
  
  // Specific debugging
  product(productName?: string): void;
  client(clientName?: string): void;
  
  // Configuration
  config(): void;
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void;
  
  // Help
  help(): void;
}

class ConsoleDebugger implements ConsoleDebugCommands {
  constructor() {
    this.setupGlobalAccess();
  }

  /**
   * Show overall system status
   */
  status(): void {
    const debugSummary = debugUtils.getDebugSummary();
    const healthReport = debugUtils.generateSystemHealthReport();
    const config = loggingManager.getConfig();
    
    console.group('🔍 System Status');
    console.log('📊 Session:', debugSummary.sessionId);
    console.log('📝 Total Logs:', debugSummary.totalLogs);
    console.log('❌ Total Errors:', debugSummary.totalErrors);
    console.log('⚙️  Total Operations:', debugSummary.totalOperations);
    console.log('🏥 Health Status:', this.getHealthEmoji(healthReport.systemStatus), healthReport.systemStatus.toUpperCase());
    console.log('🔧 Logging Enabled:', config.enabled ? '✅' : '❌');
    console.log('📈 Log Level:', config.level.toUpperCase());
    console.groupEnd();
    
    if (healthReport.systemStatus !== 'healthy') {
      console.group('💡 Recommendations');
      healthReport.recommendations.forEach(rec => console.log('•', rec));
      console.groupEnd();
    }
  }

  /**
   * Show detailed health information
   */
  health(): void {
    const healthReport = debugUtils.generateSystemHealthReport();
    
    console.group('🏥 System Health Report');
    console.log('Status:', this.getHealthEmoji(healthReport.systemStatus), healthReport.systemStatus.toUpperCase());
    
    console.group('📊 Error Summary');
    console.log('Total Errors:', healthReport.errorSummary.totalErrors);
    console.log('Recent Errors:', healthReport.errorSummary.recentErrors);
    console.log('Critical Errors:', healthReport.errorSummary.criticalErrors);
    console.log('Error Rate:', healthReport.errorSummary.errorRate.toFixed(2) + '%');
    console.groupEnd();
    
    console.group('⚡ Performance Metrics');
    console.log('Average Operation Time:', healthReport.performanceMetrics.averageOperationTime + 'ms');
    console.log('Success Rate:', healthReport.performanceMetrics.successRate + '%');
    console.groupEnd();
    
    if (healthReport.recommendations.length > 0) {
      console.group('💡 Recommendations');
      healthReport.recommendations.forEach(rec => console.log('•', rec));
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Show quick summary
   */
  summary(): void {
    const debugSummary = debugUtils.getDebugSummary();
    const flowSummary = creationFlowLogger.getFlowSummary();
    
    console.group('📋 Quick Summary');
    console.log('Session ID:', debugSummary.sessionId);
    console.log('Logs:', debugSummary.totalLogs, '| Errors:', debugSummary.totalErrors, '| Operations:', debugSummary.totalOperations);
    console.log('Flows:', flowSummary.totalFlows, '(Products:', flowSummary.productFlows, '| Clients:', flowSummary.clientFlows + ')');
    console.log('Success Rate:', ((flowSummary.successfulFlows / flowSummary.totalFlows) * 100).toFixed(1) + '%');
    
    if (debugSummary.recentActivity.length > 0) {
      console.group('🕒 Recent Activity');
      debugSummary.recentActivity.slice(0, 5).forEach(activity => console.log('•', activity));
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Enable all logging
   */
  enable(): void {
    loggingManager.setEnabled(true);
    console.log('✅ Logging enabled');
  }

  /**
   * Disable all logging
   */
  disable(): void {
    loggingManager.setEnabled(false);
    console.log('❌ Logging disabled');
  }

  /**
   * Clear all logging data
   */
  clear(): void {
    debugUtils.clearAllDebugData();
    creationFlowLogger.clearFlowData();
    console.log('🧹 All logging data cleared');
  }

  /**
   * Export all debug data
   */
  export(): string {
    const data = debugUtils.exportDebugData();
    const flowData = creationFlowLogger.exportFlowData();
    
    const fullExport = {
      timestamp: new Date().toISOString(),
      debugData: data,
      flowData: JSON.parse(flowData)
    };
    
    const exportString = JSON.stringify(fullExport, null, 2);
    console.log('📤 Debug data exported (' + (exportString.length / 1024).toFixed(1) + 'KB)');
    return exportString;
  }

  /**
   * Export only logs
   */
  exportLogs(): string {
    const logs = debugLogger.exportLogs();
    console.log('📝 Logs exported');
    return logs;
  }

  /**
   * Export only errors
   */
  exportErrors(): string {
    const errors = errorTracker.exportErrors();
    console.log('❌ Errors exported');
    return errors;
  }

  /**
   * Export only flows
   */
  exportFlows(): string {
    const flows = creationFlowLogger.exportFlowData();
    console.log('🔄 Flows exported');
    return flows;
  }

  /**
   * Analyze errors
   */
  errors(): void {
    const errorSummary = errorTracker.getErrorSummary();
    
    console.group('❌ Error Analysis');
    console.log('Total Errors:', errorSummary.totalErrors);
    
    if (errorSummary.errorsByCategory && Object.keys(errorSummary.errorsByCategory).length > 0) {
      console.group('📊 By Category');
      Object.entries(errorSummary.errorsByCategory).forEach(([category, count]) => {
        console.log(`${this.getCategoryEmoji(category)} ${category}:`, count);
      });
      console.groupEnd();
    }
    
    if (errorSummary.errorsBySeverity && Object.keys(errorSummary.errorsBySeverity).length > 0) {
      console.group('🚨 By Severity');
      Object.entries(errorSummary.errorsBySeverity).forEach(([severity, count]) => {
        console.log(`${this.getSeverityEmoji(severity)} ${severity}:`, count);
      });
      console.groupEnd();
    }
    
    if (errorSummary.topErrors.length > 0) {
      console.group('🔝 Top Errors');
      errorSummary.topErrors.slice(0, 5).forEach((error, index) => {
        console.log(`${index + 1}. [${error.category}] ${error.message} (${error.count}x)`);
      });
      console.groupEnd();
    }
    
    if (errorSummary.recentErrors.length > 0) {
      console.group('🕒 Recent Errors');
      errorSummary.recentErrors.slice(0, 3).forEach(error => {
        console.log(`[${error.severity}] ${error.error.message} (${error.occurrenceCount}x)`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Analyze performance
   */
  performance(): void {
    const stats = loggingManager.getStats();
    const healthReport = debugUtils.generateSystemHealthReport();
    
    console.group('⚡ Performance Analysis');
    console.log('Session Duration:', Math.round(stats.sessionDuration / 1000) + 's');
    console.log('Average Log Time:', stats.performanceMetrics.averageLogTime + 'ms');
    console.log('Success Rate:', healthReport.performanceMetrics.successRate + '%');
    console.log('Average Operation Time:', healthReport.performanceMetrics.averageOperationTime + 'ms');
    
    if (stats.memoryUsage) {
      console.log('Memory Usage:', Math.round(stats.memoryUsage / 1024 / 1024) + 'MB');
    }
    
    if (stats.performanceMetrics.slowestLogs.length > 0) {
      console.group('🐌 Slowest Operations');
      stats.performanceMetrics.slowestLogs.forEach(log => {
        console.log(`${log.context}: ${log.duration}ms`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Analyze flows
   */
  flows(): void {
    const flowSummary = creationFlowLogger.getFlowSummary();
    
    console.group('🔄 Flow Analysis');
    console.log('Total Flows:', flowSummary.totalFlows);
    console.log('Product Flows:', flowSummary.productFlows);
    console.log('Client Flows:', flowSummary.clientFlows);
    console.log('Successful:', flowSummary.successfulFlows);
    console.log('Failed:', flowSummary.failedFlows);
    console.log('Average Duration:', flowSummary.averageDuration + 'ms');
    
    if (flowSummary.commonErrors.length > 0) {
      console.group('❌ Common Flow Errors');
      flowSummary.commonErrors.slice(0, 5).forEach(error => {
        console.log(`[${error.flowType}] ${error.error} (${error.count}x)`);
      });
      console.groupEnd();
    }
    
    console.group('📊 Performance Metrics');
    console.log('Fastest Flow:', flowSummary.performanceMetrics.fastestFlow.type, '-', flowSummary.performanceMetrics.fastestFlow.duration + 'ms');
    console.log('Slowest Flow:', flowSummary.performanceMetrics.slowestFlow.type, '-', flowSummary.performanceMetrics.slowestFlow.duration + 'ms');
    
    if (Object.keys(flowSummary.performanceMetrics.averageStepDuration).length > 0) {
      console.group('⏱️  Average Step Durations');
      Object.entries(flowSummary.performanceMetrics.averageStepDuration).forEach(([step, duration]) => {
        console.log(`${step}: ${Math.round(duration)}ms`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
    
    console.groupEnd();
  }

  /**
   * Debug specific product issues
   */
  product(productName?: string): void {
    const logs = debugLogger.getLogs({ context: ['Product'] });
    const errors = errorTracker.getErrors({ component: ['ProductService', 'ProductCreation'] });
    const flows = creationFlowLogger.getCompletedFlows().filter(flow => 'productData' in flow);
    
    console.group('🛍️  Product Debug Information');
    
    if (productName) {
      console.log('Filtering for product:', productName);
      const filteredLogs = logs.filter(log => 
        log.data && JSON.stringify(log.data).toLowerCase().includes(productName.toLowerCase())
      );
      const filteredFlows = flows.filter(flow => 
        'productData' in flow && flow.productData.nombre.toLowerCase().includes(productName.toLowerCase())
      );
      
      console.log('Matching logs:', filteredLogs.length);
      console.log('Matching flows:', filteredFlows.length);
      
      if (filteredFlows.length > 0) {
        console.group('🔄 Recent Flows');
        filteredFlows.slice(-3).forEach(flow => {
          const duration = flow.steps.find(s => s.step === 'flow_completed')?.duration || 0;
          const success = flow.steps.some(s => s.step === 'flow_completed' && s.status === 'completed');
          console.log(`${success ? '✅' : '❌'} ${flow.productData.nombre} (${duration}ms)`);
        });
        console.groupEnd();
      }
    } else {
      console.log('Total product logs:', logs.length);
      console.log('Total product errors:', errors.length);
      console.log('Total product flows:', flows.length);
      
      const recentFlows = flows.slice(-5);
      if (recentFlows.length > 0) {
        console.group('🕒 Recent Product Flows');
        recentFlows.forEach(flow => {
          const duration = flow.steps.find(s => s.step === 'flow_completed')?.duration || 0;
          const success = flow.steps.some(s => s.step === 'flow_completed' && s.status === 'completed');
          console.log(`${success ? '✅' : '❌'} ${flow.productData.nombre} (${duration}ms)`);
        });
        console.groupEnd();
      }
    }
    
    if (errors.length > 0) {
      console.group('❌ Recent Product Errors');
      errors.slice(-3).forEach(error => {
        console.log(`[${error.severity}] ${error.error.message} (${error.occurrenceCount}x)`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Debug specific client issues
   */
  client(clientName?: string): void {
    const logs = debugLogger.getLogs({ context: ['Client'] });
    const errors = errorTracker.getErrors({ component: ['ClientService', 'ClientCreation'] });
    const flows = creationFlowLogger.getCompletedFlows().filter(flow => 'clientData' in flow);
    
    console.group('👤 Client Debug Information');
    
    if (clientName) {
      console.log('Filtering for client:', clientName);
      const filteredLogs = logs.filter(log => 
        log.data && JSON.stringify(log.data).toLowerCase().includes(clientName.toLowerCase())
      );
      const filteredFlows = flows.filter(flow => 
        'clientData' in flow && flow.clientData.nombre.toLowerCase().includes(clientName.toLowerCase())
      );
      
      console.log('Matching logs:', filteredLogs.length);
      console.log('Matching flows:', filteredFlows.length);
      
      if (filteredFlows.length > 0) {
        console.group('🔄 Recent Flows');
        filteredFlows.slice(-3).forEach(flow => {
          const duration = flow.steps.find(s => s.step === 'flow_completed')?.duration || 0;
          const success = flow.steps.some(s => s.step === 'flow_completed' && s.status === 'completed');
          console.log(`${success ? '✅' : '❌'} ${flow.clientData.nombre} (${duration}ms)`);
        });
        console.groupEnd();
      }
    } else {
      console.log('Total client logs:', logs.length);
      console.log('Total client errors:', errors.length);
      console.log('Total client flows:', flows.length);
      
      const recentFlows = flows.slice(-5);
      if (recentFlows.length > 0) {
        console.group('🕒 Recent Client Flows');
        recentFlows.forEach(flow => {
          const duration = flow.steps.find(s => s.step === 'flow_completed')?.duration || 0;
          const success = flow.steps.some(s => s.step === 'flow_completed' && s.status === 'completed');
          console.log(`${success ? '✅' : '❌'} ${flow.clientData.nombre} (${duration}ms)`);
        });
        console.groupEnd();
      }
    }
    
    if (errors.length > 0) {
      console.group('❌ Recent Client Errors');
      errors.slice(-3).forEach(error => {
        console.log(`[${error.severity}] ${error.error.message} (${error.occurrenceCount}x)`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Show current configuration
   */
  config(): void {
    const config = loggingManager.getConfig();
    
    console.group('⚙️  Logging Configuration');
    console.log('Enabled:', config.enabled ? '✅' : '❌');
    console.log('Level:', config.level.toUpperCase());
    console.log('Max Logs:', config.maxLogs);
    console.log('Max Errors:', config.maxErrors);
    console.log('Console Output:', config.enableConsoleOutput ? '✅' : '❌');
    console.log('Error Tracking:', config.enableErrorTracking ? '✅' : '❌');
    console.log('Performance Tracking:', config.enablePerformanceTracking ? '✅' : '❌');
    console.log('Breadcrumbs:', config.enableBreadcrumbs ? '✅' : '❌');
    console.log('Auto Export:', config.autoExportOnError ? '✅' : '❌');
    console.log('Export Threshold:', config.exportThreshold);
    console.groupEnd();
  }

  /**
   * Set logging level
   */
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    loggingManager.setLevel(level);
    console.log(`📈 Logging level set to: ${level.toUpperCase()}`);
  }

  /**
   * Show help information
   */
  help(): void {
    console.group('🆘 Debug Console Help');
    
    console.group('📊 Status Commands');
    console.log('debug.status()     - Show overall system status');
    console.log('debug.health()     - Show detailed health report');
    console.log('debug.summary()    - Show quick summary');
    console.groupEnd();
    
    console.group('🔧 Control Commands');
    console.log('debug.enable()     - Enable all logging');
    console.log('debug.disable()    - Disable all logging');
    console.log('debug.clear()      - Clear all logging data');
    console.groupEnd();
    
    console.group('📤 Export Commands');
    console.log('debug.export()     - Export all debug data');
    console.log('debug.exportLogs() - Export only logs');
    console.log('debug.exportErrors() - Export only errors');
    console.log('debug.exportFlows() - Export only flows');
    console.groupEnd();
    
    console.group('📈 Analysis Commands');
    console.log('debug.errors()     - Analyze error patterns');
    console.log('debug.performance() - Analyze performance metrics');
    console.log('debug.flows()      - Analyze creation flows');
    console.groupEnd();
    
    console.group('🔍 Specific Debugging');
    console.log('debug.product()    - Debug product creation issues');
    console.log('debug.product("name") - Debug specific product');
    console.log('debug.client()     - Debug client creation issues');
    console.log('debug.client("name") - Debug specific client');
    console.groupEnd();
    
    console.group('⚙️  Configuration');
    console.log('debug.config()     - Show current configuration');
    console.log('debug.setLevel("level") - Set logging level (debug/info/warn/error)');
    console.groupEnd();
    
    console.log('💡 Tip: All commands return data that can be assigned to variables for further analysis');
    console.groupEnd();
  }

  /**
   * Setup global access to debug commands
   */
  private setupGlobalAccess(): void {
    if (typeof window !== 'undefined') {
      (window as any).debug = this;
      console.log('🛠️  Debug console available: window.debug');
      console.log('💡 Type debug.help() for available commands');
    }
    
    if (typeof global !== 'undefined') {
      (global as any).debug = this;
    }
  }

  /**
   * Get emoji for health status
   */
  private getHealthEmoji(status: string): string {
    switch (status) {
      case 'healthy': return '💚';
      case 'warning': return '⚠️';
      case 'critical': return '🔴';
      default: return '❓';
    }
  }

  /**
   * Get emoji for error category
   */
  private getCategoryEmoji(category: string): string {
    switch (category) {
      case 'validation': return '✅';
      case 'network': return '🌐';
      case 'firestore': return '🔥';
      case 'permission': return '🔒';
      default: return '❓';
    }
  }

  /**
   * Get emoji for error severity
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🟠';
      case 'critical': return '🔴';
      default: return '❓';
    }
  }
}

// Create and export global instance
export const consoleDebugger = new ConsoleDebugger();

// Export types for TypeScript users
export type { ConsoleDebugCommands };

export default ConsoleDebugger;