import { SecurityValidationConfig } from './types';

/**
 * Development profile - permissive, warnings instead of errors.
 */
export const DEVELOPMENT_SECURITY_CONFIG: SecurityValidationConfig = {
    profile: 'development',
    paths: {
        allowedBaseDirs: [], // Empty = allow all (warning issued)
        maxPathLength: 1000,
        allowedExtensions: [], // Empty = allow all (warning issued)
        allowHiddenFiles: true,
        validateSymlinks: false,
        allowAbsolutePaths: true,
    },
    numbers: {
        requireBounds: false,
        defaultMin: Number.MIN_SAFE_INTEGER,
        defaultMax: Number.MAX_SAFE_INTEGER,
        allowNaN: false,
        allowInfinity: false,
    },
    strings: {
        maxLength: 10000,
        allowNullBytes: false,
        allowControlChars: false,
    },
    failOnError: false,
    auditLogging: true,
};

/**
 * Production profile - strict validation, fail on any violation.
 */
export const PRODUCTION_SECURITY_CONFIG: SecurityValidationConfig = {
    profile: 'production',
    paths: {
        maxPathLength: 500,
        allowHiddenFiles: false,
        validateSymlinks: true,
        allowAbsolutePaths: false,
    },
    numbers: {
        requireBounds: true,
        allowNaN: false,
        allowInfinity: false,
    },
    strings: {
        maxLength: 5000,
        allowNullBytes: false,
        allowControlChars: false,
    },
    failOnError: true,
    auditLogging: true,
};

/**
 * Get security configuration for a profile.
 */
export function getSecurityConfig(profile: 'development' | 'production'): SecurityValidationConfig {
    return profile === 'production' 
        ? PRODUCTION_SECURITY_CONFIG 
        : DEVELOPMENT_SECURITY_CONFIG;
}

/**
 * Merge user config with defaults for a profile.
 */
export function mergeSecurityConfig(
    userConfig: Partial<SecurityValidationConfig>,
    profile: 'development' | 'production' = 'development'
): SecurityValidationConfig {
    const baseConfig = getSecurityConfig(profile);
    return {
        ...baseConfig,
        ...userConfig,
        paths: { ...baseConfig.paths, ...userConfig.paths },
        numbers: { ...baseConfig.numbers, ...userConfig.numbers },
        strings: { ...baseConfig.strings, ...userConfig.strings },
    };
}

