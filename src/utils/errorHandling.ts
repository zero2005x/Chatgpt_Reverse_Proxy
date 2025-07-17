/**
 * Enhanced error handling utilities with custom error types
 */

export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // AI Service errors
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  API_KEY_INVALID = 'API_KEY_INVALID',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_OPERATION_ERROR = 'FILE_OPERATION_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }
}

// Specific error classes
export class AuthenticationError extends AppError {
  constructor(message: string = '認證失敗', context?: Record<string, any>) {
    super(message, ErrorCode.AUTHENTICATION_FAILED, 401, true, context);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = '輸入驗證失敗', context?: Record<string, any>) {
    super(message, ErrorCode.INVALID_INPUT, 400, true, context);
  }
}

export class NetworkError extends AppError {
  constructor(message: string = '網路連接失敗', context?: Record<string, any>) {
    super(message, ErrorCode.NETWORK_ERROR, 503, true, context);
  }
}

export class AIServiceError extends AppError {
  constructor(message: string = 'AI 服務錯誤', context?: Record<string, any>) {
    super(message, ErrorCode.AI_SERVICE_ERROR, 502, true, context);
  }
}

// Error handling utilities
export class ErrorHandler {
  static handleApiError(error: unknown, context?: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Network/fetch errors
      if (error.message.includes('fetch')) {
        return new NetworkError(`網路請求失敗: ${error.message}`, { 
          originalError: error.message,
          context 
        });
      }

      // JSON parsing errors
      if (error.message.includes('JSON')) {
        return new ValidationError(`資料格式錯誤: ${error.message}`, {
          originalError: error.message,
          context
        });
      }

      // Generic error
      return new AppError(
        error.message,
        ErrorCode.INTERNAL_ERROR,
        500,
        false,
        { originalError: error.message, context }
      );
    }

    // Unknown error type
    return new AppError(
      '發生未知錯誤',
      ErrorCode.INTERNAL_ERROR,
      500,
      false,
      { originalError: String(error), context }
    );
  }

  static getClientSafeError(error: AppError): { message: string; code: string; statusCode: number } {
    // Only expose operational errors to client
    if (error.isOperational) {
      return {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      };
    }

    // For non-operational errors, return generic message
    return {
      message: '內部伺服器錯誤',
      code: ErrorCode.INTERNAL_ERROR,
      statusCode: 500,
    };
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    backoffMultiplier: number = 2
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          throw this.handleApiError(lastError, `重試失敗 (${maxRetries} 次嘗試)`);
        }

        // Wait before retrying
        const currentDelay = delay * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }
    }

    throw this.handleApiError(lastError || new Error('重試失敗'), '所有重試都失敗');
  }

  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 10000,
    timeoutMessage: string = '操作超時'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AppError(timeoutMessage, ErrorCode.CONNECTION_TIMEOUT, 408));
      }, timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }
}

// Async error boundary for React components
export const withErrorBoundary = <T extends (...args: any[]) => any>(
  fn: T,
  fallbackValue?: any
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          console.error('Async error caught:', error);
          return fallbackValue;
        });
      }
      
      return result;
    } catch (error) {
      console.error('Sync error caught:', error);
      return fallbackValue;
    }
  }) as T;
};
