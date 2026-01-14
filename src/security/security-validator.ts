import { z } from 'zod';
import { CLIValidator, createCLIValidator } from './cli-validator';
import { ConfigValidator, createConfigValidator, ConfigValueSource } from './config-validator';
import { PathGuard, createPathGuard } from './path-guard';
import { NumericGuard, createNumericGuard } from './numeric-guard';
import { StringGuard, createStringGuard } from './string-guard';
import { 
    SecurityValidationConfig, 
    SecurityValidationResult, 
    SecurityValidationError,
    SecurityProfile 
} from './types';
import { DEVELOPMENT_SECURITY_CONFIG, PRODUCTION_SECURITY_CONFIG, mergeSecurityConfig } from './defaults';
import { Logger } from '../types';

/**
 * Aggregated validation result from all sources.
 */
export interface AggregatedValidationResult {
  /** Overall validation status */
  valid: boolean;
  /** All errors from all sources */
  errors: SecurityValidationError[];
  /** All warnings from all sources */
  warnings: SecurityValidationResult['warnings'];
  /** Results by source */
  bySource: {
    cli?: SecurityValidationResult;
    config?: SecurityValidationResult;
    defaults?: SecurityValidationResult;
  };
}

/**
 * SecurityValidator provides unified security validation across all input sources.
 */
export class SecurityValidator {
    private config: SecurityValidationConfig;
    private cliValidator: CLIValidator;
    private configValidator: ConfigValidator;
    private pathGuard: PathGuard;
    private numericGuard: NumericGuard;
    private stringGuard: StringGuard;
    private logger?: Logger;
    private schemaRegistered: boolean = false;

    constructor(config: Partial<SecurityValidationConfig> = {}, logger?: Logger) {
        this.config = mergeSecurityConfig(config, config.profile as 'development' | 'production' || 'development');
        this.logger = logger;
    
        this.cliValidator = createCLIValidator(this.config);
        this.configValidator = createConfigValidator(this.config);
        this.pathGuard = createPathGuard(this.config.paths);
        this.numericGuard = createNumericGuard(this.config.numbers);
        this.stringGuard = createStringGuard(this.config.strings);
    }

    /**
   * Register a Zod schema for validation.
   * Extracts security metadata and configures both CLI and config validators.
   */
    registerSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>): this {
        this.cliValidator.registerFromSchema(schema);
        this.configValidator.registerFromSchema(schema);
        this.schemaRegistered = true;
        return this;
    }

    /**
   * Check if a schema has been registered.
   */
    hasSchema(): boolean {
        return this.schemaRegistered;
    }

    /**
   * Validate CLI arguments.
   */
    validateCLI(args: Record<string, unknown>): SecurityValidationResult {
        const result = this.cliValidator.validateArgs(args);
        this.logResult('CLI', result);
        return result;
    }

    /**
   * Validate configuration file content.
   */
    validateConfig(
        config: Record<string, unknown>,
        sources?: Map<string, ConfigValueSource>
    ): SecurityValidationResult {
        const result = this.configValidator.validateConfig(config, sources);
        this.logResult('config', result);
        return result;
    }

    /**
   * Validate a single config file before merging.
   */
    validateConfigFile(
        content: Record<string, unknown>,
        filePath: string,
        level: number = 0
    ): SecurityValidationResult {
        const result = this.configValidator.validateSingleFile(content, filePath, level);
        this.logResult(`config file ${filePath}`, result);
        return result;
    }

    /**
   * Validate the merged configuration (CLI + config file + defaults).
   * This is the main entry point for validation after all merging is complete.
   */
    validateMerged(
        merged: Record<string, unknown>,
        cliArgs: Record<string, unknown>,
        configValues: Record<string, unknown>,
        configSources?: Map<string, ConfigValueSource>
    ): AggregatedValidationResult {
        const bySource: AggregatedValidationResult['bySource'] = {};
        const allErrors: SecurityValidationError[] = [];
        const allWarnings: SecurityValidationResult['warnings'] = [];

        // Validate CLI arguments
        bySource.cli = this.cliValidator.validateArgs(cliArgs);
        allErrors.push(...bySource.cli.errors);
        allWarnings.push(...bySource.cli.warnings);

        // Validate config values
        bySource.config = this.configValidator.validateConfig(configValues, configSources);
        allErrors.push(...bySource.config.errors);
        allWarnings.push(...bySource.config.warnings);

        // Additional cross-source validation
        const crossValidation = this.validateCrossSources(merged, cliArgs, configValues);
        allErrors.push(...crossValidation.errors);
        allWarnings.push(...crossValidation.warnings);

        const valid = allErrors.length === 0 || !this.config.failOnError;

        const result: AggregatedValidationResult = {
            valid,
            errors: allErrors,
            warnings: allWarnings,
            bySource,
        };

        this.logAggregatedResult(result);
        return result;
    }

    /**
   * Validate a single value (for ad-hoc validation).
   */
    validateValue(
        value: unknown,
        type: 'path' | 'number' | 'string',
        options: {
      fieldName?: string;
      bounds?: { min: number; max: number; integer?: boolean };
      pattern?: RegExp;
    } = {}
    ): void {
        const fieldName = options.fieldName || 'value';

        switch (type) {
            case 'path':
                if (typeof value === 'string') {
                    this.pathGuard.validate(value, fieldName);
                }
                break;
            case 'number':
                if (options.bounds) {
                    this.numericGuard.validate(value, options.bounds, fieldName);
                }
                break;
            case 'string':
                this.stringGuard.validate(value, { pattern: options.pattern }, fieldName);
                break;
        }
    }

    /**
   * Get the current security profile.
   */
    getProfile(): SecurityProfile {
        return this.config.profile;
    }

    /**
   * Check if security validation should fail on errors.
   */
    shouldFailOnError(): boolean {
        return this.config.failOnError;
    }

    /**
   * Perform cross-source validation (detect conflicts, suspicious patterns).
   */
    private validateCrossSources(
        merged: Record<string, unknown>,
        cliArgs: Record<string, unknown>,
        configValues: Record<string, unknown>
    ): { errors: SecurityValidationError[]; warnings: SecurityValidationResult['warnings'] } {
        const errors: SecurityValidationError[] = [];
        const warnings: SecurityValidationResult['warnings'] = [];

        // Warn if CLI overrides secure config values
        for (const key of Object.keys(cliArgs)) {
            if (cliArgs[key] !== undefined && configValues[key] !== undefined) {
                // This is informational, not an error
                this.logger?.debug?.(`CLI argument '${key}' overrides config file value`);
            }
        }

        // Check for potentially suspicious patterns in merged config
        if (this.config.profile === 'production') {
            // Example: warn if paths point outside expected directories
            this.checkSuspiciousPatterns(merged, warnings);
        }

        return { errors, warnings };
    }

    /**
   * Check for suspicious patterns in configuration.
   */
    private checkSuspiciousPatterns(
        config: Record<string, unknown>,
        warnings: SecurityValidationResult['warnings']
    ): void {
    // Check for paths that might be user-controlled
        const checkPath = (value: unknown, path: string) => {
            if (typeof value === 'string') {
                // Warn about home directory expansion
                if (value.includes('~')) {
                    warnings.push({
                        field: path,
                        message: `Path contains home directory shortcut '~' which may expand unexpectedly`,
                        code: 'PERMISSIVE_PATTERN',
                    });
                }
                // Warn about environment variable references
                if (value.includes('$')) {
                    warnings.push({
                        field: path,
                        message: `Path contains environment variable reference which may be user-controlled`,
                        code: 'PERMISSIVE_PATTERN',
                    });
                }
            }
        };

        this.walkObject(config, '', (path, value) => checkPath(value, path));
    }

    /**
   * Walk an object recursively.
   */
    private walkObject(
        obj: Record<string, unknown>,
        prefix: string,
        callback: (path: string, value: unknown) => void
    ): void {
        for (const [key, value] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${key}` : key;
            callback(path, value);

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                this.walkObject(value as Record<string, unknown>, path, callback);
            }
        }
    }

    /**
   * Log validation result.
   */
    private logResult(source: string, result: SecurityValidationResult): void {
        if (!this.config.auditLogging || !this.logger) return;

        if (result.errors.length > 0) {
            this.logger.warn?.(`Security validation failed for ${source}: ${result.errors.length} error(s)`);
            for (const error of result.errors) {
                this.logger.warn?.(`  - ${error.field}: ${error.message} [${error.code}]`);
            }
        }

        if (result.warnings.length > 0) {
            for (const warning of result.warnings) {
                this.logger.debug?.(`Security warning for ${source}: ${warning.field}: ${warning.message}`);
            }
        }
    }

    /**
   * Log aggregated validation result.
   */
    private logAggregatedResult(result: AggregatedValidationResult): void {
        if (!this.config.auditLogging || !this.logger) return;

        const totalErrors = result.errors.length;
        const totalWarnings = result.warnings.length;

        if (totalErrors > 0) {
            this.logger.warn?.(`Security validation completed with ${totalErrors} error(s) and ${totalWarnings} warning(s)`);
        } else if (totalWarnings > 0) {
            this.logger.info?.(`Security validation passed with ${totalWarnings} warning(s)`);
        } else {
            this.logger.debug?.('Security validation passed');
        }
    }
}

/**
 * Create a security validator.
 */
export function createSecurityValidator(
    config?: Partial<SecurityValidationConfig>,
    logger?: Logger
): SecurityValidator {
    return new SecurityValidator(config, logger);
}

/**
 * Create a security validator for a specific profile.
 */
export function createSecurityValidatorForProfile(
    profile: 'development' | 'production',
    logger?: Logger
): SecurityValidator {
    const config = profile === 'production' ? PRODUCTION_SECURITY_CONFIG : DEVELOPMENT_SECURITY_CONFIG;
    return new SecurityValidator(config, logger);
}

