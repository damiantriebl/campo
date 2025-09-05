import { ServiceError, ErrorType, RetryConfig, ServiceResponse } from '@/schemas/types';

/**
 * Enhanced error handling service for consistent error management across services
 */
export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Classify error type based on error characteristics
   */
  classifyError(error: any): ErrorType {
    if (!error) return 'unknown';

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorCode.includes('unavailable') ||
      errorCode.includes('deadline-exceeded')
    ) {
      return 'network';
    }

    // Permission errors
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('unauthorized') ||
      errorCode.includes('permission-denied') ||
      errorCode.includes('unauthenticated')
    ) {
      return 'permission';
    }

    // Firestore specific errors
    if (
      errorCode.includes('firestore') ||
      errorCode.includes('not-found') ||
      errorCode.includes('already-exists') ||
      errorCode.includes('failed-precondition') ||
      errorCode.includes('resource-exhausted')
    ) {
      return 'firestore';
    }

    // Validation errors (usually thrown by our validation functions)
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return 'validation';
    }

    return 'unknown';
  }

  /**
   * Determine if an error is retryable
   */
  isRetryable(errorType: ErrorType, error: any): boolean {
    switch (errorType) {
      case 'network':
        return true;
      case 'firestore':
        // Some Firestore errors are retryable
        const code = error.code || '';
        return code.includes('unavailable') || 
               code.includes('deadline-exceeded') || 
               code.includes('resource-exhausted');
      case 'permission':
      case 'validation':
        return false;
      case 'unknown':
        // Be conservative with unknown errors
        return false;
      default:
        return false;
    }
  }

  /**
   * Create a standardized service error
   */
  createServiceError(error: any, context?: string): ServiceError {
    const errorType = this.classifyError(error);
    const retryable = this.isRetryable(errorType, error);
    
    let message = 'Ha ocurrido un error inesperado';
    
    switch (errorType) {
      case 'network':
        message = 'Error de conexión. Verifica tu conexión a internet';
        break;
      case 'permission':
        message = 'No tienes permisos para realizar esta acción';
        break;
      case 'firestore':
        message = 'Error en la base de datos. Intenta nuevamente';
        break;
      case 'validation':
        message = error.message || 'Los datos proporcionados no son válidos';
        break;
      case 'unknown':
        message = context ? `Error en ${context}` : 'Ha ocurrido un error inesperado';
        break;
    }

    return {
      type: errorType,
      message,
      originalError: error instanceof Error ? error : new Error(String(error)),
      retryable,
      code: error.code
    };
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<ServiceResponse<T>> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: any;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if it wasn't the first attempt
        if (attempt > 1) {
          console.log(`${context}: Successful retry on attempt ${attempt}`);
        }
        
        return { success: true, data: result };
      } catch (error) {
        lastError = error;
        const serviceError = this.createServiceError(error, context);
        
        // Log the error with context
        console.error(`${context}: Attempt ${attempt} failed:`, {
          error: serviceError,
          originalError: error
        });

        // If it's the last attempt or error is not retryable, don't retry
        if (attempt === config.maxAttempts || !serviceError.retryable) {
          return { success: false, error: serviceError };
        }

        // Calculate delay for next attempt
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        console.log(`${context}: Retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxAttempts})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but just in case
    return { 
      success: false, 
      error: this.createServiceError(lastError, context) 
    };
  }

  /**
   * Log error with structured information
   */
  logError(context: string, error: any, additionalInfo?: Record<string, any>): void {
    const serviceError = this.createServiceError(error, context);
    
    console.error(`[${context}] Error occurred:`, {
      serviceError,
      additionalInfo,
      timestamp: new Date().toISOString(),
      stack: error?.stack
    });
  }

  /**
   * Create a failed service response
   */
  createFailureResponse<T>(error: any, context?: string): ServiceResponse<T> {
    const serviceError = this.createServiceError(error, context);
    return {
      success: false,
      error: serviceError,
      errors: [serviceError.message] // For backward compatibility
    };
  }

  /**
   * Create a successful service response
   */
  createSuccessResponse<T>(data: T): ServiceResponse<T> {
    return {
      success: true,
      data
    };
  }
}

export default ErrorHandlingService;