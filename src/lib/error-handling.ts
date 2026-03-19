/**
 * Centralized error handling and logging utility
 */

export interface ErrorLogEntry {
  timestamp: string;
  severity: 'error' | 'warning' | 'info';
  component: string;
  message: string;
  error?: any;
  context?: Record<string, any>;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100;

  log(entry: ErrorLogEntry) {
    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console[entry.severity](
        `[${entry.component}] ${entry.message}`,
        entry.error || entry.context || ''
      );
    }

    // In production, could send to external logging service
    // e.g., Sentry, LogRocket, etc.
  }

  error(component: string, message: string, error?: any, context?: Record<string, any>) {
    this.log({
      timestamp: new Date().toISOString(),
      severity: 'error',
      component,
      message,
      error,
      context,
    });
  }

  warning(component: string, message: string, context?: Record<string, any>) {
    this.log({
      timestamp: new Date().toISOString(),
      severity: 'warning',
      component,
      message,
      context,
    });
  }

  info(component: string, message: string, context?: Record<string, any>) {
    this.log({
      timestamp: new Date().toISOString(),
      severity: 'info',
      component,
      message,
      context,
    });
  }

  getLogs(count = 50): ErrorLogEntry[] {
    return this.logs.slice(-count);
  }

  clear() {
    this.logs = [];
  }
}

export const errorLogger = new ErrorLogger();

/**
 * Helper to handle Supabase errors with logging
 */
export function handleSupabaseError(
  component: string,
  error: any,
  context?: Record<string, any>
): string {
  let userMessage = 'Er is iets misgegaan. Probeer het later opnieuw.';

  if (error?.message) {
    if (error.message.includes('permission')) {
      userMessage = 'Je hebt geen toestemming voor deze actie.';
    } else if (error.message.includes('not found')) {
      userMessage = 'Dit item bestaat niet meer.';
    } else if (error.message.includes('unique violation')) {
      userMessage = 'Dit item bestaat al.';
    } else if (error.message.includes('network')) {
      userMessage = 'Netwerkfout. Controleer je internetverbinding.';
    }
  }

  errorLogger.error(component, 'Database error', error, context);
  return userMessage;
}

/**
 * Helper to validate input with error logging
 */
export function validateInput(
  component: string,
  input: any,
  rules: Record<string, (value: any) => boolean | string>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const [field, rule] of Object.entries(rules)) {
    const result = rule(input[field]);
    if (result !== true) {
      errors[field] = typeof result === 'string' ? result : `${field} is invalid`;
    }
  }

  if (Object.keys(errors).length > 0) {
    errorLogger.warning(component, `Validation failed for ${Object.keys(errors).join(', ')}`, {
      input: JSON.stringify(input),
      errors,
    });
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
