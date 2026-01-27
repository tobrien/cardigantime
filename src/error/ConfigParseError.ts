/**
 * Error thrown when configuration file parsing fails.
 * Provides detailed information about what went wrong during parsing.
 */
export class ConfigParseError extends Error {
    /**
     * The file path where the parse error occurred
     */
    public readonly filePath: string;

    /**
     * The original error that caused the parse failure
     */
    public readonly cause?: Error;

    /**
     * Creates a new ConfigParseError.
     * 
     * @param message - Human-readable error message
     * @param filePath - Path to the configuration file that failed to parse
     * @param cause - Optional underlying error that caused the parse failure
     */
    constructor(message: string, filePath: string, cause?: Error) {
        super(message);
        this.name = 'ConfigParseError';
        this.filePath = filePath;
        this.cause = cause;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ConfigParseError);
        }
    }

    /**
     * Returns a detailed error message including file path and cause.
     */
    toString(): string {
        let result = `${this.name}: ${this.message}`;
        if (this.filePath) {
            result += `\n  File: ${this.filePath}`;
        }
        if (this.cause) {
            result += `\n  Cause: ${this.cause.message}`;
        }
        return result;
    }
}
