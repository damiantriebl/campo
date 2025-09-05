/**
 * Core logging functionality test suite
 * Tests the logging infrastructure without external dependencies
 */

import { debugLogger } from '../DebugLogger';
import { errorTracker } from '../ErrorTracker';
import { debugUtils } from '../DebugUtils';
import { loggingManager } from '../LoggingConfig';
import { creationFlowLogger } from '../CreationFlowLogger';
import { consoleDebugger } from '../ConsoleDebugger';

describe('Core Logging Functionality', () => {
  beforeEach(() => {
    // Clear all logging data before each test
    debugLogger.clearLogs();
    errorTracker.clearErrors();
    errorTracker.clearBreadcrumbs();
    debugUtils.clearAllDebugData();
    creationFlowLogger.clearFlowData();
    
    // Configure for testing
    loggingManager.configureForTesting();
  });

  describe('DebugLogger', () => {
    it('should log messages at different levels', () => {
      debugLogger.debug('TestContext', 'Debug message', { test: true });
      debugLogger.info('TestContext', 'Info message', { test: true });
      debugLogger.warn('TestContext', 'Warning message', { test: true });
      debugLogger.error('TestContext', 'Error message', { test: true });

      const logs = debugLogger.getLogs();
      expect(logs.length).toBe(4);
      
      const debugLog = logs.find(log => log.level === 'debug');
      const infoLog = logs.find(log => log.level === 'info');
      const warnLog = logs.find(log => log.level === 'warn');
      const errorLog = logs.find(log => log.level === 'error');

      expect(debugLog).toBeDefined();
      expect(infoLog).toBeDefined();
      expect(warnLog).toBeDefined();
      expect(errorLog).toBeDefined();

      expect(debugLog?.message).toBe('Debug message');
      expect(infoLog?.message).toBe('Info message');
      expect(warnLog?.message).toBe('Warning message');
      expect(errorLog?.message).toBe('Error message');
    });

    it('should filter logs by context', () => {
      debugLogger.info('ProductService', 'Product message');
      debugLogger.info('ClientService', 'Client message');
      debugLogger.info('TestService', 'Test message');

      const productLogs = debugLogger.getLogs({ context: ['Product'] });
      const clientLogs = debugLogger.getLogs({ context: ['Client'] });

      expect(productLogs.length).toBe(1);
      expect(clientLogs.length).toBe(1);
      expect(productLogs[0].message).toBe('Product message');
      expect(clientLogs[0].message).toBe('Client message');
    });

    it('should generate debug reports', () => {
      debugLogger.info('TestContext', 'Test message 1');
      debugLogger.error('TestContext', 'Test error', {}, new Error('Test error'));
      debugLogger.info('TestContext', 'Test message 2');

      const report = debugLogger.generateReport();
      
      expect(report.summary.totalLogs).toBe(3);
      expect(report.summary.errorCount).toBe(1);
      expect(report.errorPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('ErrorTracker', () => {
    it('should track and categorize errors', () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      
      const networkError = new Error('Network timeout');
      (networkError as any).code = 'unavailable';
      
      const permissionError = new Error('Permission denied');
      (permissionError as any).code = 'permission-denied';

      errorTracker.trackError(validationError, { operation: 'validate', component: 'TestService' });
      errorTracker.trackError(networkError, { operation: 'fetch', component: 'TestService' });
      errorTracker.trackError(permissionError, { operation: 'access', component: 'TestService' });

      const errors = errorTracker.getErrors();
      expect(errors.length).toBe(3);

      const validationErrors = errors.filter(e => e.category === 'validation');
      const networkErrors = errors.filter(e => e.category === 'network');
      const permissionErrors = errors.filter(e => e.category === 'permission');

      expect(validationErrors.length).toBe(1);
      expect(networkErrors.length).toBe(1);
      expect(permissionErrors.length).toBe(1);

      expect(networkErrors[0].retryable).toBe(true);
      expect(validationErrors[0].retryable).toBe(false);
      expect(permissionErrors[0].retryable).toBe(false);
    });

    it('should track error occurrences', () => {
      const error = new Error('Repeated error');
      const context = { operation: 'test', component: 'TestService' };

      const errorId1 = errorTracker.trackError(error, context);
      const errorId2 = errorTracker.trackError(error, context);
      const errorId3 = errorTracker.trackError(error, context);

      // Should be the same error ID for identical errors
      expect(errorId1).toBe(errorId2);
      expect(errorId2).toBe(errorId3);

      const trackedError = errorTracker.getError(errorId1);
      expect(trackedError).toBeDefined();
      expect(trackedError?.occurrenceCount).toBe(3);
    });

    it('should generate error summaries', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      (error2 as any).code = 'network-error';

      errorTracker.trackError(error1, { operation: 'test1', component: 'TestService' });
      errorTracker.trackError(error2, { operation: 'test2', component: 'TestService' });

      const summary = errorTracker.getErrorSummary();
      
      expect(summary.totalErrors).toBe(2);
      expect(summary.topErrors.length).toBeGreaterThan(0);
      expect(summary.recentErrors.length).toBe(2);
    });
  });

  describe('DebugUtils', () => {
    it('should track operations', () => {
      const operationId = debugUtils.startOperation('product', 'create', { test: true });
      expect(operationId).toBeDefined();

      debugUtils.completeOperation(operationId, true, { productId: 'test-123' });

      const history = debugUtils.getOperationHistory('product');
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('product');
      expect(history[0].operation).toBe('create');
      expect(history[0].status).toBe('completed');
    });

    it('should generate system health reports', () => {
      // Create some test operations
      const op1 = debugUtils.startOperation('product', 'create');
      debugUtils.completeOperation(op1, true);

      const op2 = debugUtils.startOperation('client', 'create');
      debugUtils.completeOperation(op2, false, undefined, new Error('Test error'));

      const healthReport = debugUtils.generateSystemHealthReport();
      
      expect(healthReport.systemStatus).toMatch(/healthy|warning|critical/);
      expect(healthReport.errorSummary).toBeDefined();
      expect(healthReport.performanceMetrics).toBeDefined();
      expect(healthReport.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('CreationFlowLogger', () => {
    it('should track product creation flows', () => {
      const empresaId = 'test-empresa';
      const productData = { nombre: 'Test Product' };

      const operationId = creationFlowLogger.startProductCreation(empresaId, productData);
      expect(operationId).toMatch(/^product_flow_/);

      creationFlowLogger.logValidation(operationId, true, []);
      creationFlowLogger.logFirestoreOperation(operationId, 'createProduct', true, { productId: 'test-123' });
      creationFlowLogger.completeFlow(operationId, true, { productId: 'test-123' });

      const flow = creationFlowLogger.getFlow(operationId);
      expect(flow).toBeDefined();
      expect('productData' in flow!).toBe(true);
      
      if ('productData' in flow!) {
        expect(flow.productData.nombre).toBe('Test Product');
      }

      expect(flow?.steps.length).toBe(4); // flow_started, validation, firestore_createProduct, flow_completed
    });

    it('should track client creation flows', () => {
      const empresaId = 'test-empresa';
      const clientData = { nombre: 'Test Client' };

      const operationId = creationFlowLogger.startClientCreation(empresaId, clientData);
      expect(operationId).toMatch(/^client_flow_/);

      creationFlowLogger.logValidation(operationId, true, []);
      creationFlowLogger.logFirestoreOperation(operationId, 'createClient', true, { clientId: 'test-456' });
      creationFlowLogger.completeFlow(operationId, true, { clientId: 'test-456' });

      const flow = creationFlowLogger.getFlow(operationId);
      expect(flow).toBeDefined();
      expect('clientData' in flow!).toBe(true);
      
      if ('clientData' in flow!) {
        expect(flow.clientData.nombre).toBe('Test Client');
      }
    });

    it('should generate flow summaries', () => {
      const empresaId = 'test-empresa';

      // Create successful flows
      for (let i = 0; i < 3; i++) {
        const operationId = creationFlowLogger.startProductCreation(empresaId, { nombre: `Product ${i}` });
        creationFlowLogger.completeFlow(operationId, true, { productId: `product-${i}` });
      }

      // Create failed flows
      for (let i = 0; i < 2; i++) {
        const operationId = creationFlowLogger.startClientCreation(empresaId, { nombre: `Client ${i}` });
        creationFlowLogger.completeFlow(operationId, false, undefined, new Error(`Error ${i}`));
      }

      const summary = creationFlowLogger.getFlowSummary();
      
      expect(summary.totalFlows).toBe(5);
      expect(summary.productFlows).toBe(3);
      expect(summary.clientFlows).toBe(2);
      expect(summary.successfulFlows).toBe(3);
      expect(summary.failedFlows).toBe(2);
    });
  });

  describe('LoggingManager', () => {
    it('should manage configuration', () => {
      const initialConfig = loggingManager.getConfig();
      expect(initialConfig.enabled).toBe(true);

      loggingManager.setEnabled(false);
      const disabledConfig = loggingManager.getConfig();
      expect(disabledConfig.enabled).toBe(false);

      loggingManager.setLevel('error');
      const updatedConfig = loggingManager.getConfig();
      expect(updatedConfig.level).toBe('error');
    });

    it('should generate comprehensive reports', () => {
      // Add some test data
      debugLogger.info('TestContext', 'Test message');
      errorTracker.trackError(new Error('Test error'), { operation: 'test', component: 'TestService' });

      const report = loggingManager.generateReport();
      
      expect(report).toContain('Comprehensive Logging Report');
      expect(report).toContain('CONFIGURATION');
      expect(report).toContain('STATISTICS');
      expect(report).toContain('SYSTEM HEALTH');
    });
  });

  describe('ConsoleDebugger', () => {
    it('should provide status information', () => {
      // Mock console methods to capture output
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();

      consoleDebugger.status();

      expect(consoleSpy).toHaveBeenCalledWith('🔍 System Status');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleGroupEndSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });

    it('should provide help information', () => {
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();

      consoleDebugger.help();

      expect(consoleSpy).toHaveBeenCalledWith('🆘 Debug Console Help');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleGroupEndSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should maintain consistent session across all systems', () => {
      const userId = 'test-user';
      const empresaId = 'test-empresa';

      debugUtils.initializeSession(userId, empresaId);

      // Start operations in different systems
      debugLogger.info('TestContext', 'Test message');
      errorTracker.trackError(new Error('Test error'), { operation: 'test', component: 'TestService' });
      const operationId = creationFlowLogger.startProductCreation(empresaId, { nombre: 'Test Product' });

      // Verify session consistency
      const sessionInfo = debugUtils.getCurrentSession();
      expect(sessionInfo.userId).toBe(userId);
      expect(sessionInfo.empresaId).toBe(empresaId);

      // Verify logs have session context
      const logs = debugLogger.getLogs();
      const sessionLogs = logs.filter(log => log.userId === userId && log.empresaId === empresaId);
      expect(sessionLogs.length).toBeGreaterThan(0);
    });

    it('should export and import data consistently', () => {
      // Create test data
      debugLogger.info('TestContext', 'Test message');
      errorTracker.trackError(new Error('Test error'), { operation: 'test', component: 'TestService' });
      const operationId = creationFlowLogger.startProductCreation('test-empresa', { nombre: 'Test Product' });
      creationFlowLogger.completeFlow(operationId, true, { productId: 'test-123' });

      // Export data
      const debugData = debugUtils.exportDebugData();
      const flowData = creationFlowLogger.exportFlowData();

      expect(debugData.session).toBeDefined();
      expect(debugData.debugLogs).toBeDefined();
      expect(debugData.errorReport).toBeDefined();
      expect(debugData.systemHealth).toBeDefined();

      const parsedFlowData = JSON.parse(flowData);
      expect(parsedFlowData.summary).toBeDefined();
      expect(parsedFlowData.completedFlows).toBeInstanceOf(Array);
      expect(parsedFlowData.completedFlows.length).toBe(1);
    });

    it('should handle high-volume logging efficiently', () => {
      const startTime = Date.now();

      // Create many log entries quickly
      for (let i = 0; i < 100; i++) {
        debugLogger.info('PerformanceTest', `Message ${i}`, { index: i });
        
        if (i % 10 === 0) {
          errorTracker.trackError(new Error(`Error ${i}`), { 
            operation: 'performanceTest', 
            component: 'TestService' 
          });
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second for 100 operations

      // Verify all logs were captured
      const logs = debugLogger.getLogs();
      expect(logs.length).toBe(100);

      const errors = errorTracker.getErrors();
      expect(errors.length).toBe(10);
    });
  });

  afterAll(() => {
    // Clean up after all tests
    debugLogger.clearLogs();
    errorTracker.clearErrors();
    errorTracker.clearBreadcrumbs();
    debugUtils.clearAllDebugData();
    creationFlowLogger.clearFlowData();
  });
});