import { z } from 'zod';
import { StringSecurityOptions } from './types';

/**
 * Default string security options.
 */
const DEFAULT_STRING_OPTIONS: StringSecurityOptions = {
    maxLength: 1000,
    allowNullBytes: false,
    allowControlChars: false,
};

/**
 * Create a Zod schema for secure string validation.
 * 
 * @param options - String security options
 * @returns Zod string schema with security refinements
 * 
 * @example
 * ```typescript
 * const schema = z.object({
 *   apiKey: secureString({ minLength: 20, maxLength: 100 }),
 *   model: secureString({ pattern: /^[a-z0-9-]+$/i }),
 * });
 * ```
 */
export function secureString(
    options: Partial<StringSecurityOptions> & {
    minLength?: number;
    pattern?: RegExp;
  } = {}
) {
    const opts = { ...DEFAULT_STRING_OPTIONS, ...options };

    let schema = z.string();

    if (options.minLength !== undefined) {
        schema = schema.min(options.minLength, {
            message: `String must be at least ${options.minLength} characters`,
        });
    }

    if (opts.maxLength !== undefined) {
        schema = schema.max(opts.maxLength, {
            message: `String must be at most ${opts.maxLength} characters`,
        });
    }

    if (!opts.allowNullBytes) {
        schema = schema.refine(
            (s) => !s.includes('\0'),
            { message: 'String contains null bytes' }
        );
    }

    if (!opts.allowControlChars) {
    // Control characters except common whitespace (tab, newline, carriage return)
    // eslint-disable-next-line no-control-regex
        const controlCharPattern = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
        schema = schema.refine(
            (s) => !controlCharPattern.test(s),
            { message: 'String contains control characters' }
        );
    }

    if (options.pattern) {
        schema = schema.regex(options.pattern, {
            message: 'String does not match required pattern',
        });
    }

    return schema;
}

/**
 * Create a Zod schema for model names (e.g., "gpt-4o", "claude-3-opus").
 */
export function secureModelName() {
    return secureString({
        minLength: 1,
        maxLength: 100,
        pattern: /^[a-z0-9][-a-z0-9.:/]*$/i,
    });
}

/**
 * Create a Zod schema for environment variable names.
 */
export function secureEnvVarName() {
    return secureString({
        minLength: 1,
        maxLength: 128,
        pattern: /^[A-Z_][A-Z0-9_]*$/,
    });
}

/**
 * Create a Zod schema for safe identifiers (no special chars).
 */
export function secureIdentifier(maxLength: number = 64) {
    return secureString({
        minLength: 1,
        maxLength,
        pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    });
}

/**
 * Create a Zod schema for URLs.
 */
export function secureUrl(options: { allowedProtocols?: string[] } = {}) {
    const protocols = options.allowedProtocols || ['http', 'https'];
  
    return z.string()
        .url({ message: 'Invalid URL format' })
        .refine(
            (url) => {
                try {
                    const parsed = new URL(url);
                    return protocols.includes(parsed.protocol.replace(':', ''));
                } catch {
                    return false;
                }
            },
            { message: `URL protocol must be one of: ${protocols.join(', ')}` }
        )
        .refine(
            (url) => url.length <= 2048,
            { message: 'URL exceeds maximum length of 2048 characters' }
        );
}

