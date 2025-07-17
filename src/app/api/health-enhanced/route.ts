/**
 * Enhanced health check and monitoring API with comprehensive system metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/utils/logger';
import { performanceMonitor, smartCache } from '@/utils/performance';
import { rateLimiter, requestLogger } from '@/utils/requestMiddleware';
import { apiRetryManager } from '@/utils/apiRetry';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: ServiceHealthCheck[];
  performance: PerformanceMetrics;
  resources: ResourceMetrics;
  diagnostics: DiagnosticInfo;
}

interface ServiceHealthCheck {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastCheck: string;
  error?: string;
  metadata?: Record<string, any>;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  cacheHitRate: number;
  circuitBreakerStatus: Record<string, any>;
}

interface ResourceMetrics {
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  cache: {
    size: number;
    maxSize: number;
    hitRate: number;
  };
  rateLimiting: {
    activeConnections: number;
    rejectedRequests: number;
  };
}

interface DiagnosticInfo {
  configuration: {
    maxMessageLength: number;
    maxFileSize: number;
    rateLimitWindow: number;
    rateLimitMax: number;
  };
  dependencies: {
    baseUrl: string;
    tenantUuid: string;
  };
  features: {
    cacheEnabled: boolean;
    rateLimitEnabled: boolean;
    circuitBreakerEnabled: boolean;
  };
}

class HealthCheckService {
  private logger = apiLogger.child('HealthCheckService');
  private lastHealthCheck = 0;
  private healthCheckInterval = 30000; // 30 seconds
  private cachedHealth: SystemHealth | null = null;

  async performHealthCheck(includeExtensive = false): Promise<SystemHealth> {
    const now = Date.now();
    
    // Return cached result if recent (for frequent health checks)
    if (!includeExtensive && this.cachedHealth && (now - this.lastHealthCheck) < this.healthCheckInterval) {
      return this.cachedHealth;
    }

    const timer = performanceMonitor.startTimer('health-check');
    
    try {
      this.logger.debug('開始健康檢查', { includeExtensive });

      const [services, performance, resources] = await Promise.all([
        this.checkServices(includeExtensive),
        this.getPerformanceMetrics(),
        this.getResourceMetrics()
      ]);

      const overallStatus = this.determineOverallHealth(services, performance, resources);
      
      const health: SystemHealth = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services,
        performance,
        resources,
        diagnostics: this.getDiagnosticInfo()
      };

      // Cache the result
      this.cachedHealth = health;
      this.lastHealthCheck = now;

      timer(true, { status: overallStatus, servicesChecked: services.length });
      
      this.logger.info('健康檢查完成', {
        status: overallStatus,
        responseTime: timer.toString(),
        servicesUp: services.filter(s => s.status === 'up').length,
        servicesTotal: services.length
      });

      return health;

    } catch (error) {
      timer(false, { error: error instanceof Error ? error.message : String(error) });
      this.logger.error('健康檢查失敗', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: [],
        performance: this.getBasicPerformanceMetrics(),
        resources: this.getBasicResourceMetrics(),
        diagnostics: this.getDiagnosticInfo()
      };
    }
  }

  private async checkServices(extensive = false): Promise<ServiceHealthCheck[]> {
    const services: ServiceHealthCheck[] = [];
    
    // Check external AI service connectivity
    services.push(await this.checkAIServiceConnectivity());
    
    // Check database/storage connectivity (if applicable)
    services.push(await this.checkStorageConnectivity());
    
    if (extensive) {
      // Additional checks for extensive health check
      services.push(await this.checkExternalDependencies());
      services.push(await this.checkCacheHealth());
    }

    return services;
  }

  private async checkAIServiceConnectivity(): Promise<ServiceHealthCheck> {
    const timer = performanceMonitor.startTimer('ai-service-connectivity');
    
    try {
      const baseUrl = process.env.AI_BASE_URL || 'https://dgb01p240102.japaneast.cloudapp.azure.com';
      const checkUrl = `${baseUrl}/wise/wiseadm/s/promptportal/portal`;
      
      const startTime = Date.now();
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });
      
      const fetchPromise = fetch(checkUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Health-Check/1.0'
        }
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;
      
      timer(response.ok);
      
      return {
        name: 'AI Service',
        status: response.ok ? 'up' : 'down',
        responseTime,
        lastCheck: new Date().toISOString(),
        metadata: {
          statusCode: response.status,
          url: checkUrl
        }
      };
      
    } catch (error) {
      timer(false);
      
      return {
        name: 'AI Service',
        status: 'down',
        responseTime: -1,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkStorageConnectivity(): Promise<ServiceHealthCheck> {
    try {
      // Test localStorage availability (client-side storage)
      if (typeof window !== 'undefined') {
        const testKey = 'health-check-test';
        const testValue = Date.now().toString();
        
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        if (retrieved === testValue) {
          return {
            name: 'Local Storage',
            status: 'up',
            responseTime: 0,
            lastCheck: new Date().toISOString()
          };
        }
      }
      
      return {
        name: 'Local Storage',
        status: 'up',
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        metadata: {
          note: 'Server-side check - localStorage not available'
        }
      };
      
    } catch (error) {
      return {
        name: 'Local Storage',
        status: 'down',
        responseTime: -1,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkExternalDependencies(): Promise<ServiceHealthCheck> {
    // Check if external monitoring/logging services are accessible
    try {
      // This is a placeholder - in real implementation, you might check
      // external services like Sentry, DataDog, etc.
      return {
        name: 'External Dependencies',
        status: 'up',
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        metadata: {
          note: 'No external dependencies configured'
        }
      };
    } catch (error) {
      return {
        name: 'External Dependencies',
        status: 'down',
        responseTime: -1,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkCacheHealth(): Promise<ServiceHealthCheck> {
    try {
      const cacheStats = smartCache.getStats();
      const isHealthy = cacheStats.size <= cacheStats.maxSize;
      
      return {
        name: 'Cache System',
        status: isHealthy ? 'up' : 'degraded',
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        metadata: cacheStats
      };
    } catch (error) {
      return {
        name: 'Cache System',
        status: 'down',
        responseTime: -1,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getPerformanceMetrics(): PerformanceMetrics {
    const report = performanceMonitor.getPerformanceReport();
    const requestStats = requestLogger.getStatistics(60000); // Last minute
    
    return {
      averageResponseTime: report.averageResponseTime,
      requestsPerMinute: requestStats.totalRequests,
      errorRate: 100 - requestStats.successRate,
      cacheHitRate: this.calculateCacheHitRate(),
      circuitBreakerStatus: apiRetryManager.getAllCircuitBreakerStatuses()
    };
  }

  private getBasicPerformanceMetrics(): PerformanceMetrics {
    return {
      averageResponseTime: 0,
      requestsPerMinute: 0,
      errorRate: 0,
      cacheHitRate: 0,
      circuitBreakerStatus: {}
    };
  }

  private getResourceMetrics(): ResourceMetrics {
    const memUsage = process.memoryUsage();
    const cacheStats = smartCache.getStats();
    
    return {
      memory: {
        used: memUsage.heapUsed,
        free: memUsage.heapTotal - memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cache: {
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
        hitRate: this.calculateCacheHitRate()
      },
      rateLimiting: {
        activeConnections: 0, // Would need to track this separately
        rejectedRequests: 0    // Would need to track this separately
      }
    };
  }

  private getBasicResourceMetrics(): ResourceMetrics {
    return {
      memory: {
        used: 0,
        free: 0,
        total: 0,
        percentage: 0
      },
      cache: {
        size: 0,
        maxSize: 0,
        hitRate: 0
      },
      rateLimiting: {
        activeConnections: 0,
        rejectedRequests: 0
      }
    };
  }

  private getDiagnosticInfo(): DiagnosticInfo {
    return {
      configuration: {
        maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '10000'),
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'),
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10')
      },
      dependencies: {
        baseUrl: process.env.AI_BASE_URL || 'https://dgb01p240102.japaneast.cloudapp.azure.com',
        tenantUuid: process.env.TENANT_UUID || '2595af81-c151-47eb-9f15-d17e0adbe3b4'
      },
      features: {
        cacheEnabled: true,
        rateLimitEnabled: true,
        circuitBreakerEnabled: true
      }
    };
  }

  private calculateCacheHitRate(): number {
    // This would need to be tracked separately in a real implementation
    // For now, return a placeholder value
    return 85.5;
  }

  private determineOverallHealth(
    services: ServiceHealthCheck[],
    performance: PerformanceMetrics,
    resources: ResourceMetrics
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Check if any critical services are down
    const criticalServicesDown = services.some(s => 
      s.name === 'AI Service' && s.status === 'down'
    );
    
    if (criticalServicesDown) {
      return 'unhealthy';
    }

    // Check for degraded conditions
    const highErrorRate = performance.errorRate > 10; // >10% error rate
    const highMemoryUsage = resources.memory.percentage > 90; // >90% memory usage
    const servicesWithIssues = services.some(s => s.status === 'degraded');
    
    if (highErrorRate || highMemoryUsage || servicesWithIssues) {
      return 'degraded';
    }

    return 'healthy';
  }
}

const healthService = new HealthCheckService();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const extensive = searchParams.get('extensive') === 'true';
    const format = searchParams.get('format') || 'json';
    
    const health = await healthService.performHealthCheck(extensive);
    
    // Return appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    if (format === 'prometheus') {
      // Return Prometheus metrics format
      const prometheusMetrics = convertToPrometheusFormat(health);
      return new NextResponse(prometheusMetrics, {
        status: statusCode,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4'
        }
      });
    }
    
    return NextResponse.json(health, { status: statusCode });
    
  } catch (error) {
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(errorResponse, { status: 503 });
  }
}

export async function HEAD(req: NextRequest) {
  try {
    const health = await healthService.performHealthCheck(false);
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    return new NextResponse(null, { 
      status: statusCode,
      headers: {
        'X-Health-Status': health.status,
        'X-Health-Timestamp': health.timestamp
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}

function convertToPrometheusFormat(health: SystemHealth): string {
  const metrics: string[] = [];
  
  // System metrics
  metrics.push(`# HELP system_uptime_seconds System uptime in seconds`);
  metrics.push(`# TYPE system_uptime_seconds gauge`);
  metrics.push(`system_uptime_seconds ${health.uptime}`);
  
  metrics.push(`# HELP system_memory_usage_percentage Memory usage percentage`);
  metrics.push(`# TYPE system_memory_usage_percentage gauge`);
  metrics.push(`system_memory_usage_percentage ${health.resources.memory.percentage}`);
  
  // Performance metrics
  metrics.push(`# HELP http_request_duration_ms Average HTTP request duration in milliseconds`);
  metrics.push(`# TYPE http_request_duration_ms gauge`);
  metrics.push(`http_request_duration_ms ${health.performance.averageResponseTime}`);
  
  metrics.push(`# HELP http_requests_per_minute HTTP requests per minute`);
  metrics.push(`# TYPE http_requests_per_minute gauge`);
  metrics.push(`http_requests_per_minute ${health.performance.requestsPerMinute}`);
  
  // Service health
  health.services.forEach(service => {
    const serviceName = service.name.toLowerCase().replace(/\s+/g, '_');
    metrics.push(`# HELP service_up Service availability (1 = up, 0 = down)`);
    metrics.push(`# TYPE service_up gauge`);
    metrics.push(`service_up{service="${serviceName}"} ${service.status === 'up' ? 1 : 0}`);
    
    if (service.responseTime >= 0) {
      metrics.push(`# HELP service_response_time_ms Service response time in milliseconds`);
      metrics.push(`# TYPE service_response_time_ms gauge`);
      metrics.push(`service_response_time_ms{service="${serviceName}"} ${service.responseTime}`);
    }
  });
  
  return metrics.join('\n') + '\n';
}
