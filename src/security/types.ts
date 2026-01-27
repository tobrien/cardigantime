/**
 * Security profile levels that determine validation strictness.
 */
export type SecurityProfile = 'development' | 'production' | 'custom';

/**
 * Path security configuration options.
 */
export interface PathSecurityOptions {
  /** Allowed base directories for path resolution */
  allowedBaseDirs?: string[];
  /** Maximum path length in characters */
  maxPathLength?: number;
  /** Allowed file extensions (e.g., ['.yaml', '.json']) */
  allowedExtensions?: string[];
  /** Whether to allow hidden files (dotfiles) */
  allowHiddenFiles?: boolean;
  /** Whether to resolve and validate symlinks */
  validateSymlinks?: boolean;
  /** Whether to allow absolute paths */
  allowAbsolutePaths?: boolean;
}

/**
 * Numeric security configuration options.
 */
export interface NumericSecurityOptions {
  /** Whether to require explicit min/max bounds */
  requireBounds?: boolean;
  /** Default minimum value if not specified */
  defaultMin?: number;
  /** Default maximum value if not specified */
  defaultMax?: number;
  /** Whether to allow NaN values */
  allowNaN?: boolean;
  /** Whether to allow Infinity values */
  allowInfinity?: boolean;
}

/**
 * String security configuration options.
 */
export interface StringSecurityOptions {
  /** Maximum string length */
  maxLength?: number;
  /** Whether to allow null bytes */
  allowNullBytes?: boolean;
  /** Whether to allow control characters */
  allowControlChars?: boolean;
  /** Default pattern for validation */
  defaultPattern?: RegExp;
}

/**
 * Complete security validation configuration.
 */
export interface SecurityValidationConfig {
  /** Security profile to use */
  profile: SecurityProfile;
  /** Path security settings */
  paths: PathSecurityOptions;
  /** Numeric security settings */
  numbers: NumericSecurityOptions;
  /** Strings security settings */
  strings: StringSecurityOptions;
  /** Whether validation failures should throw or warn */
  failOnError: boolean;
  /** Whether to log security events */
  auditLogging: boolean;
}

/**
 * Field-level security metadata that can be attached to schema fields.
 */
export interface SecureFieldOptions {
  /** Whether this field contains a path */
  isPath?: boolean;
  /** Path security options for this specific field */
  pathOptions?: PathSecurityOptions;
  /** Whether this field should be treated as sensitive */
  sensitive?: boolean;
  /** Custom validation function */
  customValidator?: (value: unknown) => boolean | string;
}

/**
 * Result of a security validation operation.
 */
export interface SecurityValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors if any */
  errors: SecurityValidationError[];
  /** Warnings (used in development profile) */
  warnings: SecurityValidationWarning[];
  /** Source of the validated value */
  source: 'cli' | 'config' | 'default' | 'unknown';
}

/**
 * Security validation error details.
 */
export interface SecurityValidationError {
  /** Field path in dot notation */
  field: string;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: SecurityErrorCode;
  /** The invalid value (sanitized) */
  value?: string;
  /** Source of the invalid value */
  source: 'cli' | 'config' | 'default' | 'unknown';
}

/**
 * Security validation warning (non-fatal in development mode).
 */
export interface SecurityValidationWarning {
  /** Field path in dot notation */
  field: string;
  /** Warning message */
  message: string;
  /** Warning code */
  code: SecurityWarningCode;
}

/**
 * Error codes for security validation failures.
 */
export type SecurityErrorCode =
  | 'PATH_TRAVERSAL'
  | 'PATH_TOO_LONG'
  | 'PATH_INVALID_EXTENSION'
  | 'PATH_HIDDEN_FILE'
  | 'PATH_SYMLINK_ESCAPE'
  | 'PATH_OUTSIDE_ALLOWED'
  | 'PATH_ABSOLUTE_NOT_ALLOWED'
  | 'NUMBER_OUT_OF_RANGE'
  | 'NUMBER_NAN'
  | 'NUMBER_INFINITY'
  | 'NUMBER_MISSING_BOUNDS'
  | 'STRING_TOO_LONG'
  | 'STRING_NULL_BYTE'
  | 'STRING_CONTROL_CHAR'
  | 'STRING_PATTERN_MISMATCH'
  | 'VALIDATION_FAILED';

/**
 * Warning codes for security validation.
 */
export type SecurityWarningCode =
  | 'MISSING_PATH_BOUNDS'
  | 'MISSING_NUMERIC_BOUNDS'
  | 'PERMISSIVE_PATTERN'
  | 'DEVELOPMENT_MODE';

