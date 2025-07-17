/**
 * Enhanced request/response interceptor and rate limiting utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from './logger';
import { ErrorHandler, ValidationError } from './errorHandling';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  onLimitReached?: (req: NextRequest, key: string) => void;
}

export interface RequestLogEntry {
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  timestamp: number;
  duration?: number;
  statusCode?: number;
  success?: boolean;
  error?: string;
}

class RateLimiter {
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  private logger = apiLogger.child('RateLimiter');

  async isAllowed(req: NextRequest, config: RateLimitConfig): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalRequests: number;
  }> {
    const key = config.keyGenerator ? config.keyGenerator(req) : this.getDefaultKey(req);
    const now = Date.now();
    
    let requestData = this.requestCounts.get(key);
    
    // Initialize or reset if window expired
    if (!requestData || now >= requestData.resetTime) {
      requestData = {
        count: 0,
        resetTime: now + config.windowMs
      };
      this.requestCounts.set(key, requestData);
    }

    const allowed = requestData.count < config.maxRequests;
    
    if (allowed) {
      requestData.count++;
    } else {
      this.logger.warn('速率限制觸發', {
        key,
        count: requestData.count,
        limit: config.maxRequests,
        resetTime: new Date(requestData.resetTime).toISOString()
      });
      
      if (config.onLimitReached) {
        config.onLimitReached(req, key);
      }
    }

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - requestData.count),
      resetTime: requestData.resetTime,
      totalRequests: requestData.count
    };
  }

  private getDefaultKey(req: NextRequest): string {
    const ip = this.getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Create a more sophisticated key that includes both IP and user agent hash
    const userAgentHash = this.simpleHash(userAgent);
    return `${ip}:${userAgentHash}`;
  }

  private getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    if (cfConnectingIP) {
      return cfConnectingIP;
    }
    
    return 'unknown';
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, data] of this.requestCounts.entries()) {
      if (now >= data.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.requestCounts.delete(key));
    
    if (keysToDelete.length > 0) {
      this.logger.debug('速率限制清理完成', { cleaned: keysToDelete.length });
    }
  }

  // Get current rate limit status for a key
  getStatus(req: NextRequest, config: RateLimitConfig): {
    count: number;
    remaining: number;
    resetTime: number;
  } {
    const key = config.keyGenerator ? config.keyGenerator(req) : this.getDefaultKey(req);
    const requestData = this.requestCounts.get(key);
    
    if (!requestData) {
      return {
        count: 0,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs
      };
    }

    return {
      count: requestData.count,
      remaining: Math.max(0, config.maxRequests - requestData.count),
      resetTime: requestData.resetTime
    };
  }
}

class RequestLogger {
  private logs: RequestLogEntry[] = [];
  private maxLogs = 1000;
  private logger = apiLogger.child('RequestLogger');

  logRequest(req: NextRequest): {
    logEntry: RequestLogEntry;
    endLog: (statusCode: number, success: boolean, error?: string) => void;
  } {
    const startTime = Date.now();
    
    const logEntry: RequestLogEntry = {
      method: req.method,
      url: req.url,
      ip: this.getClientIP(req),
      userAgent: req.headers.get('user-agent') || 'unknown',
      timestamp: startTime
    };

    const endLog = (statusCode: number, success: boolean, error?: string) => {
      const duration = Date.now() - startTime;
      
      logEntry.duration = duration;
      logEntry.statusCode = statusCode;
      logEntry.success = success;
      logEntry.error = error;

      this.addLog(logEntry);

      // Log based on severity
      if (!success || statusCode >= 500) {
        this.logger.error('請求失敗', {
          method: logEntry.method,
          url: logEntry.url,
          statusCode,
          duration,
          error
        });
      } else if (statusCode >= 400) {
        this.logger.warn('客戶端錯誤', {
          method: logEntry.method,
          url: logEntry.url,
          statusCode,
          duration
        });
      } else if (duration > 5000) {
        this.logger.warn('慢請求', {
          method: logEntry.method,
          url: logEntry.url,
          statusCode,
          duration
        });
      } else {
        this.logger.debug('請求完成', {
          method: logEntry.method,
          url: logEntry.url,
          statusCode,
          duration
        });
      }
    };

    return { logEntry, endLog };
  }

  private addLog(entry: RequestLogEntry): void {
    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    if (cfConnectingIP) {
      return cfConnectingIP;
    }
    
    return 'unknown';
  }

  getRecentLogs(limit: number = 100): RequestLogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsByTimeRange(startTime: number, endTime: number): RequestLogEntry[] {
    return this.logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  getStatistics(timeWindow?: number): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    topEndpoints: Array<{ url: string; count: number }>;
    statusCodeDistribution: Record<string, number>;
  } {
    const now = Date.now();
    let filtered = timeWindow 
      ? this.logs.filter(log => now - log.timestamp <= timeWindow)
      : this.logs;

    const totalRequests = filtered.length;
    const successfulRequests = filtered.filter(log => log.success === true).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    
    const responseTimes = filtered
      .filter(log => log.duration !== undefined)
      .map(log => log.duration!);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    const errorRate = totalRequests > 0 
      ? ((totalRequests - successfulRequests) / totalRequests) * 100 
      : 0;

    // Top endpoints
    const endpointCounts: Record<string, number> = {};
    filtered.forEach(log => {
      const url = new URL(log.url).pathname;
      endpointCounts[url] = (endpointCounts[url] || 0) + 1;
    });
    
    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([url, count]) => ({ url, count }));

    // Status code distribution
    const statusCodeDistribution: Record<string, number> = {};
    filtered.forEach(log => {
      if (log.statusCode) {
        const code = log.statusCode.toString();
        statusCodeDistribution[code] = (statusCodeDistribution[code] || 0) + 1;
      }
    });

    return {
      totalRequests,
      successRate,
      averageResponseTime,
      errorRate,
      topEndpoints,
      statusCodeDistribution
    };
  }

  clearLogs(): void {
    this.logs = [];
    this.logger.info('請求日誌已清除');
  }
}

// Middleware wrapper for automatic logging and rate limiting
export function withRequestMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    rateLimit?: RateLimitConfig;
    logRequests?: boolean;
  } = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const { logRequests = true, rateLimit } = options;
    
    let logEnd: ((statusCode: number, success: boolean, error?: string) => void) | undefined;
    
    // Start request logging
    if (logRequests) {
      const { endLog } = requestLogger.logRequest(req);
      logEnd = endLog;
    }

    try {
      // Rate limiting check
      if (rateLimit) {
        const { allowed, remaining, resetTime } = await rateLimiter.isAllowed(req, rateLimit);
        
        if (!allowed) {
          const response = NextResponse.json({
            error: '請求過於頻繁，請稍後再試',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
          }, { status: 429 });
          
          response.headers.set('X-RateLimit-Limit', rateLimit.maxRequests.toString());
          response.headers.set('X-RateLimit-Remaining', remaining.toString());
          response.headers.set('X-RateLimit-Reset', resetTime.toString());
          response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
          
          if (logEnd) {
            logEnd(429, false, '請求過於頻繁');
          }
          
          return response;
        }
      }

      // Execute handler
      const response = await handler(req);
      
      // Log successful response
      if (logEnd) {
        logEnd(response.status, response.status < 400);
      }
      
      return response;
      
    } catch (error) {
      const handledError = ErrorHandler.handleApiError(error, 'request-middleware');
      const clientError = ErrorHandler.getClientSafeError(handledError);
      
      // Log error
      if (logEnd) {
        logEnd(clientError.statusCode, false, clientError.message);
      }
      
      return NextResponse.json({
        error: clientError.message,
        code: clientError.code
      }, { status: clientError.statusCode });
    }
  };
}

// Export singleton instances
export const rateLimiter = new RateLimiter();
export const requestLogger = new RequestLogger();

// Export classes for custom instances
export { RateLimiter, RequestLogger };
