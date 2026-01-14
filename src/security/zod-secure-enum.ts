import { z } from 'zod';

/**
 * Create a Zod schema for secure enum validation.
 * Unlike z.enum(), this provides better error messages and case handling.
 * 
 * @param values - Allowed enum values
 * @param options - Enum options
 * @returns Zod enum schema with security refinements
 * 
 * @example
 * ```typescript
 * const schema = z.object({
 *   logLevel: secureEnum(['debug', 'info', 'warn', 'error']),
 *   format: secureEnum(['json', 'yaml', 'xml'], { caseSensitive: false }),
 * });
 * ```
 */
export function secureEnum<T extends string>(
    values: readonly [T, ...T[]],
    options: {
    caseSensitive?: boolean;
  } = {}
) {
    const { caseSensitive = true } = options;

    if (!caseSensitive) {
        const lowerValues = values.map(v => v.toLowerCase());
        return z.string()
            .transform((s) => s.toLowerCase() as T)
            .refine(
                (s) => lowerValues.includes(s.toLowerCase()),
                { message: `Value must be one of: ${values.join(', ')}` }
            );
    }

    return z.enum(values).refine(
        () => true, // Always passes since z.enum already validates
        { message: `Value must be one of: ${values.join(', ')}` }
    );
}

