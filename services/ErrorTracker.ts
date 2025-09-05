/**
 * Error tracking utility for better problem identification
 * Provides advanced error analysis and tracking capabilities
 */

import { debugLogger } from './DebugLogger';

export interface ErrorContext {
    operation: string;
    component: string;
    userId?: string;
    empresaId?: string;
    userAgent?: string;
    url?: string;
    timestamp: string;
    sessionId: string;
}

export interface TrackedError {
    id: string;
    error: Error;
    context: ErrorContext;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'validation' | 'network' | 'firestore' | 'permission' | 'unknown';
    retryable: boolean;
    resolved: boolean;
    occurrenceCount: number;
    firstOccurrence: string;
    lastOccurrence: string;
    stackTrace?: string;
    breadcrumbs: string[];
    tags: string[];
}

export interface ErrorSummary {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    topErrors: Array<{ message: string; count: number; category: string }>;
    recentErrors: TrackedError[];
    errorTrends: Array<{ date: string; count: number }>;
}

export interface ErrorFilter {
    category?: string[];
    severity?: string[];
    component?: string[];
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    empresaId?: string;
}

class ErrorTracker {
    private errors: Map<string, TrackedError> = new Map();
    private breadcrumbs: string[] = [];
    private maxBreadcrumbs: number = 50;
    private maxErrors: number = 1000;
    private sessionId: string;

    constructor() {
        this.sessionId = this.generateSessionId();
        this.addBreadcrumb('ErrorTracker initialized');
    }

    private generateSessionId(): string {
        return `error_session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    private generateErrorId(error: Error, context: ErrorContext): string {
        // Create a unique ID based on error message, stack trace, and context
        const key = `${error.name}_${error.message}_${context.operation}_${context.component}`;
        return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }

    /**
     * Add a breadcrumb for tracking user actions leading to errors
     */
    addBreadcrumb(message: string, data?: any): void {
        const breadcrumb = `[${new Date().toISOString()}] ${message}${data ? ` - ${JSON.stringify(data)}` : ''}`;
        this.breadcrumbs.push(breadcrumb);

        // Maintain max breadcrumbs limit
        if (this.breadcrumbs.length > this.maxBreadcrumbs) {
            this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
        }

        debugLogger.debug('ErrorTracker', 'Breadcrumb added', { message, data });
    }

    /**
     * Track an error with context and analysis
     */
    trackError(
        error: Error,
        context: Partial<ErrorContext>,
        options?: {
            severity?: TrackedError['severity'];
            tags?: string[];
            additionalData?: any;
        }
    ): string {
        const fullContext: ErrorContext = {
            operation: context.operation || 'unknown',
            component: context.component || 'unknown',
            userId: context.userId,
            empresaId: context.empresaId,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            url: typeof window !== 'undefined' && window.location ? window.location.href : undefined,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId
        };

        const errorId = this.generateErrorId(error, fullContext);
        const category = this.categorizeError(error);
        const severity = options?.severity || this.determineSeverity(error, category);
        const retryable = this.isRetryable(error, category);

        let trackedError = this.errors.get(errorId);

        if (trackedError) {
            // Update existing error
            trackedError.occurrenceCount++;
            trackedError.lastOccurrence = fullContext.timestamp;
            trackedError.breadcrumbs = [...this.breadcrumbs];

            // Update tags if provided
            if (options?.tags) {
                trackedError.tags = [...new Set([...trackedError.tags, ...options.tags])];
            }
        } else {
            // Create new tracked error
            trackedError = {
                id: errorId,
                error,
                context: fullContext,
                severity,
                category,
                retryable,
                resolved: false,
                occurrenceCount: 1,
                firstOccurrence: fullContext.timestamp,
                lastOccurrence: fullContext.timestamp,
                stackTrace: error.stack,
                breadcrumbs: [...this.breadcrumbs],
                tags: options?.tags || []
            };

            this.errors.set(errorId, trackedError);
        }

        // Log to debug logger
        debugLogger.error(
            `ErrorTracker.${fullContext.component}`,
            `Error tracked: ${error.message}`,
            {
                errorId,
                category,
                severity,
                retryable,
                occurrenceCount: trackedError.occurrenceCount,
                context: fullContext,
                additionalData: options?.additionalData
            },
            error
        );

        // Maintain max errors limit
        if (this.errors.size > this.maxErrors) {
            const oldestError = Array.from(this.errors.values())
                .sort((a, b) => new Date(a.firstOccurrence).getTime() - new Date(b.firstOccurrence).getTime())[0];
            this.errors.delete(oldestError.id);
        }

        // Add breadcrumb for this error
        this.addBreadcrumb(`Error: ${error.message}`, {
            errorId,
            category,
            severity,
            operation: fullContext.operation
        });

        return errorId;
    }

    /**
     * Categorize error based on its characteristics
     */
    private categorizeError(error: Error): TrackedError['category'] {
        const message = error.message.toLowerCase();
        const code = (error as any).code || '';

        // Validation errors
        if (
            message.includes('validation') ||
            message.includes('invalid') ||
            message.includes('required') ||
            message.includes('formato') ||
            error.name === 'ValidationError'
        ) {
            return 'validation';
        }

        // Network errors
        if (
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('connection') ||
            message.includes('fetch') ||
            code.includes('unavailable') ||
            code.includes('deadline-exceeded')
        ) {
            return 'network';
        }

        // Permission errors
        if (
            message.includes('permission') ||
            message.includes('unauthorized') ||
            message.includes('forbidden') ||
            code.includes('permission-denied') ||
            code.includes('unauthenticated')
        ) {
            return 'permission';
        }

        // Firestore errors
        if (
            message.includes('firestore') ||
            message.includes('firebase') ||
            code.includes('firestore') ||
            code.includes('not-found') ||
            code.includes('already-exists') ||
            code.includes('failed-precondition') ||
            code.includes('resource-exhausted')
        ) {
            return 'firestore';
        }

        return 'unknown';
    }

    /**
     * Determine error severity
     */
    private determineSeverity(error: Error, category: TrackedError['category']): TrackedError['severity'] {
        const message = error.message.toLowerCase();
        const code = (error as any).code || '';

        // Critical errors
        if (
            message.includes('fatal') ||
            message.includes('crash') ||
            code.includes('internal') ||
            category === 'permission' && message.includes('denied')
        ) {
            return 'critical';
        }

        // High severity errors
        if (
            category === 'firestore' ||
            message.includes('failed to create') ||
            message.includes('failed to save') ||
            message.includes('data loss')
        ) {
            return 'high';
        }

        // Medium severity errors
        if (
            category === 'network' ||
            message.includes('retry') ||
            message.includes('timeout')
        ) {
            return 'medium';
        }

        // Low severity (validation, user input errors)
        return 'low';
    }

    /**
     * Determine if error is retryable
     */
    private isRetryable(error: Error, category: TrackedError['category']): boolean {
        const code = (error as any).code || '';

        switch (category) {
            case 'network':
                return true;
            case 'firestore':
                return code.includes('unavailable') ||
                    code.includes('deadline-exceeded') ||
                    code.includes('resource-exhausted');
            case 'validation':
            case 'permission':
                return false;
            case 'unknown':
                return false;
            default:
                return false;
        }
    }

    /**
     * Mark an error as resolved
     */
    resolveError(errorId: string, resolution?: string): boolean {
        const error = this.errors.get(errorId);
        if (error) {
            error.resolved = true;
            if (resolution) {
                error.tags.push(`resolved:${resolution}`);
            }

            debugLogger.info('ErrorTracker', 'Error marked as resolved', {
                errorId,
                resolution,
                errorMessage: error.error.message
            });

            return true;
        }
        return false;
    }

    /**
     * Get error by ID
     */
    getError(errorId: string): TrackedError | undefined {
        return this.errors.get(errorId);
    }

    /**
     * Get filtered errors
     */
    getErrors(filter?: ErrorFilter): TrackedError[] {
        let errors = Array.from(this.errors.values());

        if (filter) {
            if (filter.category && filter.category.length > 0) {
                errors = errors.filter(error => filter.category!.includes(error.category));
            }

            if (filter.severity && filter.severity.length > 0) {
                errors = errors.filter(error => filter.severity!.includes(error.severity));
            }

            if (filter.component && filter.component.length > 0) {
                errors = errors.filter(error =>
                    filter.component!.some(comp => error.context.component.includes(comp))
                );
            }

            if (filter.resolved !== undefined) {
                errors = errors.filter(error => error.resolved === filter.resolved);
            }

            if (filter.startDate) {
                errors = errors.filter(error =>
                    new Date(error.firstOccurrence) >= filter.startDate!
                );
            }

            if (filter.endDate) {
                errors = errors.filter(error =>
                    new Date(error.lastOccurrence) <= filter.endDate!
                );
            }

            if (filter.userId) {
                errors = errors.filter(error => error.context.userId === filter.userId);
            }

            if (filter.empresaId) {
                errors = errors.filter(error => error.context.empresaId === filter.empresaId);
            }
        }

        return errors.sort((a, b) =>
            new Date(b.lastOccurrence).getTime() - new Date(a.lastOccurrence).getTime()
        );
    }

    /**
     * Get error summary and statistics
     */
    getErrorSummary(filter?: ErrorFilter): ErrorSummary {
        const errors = this.getErrors(filter);

        const errorsByCategory: Record<string, number> = {};
        const errorsBySeverity: Record<string, number> = {};
        const errorCounts: Record<string, { count: number; category: string }> = {};

        errors.forEach(error => {
            // Count by category
            errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + error.occurrenceCount;

            // Count by severity
            errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + error.occurrenceCount;

            // Count by message for top errors
            const key = error.error.message;
            if (!errorCounts[key]) {
                errorCounts[key] = { count: 0, category: error.category };
            }
            errorCounts[key].count += error.occurrenceCount;
        });

        const topErrors = Object.entries(errorCounts)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 10)
            .map(([message, data]) => ({
                message,
                count: data.count,
                category: data.category
            }));

        // Generate error trends (last 7 days)
        const errorTrends: Array<{ date: string; count: number }> = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayErrors = errors.filter(error => {
                const errorDate = new Date(error.lastOccurrence).toISOString().split('T')[0];
                return errorDate === dateStr;
            });

            const dayCount = dayErrors.reduce((sum, error) => sum + error.occurrenceCount, 0);
            errorTrends.push({ date: dateStr, count: dayCount });
        }

        return {
            totalErrors: errors.reduce((sum, error) => sum + error.occurrenceCount, 0),
            errorsByCategory,
            errorsBySeverity,
            topErrors,
            recentErrors: errors.slice(0, 10),
            errorTrends
        };
    }

    /**
     * Get breadcrumbs leading to errors
     */
    getBreadcrumbs(): string[] {
        return [...this.breadcrumbs];
    }

    /**
     * Clear all tracked errors
     */
    clearErrors(): void {
        const errorCount = this.errors.size;
        this.errors.clear();
        debugLogger.info('ErrorTracker', 'All errors cleared', { clearedCount: errorCount });
    }

    /**
     * Clear breadcrumbs
     */
    clearBreadcrumbs(): void {
        const breadcrumbCount = this.breadcrumbs.length;
        this.breadcrumbs = [];
        debugLogger.info('ErrorTracker', 'Breadcrumbs cleared', { clearedCount: breadcrumbCount });
    }

    /**
     * Export errors as JSON
     */
    exportErrors(filter?: ErrorFilter): string {
        const errors = this.getErrors(filter);
        return JSON.stringify(errors, null, 2);
    }

    /**
     * Generate error report
     */
    generateErrorReport(filter?: ErrorFilter): string {
        const summary = this.getErrorSummary(filter);
        const errors = this.getErrors(filter);

        return `
=== Error Tracking Report ===
Generated: ${new Date().toISOString()}
Session: ${this.sessionId}

SUMMARY:
- Total Errors: ${summary.totalErrors}
- Unique Error Types: ${errors.length}
- Unresolved Errors: ${errors.filter(e => !e.resolved).length}

ERRORS BY CATEGORY:
${Object.entries(summary.errorsByCategory)
                .map(([category, count]) => `- ${category}: ${count}`)
                .join('\n')}

ERRORS BY SEVERITY:
${Object.entries(summary.errorsBySeverity)
                .map(([severity, count]) => `- ${severity}: ${count}`)
                .join('\n')}

TOP ERRORS:
${summary.topErrors
                .map((error, i) => `${i + 1}. [${error.category}] ${error.message} (${error.count} occurrences)`)
                .join('\n')}

RECENT ERRORS:
${summary.recentErrors
                .slice(0, 5)
                .map(error => `- [${error.severity}] ${error.error.message} (${error.occurrenceCount}x, last: ${error.lastOccurrence})`)
                .join('\n')}

ERROR TRENDS (Last 7 days):
${summary.errorTrends
                .map(trend => `${trend.date}: ${trend.count} errors`)
                .join('\n')}

RECENT BREADCRUMBS:
${this.breadcrumbs.slice(-10).join('\n')}
`;
    }
}

// Global instance
export const errorTracker = new ErrorTracker();

// Helper functions for common error tracking patterns
export const trackProductError = (error: Error, operation: string, data?: any) => {
    return errorTracker.trackError(error, {
        operation,
        component: 'ProductService'
    }, {
        tags: ['product', 'creation'],
        additionalData: data
    });
};

export const trackClientError = (error: Error, operation: string, data?: any) => {
    return errorTracker.trackError(error, {
        operation,
        component: 'ClientService'
    }, {
        tags: ['client', 'creation'],
        additionalData: data
    });
};

export const trackValidationError = (error: Error, component: string, data?: any) => {
    return errorTracker.trackError(error, {
        operation: 'validation',
        component
    }, {
        severity: 'low',
        tags: ['validation'],
        additionalData: data
    });
};

export const trackFirestoreError = (error: Error, operation: string, component: string, data?: any) => {
    return errorTracker.trackError(error, {
        operation,
        component
    }, {
        severity: 'high',
        tags: ['firestore', 'database'],
        additionalData: data
    });
};

export const trackNetworkError = (error: Error, operation: string, component: string, data?: any) => {
    return errorTracker.trackError(error, {
        operation,
        component
    }, {
        severity: 'medium',
        tags: ['network', 'connectivity'],
        additionalData: data
    });
};

export default ErrorTracker;