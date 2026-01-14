import { Logger } from '../types';
import { SecurityValidationError, SecurityErrorCode, SecurityProfile } from './types';

/**
 * Security event types for audit logging.
 */
export type SecurityEventType =
  | 'VALIDATION_STARTED'
  | 'VALIDATION_PASSED'
  | 'VALIDATION_FAILED'
  | 'PATH_BLOCKED'
  | 'NUMERIC_REJECTED'
  | 'STRING_REJECTED'
  | 'PROFILE_CHANGED'
  | 'CONFIG_LOADED'
  | 'SUSPICIOUS_PATTERN';

/**
 * Security event severity levels.
 */
export type SecuritySeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Security audit event.
 */
export interface SecurityAuditEvent {
  /** Event type */
  type: SecurityEventType;
  /** Event severity */
  severity: SecuritySeverity;
  /** ISO timestamp */
  timestamp: string;
  /** Source of the event (cli, config, etc.) */
  source: string;
  /** Human-readable message */
  message: string;
  /** Structured event details */
  details: Record<string, unknown>;
  /** Associated error code if applicable */
  errorCode?: SecurityErrorCode;
  /** Request/session ID for correlation */
  correlationId?: string;
}

/**
 * Audit logger configuration.
 */
export interface AuditLoggerConfig {
  /** Whether audit logging is enabled */
  enabled: boolean;
  /** Minimum severity level to log */
  minSeverity: SecuritySeverity;
  /** Whether to include sensitive details (sanitized in production) */
  includeSensitiveDetails: boolean;
  /** Custom correlation ID generator */
  correlationIdGenerator?: () => string;
}

const DEFAULT_AUDIT_CONFIG: AuditLoggerConfig = {
    enabled: true,
    minSeverity: 'info',
    includeSensitiveDetails: false,
};

const SEVERITY_ORDER: Record<SecuritySeverity, number> = {
    info: 0,
    warning: 1,
    error: 2,
    critical: 3,
};

/**
 * SecurityAuditLogger provides structured security event logging.
 */
export class SecurityAuditLogger {
    private config: AuditLoggerConfig;
    private logger?: Logger;
    private correlationId?: string;
    private eventBuffer: SecurityAuditEvent[] = [];
    private maxBufferSize: number = 100;

    constructor(logger?: Logger, config: Partial<AuditLoggerConfig> = {}) {
        this.logger = logger;
        this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
    }

    /**
   * Set correlation ID for event grouping.
   */
    setCorrelationId(id: string): this {
        this.correlationId = id;
        return this;
    }

    /**
   * Generate a new correlation ID.
   */
    generateCorrelationId(): string {
        if (this.config.correlationIdGenerator) {
            return this.config.correlationIdGenerator();
        }
        return `sec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
   * Log validation started.
   */
    validationStarted(source: string, fieldCount: number): void {
        this.logEvent({
            type: 'VALIDATION_STARTED',
            severity: 'info',
            source,
            message: `Security validation started for ${source}`,
            details: { fieldCount },
        });
    }

    /**
   * Log validation passed.
   */
    validationPassed(source: string, warningCount: number = 0): void {
        this.logEvent({
            type: 'VALIDATION_PASSED',
            severity: warningCount > 0 ? 'warning' : 'info',
            source,
            message: warningCount > 0 
                ? `Security validation passed with ${warningCount} warning(s)`
                : 'Security validation passed',
            details: { warningCount },
        });
    }

    /**
   * Log validation failed.
   */
    validationFailed(source: string, errors: SecurityValidationError[]): void {
        this.logEvent({
            type: 'VALIDATION_FAILED',
            severity: 'error',
            source,
            message: `Security validation failed with ${errors.length} error(s)`,
            details: {
                errorCount: errors.length,
                errors: this.sanitizeErrors(errors),
            },
        });
    }

    /**
   * Log path blocked.
   */
    pathBlocked(path: string, reason: string, source: string, errorCode?: SecurityErrorCode): void {
        this.logEvent({
            type: 'PATH_BLOCKED',
            severity: 'warning',
            source,
            message: `Path blocked: ${reason}`,
            details: {
                path: this.sanitizePath(path),
                reason,
            },
            errorCode,
        });
    }

    /**
   * Log numeric value rejected.
   */
    numericRejected(field: string, _value: number, reason: string, source: string): void {
        this.logEvent({
            type: 'NUMERIC_REJECTED',
            severity: 'warning',
            source,
            message: `Numeric value rejected for ${field}: ${reason}`,
            details: { field, reason },
            // Don't log the actual value to prevent enumeration
        });
    }

    /**
   * Log string value rejected.
   */
    stringRejected(field: string, reason: string, source: string, errorCode?: SecurityErrorCode): void {
        this.logEvent({
            type: 'STRING_REJECTED',
            severity: 'warning',
            source,
            message: `String value rejected for ${field}: ${reason}`,
            details: { field, reason },
            errorCode,
        });
    }

    /**
   * Log profile change.
   */
    profileChanged(oldProfile: SecurityProfile, newProfile: SecurityProfile): void {
        this.logEvent({
            type: 'PROFILE_CHANGED',
            severity: 'info',
            source: 'system',
            message: `Security profile changed from ${oldProfile} to ${newProfile}`,
            details: { oldProfile, newProfile },
        });
    }

    /**
   * Log config loaded.
   */
    configLoaded(filePath: string, fieldCount: number): void {
        this.logEvent({
            type: 'CONFIG_LOADED',
            severity: 'info',
            source: 'config',
            message: `Configuration loaded from ${this.sanitizePath(filePath)}`,
            details: { 
                file: this.sanitizePath(filePath), 
                fieldCount 
            },
        });
    }

    /**
   * Log suspicious pattern detected.
   */
    suspiciousPattern(field: string, pattern: string, source: string): void {
        this.logEvent({
            type: 'SUSPICIOUS_PATTERN',
            severity: 'warning',
            source,
            message: `Suspicious pattern detected in ${field}`,
            details: { field, pattern },
        });
    }

    /**
   * Get buffered events (for testing/export).
   */
    getBufferedEvents(): SecurityAuditEvent[] {
        return [...this.eventBuffer];
    }

    /**
   * Clear event buffer.
   */
    clearBuffer(): void {
        this.eventBuffer = [];
    }

    /**
   * Core event logging.
   */
    private logEvent(event: Omit<SecurityAuditEvent, 'timestamp' | 'correlationId'>): void {
        if (!this.config.enabled) return;

        const fullEvent: SecurityAuditEvent = {
            ...event,
            timestamp: new Date().toISOString(),
            correlationId: this.correlationId,
        };

        // Check severity threshold
        if (SEVERITY_ORDER[event.severity] < SEVERITY_ORDER[this.config.minSeverity]) {
            return;
        }

        // Buffer event
        this.eventBuffer.push(fullEvent);
        if (this.eventBuffer.length > this.maxBufferSize) {
            this.eventBuffer.shift();
        }

        // Log to underlying logger
        if (this.logger) {
            const logMessage = this.formatLogMessage(fullEvent);
      
            switch (event.severity) {
                case 'info':
                    this.logger.info(logMessage);
                    break;
                case 'warning':
                    this.logger.warn(logMessage);
                    break;
                case 'error':
                case 'critical':
                    this.logger.error(logMessage);
                    break;
            }
        }
    }

    /**
   * Format event for logging.
   */
    private formatLogMessage(event: SecurityAuditEvent): string {
        const prefix = event.correlationId ? `[${event.correlationId}] ` : '';
        const details = Object.keys(event.details).length > 0
            ? ` ${JSON.stringify(event.details)}`
            : '';
    
        return `${prefix}[SECURITY:${event.type}] ${event.message}${details}`;
    }

    /**
   * Sanitize path for logging (remove sensitive parts).
   */
    private sanitizePath(path: string): string {
        if (!this.config.includeSensitiveDetails) {
            // Replace home directory
            const home = process.env.HOME || process.env.USERPROFILE || '';
            if (home && path.startsWith(home)) {
                path = path.replace(home, '~');
            }
            // Truncate long paths
            if (path.length > 100) {
                path = '...' + path.substring(path.length - 97);
            }
        }
        return path;
    }

    /**
   * Sanitize errors for logging.
   */
    private sanitizeErrors(errors: SecurityValidationError[]): Array<{ field: string; code: string }> {
        return errors.map(e => ({
            field: e.field,
            code: e.code,
            // Don't include the actual value or full message
        }));
    }
}

/**
 * Create an audit logger.
 */
export function createAuditLogger(logger?: Logger, config?: Partial<AuditLoggerConfig>): SecurityAuditLogger {
    return new SecurityAuditLogger(logger, config);
}

/**
 * Global audit logger instance.
 */
let globalAuditLogger: SecurityAuditLogger | null = null;

/**
 * Get the global audit logger.
 */
export function getAuditLogger(): SecurityAuditLogger {
    if (!globalAuditLogger) {
        globalAuditLogger = new SecurityAuditLogger();
    }
    return globalAuditLogger;
}

/**
 * Configure the global audit logger.
 */
export function configureAuditLogger(logger?: Logger, config?: Partial<AuditLoggerConfig>): void {
    globalAuditLogger = new SecurityAuditLogger(logger, config);
}

