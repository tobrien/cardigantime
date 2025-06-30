/**
 * Error thrown when configuration validation fails
 */
export class ConfigurationError extends Error {
    public readonly errorType: 'validation' | 'schema' | 'extra_keys';
    public readonly details?: any;
    public readonly configPath?: string;

    constructor(
        errorType: 'validation' | 'schema' | 'extra_keys',
        message: string,
        details?: any,
        configPath?: string
    ) {
        super(message);
        this.name = 'ConfigurationError';
        this.errorType = errorType;
        this.details = details;
        this.configPath = configPath;
    }

    /**
     * Creates a validation error for when config doesn't match the schema
     */
    static validation(message: string, zodError?: any, configPath?: string): ConfigurationError {
        return new ConfigurationError('validation', message, zodError, configPath);
    }

    /**
     * Creates an error for when extra/unknown keys are found
     */
    static extraKeys(extraKeys: string[], allowedKeys: string[], configPath?: string): ConfigurationError {
        const message = `Unknown configuration keys found: ${extraKeys.join(', ')}. Allowed keys are: ${allowedKeys.join(', ')}`;
        return new ConfigurationError('extra_keys', message, { extraKeys, allowedKeys }, configPath);
    }

    /**
     * Creates a schema error for when the configuration schema itself is invalid
     */
    static schema(message: string, details?: any): ConfigurationError {
        return new ConfigurationError('schema', message, details);
    }
} 