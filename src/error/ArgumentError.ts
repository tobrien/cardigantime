/**
 * Error thrown when CLI arguments or function parameters are invalid.
 * 
 * This error provides specific context about which argument failed validation
 * and why, making it easier for users to fix their command-line usage or
 * for developers to debug parameter issues.
 * 
 * @example
 * ```typescript
 * throw new ArgumentError('config-directory', 'Path cannot be empty');
 * // Error message: "Path cannot be empty"
 * // error.argument: "config-directory"
 * ```
 */
export class ArgumentError extends Error {
    /** The name of the argument that caused the error */
    private argumentName: string;

    /**
     * Creates a new ArgumentError instance.
     * 
     * @param argumentName - The name of the invalid argument
     * @param message - Description of why the argument is invalid
     */
    constructor(argumentName: string, message: string) {
        super(`${message}`);
        this.name = 'ArgumentError';
        this.argumentName = argumentName;
    }

    /**
     * Gets the name of the argument that caused this error.
     * 
     * @returns The argument name
     */
    get argument(): string {
        return this.argumentName;
    }
}