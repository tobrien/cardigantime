import { z } from 'zod';
import { NumericSecurityOptions } from './types';

/**
 * Default numeric security options.
 */
const DEFAULT_NUMERIC_OPTIONS: NumericSecurityOptions = {
    requireBounds: true,
    allowNaN: false,
    allowInfinity: false,
};

/**
 * Create a Zod schema for secure numeric validation with required bounds.
 * 
 * @param min - Minimum allowed value (required in production)
 * @param max - Maximum allowed value (required in production)
 * @param options - Additional numeric security options
 * @returns Zod number schema with security refinements
 * 
 * @example
 * ```typescript
 * const schema = z.object({
 *   timeout: secureNumber(100, 60000, { integer: true }),
 *   temperature: secureNumber(0, 1),
 * });
 * ```
 */
export function secureNumber(
    min: number,
    max: number,
    options: Partial<NumericSecurityOptions> & { integer?: boolean } = {}
) {
    const opts = { ...DEFAULT_NUMERIC_OPTIONS, ...options };

    let schema = z.number()
        .min(min, { message: `Value must be at least ${min}` })
        .max(max, { message: `Value must be at most ${max}` });

    if (options.integer) {
        schema = schema.int({ message: 'Value must be an integer' });
    }

    if (!opts.allowNaN) {
        schema = schema.refine(
            (n) => !Number.isNaN(n),
            { message: 'NaN is not allowed' }
        );
    }

    if (!opts.allowInfinity) {
        schema = schema.refine(
            (n) => Number.isFinite(n),
            { message: 'Infinity is not allowed' }
        );
    }

    return schema;
}

/**
 * Create a Zod schema for a port number (1-65535).
 */
export function securePort() {
    return secureNumber(1, 65535, { integer: true });
}

/**
 * Create a Zod schema for a timeout in milliseconds.
 * @param maxMs - Maximum timeout in milliseconds (default: 5 minutes)
 */
export function secureTimeout(maxMs: number = 300000) {
    return secureNumber(0, maxMs, { integer: true });
}

/**
 * Create a Zod schema for a percentage (0-100).
 */
export function securePercentage() {
    return secureNumber(0, 100);
}

/**
 * Create a Zod schema for a retry count.
 * @param maxRetries - Maximum retries allowed (default: 10)
 */
export function secureRetryCount(maxRetries: number = 10) {
    return secureNumber(0, maxRetries, { integer: true });
}

