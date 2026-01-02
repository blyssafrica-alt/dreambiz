/**
 * Production-ready logging utility
 * - In development: Uses console.log with colors
 * - In production: Sends logs to Sentry and PostHog
 */

import * as Sentry from '@sentry/react-native';

// Dynamic import for PostHog to handle type issues
let posthogInstance: any;
try {
  const PostHogModule = require('posthog-react-native');
  posthogInstance = PostHogModule.default || PostHogModule;
} catch (e) {
  // PostHog not available
  posthogInstance = null;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = __DEV__;
  private enabled = true;

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: LogContext) {
    if (!this.enabled) return;
    
    if (this.isDevelopment) {
      console.log(`🔍 [DEBUG] ${message}`, context || '');
    }
    // Debug logs are not sent to Sentry in production
  }

  /**
   * Log info messages
   */
  info(message: string, context?: LogContext) {
    if (!this.enabled) return;
    
    if (this.isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, context || '');
    } else {
      // In production, track as event in PostHog
      if (typeof posthogInstance?.capture === 'function') {
        posthogInstance.capture('log_info', {
          message,
          ...context,
        });
      }
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext) {
    if (!this.enabled) return;
    
    if (this.isDevelopment) {
      console.warn(`⚠️ [WARN] ${message}`, context || '');
    } else {
      // Send warnings to Sentry with warning level
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: context,
      });
      
      // Track in PostHog
      if (typeof posthogInstance?.capture === 'function') {
        posthogInstance.capture('log_warn', {
          message,
          ...context,
        });
      }
    }
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (!this.enabled) return;
    
    if (this.isDevelopment) {
      console.error(`❌ [ERROR] ${message}`, error || '', context || '');
    } else {
      // Send errors to Sentry
      if (error instanceof Error) {
        Sentry.captureException(error, {
          extra: {
            message,
            ...context,
          },
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: {
            error,
            ...context,
          },
        });
      }
      
      // Track in PostHog
      if (typeof posthogInstance?.capture === 'function') {
        posthogInstance.capture('log_error', {
          message,
          error: error instanceof Error ? error.message : String(error),
          ...context,
        });
      }
    }
  }

  /**
   * Log performance metrics
   */
  performance(metricName: string, duration: number, context?: LogContext) {
    if (!this.enabled) return;
    
    if (this.isDevelopment) {
      console.log(`⏱️ [PERF] ${metricName}: ${duration}ms`, context || '');
    } else {
      // Send to Sentry as performance transaction
      Sentry.metrics.distribution(metricName, duration, {
        tags: context,
      });
      
      // Track in PostHog
      if (typeof posthogInstance?.capture === 'function') {
        posthogInstance.capture('performance_metric', {
          metric_name: metricName,
          duration,
          ...context,
        });
      }
    }
  }

  /**
   * Start a performance timer
   */
  startTimer(label: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.performance(label, duration);
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => 
    logger.error(message, error, context),
  performance: (metricName: string, duration: number, context?: LogContext) => 
    logger.performance(metricName, duration, context),
  startTimer: (label: string) => logger.startTimer(label),
};

export default logger;

