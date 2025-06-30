/**
 * Error thrown when file system operations fail
 */
export class FileSystemError extends Error {
    public readonly errorType: 'not_found' | 'not_readable' | 'not_writable' | 'creation_failed' | 'operation_failed';
    public readonly path: string;
    public readonly operation: string;
    public readonly originalError?: Error;

    constructor(
        errorType: 'not_found' | 'not_readable' | 'not_writable' | 'creation_failed' | 'operation_failed',
        message: string,
        path: string,
        operation: string,
        originalError?: Error
    ) {
        super(message);
        this.name = 'FileSystemError';
        this.errorType = errorType;
        this.path = path;
        this.operation = operation;
        this.originalError = originalError;
    }

    /**
     * Creates an error for when a required directory doesn't exist
     */
    static directoryNotFound(path: string, isRequired: boolean = false): FileSystemError {
        const message = isRequired
            ? 'Configuration directory does not exist and is required'
            : 'Configuration directory not found';
        return new FileSystemError('not_found', message, path, 'directory_access');
    }

    /**
     * Creates an error for when a directory exists but isn't readable
     */
    static directoryNotReadable(path: string): FileSystemError {
        const message = 'Configuration directory exists but is not readable';
        return new FileSystemError('not_readable', message, path, 'directory_read');
    }

    /**
     * Creates an error for directory creation failures
     */
    static directoryCreationFailed(path: string, originalError: Error): FileSystemError {
        const message = 'Failed to create directory: ' + (originalError.message || 'Unknown error');
        return new FileSystemError('creation_failed', message, path, 'directory_create', originalError);
    }

    /**
     * Creates an error for file operation failures (glob, etc.)
     */
    static operationFailed(operation: string, path: string, originalError: Error): FileSystemError {
        const message = `Failed to ${operation}: ${originalError.message || 'Unknown error'}`;
        return new FileSystemError('operation_failed', message, path, operation, originalError);
    }

    /**
     * Creates an error for when a file is not found
     */
    static fileNotFound(path: string): FileSystemError {
        const message = 'Configuration file not found';
        return new FileSystemError('not_found', message, path, 'file_read');
    }
} 