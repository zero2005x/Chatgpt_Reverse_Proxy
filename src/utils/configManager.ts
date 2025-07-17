/**
 * Advanced configuration management system with validation, secrets, and environment handling
 */

import { apiLogger } from './logger';

// Configuration interfaces
interface DatabaseConfig {
  url?: string;
  maxConnections: number;
  timeout: number;
  ssl: boolean;
}

interface AIServiceConfig {
  baseUrl: string;
  tenantUuid: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

interface CacheConfig {
  maxSize: number;
  ttl: number;
  cleanupInterval: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

interface SecurityConfig {
  maxMessageLength: number;
  maxFileSize: number;
  allowedOrigins: string[];
  requireApiKey: boolean;
  encryptionKey?: string;
}

interface MonitoringConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  enableHealthChecks: boolean;
  metricsRetentionDays: number;
  alerting: {
    enabled: boolean;
    errorThreshold: number;
    responseTimeThreshold: number;
  };
}

interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableConsole: boolean;
  enableFile: boolean;
  enableExternal: boolean;
  maxFileSize: number;
  maxFiles: number;
  structuredLogging: boolean;
}

interface ApplicationConfig {
  application: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    port: number;
    host: string;
    timezone: string;
  };
  database: DatabaseConfig;
  aiService: AIServiceConfig;
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  logging: LoggingConfig;
}

export type {
  ApplicationConfig,
  DatabaseConfig,
  AIServiceConfig,
  CacheConfig,
  RateLimitConfig,
  SecurityConfig,
  MonitoringConfig,
  LoggingConfig
};

class ConfigurationManager {
  private config: ApplicationConfig | null = null;
  private secrets: Map<string, string> = new Map();
  private logger = apiLogger.child('ConfigurationManager');
  private isInitialized = false;
  private configWatchers: Array<(config: ApplicationConfig) => void> = [];

  constructor() {
    this.loadSecrets();
  }

  /**
   * Initialize configuration from environment variables and defaults
   */
  async initialize(): Promise<ApplicationConfig> {
    if (this.isInitialized && this.config) {
      return this.config;
    }

    try {
      this.logger.debug('正在初始化配置管理器');

      const rawConfig = this.extractConfigFromEnvironment();
      this.config = this.validateAndNormalizeConfig(rawConfig);
      
      // Validate critical configurations
      await this.validateCriticalConfig();
      
      // Apply environment-specific overrides
      this.applyEnvironmentOverrides();
      
      this.isInitialized = true;
      
      this.logger.info('配置管理器初始化完成', {
        environment: this.config.application.environment,
        aiServiceConfigured: !!this.config.aiService.baseUrl,
        rateLimitEnabled: this.config.rateLimit.maxRequests > 0,
        monitoringEnabled: this.config.monitoring.enableMetrics
      });

      // Notify watchers
      this.notifyWatchers();

      return this.config;

    } catch (error) {
      this.logger.error('配置初始化失敗', error);
      throw new Error(`Configuration initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate and normalize raw configuration
   */
  private validateAndNormalizeConfig(rawConfig: any): ApplicationConfig {
    // Set defaults and validate
    const config: ApplicationConfig = {
      application: {
        name: rawConfig.application?.name || 'AI Chat Multi-Service Platform',
        version: rawConfig.application?.version || '1.0.0',
        environment: this.validateEnvironment(rawConfig.application?.environment),
        port: this.validateNumber(rawConfig.application?.port, 1000, 65535, 3000),
        host: rawConfig.application?.host || 'localhost',
        timezone: rawConfig.application?.timezone || 'UTC'
      },
      database: {
        url: rawConfig.database?.url,
        maxConnections: this.validateNumber(rawConfig.database?.maxConnections, 1, 100, 10),
        timeout: this.validateNumber(rawConfig.database?.timeout, 1000, 30000, 10000),
        ssl: rawConfig.database?.ssl !== false
      },
      aiService: {
        baseUrl: rawConfig.aiService?.baseUrl || 'https://dgb01p240102.japaneast.cloudapp.azure.com',
        tenantUuid: rawConfig.aiService?.tenantUuid || '2595af81-c151-47eb-9f15-d17e0adbe3b4',
        timeout: this.validateNumber(rawConfig.aiService?.timeout, 5000, 60000, 30000),
        maxRetries: this.validateNumber(rawConfig.aiService?.maxRetries, 0, 5, 3),
        retryDelay: this.validateNumber(rawConfig.aiService?.retryDelay, 100, 5000, 1000)
      },
      cache: {
        maxSize: this.validateNumber(rawConfig.cache?.maxSize, 100, 10000, 1000),
        ttl: this.validateNumber(rawConfig.cache?.ttl, 60000, 86400000, 300000),
        cleanupInterval: this.validateNumber(rawConfig.cache?.cleanupInterval, 60000, 3600000, 300000)
      },
      rateLimit: {
        windowMs: this.validateNumber(rawConfig.rateLimit?.windowMs, 1000, 3600000, 60000),
        maxRequests: this.validateNumber(rawConfig.rateLimit?.maxRequests, 1, 1000, 100),
        skipSuccessfulRequests: rawConfig.rateLimit?.skipSuccessfulRequests === true,
        skipFailedRequests: rawConfig.rateLimit?.skipFailedRequests === true
      },
      security: {
        maxMessageLength: this.validateNumber(rawConfig.security?.maxMessageLength, 100, 100000, 10000),
        maxFileSize: this.validateNumber(rawConfig.security?.maxFileSize, 1024, 10485760, 5242880),
        allowedOrigins: Array.isArray(rawConfig.security?.allowedOrigins) 
          ? rawConfig.security.allowedOrigins 
          : ['localhost', '127.0.0.1'],
        requireApiKey: rawConfig.security?.requireApiKey === true,
        encryptionKey: rawConfig.security?.encryptionKey
      },
      monitoring: {
        enableMetrics: rawConfig.monitoring?.enableMetrics !== false,
        enableTracing: rawConfig.monitoring?.enableTracing === true,
        enableHealthChecks: rawConfig.monitoring?.enableHealthChecks !== false,
        metricsRetentionDays: this.validateNumber(rawConfig.monitoring?.metricsRetentionDays, 1, 90, 7),
        alerting: {
          enabled: rawConfig.monitoring?.alerting?.enabled === true,
          errorThreshold: this.validateNumber(rawConfig.monitoring?.alerting?.errorThreshold, 1, 100, 10),
          responseTimeThreshold: this.validateNumber(rawConfig.monitoring?.alerting?.responseTimeThreshold, 100, 30000, 5000)
        }
      },
      logging: {
        level: this.validateLogLevel(rawConfig.logging?.level),
        enableConsole: rawConfig.logging?.enableConsole !== false,
        enableFile: rawConfig.logging?.enableFile === true,
        enableExternal: rawConfig.logging?.enableExternal === true,
        maxFileSize: this.validateNumber(rawConfig.logging?.maxFileSize, 1048576, 104857600, 10485760),
        maxFiles: this.validateNumber(rawConfig.logging?.maxFiles, 1, 20, 5),
        structuredLogging: rawConfig.logging?.structuredLogging !== false
      }
    };

    return config;
  }

  /**
   * Validate environment value
   */
  private validateEnvironment(env: any): 'development' | 'staging' | 'production' {
    if (env === 'staging' || env === 'production') {
      return env;
    }
    return 'development';
  }

  /**
   * Validate log level
   */
  private validateLogLevel(level: any): 'debug' | 'info' | 'warn' | 'error' {
    if (level === 'debug' || level === 'warn' || level === 'error') {
      return level;
    }
    return 'info';
  }

  /**
   * Validate number with min/max constraints
   */
  private validateNumber(value: any, min: number, max: number, defaultValue: number): number {
    const num = parseInt(String(value));
    if (isNaN(num) || num < min || num > max) {
      return defaultValue;
    }
    return num;
  }

  /**
   * Get the current configuration
   */
  getConfig(): ApplicationConfig {
    if (!this.config || !this.isInitialized) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  /**
   * Get specific configuration section
   */
  getSection<T extends keyof ApplicationConfig>(section: T): ApplicationConfig[T] {
    return this.getConfig()[section];
  }

  /**
   * Get a secret value
   */
  getSecret(key: string): string | undefined {
    return this.secrets.get(key);
  }

  /**
   * Set a secret value (for runtime configuration)
   */
  setSecret(key: string, value: string): void {
    this.secrets.set(key, value);
    this.logger.debug('密鑰已更新', { key });
  }

  /**
   * Validate that critical configuration is present and valid
   */
  private async validateCriticalConfig(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    const errors: string[] = [];

    // Validate AI service configuration
    if (!this.config.aiService.baseUrl) {
      errors.push('AI_BASE_URL is required');
    }

    if (!this.config.aiService.tenantUuid) {
      errors.push('TENANT_UUID is required');
    }

    // Validate security configuration in production
    if (this.config.application.environment === 'production') {
      if (!this.config.security.encryptionKey) {
        errors.push('ENCRYPTION_KEY is required in production');
      }

      if (this.config.security.allowedOrigins.includes('localhost')) {
        errors.push('localhost should not be in allowed origins in production');
      }
    }

    // Test AI service connectivity
    try {
      const testUrl = `${this.config.aiService.baseUrl}/wise/wiseadm/s/promptportal/portal`;
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        this.logger.warn('AI服務連接測試失敗', { 
          status: response.status, 
          url: testUrl 
        });
      }
    } catch (error) {
      this.logger.warn('無法測試AI服務連接', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      // Don't fail initialization for connectivity issues
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Extract configuration from environment variables
   */
  private extractConfigFromEnvironment(): Partial<ApplicationConfig> {
    return {
      application: {
        name: process.env.APP_NAME || 'AI Chat Multi-Service Platform',
        version: process.env.APP_VERSION || '1.0.0',
        environment: (process.env.NODE_ENV as any) || 'development',
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || 'localhost',
        timezone: process.env.TZ || 'UTC'
      },
      database: {
        url: process.env.DATABASE_URL,
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
        timeout: parseInt(process.env.DB_TIMEOUT || '10000'),
        ssl: process.env.DB_SSL !== 'false'
      },
      aiService: {
        baseUrl: process.env.AI_BASE_URL || 'https://dgb01p240102.japaneast.cloudapp.azure.com',
        tenantUuid: process.env.TENANT_UUID || '2595af81-c151-47eb-9f15-d17e0adbe3b4',
        timeout: parseInt(process.env.AI_TIMEOUT || '30000'),
        maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.AI_RETRY_DELAY || '1000')
      },
      cache: {
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
        ttl: parseInt(process.env.CACHE_TTL || '300000'),
        cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '300000')
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
        skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true'
      },
      security: {
        maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '10000'),
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'),
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['localhost', '127.0.0.1'],
        requireApiKey: process.env.REQUIRE_API_KEY === 'true',
        encryptionKey: process.env.ENCRYPTION_KEY
      },
      monitoring: {
        enableMetrics: process.env.ENABLE_METRICS !== 'false',
        enableTracing: process.env.ENABLE_TRACING === 'true',
        enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
        metricsRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '7'),
        alerting: {
          enabled: process.env.ALERTING_ENABLED === 'true',
          errorThreshold: parseInt(process.env.ALERT_ERROR_THRESHOLD || '10'),
          responseTimeThreshold: parseInt(process.env.ALERT_RESPONSE_TIME_THRESHOLD || '5000')
        }
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE === 'true',
        enableExternal: process.env.LOG_EXTERNAL === 'true',
        maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'),
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
        structuredLogging: process.env.LOG_STRUCTURED !== 'false'
      }
    };
  }

  /**
   * Load secrets from environment or secure storage
   */
  private loadSecrets(): void {
    // Load API keys and sensitive data
    if (process.env.ENCRYPTION_KEY) {
      this.secrets.set('encryption_key', process.env.ENCRYPTION_KEY);
    }
    
    if (process.env.JWT_SECRET) {
      this.secrets.set('jwt_secret', process.env.JWT_SECRET);
    }
    
    if (process.env.API_KEY) {
      this.secrets.set('api_key', process.env.API_KEY);
    }

    // Additional secrets can be loaded from secure vaults in production
    this.loadAdditionalSecrets();
  }

  /**
   * Load additional secrets from external sources (placeholder)
   */
  private loadAdditionalSecrets(): void {
    // In production, this could load from:
    // - Azure Key Vault
    // - AWS Secrets Manager
    // - HashiCorp Vault
    // - Kubernetes Secrets
    
    this.logger.debug('額外密鑰載入完成');
  }

  /**
   * Apply environment-specific configuration overrides
   */
  private applyEnvironmentOverrides(): void {
    if (!this.config) return;

    switch (this.config.application.environment) {
      case 'development':
        this.config.logging.level = 'debug';
        this.config.monitoring.enableTracing = true;
        this.config.security.requireApiKey = false;
        break;

      case 'staging':
        this.config.logging.level = 'info';
        this.config.monitoring.enableTracing = true;
        this.config.security.requireApiKey = true;
        break;

      case 'production':
        this.config.logging.level = 'warn';
        this.config.monitoring.enableTracing = false;
        this.config.security.requireApiKey = true;
        this.config.rateLimit.maxRequests = 50; // Stricter rate limiting
        break;
    }

    this.logger.debug('環境特定配置已應用', {
      environment: this.config.application.environment
    });
  }

  /**
   * Add a configuration watcher
   */
  addWatcher(callback: (config: ApplicationConfig) => void): void {
    this.configWatchers.push(callback);
  }

  /**
   * Remove a configuration watcher
   */
  removeWatcher(callback: (config: ApplicationConfig) => void): void {
    const index = this.configWatchers.indexOf(callback);
    if (index > -1) {
      this.configWatchers.splice(index, 1);
    }
  }

  /**
   * Notify all watchers of configuration changes
   */
  private notifyWatchers(): void {
    if (!this.config) return;
    
    this.configWatchers.forEach(callback => {
      try {
        callback(this.config!);
      } catch (error) {
        this.logger.error('配置監聽器錯誤', error);
      }
    });
  }

  /**
   * Reload configuration (for hot reloading in development)
   */
  async reload(): Promise<ApplicationConfig> {
    this.logger.info('重新載入配置');
    this.isInitialized = false;
    this.config = null;
    this.loadSecrets();
    return await this.initialize();
  }

  /**
   * Get configuration as a sanitized object (for debugging/logging)
   */
  getSanitizedConfig(): any {
    if (!this.config) return null;

    const sanitized = JSON.parse(JSON.stringify(this.config));
    
    // Remove or mask sensitive data
    if (sanitized.security?.encryptionKey) {
      sanitized.security.encryptionKey = '***MASKED***';
    }
    
    return sanitized;
  }

  /**
   * Export configuration for external tools (with secrets masked)
   */
  exportConfig(): string {
    const sanitized = this.getSanitizedConfig();
    return JSON.stringify(sanitized, null, 2);
  }
}

// Global configuration instance
export const configManager = new ConfigurationManager();

// Convenience exports
export const getConfig = () => configManager.getConfig();
export const getConfigSection = <T extends keyof ApplicationConfig>(section: T) => 
  configManager.getSection(section);
export const getSecret = (key: string) => configManager.getSecret(key);

// Initialize configuration on module load in server environments
if (typeof window === 'undefined') {
  configManager.initialize().catch(error => {
    console.error('Failed to initialize configuration:', error);
  });
}
