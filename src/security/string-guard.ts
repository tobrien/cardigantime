import { StringSecurityOptions, SecurityValidationError } from './types';

/**
 * Common patterns for security-sensitive strings.
 */
export const SAFE_PATTERNS = {
    /** Model names: alphanumeric with hyphens, dots, colons, slashes */
    modelName: /^[a-z0-9][-a-z0-9.:/]*$/i,
    /** Identifiers: alphanumeric with underscores */
    identifier: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    /** Environment variable names */
    envVar: /^[A-Z_][A-Z0-9_]*$/,
    /** Slugs: lowercase alphanumeric with hyphens */
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    /** Semantic version */
    semver: /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?$/,
    /** Safe filename (no path separators) */
    filename: /^[a-zA-Z0-9_.-]+$/,
    /** Email (basic validation) */
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    /** URL (http/https only) */
    httpUrl: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
} as const;

/**
 * Dangerous character patterns to detect.
 * These patterns intentionally match control characters for security validation.
 */
/* eslint-disable no-control-regex */
const DANGEROUS_PATTERNS = {
    /** Null bytes */
    nullByte: /\0/,
    /** ASCII control characters (except common whitespace) */
    controlChars: /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/,
    /** Shell metacharacters */
    shellMeta: /[;&|`$(){}[\]<>!#*?]/,
    /** ANSI escape sequences */
    ansiEscape: /\x1b\[/,
    /** Common injection attempts */
    sqlInjection: /('|"|;|--|\b(OR|AND|UNION|SELECT|INSERT|UPDATE|DELETE|DROP)\b)/i,
};
/* eslint-enable no-control-regex */

/**
 * StringGuard provides secure string validation.
 */
export class StringGuard {
    private options: StringSecurityOptions;

    constructor(options: Partial<StringSecurityOptions> = {}) {
        this.options = {
            maxLength: 1000,
            allowNullBytes: false,
            allowControlChars: false,
            ...options,
        };
    }

    /**
   * Validate a string value against security constraints.
   * 
   * @param value - The string to validate
   * @param constraints - Validation constraints
   * @param fieldName - Field name for error messages
   * @returns The validated string
   * @throws Error if validation fails
   */
    validate(
        value: unknown,
        constraints: {
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      patternName?: string;
      allowedValues?: string[];
      blockShellMeta?: boolean;
      trim?: boolean;
    } = {},
        fieldName: string = 'value'
    ): string {
        const errors: SecurityValidationError[] = [];

        // Type check
        if (typeof value !== 'string') {
            errors.push({
                field: fieldName,
                message: `${fieldName} must be a string, received ${typeof value}`,
                code: 'VALIDATION_FAILED',
                source: 'unknown',
            });
            throw this.createError(errors, fieldName);
        }

        let str = value;

        // Optional trim
        if (constraints.trim) {
            str = str.trim();
        }

        // Check null bytes
        if (!this.options.allowNullBytes && DANGEROUS_PATTERNS.nullByte.test(str)) {
            errors.push({
                field: fieldName,
                message: `${fieldName} contains null bytes`,
                code: 'STRING_NULL_BYTE',
                source: 'unknown',
            });
        }

        // Check control characters
        if (!this.options.allowControlChars && DANGEROUS_PATTERNS.controlChars.test(str)) {
            errors.push({
                field: fieldName,
                message: `${fieldName} contains control characters`,
                code: 'STRING_CONTROL_CHAR',
                source: 'unknown',
            });
        }

        // Check ANSI escape sequences
        if (DANGEROUS_PATTERNS.ansiEscape.test(str)) {
            errors.push({
                field: fieldName,
                message: `${fieldName} contains ANSI escape sequences`,
                code: 'STRING_CONTROL_CHAR',
                source: 'unknown',
            });
        }

        // Check shell metacharacters if requested
        if (constraints.blockShellMeta && DANGEROUS_PATTERNS.shellMeta.test(str)) {
            errors.push({
                field: fieldName,
                message: `${fieldName} contains shell metacharacters`,
                code: 'VALIDATION_FAILED',
                source: 'unknown',
            });
        }

        // Check length
        const maxLen = constraints.maxLength ?? this.options.maxLength ?? 1000;
        if (str.length > maxLen) {
            errors.push({
                field: fieldName,
                message: `${fieldName} exceeds maximum length of ${maxLen} characters`,
                code: 'STRING_TOO_LONG',
                source: 'unknown',
            });
        }

        if (constraints.minLength !== undefined && str.length < constraints.minLength) {
            errors.push({
                field: fieldName,
                message: `${fieldName} must be at least ${constraints.minLength} characters`,
                code: 'VALIDATION_FAILED',
                source: 'unknown',
            });
        }

        // Check pattern
        if (constraints.pattern && !constraints.pattern.test(str)) {
            const patternDesc = constraints.patternName || 'required format';
            errors.push({
                field: fieldName,
                message: `${fieldName} does not match ${patternDesc}`,
                code: 'STRING_PATTERN_MISMATCH',
                source: 'unknown',
            });
        }

        // Check allowed values
        if (constraints.allowedValues && !constraints.allowedValues.includes(str)) {
            errors.push({
                field: fieldName,
                message: `${fieldName} must be one of: ${constraints.allowedValues.join(', ')}`,
                code: 'VALIDATION_FAILED',
                source: 'unknown',
            });
        }

        if (errors.length > 0) {
            throw this.createError(errors, fieldName);
        }

        return str;
    }

    /**
   * Validate using a predefined safe pattern.
   */
    validatePattern(
        value: unknown,
        patternName: keyof typeof SAFE_PATTERNS,
        fieldName?: string,
        additionalConstraints: { minLength?: number; maxLength?: number } = {}
    ): string {
        const pattern = SAFE_PATTERNS[patternName];
        const name = fieldName || patternName;

        return this.validate(value, {
            pattern,
            patternName: patternName.replace(/([A-Z])/g, ' $1').toLowerCase().trim(),
            ...additionalConstraints,
        }, name);
    }

    /**
   * Validate a model name (e.g., "gpt-4o", "claude-3-opus-20240229").
   */
    validateModelName(value: unknown, fieldName: string = 'model'): string {
        return this.validatePattern(value, 'modelName', fieldName, {
            minLength: 1,
            maxLength: 100,
        });
    }

    /**
   * Validate an identifier (variable name, etc.).
   */
    validateIdentifier(value: unknown, fieldName: string = 'identifier'): string {
        return this.validatePattern(value, 'identifier', fieldName, {
            minLength: 1,
            maxLength: 64,
        });
    }

    /**
   * Validate a filename (no path separators).
   */
    validateFilename(value: unknown, fieldName: string = 'filename'): string {
        return this.validatePattern(value, 'filename', fieldName, {
            minLength: 1,
            maxLength: 255,
        });
    }

    /**
   * Validate an enum-like string value.
   */
    validateEnum<T extends string>(
        value: unknown,
        allowedValues: readonly T[],
        fieldName: string,
        options: { caseSensitive?: boolean } = {}
    ): T {
        const { caseSensitive = true } = options;

        if (typeof value !== 'string') {
            throw new Error(`${fieldName} must be a string`);
        }

        const normalizedValue = caseSensitive ? value : value.toLowerCase();
        const normalizedAllowed = caseSensitive 
            ? allowedValues 
            : allowedValues.map(v => v.toLowerCase());

        const index = normalizedAllowed.indexOf(normalizedValue as T);
        if (index === -1) {
            throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
        }

        return allowedValues[index];
    }

    /**
   * Sanitize a string by removing dangerous characters (for logging, etc.).
   */
    sanitize(value: string, maxLength: number = 100): string {
        /* eslint-disable no-control-regex */
        return value
            .substring(0, maxLength)
            .replace(/[\x00-\x1f\x7f]/g, '') // Remove control chars
            .replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI escapes
        /* eslint-enable no-control-regex */
    }

    /**
   * Check if a string appears to contain injection attempts.
   */
    detectInjection(value: string): { suspicious: boolean; reason?: string } {
        if (DANGEROUS_PATTERNS.sqlInjection.test(value)) {
            return { suspicious: true, reason: 'potential SQL injection' };
        }
        if (DANGEROUS_PATTERNS.shellMeta.test(value)) {
            return { suspicious: true, reason: 'shell metacharacters' };
        }
        if (DANGEROUS_PATTERNS.ansiEscape.test(value)) {
            return { suspicious: true, reason: 'ANSI escape sequences' };
        }
        return { suspicious: false };
    }

    private createError(errors: SecurityValidationError[], context: string): Error {
        const error = new Error(
            `String validation failed for ${context}: ${errors.map(e => e.message).join('; ')}`
        );
        (error as { errors?: SecurityValidationError[]; code?: string }).errors = errors;
        (error as { errors?: SecurityValidationError[]; code?: string }).code = 'STRING_VALIDATION_ERROR';
        return error;
    }
}

/**
 * Global StringGuard instance.
 */
let defaultStringGuard: StringGuard | null = null;

/**
 * Get the default StringGuard instance.
 */
export function getStringGuard(): StringGuard {
    if (!defaultStringGuard) {
        defaultStringGuard = new StringGuard();
    }
    return defaultStringGuard;
}

/**
 * Create a new StringGuard with custom options.
 */
export function createStringGuard(options: Partial<StringSecurityOptions>): StringGuard {
    return new StringGuard(options);
}

