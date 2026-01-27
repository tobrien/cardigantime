/**
 * Path traversal attack vectors.
 */
export const PATH_TRAVERSAL_VECTORS = [
    // Basic traversal
    '../etc/passwd',
    '..\\windows\\system32',
    '../../../../../../etc/passwd',
  
    // URL-encoded
    '%2e%2e/etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd',
    '%252e%252e/etc/passwd', // Double-encoded
  
    // Mixed encoding
    '.%2e/etc/passwd',
    '%2e./etc/passwd',
    '..%2fetc/passwd',
  
    // Windows-specific
    '..\\..\\..\\windows\\system32',
  
    // Edge cases
    './../../',
    './../..',
];

/**
 * Numeric attack vectors.
 */
export const NUMERIC_ATTACK_VECTORS = [
    // Extremes
    Number.MAX_VALUE,
    Number.MIN_VALUE,
    Number.MAX_SAFE_INTEGER + 1,
    Number.MIN_SAFE_INTEGER - 1,
  
    // Special values
    NaN,
    Infinity,
    -Infinity,
  
    // Edge integers
    0,
    -0,
    2147483647,  // INT32_MAX
    2147483648,  // INT32_MAX + 1
    -2147483648, // INT32_MIN
    -2147483649, // INT32_MIN - 1
  
    // Float precision issues
    0.1 + 0.2, // 0.30000000000000004
    Number.EPSILON,
];

/**
 * String injection attack vectors.
 */
export const STRING_INJECTION_VECTORS = [
    // Null bytes
    'hello\0world',
    'test\x00injection',
  
    // Control characters
    'hello\x07bell',
    'test\x1b[31mred',
    '\x00\x01\x02\x03',
  
    // ANSI escape sequences
    '\x1b[2J', // Clear screen
    '\x1b[0m', // Reset
    '\x1b]0;title\x07', // Window title
  
    // SQL injection patterns
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "1; SELECT * FROM passwords",
  
    // Shell metacharacters
    '; rm -rf /',
    '| cat /etc/passwd',
    '`cat /etc/passwd`',
    '$(cat /etc/passwd)',
    '&& malicious',
  
    // Template injection
    '${process.env.SECRET}',
    '{{constructor.constructor("return process")()}}',
  
    // Length attacks
    'a'.repeat(10000),
    'a'.repeat(100000),
];

/**
 * Model name attack vectors.
 */
export const MODEL_NAME_VECTORS = [
    // Valid
    { value: 'gpt-4o', shouldPass: true },
    { value: 'claude-3-opus-20240229', shouldPass: true },
    { value: 'llama-2-70b', shouldPass: true },
  
    // Invalid - path traversal (these contain / which is valid in model names for org/model format)
    { value: '../gpt-4', shouldPass: false },
    // Note: 'gpt-4/../../../etc' actually matches the model pattern since it allows / - it would be caught by path validation
  
    // Invalid - shell injection
    { value: 'gpt-4; rm -rf /', shouldPass: false },
    { value: 'gpt-4 | cat', shouldPass: false },
  
    // Invalid - null bytes
    { value: 'gpt-4\0malicious', shouldPass: false },
];

/**
 * Helper to test all vectors against a validator.
 */
export function testAllVectors<T>(
    vectors: T[],
    validator: (v: T) => boolean,
    expectation: boolean
): { passed: boolean; failures: T[] } {
    const failures: T[] = [];
  
    for (const vector of vectors) {
        try {
            const result = validator(vector);
            if (result !== expectation) {
                failures.push(vector);
            }
        } catch {
            if (expectation === true) {
                failures.push(vector);
            }
        }
    }
  
    return {
        passed: failures.length === 0,
        failures,
    };
}

