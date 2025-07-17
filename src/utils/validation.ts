/**
 * Enhanced validation utilities for API requests and user inputs
 */

import { ValidationError } from './errorHandling';

export interface ValidationRule<T = any> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
  transform?: (value: T) => T;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  data?: Record<string, any>;
}

export class Validator {
  static validate(data: Record<string, any>, schema: ValidationSchema): ValidationResult {
    const errors: Record<string, string> = {};
    const transformedData: Record<string, any> = {};

    for (const [field, rule] of Object.entries(schema)) {
      const value = data[field];

      try {
        // Check required fields
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors[field] = `${field} 是必填欄位`;
          continue;
        }

        // Skip validation if field is not required and is empty
        if (!rule.required && (value === undefined || value === null || value === '')) {
          continue;
        }

        let processedValue = value;

        // Apply transformation if provided
        if (rule.transform && value !== undefined && value !== null) {
          processedValue = rule.transform(value);
        }

        // Length validation for strings
        if (typeof processedValue === 'string') {
          if (rule.minLength && processedValue.length < rule.minLength) {
            errors[field] = `${field} 最少需要 ${rule.minLength} 個字符`;
            continue;
          }

          if (rule.maxLength && processedValue.length > rule.maxLength) {
            errors[field] = `${field} 最多只能 ${rule.maxLength} 個字符`;
            continue;
          }

          // Pattern validation
          if (rule.pattern && !rule.pattern.test(processedValue)) {
            errors[field] = `${field} 格式不正確`;
            continue;
          }
        }

        // Custom validation
        if (rule.custom) {
          const customResult = rule.custom(processedValue);
          if (typeof customResult === 'string') {
            errors[field] = customResult;
            continue;
          } else if (!customResult) {
            errors[field] = `${field} 驗證失敗`;
            continue;
          }
        }

        transformedData[field] = processedValue;
      } catch (error) {
        errors[field] = `${field} 驗證時發生錯誤`;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      data: Object.keys(errors).length === 0 ? transformedData : undefined,
    };
  }

  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  static validateCredentials(username: string, password: string, baseUrl?: string): ValidationResult {
    const schema: ValidationSchema = {
      username: {
        required: true,
        minLength: 3,
        maxLength: 50,
        transform: (value: string) => Validator.sanitizeString(value),
        custom: (value: string) => {
          if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
            return '用戶名只能包含字母、數字、點、下劃線和破折號';
          }
          return true;
        }
      },
      password: {
        required: true,
        minLength: 6,
        maxLength: 100,
        custom: (value: string) => {
          if (typeof value !== 'string') return '密碼必須是字符串';
          if (value.includes('<') || value.includes('>')) {
            return '密碼不能包含特殊字符 < 或 >';
          }
          return true;
        }
      }
    };

    if (baseUrl) {
      schema.baseUrl = {
        required: true,
        custom: (value: string) => {
          if (!Validator.isValidUrl(value)) {
            return '請提供有效的服務器 URL';
          }
          if (!value.startsWith('http://') && !value.startsWith('https://')) {
            return 'URL 必須以 http:// 或 https:// 開頭';
          }
          return true;
        }
      };
    }

    return Validator.validate({ username, password, baseUrl }, schema);
  }

  static validateMessage(message: string): ValidationResult {
    const schema: ValidationSchema = {
      message: {
        required: true,
        maxLength: 10000,
        transform: (value: string) => Validator.sanitizeString(value),
        custom: (value: string) => {
          // Check for malicious patterns
          const maliciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i
          ];
          
          if (maliciousPatterns.some(pattern => pattern.test(value))) {
            return '訊息包含不允許的內容';
          }
          
          return true;
        }
      }
    };

    return Validator.validate({ message }, schema);
  }

  static validateApiKey(apiKey: string, service: string): ValidationResult {
    const schema: ValidationSchema = {
      apiKey: {
        required: true,
        minLength: 10,
        maxLength: 200,
        transform: (value: string) => value.trim(),
        custom: (value: string) => {
          // Basic API key format validation based on service
          switch (service.toLowerCase()) {
            case 'openai':
              if (!value.startsWith('sk-')) {
                return 'OpenAI API Key 必須以 sk- 開頭';
              }
              break;
            case 'anthropic':
              if (!value.startsWith('sk-ant-')) {
                return 'Anthropic API Key 必須以 sk-ant- 開頭';
              }
              break;
            // Add more service-specific validations as needed
          }
          return true;
        }
      },
      service: {
        required: true,
        transform: (value: string) => value.toLowerCase().trim(),
        custom: (value: string) => {
          const validServices = [
            'openai', 'anthropic', 'google', 'mistral', 'cohere',
            'groq', 'xai', 'azure', 'huggingface', 'together'
          ];
          if (!validServices.includes(value)) {
            return '不支援的 AI 服務';
          }
          return true;
        }
      }
    };

    return Validator.validate({ apiKey, service }, schema);
  }
}

// Middleware function for validating API requests
export function validateApiRequest(
  validationFn: (data: any) => ValidationResult
) {
  return (data: any) => {
    const result = validationFn(data);
    if (!result.isValid) {
      const errorMessage = Object.values(result.errors).join(', ');
      throw new ValidationError(errorMessage, {
        validationErrors: result.errors
      });
    }
    return result.data;
  };
}

// Common validation patterns
export const ValidationPatterns = {
  USERNAME: /^[a-zA-Z0-9._-]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  API_KEY_OPENAI: /^sk-[a-zA-Z0-9]+$/,
  API_KEY_ANTHROPIC: /^sk-ant-[a-zA-Z0-9-]+$/,
} as const;

// Pre-configured validators for common use cases
export const CommonValidators = {
  credentials: (data: { username: string; password: string; baseUrl?: string }) => 
    Validator.validateCredentials(data.username, data.password, data.baseUrl),
  
  message: (data: { message: string }) => 
    Validator.validateMessage(data.message),
  
  apiKey: (data: { apiKey: string; service: string }) => 
    Validator.validateApiKey(data.apiKey, data.service),
} as const;
