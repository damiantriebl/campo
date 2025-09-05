/**
 * Comprehensive test suite for all logging systems integration
 * Tests the complete logging infrastructure for product and client creation flows
 */

// Mock AsyncStorage before importing services
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })
  }
}));

import { 
  debugLogger, 
  errorTracker, 
  debugUtils, 
  loggingManager,
  creationFlowLogger,
  logProductCreationFlow,
  logClientCreationFlow
} from '../index';

describe('Comprehensive Logging Integration', () => {
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

  describe('Product Creation Flow Logging', () => {
    const mockEmpresaId = 'test-empresa-123';
    const mockProductData = {
      nombre: 'Test Product',
      ultimoCosto: 100,
      ultimaGanancia: 50,
      colorFondo: '#FF0000',
      posicion: 1,
      activo: true
    };

    it('should log complete product creation flow successfully', async () => {
      // Start flow
      const operationId = logProductCreationFlow.start(mockEmpresaId, mockProductData, 'test-user');
      
      expect(operationId).toBeDefined();
      expect(operationId).toMatch(/^product_flow_/);

      // Log validation step
      logProductCreationFlow.validation(operationId, true, []);
      
      // Log Firestore operation
      logProductCreationFlow.firestore(operationId, 'createProduct', true, { productId: 'new-product-123' });
      
      // Complete flow
      logProductCreationFlow.complete(operationId, true, { productId: 'new-product-123' });

      // Verify flow was logged
      const flow = creationFlowLogger.getFlow(operationId);
      expect(flow).toBeDefined();
      expect(flow?.steps).toHaveLength(4); // flow_started, validation, firestore_createProduct, flow_completed

      // Verify debug logs were created
      const debugLogs = debugLogger.getLogs();
      expect(debugLogs.length).toBeGreaterThan(0);
      
      const productLogs = debugLogs.filter(log => log.context.includes('Product'));
      expect(productLogs.length).toBeGreaterThan(0);

      // Verify breadcrumbs were added
      const breadcrumbs = errorTracker.getBreadcrumbs();
      expect(breadcrumbs.length).toBeGreaterThan(0);
      
      const productBreadcrumbs = breadcrumbs.filter(b => b.includes('Product'));
      expect(productBreadcrumbs.length).toBeGreaterThan(0);
    });

    it('should log product creation flow with validation errors', async () => {
      const operationId = logProductCreationFlow.start(mockEmpresaId, mockProductData);
      
      // Log validation failure
      const validationErrors = ['Nombre es requerido', 'Precio debe ser mayor a 0'];
      logProductCreationFlow.validation(operationId, false, validationErrors);
      
      // Complete flow with failure
      const validationError = new Error(validationErrors.join(', '));
      logProductCreationFlow.complete(operationId, false, undefined, validationError);

      // Verify error was tracked
      const errors = errorTracker.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      
      const validationErrorsTracked = errors.filter(e => e.category === 'validation');
      expect(validationErrorsTracked.length).toBeGreaterThan(0);

      // Verify flow shows failure
      const flow = creationFlowLogger.getFlow(operationId);
      expect(flow).toBeDefined();
      
      const failedSteps = flow?.steps.filter(step => step.status === 'failed');
      expect(failedSteps?.length).toBeGreaterThan(0);
    });

    it('should log product creation flow with Firestore errors', async () => {
      const operationId = logProductCreationFlow.start(mockEmpresaId, mockProductData);
      
      // Log successful validation
      logProductCreationFlow.validation(operationId, true, []);
      
      // Log Firestore failure
      const firestoreError = new Error('Permission denied');
      (firestoreError as any).code = 'permission-denied';
      logProductCreationFlow.firestore(operationId, 'createProduct', false, undefined, firestoreError);
      
      // Complete flow with failure
      logProductCreationFlow.complete(operationId, false, undefined, firestoreError);

      // Verify error was tracked with correct category
      const errors = errorTracker.getErrors();
      const firestoreErrors = errors.filter(e => e.category === 'permission');
      expect(firestoreErrors.length).toBeGreaterThan(0);

      // Verify error details
      const trackedError = firestoreErrors[0];
      expect(trackedError.error.message).toBe('Permission denied');
      expect(trackedError.context.operation).toBe('firestore_createProduct');
    });
  });

  describe('Client Creation Flow Logging', () => {
    const mockEmpresaId = 'test-empresa-456';
    const mockClientData = {
      nombre: 'Test Client',
      direccion: '123 Test St',
      telefono: '555-0123',
      oculto: false,
      notas: 'Test notes',
      fechaImportante: new Date()
    };

    it('should log complete client creation flow successfully', async () => {
      // Start flow
      const operationId = logClientCreationFlow.start(mockEmpresaId, mockClientData, 'test-user');
      
      expect(operationId).toBeDefined();
      expect(operationId).toMatch(/^client_flow_/);

      // Log validation step
      logClientCreationFlow.validation(operationId, true, []);
      
      // Log Firestore operation
      logClientCreationFlow.firestore(operationId, 'createClient', true, { clientId: 'new-client-456' });
      
      // Complete flow
      logClientCreationFlow.complete(operationId, true, { clientId: 'new-client-456' });

      // Verify flow was logged
      const flow = creationFlowLogger.getFlow(operationId);
      expect(flow).toBeDefined();
      expect(flow?.steps).toHaveLength(4); // flow_started, validation, firestore_createClient, flow_completed

      // Verify it's a client flow
      expect('clientData' in flow!).toBe(true);
      if ('clientData' in flow!) {
        expect(flow.clientData.nombre).toBe('Test Client');
      }
    });

    it('should handle client creation with network errors', async () => {
      const operationId = logClientCreationFlow.start(mockEmpresaId, mockClientData);
      
      // Log successful validation
      logClientCreationFlow.validation(operationId, true, []);
      
      // Log network error
      const networkError = new Error('Network timeout');
      (networkError as any).code = 'unavailable';
      logClientCreationFlow.firestore(operationId, 'createClient', false, undefined, networkError);
      
      // Complete flow with failure
      logClientCreationFlow.complete(operationId, false, undefined, networkError);

      // Verify error was categorized correctly
      const errors = errorTracker.getErrors();
      const networkErrors = errors.filter(e => e.category === 'network');
      expect(networkErrors.length).toBeGreaterThan(0);

      // Verify error is marked as retryable
      const trackedError = networkErrors[0];
      expect(trackedError.retryable).toBe(true);
    });
  });

  describe('Cross-System Integration', () => {
    it('should maintain consistent session across all logging systems', async () => {
      const userId = 'test-user-789';
      const empresaId = 'test-empresa-789';
      
      // Initialize session
      debugUtils.initializeSession(userId, empresaId);
      
      // Start both product and client flows
      const productOperationId = logProductCreationFlow.start(empresaId, {
        nombre: 'Integration Test Product'
      }, userId);
      
      const clientOperationId = logClientCreationFlow.start(empresaId, {
        nombre: 'Integration Test Client'
      }, userId);

      // Verify session consistency
      const sessionInfo = debugUtils.getCurrentSession();
      expect(sessionInfo.userId).toBe(userId);
      expect(sessionInfo.empresaId).toBe(empresaId);

      // Verify logs have consistent session info
      const debugLogs = debugLogger.getLogs();
      const sessionLogs = debugLogs.filter(log => log.userId === userId && log.empresaId === empresaId);
      expect(sessionLogs.length).toBeGreaterThan(0);

      // Complete flows
      logProductCreationFlow.complete(productOperationId, true, { productId: 'test-product' });
      logClientCreationFlow.complete(clientOperationId, true, { clientId: 'test-client' });

      // Verify flow summary
      const flowSummary = creationFlowLogger.getFlowSummary();
      expect(flowSummary.totalFlows).toBe(2);
      expect(flowSummary.productFlows).toBe(1);
      expect(flowSummary.clientFlows).toBe(1);
      expect(flowSummary.successfulFlows).toBe(2);
    });

    it('should generate comprehensive system health report', async () => {
      // Create some test activity
      const empresaId = 'health-test-empresa';
      
      // Successful operations
      for (let i = 0; i < 3; i++) {
        const operationId = logProductCreationFlow.start(empresaId, { nombre: `Product ${i}` });
        logProductCreationFlow.validation(operationId, true, []);
        logProductCreationFlow.firestore(operationId, 'createProduct', true, { productId: `product-${i}` });
        logProductCreationFlow.complete(operationId, true, { productId: `product-${i}` });
      }

      // Failed operations
      for (let i = 0; i < 2; i++) {
        const operationId = logClientCreationFlow.start(empresaId, { nombre: `Client ${i}` });
        const error = new Error(`Test error ${i}`);
        logClientCreationFlow.validation(operationId, false, [`Error ${i}`]);
        logClientCreationFlow.complete(operationId, false, undefined, error);
      }

      // Generate health report
      const healthReport = debugUtils.generateSystemHealthReport();
      
      expect(healthReport).toBeDefined();
      expect(healthReport.systemStatus).toMatch(/healthy|warning|critical/);
      expect(healthReport.errorSummary.totalErrors).toBeGreaterThan(0);
      expect(healthReport.performanceMetrics.successRate).toBeLessThan(100);
      expect(healthReport.recommendations).toBeInstanceOf(Array);
      expect(healthReport.recommendations.length).toBeGreaterThan(0);
    });

    it('should export and import comprehensive debug data', async () => {
      // Create test data
      const empresaId = 'export-test-empresa';
      const operationId = logProductCreationFlow.start(empresaId, { nombre: 'Export Test Product' });
      
      // Add some errors
      const testError = new Error('Export test error');
      errorTracker.trackError(testError, { operation: 'test', component: 'ExportTest' });
      
      logProductCreationFlow.complete(operationId, true, { productId: 'export-test-product' });

      // Export all data
      const exportedData = debugUtils.exportDebugData();
      expect(exportedData).toBeDefined();
      expect(exportedData.session).toBeDefined();
      expect(exportedData.debugLogs).toBeDefined();
      expect(exportedData.errorReport).toBeDefined();
      expect(exportedData.systemHealth).toBeDefined();

      // Verify exported data structure
      expect(exportedData.session.sessionId).toBeDefined();
      expect(exportedData.systemHealth.systemStatus).toMatch(/healthy|warning|critical/);
      
      // Verify flow data can be exported
      const flowData = creationFlowLogger.exportFlowData();
      const parsedFlowData = JSON.parse(flowData);
      expect(parsedFlowData.summary).toBeDefined();
      expect(parsedFlowData.completedFlows).toBeInstanceOf(Array);
    });

    it('should handle high-volume logging without performance degradation', async () => {
      const startTime = Date.now();
      const empresaId = 'performance-test-empresa';
      
      // Create many operations quickly
      const operations: string[] = [];
      for (let i = 0; i < 50; i++) {
        const operationId = logProductCreationFlow.start(empresaId, { nombre: `Perf Test Product ${i}` });
        operations.push(operationId);
        
        logProductCreationFlow.validation(operationId, true, []);
        logProductCreationFlow.firestore(operationId, 'createProduct', true, { productId: `perf-product-${i}` });
        logProductCreationFlow.complete(operationId, true, { productId: `perf-product-${i}` });
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 50 operations
      
      // Verify all operations were logged
      const flowSummary = creationFlowLogger.getFlowSummary();
      expect(flowSummary.totalFlows).toBe(50);
      expect(flowSummary.successfulFlows).toBe(50);
      
      // Verify logging systems are still responsive
      const debugSummary = debugUtils.getDebugSummary();
      expect(debugSummary.totalOperations).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Error Analysis and Reporting', () => {
    it('should identify error patterns across multiple flows', async () => {
      const empresaId = 'pattern-test-empresa';
      
      // Create multiple flows with the same error pattern
      const commonError = 'Validation failed: nombre is required';
      
      for (let i = 0; i < 5; i++) {
        const operationId = logProductCreationFlow.start(empresaId, { nombre: '' });
        const error = new Error(commonError);
        logProductCreationFlow.validation(operationId, false, [commonError]);
        logProductCreationFlow.complete(operationId, false, undefined, error);
      }

      // Analyze error patterns
      const errorSummary = errorTracker.getErrorSummary();
      expect(errorSummary.topErrors.length).toBeGreaterThan(0);
      
      const topError = errorSummary.topErrors[0];
      expect(topError.count).toBe(5);
      expect(topError.message).toBe(commonError);
    });

    it('should provide actionable recommendations based on error patterns', async () => {
      const empresaId = 'recommendation-test-empresa';
      
      // Create flows with different error types
      const errors = [
        { message: 'Network timeout', code: 'unavailable' },
        { message: 'Permission denied', code: 'permission-denied' },
        { message: 'Validation failed', code: 'validation-error' }
      ];

      for (const errorInfo of errors) {
        const operationId = logProductCreationFlow.start(empresaId, { nombre: 'Test Product' });
        const error = new Error(errorInfo.message);
        (error as any).code = errorInfo.code;
        
        errorTracker.trackError(error, { 
          operation: 'test', 
          component: 'RecommendationTest' 
        });
        
        logProductCreationFlow.complete(operationId, false, undefined, error);
      }

      // Generate health report with recommendations
      const healthReport = debugUtils.generateSystemHealthReport();
      expect(healthReport.recommendations).toBeInstanceOf(Array);
      expect(healthReport.recommendations.length).toBeGreaterThan(0);
      
      // Should have specific recommendations for different error types
      const recommendations = healthReport.recommendations.join(' ');
      expect(recommendations.length).toBeGreaterThan(0);
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