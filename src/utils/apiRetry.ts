/**
 * Enhanced API retry utility with intelligent backoff and circuit breaker pattern
 */

import { apiLogger } from './logger';
import { ErrorHandler, NetworkError, AIServiceError } from './errorHandling';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterMax: number;
  retryableErrors: string[];
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterMax: 100,
  retryableErrors: ['NETWORK_ERROR', 'CONNECTION_TIMEOUT', 'SERVICE_UNAVAILABLE'],
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000, // 1 minute
};

class ApiRetryManager {
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private config: RetryConfig;
  private logger = apiLogger.child('ApiRetryManager');

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config, ...customConfig };
    const circuitBreaker = this.getCircuitBreaker(operationId);

    // Check circuit breaker
    if (circuitBreaker.state === 'open') {
      if (Date.now() - circuitBreaker.lastFailure < config.circuitBreakerTimeout) {
        throw new NetworkError('服務暫時不可用 (熔斷器已開啟)', {
          operationId,
          circuitBreakerState: circuitBreaker.state
        });
      } else {
        // Move to half-open state
        circuitBreaker.state = 'half-open';
        this.logger.info('熔斷器進入半開狀態', { operationId });
      }
    }

    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        this.logger.debug('執行操作', { operationId, attempt, maxAttempts: config.maxAttempts });
        
        const result = await operation();
        
        // Success - reset circuit breaker
        if (circuitBreaker.failures > 0) {
          circuitBreaker.failures = 0;
          circuitBreaker.state = 'closed';
          this.logger.info('操作成功，重置熔斷器', { operationId });
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const handledError = ErrorHandler.handleApiError(lastError, operationId);
        
        this.logger.warn('操作失敗', {
          operationId,
          attempt,
          error: handledError.message,
          code: handledError.code
        });

        // Check if error is retryable
        const isRetryable = this.isRetryableError(handledError, config);
        
        // Update circuit breaker
        this.updateCircuitBreaker(operationId, handledError, isRetryable);
        
        // Don't retry if error is not retryable or we've reached max attempts
        if (!isRetryable || attempt === config.maxAttempts) {
          throw handledError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config);
        
        this.logger.debug('等待重試', { operationId, attempt, delay });
        await this.sleep(delay);
      }
    }

    throw ErrorHandler.handleApiError(lastError || new Error('重試失敗'), operationId);
  }

  private getCircuitBreaker(operationId: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(operationId)) {
      this.circuitBreakers.set(operationId, {
        failures: 0,
        lastFailure: 0,
        state: 'closed'
      });
    }
    return this.circuitBreakers.get(operationId)!;
  }

  private updateCircuitBreaker(operationId: string, error: Error, isRetryable: boolean): void {
    const circuitBreaker = this.getCircuitBreaker(operationId);
    
    if (isRetryable) {
      circuitBreaker.failures++;
      circuitBreaker.lastFailure = Date.now();
      
      if (circuitBreaker.failures >= this.config.circuitBreakerThreshold) {
        circuitBreaker.state = 'open';
        this.logger.warn('熔斷器開啟', {
          operationId,
          failures: circuitBreaker.failures,
          threshold: this.config.circuitBreakerThreshold
        });
      }
    }
  }

  private isRetryableError(error: Error, config: RetryConfig): boolean {
    // Check if error type is in retryable list
    if ('code' in error && typeof error.code === 'string') {
      return config.retryableErrors.includes(error.code);
    }
    
    // Check for specific error patterns
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /503/,
      /502/,
      /504/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /ETIMEDOUT/
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: delay = baseDelay * (backoffMultiplier ^ (attempt - 1))
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * config.jitterMax;
    
    // Cap at maxDelay
    return Math.min(exponentialDelay + jitter, config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get circuit breaker status for monitoring
  getCircuitBreakerStatus(operationId: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(operationId) || null;
  }

  // Reset circuit breaker manually
  resetCircuitBreaker(operationId: string): void {
    this.circuitBreakers.delete(operationId);
    this.logger.info('手動重置熔斷器', { operationId });
  }

  // Get all circuit breaker statuses for monitoring
  getAllCircuitBreakerStatuses(): Record<string, CircuitBreakerState> {
    const statuses: Record<string, CircuitBreakerState> = {};
    for (const [id, state] of this.circuitBreakers.entries()) {
      statuses[id] = { ...state };
    }
    return statuses;
  }
}

// Export singleton instance
export const apiRetryManager = new ApiRetryManager();

// Export class for custom configurations
export { ApiRetryManager };
