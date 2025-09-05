/**
 * Comprehensive logging service specifically for product and client creation flows
 * Integrates all logging systems and provides structured logging for debugging
 */

import { debugLogger, logProductCreation, logClientCreation } from './DebugLogger';
import { errorTracker, trackProductError, trackClientError } from './ErrorTracker';
import { debugUtils, debugProduct, debugClient } from './DebugUtils';
import { loggingManager } from './LoggingConfig';

export interface CreationFlowContext {
  empresaId: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  timestamp: string;
}

export interface ProductCreationFlow {
  operationId: string;
  context: CreationFlowContext;
  productData: {
    nombre: string;
    hasUltimoCosto: boolean;
    hasUltimaGanancia: boolean;
    colorFondo?: string;
    posicion?: number;
    activo?: boolean;
  };
  startTime: number;
  steps: Array<{
    step: string;
    status: 'started' | 'completed' | 'failed';
    timestamp: string;
    duration?: number;
    error?: string;
    data?: any;
  }>;
}

export interface ClientCreationFlow {
  operationId: string;
  context: CreationFlowContext;
  clientData: {
    nombre: string;
    direccion?: string;
    telefono?: string;
    hasNotas: boolean;
    hasFechaImportante: boolean;
    oculto?: boolean;
  };
  startTime: number;
  steps: Array<{
    step: string;
    status: 'started' | 'completed' | 'failed';
    timestamp: string;
    duration?: number;
    error?: string;
    data?: any;
  }>;
}

export interface CreationFlowSummary {
  totalFlows: number;
  productFlows: number;
  clientFlows: number;
  successfulFlows: number;
  failedFlows: number;
  averageDuration: number;
  commonErrors: Array<{
    error: string;
    count: number;
    flowType: 'product' | 'client';
  }>;
  performanceMetrics: {
    fastestFlow: { type: string; duration: number };
    slowestFlow: { type: string; duration: number };
    averageStepDuration: Record<string, number>;
  };
}

class CreationFlowLogger {
  private activeFlows: Map<string, ProductCreationFlow | ClientCreationFlow> = new Map();
  private completedFlows: Array<ProductCreationFlow | ClientCreationFlow> = [];
  private maxCompletedFlows: number = 100;

  constructor() {
    // Initialize logging systems
    debugUtils.initializeSession();
    debugLogger.info('CreationFlowLogger', 'Creation flow logger initialized');
  }

  /**
   * Start logging a product creation flow
   */
  startProductCreation(
    empresaId: string,
    productData: any,
    userId?: string
  ): string {
    const operationId = this.generateOperationId('product');
    const startTime = Date.now();
    
    const context: CreationFlowContext = {
      empresaId,
      userId,
      sessionId: debugUtils.getCurrentSession().sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString()
    };

    const flow: ProductCreationFlow = {
      operationId,
      context,
      productData: {
        nombre: productData.nombre,
        hasUltimoCosto: productData.ultimoCosto !== undefined,
        hasUltimaGanancia: productData.ultimaGanancia !== undefined,
        colorFondo: productData.colorFondo,
        posicion: productData.posicion,
        activo: productData.activo
      },
      startTime,
      steps: []
    };

    this.activeFlows.set(operationId, flow);

    // Log in all systems
    debugLogger.info('CreationFlowLogger', 'Product creation flow started', {
      operationId,
      empresaId,
      productName: productData.nombre
    });

    logProductCreation.start(empresaId, productData);
    
    errorTracker.addBreadcrumb('Product creation flow started', {
      operationId,
      empresaId,
      productName: productData.nombre
    });

    const debugOperationId = debugProduct.start(empresaId, productData);
    
    // Store debug operation ID for later use
    flow.steps.push({
      step: 'flow_started',
      status: 'completed',
      timestamp: new Date().toISOString(),
      data: { debugOperationId }
    });

    console.log(`[CreationFlowLogger] Product creation flow started: ${operationId}`, {
      empresaId,
      productName: productData.nombre,
      operationId
    });

    return operationId;
  }

  /**
   * Start logging a client creation flow
   */
  startClientCreation(
    empresaId: string,
    clientData: any,
    userId?: string
  ): string {
    const operationId = this.generateOperationId('client');
    const startTime = Date.now();
    
    const context: CreationFlowContext = {
      empresaId,
      userId,
      sessionId: debugUtils.getCurrentSession().sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString()
    };

    const flow: ClientCreationFlow = {
      operationId,
      context,
      clientData: {
        nombre: clientData.nombre,
        direccion: clientData.direccion,
        telefono: clientData.telefono,
        hasNotas: !!clientData.notas,
        hasFechaImportante: !!clientData.fechaImportante,
        oculto: clientData.oculto
      },
      startTime,
      steps: []
    };

    this.activeFlows.set(operationId, flow);

    // Log in all systems
    debugLogger.info('CreationFlowLogger', 'Client creation flow started', {
      operationId,
      empresaId,
      clientName: clientData.nombre
    });

    logClientCreation.start(empresaId, clientData);
    
    errorTracker.addBreadcrumb('Client creation flow started', {
      operationId,
      empresaId,
      clientName: clientData.nombre
    });

    const debugOperationId = debugClient.start(empresaId, clientData);
    
    // Store debug operation ID for later use
    flow.steps.push({
      step: 'flow_started',
      status: 'completed',
      timestamp: new Date().toISOString(),
      data: { debugOperationId }
    });

    console.log(`[CreationFlowLogger] Client creation flow started: ${operationId}`, {
      empresaId,
      clientName: clientData.nombre,
      operationId
    });

    return operationId;
  }

  /**
   * Log a step in the creation flow
   */
  logStep(
    operationId: string,
    step: string,
    status: 'started' | 'completed' | 'failed',
    data?: any,
    error?: Error
  ): void {
    const flow = this.activeFlows.get(operationId);
    if (!flow) {
      console.warn(`[CreationFlowLogger] Flow not found: ${operationId}`);
      return;
    }

    const timestamp = new Date().toISOString();
    const stepInfo = {
      step,
      status,
      timestamp,
      data,
      error: error?.message
    };

    // Calculate duration if this is a completion of a previously started step
    const previousStep = flow.steps.find(s => s.step === step && s.status === 'started');
    if (previousStep && status !== 'started') {
      stepInfo.duration = Date.now() - new Date(previousStep.timestamp).getTime();
    }

    flow.steps.push(stepInfo);

    // Log to appropriate systems
    const flowType = this.isProductFlow(flow) ? 'product' : 'client';
    const entityName = this.isProductFlow(flow) ? flow.productData.nombre : flow.clientData.nombre;

    if (status === 'failed' && error) {
      debugLogger.error('CreationFlowLogger', `${flowType} creation step failed: ${step}`, {
        operationId,
        step,
        entityName,
        duration: stepInfo.duration
      }, error);

      if (flowType === 'product') {
        trackProductError(error, step, {
          operationId,
          empresaId: flow.context.empresaId,
          productName: entityName,
          step
        });
      } else {
        trackClientError(error, step, {
          operationId,
          empresaId: flow.context.empresaId,
          clientName: entityName,
          step
        });
      }

      errorTracker.addBreadcrumb(`${flowType} creation step failed: ${step}`, {
        operationId,
        error: error.message
      });
    } else {
      const logLevel = status === 'failed' ? 'error' : 'info';
      debugLogger[logLevel]('CreationFlowLogger', `${flowType} creation step ${status}: ${step}`, {
        operationId,
        step,
        entityName,
        duration: stepInfo.duration,
        data
      });

      errorTracker.addBreadcrumb(`${flowType} creation step ${status}: ${step}`, {
        operationId,
        duration: stepInfo.duration
      });
    }

    console.log(`[CreationFlowLogger] Step logged: ${operationId} - ${step} (${status})`, {
      operationId,
      step,
      status,
      duration: stepInfo.duration,
      entityName
    });
  }

  /**
   * Complete a creation flow
   */
  completeFlow(
    operationId: string,
    success: boolean,
    result?: any,
    error?: Error
  ): void {
    const flow = this.activeFlows.get(operationId);
    if (!flow) {
      console.warn(`[CreationFlowLogger] Flow not found for completion: ${operationId}`);
      return;
    }

    const endTime = Date.now();
    const totalDuration = endTime - flow.startTime;
    const flowType = this.isProductFlow(flow) ? 'product' : 'client';
    const entityName = this.isProductFlow(flow) ? flow.productData.nombre : flow.clientData.nombre;

    // Add completion step
    flow.steps.push({
      step: 'flow_completed',
      status: success ? 'completed' : 'failed',
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      data: result,
      error: error?.message
    });

    // Log completion in all systems
    if (success) {
      debugLogger.info('CreationFlowLogger', `${flowType} creation flow completed successfully`, {
        operationId,
        entityName,
        totalDuration,
        stepCount: flow.steps.length,
        result
      });

      if (flowType === 'product') {
        logProductCreation.complete(true, result?.productId || result);
        const debugOperationId = flow.steps[0]?.data?.debugOperationId;
        if (debugOperationId) {
          debugProduct.complete(debugOperationId, true, result?.productId || result);
        }
      } else {
        logClientCreation.complete(true, result?.clientId || result);
        const debugOperationId = flow.steps[0]?.data?.debugOperationId;
        if (debugOperationId) {
          debugClient.complete(debugOperationId, true, result?.clientId || result);
        }
      }

      errorTracker.addBreadcrumb(`${flowType} creation completed successfully`, {
        operationId,
        totalDuration,
        result: result?.id || result
      });
    } else {
      debugLogger.error('CreationFlowLogger', `${flowType} creation flow failed`, {
        operationId,
        entityName,
        totalDuration,
        stepCount: flow.steps.length,
        errorMessage: error?.message
      }, error);

      if (flowType === 'product') {
        logProductCreation.complete(false, undefined, error);
        trackProductError(error || new Error('Flow failed'), 'flowCompletion', {
          operationId,
          empresaId: flow.context.empresaId,
          productName: entityName,
          totalDuration
        });
        const debugOperationId = flow.steps[0]?.data?.debugOperationId;
        if (debugOperationId) {
          debugProduct.complete(debugOperationId, false, undefined, error);
        }
      } else {
        logClientCreation.complete(false, undefined, error);
        trackClientError(error || new Error('Flow failed'), 'flowCompletion', {
          operationId,
          empresaId: flow.context.empresaId,
          clientName: entityName,
          totalDuration
        });
        const debugOperationId = flow.steps[0]?.data?.debugOperationId;
        if (debugOperationId) {
          debugClient.complete(debugOperationId, false, undefined, error);
        }
      }

      errorTracker.addBreadcrumb(`${flowType} creation failed`, {
        operationId,
        totalDuration,
        error: error?.message
      });
    }

    // Move to completed flows
    this.activeFlows.delete(operationId);
    this.completedFlows.push(flow);

    // Maintain max completed flows limit
    if (this.completedFlows.length > this.maxCompletedFlows) {
      this.completedFlows = this.completedFlows.slice(-this.maxCompletedFlows);
    }

    console.log(`[CreationFlowLogger] Flow completed: ${operationId} (${success ? 'success' : 'failed'})`, {
      operationId,
      success,
      totalDuration,
      stepCount: flow.steps.length,
      entityName
    });
  }

  /**
   * Log validation results
   */
  logValidation(
    operationId: string,
    isValid: boolean,
    errors: string[],
    data?: any
  ): void {
    this.logStep(operationId, 'validation', isValid ? 'completed' : 'failed', {
      isValid,
      errors,
      data
    }, isValid ? undefined : new Error(errors.join(', ')));

    // Also log to validation-specific loggers
    const flow = this.activeFlows.get(operationId);
    if (flow) {
      const flowType = this.isProductFlow(flow) ? 'product' : 'client';
      debugUtils.logValidation(`${flowType}Creation`, isValid, errors, data);
    }
  }

  /**
   * Log Firestore operations
   */
  logFirestoreOperation(
    operationId: string,
    operation: string,
    success: boolean,
    data?: any,
    error?: Error
  ): void {
    this.logStep(operationId, `firestore_${operation}`, success ? 'completed' : 'failed', data, error);

    // Also log to Firestore-specific loggers
    const flow = this.activeFlows.get(operationId);
    if (flow) {
      const flowType = this.isProductFlow(flow) ? 'product' : 'client';
      debugUtils.logFirestoreOperation(`${flowType}Creation`, operation, success, data, error);
      
      if (flowType === 'product') {
        debugProduct.firestore(operation, success, data, error);
      } else {
        debugClient.firestore(operation, success, data, error);
      }
    }
  }

  /**
   * Get active flows
   */
  getActiveFlows(): Array<ProductCreationFlow | ClientCreationFlow> {
    return Array.from(this.activeFlows.values());
  }

  /**
   * Get completed flows
   */
  getCompletedFlows(): Array<ProductCreationFlow | ClientCreationFlow> {
    return [...this.completedFlows];
  }

  /**
   * Get flow by operation ID
   */
  getFlow(operationId: string): ProductCreationFlow | ClientCreationFlow | undefined {
    return this.activeFlows.get(operationId) || 
           this.completedFlows.find(flow => flow.operationId === operationId);
  }

  /**
   * Generate comprehensive flow summary
   */
  getFlowSummary(): CreationFlowSummary {
    const allFlows = [...this.activeFlows.values(), ...this.completedFlows];
    
    const productFlows = allFlows.filter(flow => this.isProductFlow(flow));
    const clientFlows = allFlows.filter(flow => !this.isProductFlow(flow));
    
    const completedFlows = allFlows.filter(flow => 
      flow.steps.some(step => step.step === 'flow_completed' && step.status === 'completed')
    );
    
    const failedFlows = allFlows.filter(flow => 
      flow.steps.some(step => step.step === 'flow_completed' && step.status === 'failed')
    );

    // Calculate average duration
    const flowsWithDuration = allFlows.filter(flow => {
      const completionStep = flow.steps.find(step => step.step === 'flow_completed');
      return completionStep && completionStep.duration;
    });
    
    const averageDuration = flowsWithDuration.length > 0 ?
      flowsWithDuration.reduce((sum, flow) => {
        const completionStep = flow.steps.find(step => step.step === 'flow_completed');
        return sum + (completionStep?.duration || 0);
      }, 0) / flowsWithDuration.length : 0;

    // Find common errors
    const errorCounts: Record<string, { count: number; flowType: 'product' | 'client' }> = {};
    allFlows.forEach(flow => {
      const flowType = this.isProductFlow(flow) ? 'product' : 'client';
      flow.steps.forEach(step => {
        if (step.status === 'failed' && step.error) {
          const key = step.error;
          if (!errorCounts[key]) {
            errorCounts[key] = { count: 0, flowType };
          }
          errorCounts[key].count++;
        }
      });
    });

    const commonErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([error, data]) => ({
        error,
        count: data.count,
        flowType: data.flowType
      }));

    // Performance metrics
    const durations = flowsWithDuration.map(flow => {
      const completionStep = flow.steps.find(step => step.step === 'flow_completed');
      return {
        type: this.isProductFlow(flow) ? 'product' : 'client',
        duration: completionStep?.duration || 0
      };
    });

    const fastestFlow = durations.reduce((fastest, current) => 
      current.duration < fastest.duration ? current : fastest, 
      { type: 'none', duration: Infinity }
    );

    const slowestFlow = durations.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest, 
      { type: 'none', duration: 0 }
    );

    // Average step durations
    const stepDurations: Record<string, number[]> = {};
    allFlows.forEach(flow => {
      flow.steps.forEach(step => {
        if (step.duration) {
          if (!stepDurations[step.step]) {
            stepDurations[step.step] = [];
          }
          stepDurations[step.step].push(step.duration);
        }
      });
    });

    const averageStepDuration: Record<string, number> = {};
    Object.entries(stepDurations).forEach(([step, durations]) => {
      averageStepDuration[step] = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    });

    return {
      totalFlows: allFlows.length,
      productFlows: productFlows.length,
      clientFlows: clientFlows.length,
      successfulFlows: completedFlows.length,
      failedFlows: failedFlows.length,
      averageDuration: Math.round(averageDuration),
      commonErrors,
      performanceMetrics: {
        fastestFlow: fastestFlow.duration === Infinity ? { type: 'none', duration: 0 } : fastestFlow,
        slowestFlow,
        averageStepDuration
      }
    };
  }

  /**
   * Export flow data for analysis
   */
  exportFlowData(): string {
    const summary = this.getFlowSummary();
    const activeFlows = this.getActiveFlows();
    const completedFlows = this.getCompletedFlows();

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary,
      activeFlows,
      completedFlows
    }, null, 2);
  }

  /**
   * Clear all flow data
   */
  clearFlowData(): void {
    const activeCount = this.activeFlows.size;
    const completedCount = this.completedFlows.length;
    
    this.activeFlows.clear();
    this.completedFlows = [];
    
    debugLogger.info('CreationFlowLogger', 'All flow data cleared', {
      clearedActiveFlows: activeCount,
      clearedCompletedFlows: completedCount
    });
    
    console.log(`[CreationFlowLogger] Cleared ${activeCount} active flows and ${completedCount} completed flows`);
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(type: 'product' | 'client'): string {
    return `${type}_flow_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Check if flow is a product flow
   */
  private isProductFlow(flow: ProductCreationFlow | ClientCreationFlow): flow is ProductCreationFlow {
    return 'productData' in flow;
  }
}

// Global instance
export const creationFlowLogger = new CreationFlowLogger();

// Helper functions for easy integration
export const logProductCreationFlow = {
  start: (empresaId: string, productData: any, userId?: string) => 
    creationFlowLogger.startProductCreation(empresaId, productData, userId),
  
  step: (operationId: string, step: string, status: 'started' | 'completed' | 'failed', data?: any, error?: Error) =>
    creationFlowLogger.logStep(operationId, step, status, data, error),
  
  validation: (operationId: string, isValid: boolean, errors: string[], data?: any) =>
    creationFlowLogger.logValidation(operationId, isValid, errors, data),
  
  firestore: (operationId: string, operation: string, success: boolean, data?: any, error?: Error) =>
    creationFlowLogger.logFirestoreOperation(operationId, operation, success, data, error),
  
  complete: (operationId: string, success: boolean, result?: any, error?: Error) =>
    creationFlowLogger.completeFlow(operationId, success, result, error)
};

export const logClientCreationFlow = {
  start: (empresaId: string, clientData: any, userId?: string) => 
    creationFlowLogger.startClientCreation(empresaId, clientData, userId),
  
  step: (operationId: string, step: string, status: 'started' | 'completed' | 'failed', data?: any, error?: Error) =>
    creationFlowLogger.logStep(operationId, step, status, data, error),
  
  validation: (operationId: string, isValid: boolean, errors: string[], data?: any) =>
    creationFlowLogger.logValidation(operationId, isValid, errors, data),
  
  firestore: (operationId: string, operation: string, success: boolean, data?: any, error?: Error) =>
    creationFlowLogger.logFirestoreOperation(operationId, operation, success, data, error),
  
  complete: (operationId: string, success: boolean, result?: any, error?: Error) =>
    creationFlowLogger.completeFlow(operationId, success, result, error)
};

export default CreationFlowLogger;