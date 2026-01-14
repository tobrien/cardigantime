import { NumericSecurityOptions, SecurityValidationError } from './types';

/**
 * Common numeric ranges for security-sensitive options.
 */
export const SAFE_RANGES = {
    /** Port numbers: 1-65535 */
    port: { min: 1, max: 65535 },
    /** Timeout in ms: 0 to 5 minutes */
    timeout: { min: 0, max: 300000 },
    /** Retry count: 0-10 */
    retries: { min: 0, max: 10 },
    /** Percentage: 0-100 */
    percentage: { min: 0, max: 100 },
    /** Concurrency: 1-100 */
    concurrency: { min: 1, max: 100 },
    /** Temperature (AI): 0-2 */
    temperature: { min: 0, max: 2 },
    /** Max tokens: 1 to 1M */
    maxTokens: { min: 1, max: 1000000 },
    /** File size in bytes: 0 to 100MB */
    fileSize: { min: 0, max: 100 * 1024 * 1024 },
    /** Line count: 0 to 1M */
    lineCount: { min: 0, max: 1000000 },
} as const;

/**
 * NumericGuard provides secure numeric validation with bounds checking.
 */
export class NumericGuard {
    private options: NumericSecurityOptions;

    constructor(options: Partial<NumericSecurityOptions> = {}) {
        this.options = {
            requireBounds: true,
            allowNaN: false,
            allowInfinity: false,
            defaultMin: Number.MIN_SAFE_INTEGER,
            defaultMax: Number.MAX_SAFE_INTEGER,
            ...options,
        };
    }

    /**
   * Validate a numeric value against bounds and edge cases.
   * 
   * @param value - The value to validate (can be string for CLI parsing)
   * @param bounds - Min/max bounds for the value
   * @param fieldName - Field name for error messages
   * @returns The validated number
   * @throws Error if validation fails
   */
    validate(
        value: unknown,
        bounds: { min: number; max: number; integer?: boolean },
        fieldName: string = 'value'
    ): number {
        const errors: SecurityValidationError[] = [];

        // Parse string values
        let num: number;
        if (typeof value === 'string') {
            num = bounds.integer ? parseInt(value, 10) : parseFloat(value);
        } else if (typeof value === 'number') {
            num = value;
        } else {
            errors.push({
                field: fieldName,
                message: `${fieldName} must be a number, received ${typeof value}`,
                code: 'VALIDATION_FAILED',
                source: 'unknown',
            });
            throw this.createError(errors, fieldName);
        }

        // Check NaN
        if (Number.isNaN(num)) {
            if (!this.options.allowNaN) {
                errors.push({
                    field: fieldName,
                    message: `${fieldName} is NaN (not a number)`,
                    code: 'NUMBER_NAN',
                    source: 'unknown',
                });
            }
        }

        // Check Infinity
        if (!Number.isFinite(num)) {
            if (!this.options.allowInfinity) {
                errors.push({
                    field: fieldName,
                    message: `${fieldName} is infinite`,
                    code: 'NUMBER_INFINITY',
                    source: 'unknown',
                });
            }
        }

        // Check integer constraint
        if (bounds.integer && !Number.isInteger(num) && Number.isFinite(num)) {
            errors.push({
                field: fieldName,
                message: `${fieldName} must be an integer`,
                code: 'VALIDATION_FAILED',
                source: 'unknown',
            });
        }

        // Check bounds
        if (num < bounds.min) {
            errors.push({
                field: fieldName,
                message: `${fieldName} must be at least ${bounds.min}, received ${num}`,
                code: 'NUMBER_OUT_OF_RANGE',
                value: String(num),
                source: 'unknown',
            });
        }

        if (num > bounds.max) {
            errors.push({
                field: fieldName,
                message: `${fieldName} must be at most ${bounds.max}, received ${num}`,
                code: 'NUMBER_OUT_OF_RANGE',
                value: String(num),
                source: 'unknown',
            });
        }

        if (errors.length > 0) {
            throw this.createError(errors, fieldName);
        }

        return num;
    }

    /**
   * Validate using a predefined safe range.
   */
    validateRange(
        value: unknown,
        rangeName: keyof typeof SAFE_RANGES,
        fieldName?: string
    ): number {
        const range = SAFE_RANGES[rangeName];
        const name = fieldName || rangeName;
        const isInteger = ['port', 'retries', 'concurrency', 'maxTokens', 'lineCount'].includes(rangeName);
    
        return this.validate(value, { ...range, integer: isInteger }, name);
    }

    /**
   * Validate with optional default value.
   */
    validateWithDefault(
        value: unknown,
        bounds: { min: number; max: number; integer?: boolean },
        defaultValue: number,
        fieldName: string = 'value'
    ): number {
        if (value === undefined || value === null) {
            return defaultValue;
        }
        return this.validate(value, bounds, fieldName);
    }

    /**
   * Parse and validate a CLI numeric argument.
   */
    parseCliArg(
        value: string | undefined,
        bounds: { min: number; max: number; integer?: boolean; default?: number },
        fieldName: string
    ): number {
        if (value === undefined) {
            if (bounds.default !== undefined) {
                return bounds.default;
            }
            throw new Error(`${fieldName} is required`);
        }

        return this.validate(value, bounds, fieldName);
    }

    /**
   * Validate multiple numeric fields at once.
   */
    validateMany(
        values: Record<string, unknown>,
        schemas: Record<string, { min: number; max: number; integer?: boolean; optional?: boolean }>
    ): Record<string, number> {
        const result: Record<string, number> = {};
        const allErrors: SecurityValidationError[] = [];

        for (const [fieldName, schema] of Object.entries(schemas)) {
            const value = values[fieldName];
      
            if (value === undefined || value === null) {
                if (!schema.optional) {
                    allErrors.push({
                        field: fieldName,
                        message: `${fieldName} is required`,
                        code: 'VALIDATION_FAILED',
                        source: 'unknown',
                    });
                }
                continue;
            }

            try {
                result[fieldName] = this.validate(value, schema, fieldName);
            } catch (error: unknown) {
                const err = error as { errors?: SecurityValidationError[] };
                if (err.errors) {
                    allErrors.push(...err.errors);
                }
            }
        }

        if (allErrors.length > 0) {
            throw this.createError(allErrors, 'multiple fields');
        }

        return result;
    }

    private createError(errors: SecurityValidationError[], context: string): Error {
        const error = new Error(
            `Numeric validation failed for ${context}: ${errors.map(e => e.message).join('; ')}`
        );
        (error as { errors?: SecurityValidationError[]; code?: string }).errors = errors;
        (error as { errors?: SecurityValidationError[]; code?: string }).code = 'NUMERIC_VALIDATION_ERROR';
        return error;
    }
}

/**
 * Global NumericGuard instance.
 */
let defaultNumericGuard: NumericGuard | null = null;

/**
 * Get the default NumericGuard instance.
 */
export function getNumericGuard(): NumericGuard {
    if (!defaultNumericGuard) {
        defaultNumericGuard = new NumericGuard();
    }
    return defaultNumericGuard;
}

/**
 * Create a new NumericGuard with custom options.
 */
export function createNumericGuard(options: Partial<NumericSecurityOptions>): NumericGuard {
    return new NumericGuard(options);
}

