/**
 * Enhanced chat API route with improved error handling, performance monitoring, and retry logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/utils/logger';
import { ErrorHandler, ValidationError, AuthenticationError, AIServiceError } from '@/utils/errorHandling';
import { apiRetryManager } from '@/utils/apiRetry';
import { performanceMonitor, smartCache } from '@/utils/performance';
import { withRequestMiddleware } from '@/utils/requestMiddleware';
import { Validator, ValidationSchema } from '@/utils/validation';

// Enhanced security configuration
const ENHANCED_SECURITY_CONFIG = {
  MAX_MESSAGE_LENGTH: parseInt(process.env.MAX_MESSAGE_LENGTH || '10000'),
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 50,
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 100,
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'),
  ALLOWED_FILE_TYPES: ['text/plain', 'text/csv', 'application/pdf', 'image/jpeg', 'image/png'],
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT || '1800000'), // 30 minutes
  MAX_RETRY_ATTEMPTS: 3,
  CIRCUIT_BREAKER_THRESHOLD: 5,
};

// Validation schemas
const chatRequestSchema: ValidationSchema = {
  message: {
    required: false,
    maxLength: ENHANCED_SECURITY_CONFIG.MAX_MESSAGE_LENGTH,
    pattern: /^[^<>]*$/, // Prevent basic XSS
    transform: (value: string) => value.trim(),
  },
  username: {
    required: true,
    minLength: ENHANCED_SECURITY_CONFIG.MIN_USERNAME_LENGTH,
    maxLength: ENHANCED_SECURITY_CONFIG.MAX_USERNAME_LENGTH,
    pattern: /^[a-zA-Z0-9._-]+$/,
    transform: (value: string) => value.toLowerCase().trim(),
  },
  password: {
    required: true,
    minLength: ENHANCED_SECURITY_CONFIG.MIN_PASSWORD_LENGTH,
    maxLength: ENHANCED_SECURITY_CONFIG.MAX_PASSWORD_LENGTH,
  },
  id: {
    required: false,
    pattern: /^[0-9]+$/,
    transform: (value: string) => value || '13',
  },
  baseUrl: {
    required: false,
    pattern: /^https?:\/\/[^\s]+$/,
    transform: (value: string) => value || process.env.AI_BASE_URL || 'https://dgb01p240102.japaneast.cloudapp.azure.com',
  },
};

interface ChatRequest {
  message?: string;
  username: string;
  password: string;
  id?: string;
  file?: {
    data?: string;
    content?: string;
    name?: string;
    type?: string;
  };
  baseUrl?: string;
}

interface SessionData {
  cookie: string;
  apiKey?: string;
  timestamp: number;
  userId: string;
}

// Enhanced session cache with TTL
const sessionCache = new Map<string, SessionData>();

class EnhancedChatService {
  private logger = apiLogger.child('EnhancedChatService');

  async processChat(request: ChatRequest): Promise<{ reply: string; metadata?: any }> {
    const timer = performanceMonitor.startTimer('chat-process');
    
    try {
      this.logger.apiRequest('POST', '/api/chat/enhanced', {
        messageLength: request.message?.length,
        hasFile: !!request.file,
        userId: request.username
      });

      // Validate input
      const validation = Validator.validate(request, chatRequestSchema);
      if (!validation.isValid) {
        throw new ValidationError('輸入驗證失敗', { errors: validation.errors });
      }

      const validatedData = validation.data as ChatRequest;

      // Generate session key
      const sessionKey = this.generateSessionKey(validatedData.username, validatedData.baseUrl!);
      
      // Get or create session
      const session = await this.getOrCreateSession(
        sessionKey,
        validatedData.username,
        validatedData.password,
        validatedData.baseUrl!
      );

      // Process the chat request
      const result = await this.executeChat(validatedData, session);
      
      timer(true, { messageLength: request.message?.length });
      
      const startTime = Date.now();
      this.logger.apiResponse('POST', '/api/chat/enhanced', 200, 
        Date.now() - startTime);

      return result;
      
    } catch (error) {
      timer(false, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async getOrCreateSession(
    sessionKey: string,
    username: string,
    password: string,
    baseUrl: string
  ): Promise<SessionData> {
    // Check cache first
    const cached = sessionCache.get(sessionKey);
    if (cached && Date.now() - cached.timestamp < ENHANCED_SECURITY_CONFIG.SESSION_TIMEOUT) {
      this.logger.debug('使用快取會話', { sessionKey: sessionKey.substring(0, 10) + '***' });
      return cached;
    }

    // Create new session with retry logic
    const session = await apiRetryManager.executeWithRetry(
      () => this.performLogin(username, password, baseUrl),
      `login-${sessionKey}`,
      {
        maxAttempts: 2, // Fewer retries for login
        retryableErrors: ['NETWORK_ERROR', 'CONNECTION_TIMEOUT']
      }
    );

    if (!session) {
      throw new AuthenticationError('登入失敗，無法建立會話');
    }

    // Cache the session
    const sessionData: SessionData = {
      cookie: session,
      timestamp: Date.now(),
      userId: username
    };

    sessionCache.set(sessionKey, sessionData);
    
    // Clean up old sessions
    this.cleanupExpiredSessions();

    return sessionData;
  }

  private async executeChat(request: ChatRequest, session: SessionData): Promise<{ reply: string; metadata?: any }> {
    const { message, file, id, baseUrl } = request;
    
    if (!message && !file) {
      throw new ValidationError('必須提供訊息或檔案');
    }

    // Verify portal access with caching
    const accessKey = `portal-access-${session.userId}-${baseUrl}`;
    let hasAccess = smartCache.get(accessKey);
    
    if (hasAccess === null) {
      hasAccess = await apiRetryManager.executeWithRetry(
        () => this.verifyPortalAccess(session.cookie, baseUrl!),
        `portal-access-${session.userId}`,
        { maxAttempts: 2 }
      );
      
      // Cache access status for 5 minutes
      smartCache.set(accessKey, hasAccess, 5 * 60 * 1000);
    }

    if (!hasAccess) {
      throw new AuthenticationError('無法存取 AI Portal，請確認權限');
    }

    // Get API key with caching
    const apiKeyKey = `api-key-${session.userId}`;
    let apiKey = smartCache.get(apiKeyKey);
    
    if (!apiKey) {
      apiKey = await apiRetryManager.executeWithRetry(
        () => this.getApiKey(session.cookie, baseUrl!),
        `api-key-${session.userId}`,
        { maxAttempts: 2 }
      );
      
      if (apiKey) {
        // Cache API key for 10 minutes
        smartCache.set(apiKeyKey, apiKey, 10 * 60 * 1000);
      }
    }

    // Execute AI completion with enhanced endpoints and retry logic
    return await this.executeAICompletion(
      message || '',
      file,
      session.cookie,
      apiKey,
      id || '13',
      baseUrl!
    );
  }

  private async executeAICompletion(
    message: string,
    file: any,
    sessionCookie: string,
    apiKey: string | null,
    formId: string,
    baseUrl: string
  ): Promise<{ reply: string; metadata?: any }> {
    
    // Enhanced endpoint configurations with priority and retry settings
    const endpoints = this.buildEnhancedEndpoints(message, file, sessionCookie, apiKey, formId, baseUrl);
    
    let lastError: Error | undefined;
    
    for (const endpoint of endpoints) {
      try {
        this.logger.debug(`嘗試端點: ${endpoint.description}`, { url: endpoint.url });
        
        const result = await apiRetryManager.executeWithRetry(
          () => this.callAIEndpoint(endpoint),
          `ai-endpoint-${endpoint.priority}`,
          {
            maxAttempts: endpoint.retryAttempts || 2,
            circuitBreakerThreshold: 3
          }
        );
        
        if (result.success) {
          this.logger.info(`端點成功: ${endpoint.description}`, {
            responseLength: result.reply?.length || 0
          });
          
          return {
            reply: result.reply || '無回應內容',
            metadata: {
              endpoint: endpoint.description,
              priority: endpoint.priority,
              processingTime: result.processingTime
            }
          };
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`端點失敗: ${endpoint.description}`, {
          error: lastError.message,
          priority: endpoint.priority
        });
      }
    }

    // All endpoints failed
    throw new AIServiceError('所有 AI 端點都無法回應', {
      lastError: lastError?.message,
      totalEndpoints: endpoints.length
    });
  }

  private buildEnhancedEndpoints(
    message: string,
    file: any,
    sessionCookie: string,
    apiKey: string | null,
    formId: string,
    baseUrl: string
  ) {
    const fileContent = this.processFileContent(file);
    
    return [
      // Priority 1: Primary completion endpoint
      {
        priority: 1,
        url: `${baseUrl}/wise/wiseadm/s/promptportal/portal/completion?id=${formId}&action=completion`,
        method: 'POST',
        payload: this.buildCompletionPayload(message, fileContent, null),
        contentType: 'application/x-www-form-urlencoded',
        description: '主要完成端點',
        retryAttempts: 3
      },
      
      // Priority 2: Completion with API key
      ...(apiKey ? [{
        priority: 2,
        url: `${baseUrl}/wise/wiseadm/s/promptportal/portal/completion?id=${formId}&action=completion&apikey=${apiKey}`,
        method: 'POST',
        payload: this.buildCompletionPayload(message, fileContent, null),
        contentType: 'application/x-www-form-urlencoded',
        description: '帶API Key的完成端點',
        retryAttempts: 2
      }] : []),
      
      // Priority 3: Alternative endpoints
      {
        priority: 3,
        url: `${baseUrl}/wise/api/prompt/execute`,
        method: 'POST',
        payload: JSON.stringify({
          INPUT: message,
          id: formId,
          ...(apiKey && { apikey: apiKey })
        }),
        contentType: 'application/json',
        description: 'Prompt執行端點',
        retryAttempts: 2
      },
      
      // Priority 4: Fallback endpoints
      {
        priority: 4,
        url: `${baseUrl}/wise/wiseadm/s/promptportal/portal/execute`,
        method: 'POST',
        payload: JSON.stringify({
          INPUT: message,
          id: formId
        }),
        contentType: 'application/json',
        description: 'Portal執行端點',
        retryAttempts: 1
      }
    ].sort((a, b) => a.priority - b.priority);
  }

  private async callAIEndpoint(endpoint: any): Promise<{ success: boolean; reply?: string; processingTime?: number }> {
    const startTime = Date.now();
    
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': endpoint.contentType,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: endpoint.payload,
    });

    const processingTime = Date.now() - startTime;

    if (!response.ok) {
      throw new AIServiceError(`端點回應錯誤: ${response.status}`, {
        status: response.status,
        statusText: response.statusText
      });
    }

    const data = await response.json();
    const reply = this.extractReply(data);

    if (!reply) {
      throw new AIServiceError('無法從回應中提取內容');
    }

    return {
      success: true,
      reply,
      processingTime
    };
  }

  private extractReply(data: any): string | null {
    // Enhanced reply extraction with multiple fallbacks
    const possibleFields = [
      'completion', 'response', 'reply', 'answer', 'message', 
      'output', 'text', 'content', 'result', 'data'
    ];

    for (const field of possibleFields) {
      if (data[field] && typeof data[field] === 'string') {
        return data[field].trim();
      }
    }

    // Try nested objects
    if (data.data && typeof data.data === 'object') {
      return this.extractReply(data.data);
    }

    // If data is a string itself
    if (typeof data === 'string') {
      return data.trim();
    }

    return null;
  }

  private buildCompletionPayload(message: string, fileContent: string | null, csrfToken: string | null) {
    const params = new URLSearchParams();
    
    if (fileContent) {
      params.append('USERUPLOADFILE', fileContent);
    } else {
      params.append('INPUT', message);
    }
    
    params.append('TEXT1', 'text input');
    
    if (csrfToken) {
      params.append('_token', csrfToken);
    }
    
    return params;
  }

  private processFileContent(file: any): string | null {
    if (!file) return null;

    if (file.data && file.data.startsWith('data:')) {
      return file.data;
    }

    if (file.content) {
      const contentBase64 = Buffer.from(file.content, 'utf-8').toString('base64');
      const mimeType = file.type || 'text/plain';
      return `data:${mimeType};base64,${contentBase64}`;
    }

    return null;
  }

  private generateSessionKey(username: string, baseUrl: string): string {
    return Buffer.from(`${username}:${baseUrl}`).toString('base64');
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, session] of sessionCache.entries()) {
      if (now - session.timestamp > ENHANCED_SECURITY_CONFIG.SESSION_TIMEOUT) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => sessionCache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.logger.debug('清理過期會話', { cleaned: keysToDelete.length });
    }
  }

  // Placeholder methods - implement based on existing logic
  private async performLogin(username: string, password: string, baseUrl: string): Promise<string | null> {
    // Implementation would be similar to existing performFreshLogin but with enhanced error handling
    return null; // Placeholder
  }

  private async verifyPortalAccess(sessionCookie: string, baseUrl: string): Promise<boolean> {
    // Implementation would be similar to existing verifyPortalAccess but with enhanced error handling
    return true; // Placeholder
  }

  private async getApiKey(sessionCookie: string, baseUrl: string): Promise<string | null> {
    // Implementation would be similar to existing getApiKey but with enhanced error handling
    return null; // Placeholder
  }
}

// Create service instance
const chatService = new EnhancedChatService();

// Main handler with middleware
async function handleChatRequest(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const result = await chatService.processChat(body);
    
    return NextResponse.json({
      reply: result.reply,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const handledError = ErrorHandler.handleApiError(error, 'enhanced-chat');
    const clientError = ErrorHandler.getClientSafeError(handledError);
    
    return NextResponse.json({
      error: clientError.message,
      code: clientError.code,
      timestamp: new Date().toISOString()
    }, { status: clientError.statusCode });
  }
}

// Export with middleware
export const POST = withRequestMiddleware(handleChatRequest, {
  rateLimit: {
    windowMs: ENHANCED_SECURITY_CONFIG.RATE_LIMIT_WINDOW,
    maxRequests: ENHANCED_SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS,
    keyGenerator: (req) => {
      // Custom rate limiting per user
      const userAgent = req.headers.get('user-agent') || '';
      const forwarded = req.headers.get('x-forwarded-for') || '';
      return `chat:${forwarded}:${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
    }
  },
  logRequests: true
});
