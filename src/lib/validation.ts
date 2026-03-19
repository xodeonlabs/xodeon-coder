/**
 * Input validation utilities with comprehensive validation rules
 */

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const ValidationRules = {
  email: (value: any): boolean | string => {
    if (!value) return 'Email is required';
    if (typeof value !== 'string') return 'Email must be a string';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || 'Invalid email format';
  },

  password: (value: any, minLength = 8): boolean | string => {
    if (!value) return 'Password is required';
    if (typeof value !== 'string') return 'Password must be a string';
    if (value.length < minLength) return `Password must be at least ${minLength} characters`;
    return true;
  },

  displayName: (value: any): boolean | string => {
    if (!value) return 'Display name is required';
    if (typeof value !== 'string') return 'Display name must be a string';
    if (value.length < 2) return 'Display name must be at least 2 characters';
    if (value.length > 50) return 'Display name must not exceed 50 characters';
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(value)) {
      return 'Display name can only contain letters, numbers, spaces, hyphens and underscores';
    }
    return true;
  },

  appName: (value: any): boolean | string => {
    if (!value) return 'App name is required';
    if (typeof value !== 'string') return 'App name must be a string';
    if (value.length < 1) return 'App name is required';
    if (value.length > 100) return 'App name must not exceed 100 characters';
    return true;
  },

  description: (value: any, maxLength = 500): boolean | string => {
    if (typeof value !== 'string' && value !== null && value !== undefined) {
      return 'Description must be a string';
    }
    if (value && value.length > maxLength) {
      return `Description must not exceed ${maxLength} characters`;
    }
    return true;
  },

  code: (value: any): boolean | string => {
    if (!value) return 'Code is required';
    if (typeof value !== 'string') return 'Code must be a string';
    return true;
  },

  url: (value: any): boolean | string => {
    if (!value) return 'URL is required';
    if (typeof value !== 'string') return 'URL must be a string';
    try {
      new URL(value);
      return true;
    } catch {
      return 'Invalid URL format';
    }
  },

  number: (value: any, min?: number, max?: number): boolean | string => {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'number') return 'Value must be a number';
    if (min !== undefined && value < min) return `Value must be at least ${min}`;
    if (max !== undefined && value > max) return `Value must not exceed ${max}`;
    return true;
  },

  percentage: (value: any): boolean | string => {
    const numValidation = ValidationRules.number(value, 0, 100);
    return numValidation === true || numValidation || 'Percentage must be between 0 and 100';
  },

  username: (value: any): boolean | string => {
    if (!value) return 'Username is required';
    if (typeof value !== 'string') return 'Username must be a string';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 20) return 'Username must not exceed 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Username can only contain letters, numbers and underscores';
    }
    return true;
  },

  messageContent: (value: any, minLength = 1, maxLength = 2000): boolean | string => {
    if (!value) return 'Message content is required';
    if (typeof value !== 'string') return 'Message must be a string';
    const trimmed = value.trim();
    if (trimmed.length < minLength) return 'Message is too short';
    if (trimmed.length > maxLength) return `Message must not exceed ${maxLength} characters`;
    return true;
  },

  hexColor: (value: any): boolean | string => {
    if (!value) return 'Color is required';
    if (typeof value !== 'string') return 'Color must be a string';
    if (!/^#(?:[0-9a-f]{3}){1,2}$/i.test(value)) return 'Invalid hex color format';
    return true;
  },

  uuid: (value: any): boolean | string => {
    if (!value) return 'ID is required';
    if (typeof value !== 'string') return 'ID must be a string';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value) || 'Invalid ID format';
  },
};

/**
 * Sanitize user input to prevent XSS and other attacks
 */
export function sanitizeInput(value: string, allowHtml = false): string {
  if (!value) return '';

  let sanitized = value;

  if (!allowHtml) {
    // Escape HTML special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  return sanitized.trim();
}

/**
 * Validate multiple fields at once
 */
export function validateFields(
  data: Record<string, any>,
  schema: Record<string, (value: any) => boolean | string>
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [field, rule] of Object.entries(schema)) {
    const result = rule(data[field]);
    if (result !== true) {
      errors[field] = typeof result === 'string' ? result : `${field} is invalid`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts = 5, windowMs = 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(timestamp => now - timestamp < this.windowMs);

    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  reset(key: string) {
    this.attempts.delete(key);
  }

  getRemainingAttempts(key: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const recentAttempts = attempts.filter(timestamp => now - timestamp < this.windowMs);
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }
}
