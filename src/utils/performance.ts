/**
 * Enhanced performance monitoring and caching utilities
 */

import { apiLogger } from './logger';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number;
  cleanupInterval: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private logger = apiLogger.child('PerformanceMonitor');
  private maxMetrics = 1000; // Keep last 1000 metrics

  startTimer(operation: string): (success?: boolean, metadata?: Record<string, any>) => PerformanceMetric {
    const startTime = performance.now();
    const startTimestamp = Date.now();

    return (success: boolean = true, metadata?: Record<string, any>): PerformanceMetric => {
      const duration = performance.now() - startTime;
      const metric: PerformanceMetric = {
        operation,
        duration,
        success,
        timestamp: startTimestamp,
        metadata
      };

      this.addMetric(metric);
      
      // Log slow operations
      if (duration > 5000) { // 5 seconds
        this.logger.warn('慢操作檢測', {
          operation,
          duration: `${duration.toFixed(2)}ms`,
          success,
          metadata
        });
      }

      return metric;
    };
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(operation?: string, limit: number = 100): PerformanceMetric[] {
    let filtered = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;
    
    return filtered.slice(-limit);
  }

  getAverageResponseTime(operation?: string, timeWindow?: number): number {
    const now = Date.now();
    let filtered = this.metrics;

    if (operation) {
      filtered = filtered.filter(m => m.operation === operation);
    }

    if (timeWindow) {
      filtered = filtered.filter(m => now - m.timestamp <= timeWindow);
    }

    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, metric) => sum + metric.duration, 0);
    return total / filtered.length;
  }

  getSuccessRate(operation?: string, timeWindow?: number): number {
    const now = Date.now();
    let filtered = this.metrics;

    if (operation) {
      filtered = filtered.filter(m => m.operation === operation);
    }

    if (timeWindow) {
      filtered = filtered.filter(m => now - m.timestamp <= timeWindow);
    }

    if (filtered.length === 0) return 0;

    const successCount = filtered.filter(m => m.success).length;
    return (successCount / filtered.length) * 100;
  }

  getPerformanceReport(): {
    totalOperations: number;
    averageResponseTime: number;
    successRate: number;
    slowOperations: PerformanceMetric[];
    operationBreakdown: Record<string, {
      count: number;
      averageTime: number;
      successRate: number;
    }>;
  } {
    const totalOperations = this.metrics.length;
    const averageResponseTime = this.getAverageResponseTime();
    const successRate = this.getSuccessRate();
    const slowOperations = this.metrics.filter(m => m.duration > 5000);

    // Calculate per-operation statistics
    const operationStats: Record<string, {
      count: number;
      totalTime: number;
      successCount: number;
    }> = {};

    this.metrics.forEach(metric => {
      if (!operationStats[metric.operation]) {
        operationStats[metric.operation] = {
          count: 0,
          totalTime: 0,
          successCount: 0
        };
      }

      const stats = operationStats[metric.operation];
      stats.count++;
      stats.totalTime += metric.duration;
      if (metric.success) stats.successCount++;
    });

    const operationBreakdown: Record<string, {
      count: number;
      averageTime: number;
      successRate: number;
    }> = {};

    Object.entries(operationStats).forEach(([operation, stats]) => {
      operationBreakdown[operation] = {
        count: stats.count,
        averageTime: stats.totalTime / stats.count,
        successRate: (stats.successCount / stats.count) * 100
      };
    });

    return {
      totalOperations,
      averageResponseTime,
      successRate,
      slowOperations,
      operationBreakdown
    };
  }

  clearMetrics(): void {
    this.metrics = [];
    this.logger.info('效能指標已清除');
  }
}

class SmartCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private logger = apiLogger.child('SmartCache');

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    };

    this.startCleanupTimer();
  }

  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      key
    };

    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
    this.logger.debug('快取項目已設定', { key, ttl: entry.ttl });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.logger.debug('快取項目已過期', { key });
      return null;
    }

    this.logger.debug('快取命中', { key });
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug('快取項目已刪除', { key });
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.logger.info('快取已清除');
  }

  getStats(): {
    size: number;
    maxSize: number;
    keys: string[];
    oldestEntry?: { key: string; age: number };
  } {
    const keys = Array.from(this.cache.keys());
    let oldestEntry: { key: string; age: number } | undefined;

    if (keys.length > 0) {
      let oldestTimestamp = Date.now();
      let oldestKey = '';

      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
          oldestKey = key;
        }
      }

      oldestEntry = {
        key: oldestKey,
        age: Date.now() - oldestTimestamp
      };
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      keys,
      oldestEntry
    };
  }

  private evictOldest(): void {
    let oldestTimestamp = Date.now();
    let oldestKey = '';

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug('驅逐最舊的快取項目', { key: oldestKey });
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      this.logger.debug('快取清理完成', { cleaned: keysToDelete.length });
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Decorator for automatic performance monitoring
export function monitor(operation?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const timer = performanceMonitor.startTimer(operationName);
      
      try {
        const result = await originalMethod.apply(this, args);
        timer(true, { args: args.length });
        return result;
      } catch (error) {
        timer(false, { 
          args: args.length, 
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    };

    return descriptor;
  };
}

// Export singleton instances
export const performanceMonitor = new PerformanceMonitor();
export const smartCache = new SmartCache();

// Export classes for custom instances
export { PerformanceMonitor, SmartCache };
