import { SecurityValidationConfig, SecurityProfile } from './types';
import { DEVELOPMENT_SECURITY_CONFIG, PRODUCTION_SECURITY_CONFIG } from './defaults';

/**
 * Profile presets for common scenarios.
 */
export const SECURITY_PROFILES: Record<SecurityProfile, SecurityValidationConfig> = {
    development: DEVELOPMENT_SECURITY_CONFIG,
    production: PRODUCTION_SECURITY_CONFIG,
    custom: DEVELOPMENT_SECURITY_CONFIG, // Custom starts with development as base
};

/**
 * Environment-based profile detection.
 */
export function detectProfile(): SecurityProfile {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    const cardigantimeEnv = process.env.CARDIGANTIME_SECURITY_PROFILE?.toLowerCase();

    // Explicit Cardigantime setting takes precedence
    if (cardigantimeEnv === 'production' || cardigantimeEnv === 'strict') {
        return 'production';
    }
    if (cardigantimeEnv === 'development' || cardigantimeEnv === 'permissive') {
        return 'development';
    }

    // Fall back to NODE_ENV
    if (nodeEnv === 'production' || nodeEnv === 'prod') {
        return 'production';
    }

    // Default to development
    return 'development';
}

/**
 * Get security configuration for a profile.
 */
export function getProfileConfig(profile: SecurityProfile): SecurityValidationConfig {
    return { ...SECURITY_PROFILES[profile] };
}

/**
 * Profile builder for custom configurations.
 */
export class SecurityProfileBuilder {
    private config: SecurityValidationConfig;

    constructor(baseProfile: 'development' | 'production' = 'development') {
        this.config = { ...SECURITY_PROFILES[baseProfile], profile: 'custom' };
    }

    /**
   * Enable fail-fast mode (throw on first error).
   */
    failFast(enabled: boolean = true): this {
        this.config.failOnError = enabled;
        return this;
    }

    /**
   * Enable audit logging.
   */
    withAuditLogging(enabled: boolean = true): this {
        this.config.auditLogging = enabled;
        return this;
    }

    /**
   * Set path security options.
   */
    withPathSecurity(options: Partial<SecurityValidationConfig['paths']>): this {
        this.config.paths = { ...this.config.paths, ...options };
        return this;
    }

    /**
   * Set numeric security options.
   */
    withNumericSecurity(options: Partial<SecurityValidationConfig['numbers']>): this {
        this.config.numbers = { ...this.config.numbers, ...options };
        return this;
    }

    /**
   * Set string security options.
   */
    withStringSecurity(options: Partial<SecurityValidationConfig['strings']>): this {
        this.config.strings = { ...this.config.strings, ...options };
        return this;
    }

    /**
   * Restrict paths to specific base directories.
   */
    restrictPathsTo(directories: string[]): this {
        this.config.paths.allowedBaseDirs = directories;
        return this;
    }

    /**
   * Allow only specific file extensions.
   */
    allowExtensions(extensions: string[]): this {
        this.config.paths.allowedExtensions = extensions;
        return this;
    }

    /**
   * Require explicit numeric bounds.
   */
    requireNumericBounds(required: boolean = true): this {
        this.config.numbers.requireBounds = required;
        return this;
    }

    /**
   * Set maximum string length.
   */
    maxStringLength(length: number): this {
        this.config.strings.maxLength = length;
        return this;
    }

    /**
   * Create production-like profile with specific overrides.
   */
    productionLike(overrides: Partial<SecurityValidationConfig> = {}): this {
        this.config = { 
            ...SECURITY_PROFILES.production, 
            profile: 'custom',
            ...overrides 
        };
        return this;
    }

    /**
   * Build the final configuration.
   */
    build(): SecurityValidationConfig {
        return { ...this.config };
    }
}

/**
 * Create a custom security profile.
 */
export function createProfile(base: 'development' | 'production' = 'development'): SecurityProfileBuilder {
    return new SecurityProfileBuilder(base);
}

/**
 * Preset profiles for common scenarios.
 */
export const presets = {
    /**
   * Local development with warnings only.
   */
    localDevelopment: () => createProfile('development')
        .failFast(false)
        .withAuditLogging(true)
        .build(),

    /**
   * CI/CD testing with strict validation but detailed errors.
   */
    testing: () => createProfile('production')
        .failFast(true)
        .withAuditLogging(true)
        .build(),

    /**
   * Production deployment with maximum security.
   */
    productionDeployment: () => createProfile('production')
        .failFast(true)
        .withAuditLogging(true)
        .withPathSecurity({
            allowHiddenFiles: false,
            validateSymlinks: true,
            maxPathLength: 300,
        })
        .build(),

    /**
   * Library usage (embedded in other applications).
   */
    libraryMode: () => createProfile('development')
        .failFast(false)
        .withAuditLogging(false)
        .build(),

    /**
   * Config file only (no CLI, just validating config files).
   */
    configFileOnly: () => createProfile('production')
        .failFast(true)
        .withPathSecurity({
            allowedExtensions: ['.yaml', '.yml', '.json'],
        })
        .build(),
};

/**
 * Runtime profile switching support.
 */
export class ProfileManager {
    private currentProfile: SecurityProfile;
    private currentConfig: SecurityValidationConfig;
    private listeners: ((profile: SecurityProfile, config: SecurityValidationConfig) => void)[] = [];

    constructor(initialProfile?: SecurityProfile) {
        this.currentProfile = initialProfile || detectProfile();
        this.currentConfig = getProfileConfig(this.currentProfile);
    }

    /**
   * Get current profile.
   */
    getProfile(): SecurityProfile {
        return this.currentProfile;
    }

    /**
   * Get current configuration.
   */
    getConfig(): SecurityValidationConfig {
        return { ...this.currentConfig };
    }

    /**
   * Switch to a different profile.
   */
    switchProfile(profile: SecurityProfile): void {
        this.currentProfile = profile;
        this.currentConfig = getProfileConfig(profile);
        this.notifyListeners();
    }

    /**
   * Apply a custom configuration.
   */
    applyCustomConfig(config: SecurityValidationConfig): void {
        this.currentProfile = 'custom';
        this.currentConfig = { ...config };
        this.notifyListeners();
    }

    /**
   * Subscribe to profile changes.
   */
    onProfileChange(listener: (profile: SecurityProfile, config: SecurityValidationConfig) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index >= 0) this.listeners.splice(index, 1);
        };
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener(this.currentProfile, this.currentConfig);
        }
    }
}

/**
 * Global profile manager instance.
 */
let globalProfileManager: ProfileManager | null = null;

/**
 * Get the global profile manager.
 */
export function getProfileManager(): ProfileManager {
    if (!globalProfileManager) {
        globalProfileManager = new ProfileManager();
    }
    return globalProfileManager;
}

