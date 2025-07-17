/**
 * Enhanced logging utility with different log levels and structured logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  stack?: string;
}

class Logger {
  private level: LogLevel;
  private context: string;

  constructor(context: string = 'App', level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : level;
  }

  private formatMessage(level: string, message: string, metadata?: Record<string, any>): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
    };

    if (metadata) {
      entry.metadata = metadata;
    }

    return entry;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private outputLog(entry: LogEntry, consoleMethod: (message?: any, ...optionalParams: any[]) => void) {
    if (process.env.NODE_ENV === 'development') {
      // Enhanced development logging
      const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.context}]`;
      if (entry.metadata) {
        consoleMethod(prefix, entry.message, entry.metadata);
      } else {
        consoleMethod(prefix, entry.message);
      }
    } else {
      // Production logging (structured JSON)
      consoleMethod(JSON.stringify(entry));
    }
  }

  debug(message: string, metadata?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.formatMessage('DEBUG', message, metadata);
    this.outputLog(entry, console.debug);
  }

  info(message: string, metadata?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.formatMessage('INFO', message, metadata);
    this.outputLog(entry, console.info);
  }

  warn(message: string, metadata?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.formatMessage('WARN', message, metadata);
    this.outputLog(entry, console.warn);
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.formatMessage('ERROR', message, metadata);
    
    if (error instanceof Error) {
      entry.stack = error.stack;
      entry.metadata = {
        ...entry.metadata,
        errorName: error.name,
        errorMessage: error.message,
        errorCode: (error as any).code,
        errorStatusCode: (error as any).statusCode,
      };
    } else if (error) {
      entry.metadata = {
        ...entry.metadata,
        error: String(error),
      };
    }

    this.outputLog(entry, console.error);

    // In production, you might want to send critical errors to external monitoring
    if (process.env.NODE_ENV === 'production' && this.isHighSeverityError(entry)) {
      this.sendToExternalMonitoring(entry);
    }
  }

  // Performance logging
  time(label: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.debug(`⏱️ ${label}`, { duration: `${duration}ms` });
    };
  }

  // Structured API request logging
  apiRequest(method: string, url: string, metadata?: Record<string, any>) {
    this.info(`🌐 API Request: ${method} ${url}`, {
      type: 'api_request',
      method,
      url,
      ...metadata
    });
  }

  apiResponse(method: string, url: string, statusCode: number, duration: number, metadata?: Record<string, any>) {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    const emoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
    
    this[level](`${emoji} API Response: ${method} ${url} ${statusCode}`, {
      type: 'api_response',
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ...metadata
    });
  }

  // Database operation logging
  dbOperation(operation: string, table: string, duration?: number, metadata?: Record<string, any>) {
    this.debug(`🗄️ DB Operation: ${operation} on ${table}`, {
      type: 'db_operation',
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      ...metadata
    });
  }

  // Authentication logging
  authEvent(event: string, userId?: string, metadata?: Record<string, any>) {
    this.info(`🔐 Auth Event: ${event}`, {
      type: 'auth_event',
      event,
      userId: userId ? `user_${userId.substring(0, 8)}***` : undefined, // Masked for privacy
      ...metadata
    });
  }

  // Business logic logging
  businessEvent(event: string, metadata?: Record<string, any>) {
    this.info(`📊 Business Event: ${event}`, {
      type: 'business_event',
      event,
      ...metadata
    });
  }

  private isHighSeverityError(entry: LogEntry): boolean {
    // Define criteria for high severity errors that need immediate attention
    if (entry.metadata?.errorStatusCode >= 500) return true;
    if (entry.metadata?.errorCode === 'AUTHENTICATION_FAILED') return true;
    if (entry.message.includes('critical') || entry.message.includes('security')) return true;
    return false;
  }

  private sendToExternalMonitoring(entry: LogEntry): void {
    // Placeholder for external monitoring integration
    // You could integrate with services like Sentry, DataDog, etc.
    console.log('🚨 High severity error detected:', entry);
  }

  // Create child logger with additional context
  child(additionalContext: string): Logger {
    return new Logger(`${this.context}:${additionalContext}`, this.level);
  }
}

// Export singleton instances for common contexts
export const apiLogger = new Logger('API');
export const authLogger = new Logger('Auth');
export const chatLogger = new Logger('Chat');
export const uiLogger = new Logger('UI');

// Export the Logger class for custom instances
export { Logger };

// Default logger
export const logger = new Logger('App');
