import { Command } from "commander";
import { ZodObject } from "zod";

import { z } from "zod";
import { SecurityValidationConfig } from "./security/types";

/**
 * Available features that can be enabled in Cardigantime.
 * Currently supports:
 * - 'config': Configuration file reading and validation
 * - 'hierarchical': Hierarchical configuration discovery and layering
 */
export type Feature = 'config' | 'hierarchical';

/**
 * Supported configuration file formats.
 * 
 * - 'yaml': YAML format (.yaml, .yml)
 * - 'json': JSON format (.json)
 * - 'javascript': JavaScript module (.js, .mjs, .cjs)
 * - 'typescript': TypeScript module (.ts, .mts, .cts)
 */
export enum ConfigFormat {
    YAML = 'yaml',
    JSON = 'json',
    JavaScript = 'javascript',
    TypeScript = 'typescript'
}

/**
 * Interface for format-specific configuration parsers.
 * Each parser is responsible for loading and parsing configuration from a specific format.
 * 
 * @template T - The type of the parsed configuration object
 */
export interface ConfigParser<T = unknown> {
    /** The format this parser handles */
    format: ConfigFormat;
    /** File extensions this parser supports (e.g., ['.yaml', '.yml']) */
    extensions: string[];
    /** 
     * Parses configuration content from a file.
     * 
     * @param content - The raw file content as a string
     * @param filePath - The absolute path to the configuration file
     * @returns Promise resolving to the parsed configuration object
     * @throws {Error} When parsing fails or content is invalid
     */
    parse(content: string, filePath: string): Promise<T>;
}

/**
 * Metadata about where a configuration value came from.
 * Used for tracking configuration sources and debugging.
 */
export interface ConfigSource {
    /** The format of the configuration file */
    format: ConfigFormat;
    /** Absolute path to the configuration file */
    filePath: string;
    /** The parsed configuration content */
    content: unknown;
    /** Timestamp when the configuration was loaded */
    loadedAt: Date;
}

/**
 * Defines how array fields should be merged in hierarchical configurations.
 * 
 * - 'override': Higher precedence arrays completely replace lower precedence arrays (default)
 * - 'append': Higher precedence array elements are appended to lower precedence arrays
 * - 'prepend': Higher precedence array elements are prepended to lower precedence arrays
 */
export type ArrayOverlapMode = 'override' | 'append' | 'prepend';

/**
 * Configuration for how fields should be merged in hierarchical configurations.
 * Maps field names (using dot notation) to their overlap behavior.
 * 
 * @example
 * ```typescript
 * const fieldOverlaps: FieldOverlapOptions = {
 *   'features': 'append',           // features arrays will be combined by appending
 *   'api.endpoints': 'prepend',     // nested endpoint arrays will be combined by prepending
 *   'excludePatterns': 'override'   // excludePatterns arrays will replace each other (default behavior)
 * };
 * ```
 */
export interface FieldOverlapOptions {
    [fieldPath: string]: ArrayOverlapMode;
}

/**
 * Configuration for resolving relative paths in configuration values.
 * Paths specified in these fields will be resolved relative to the configuration file's directory.
 */
export interface PathResolutionOptions {
    /** Array of field names (using dot notation) that contain paths to be resolved */
    pathFields?: string[];
    /** Array of field names whose array elements should all be resolved as paths */
    resolvePathArray?: string[];
}

/**
 * Default configuration options for Cardigantime.
 * These define the basic behavior of configuration loading.
 */
export interface DefaultOptions {
    /** Directory path where configuration files are located */
    configDirectory: string;
    /** Name of the configuration file (e.g., 'config.yaml', 'app.yml') */
    configFile: string;
    /** Whether the configuration directory must exist. If true, throws error if directory doesn't exist */
    isRequired: boolean;
    /** File encoding for reading configuration files (e.g., 'utf8', 'ascii') */
    encoding: string;
    /** Configuration for resolving relative paths in configuration values */
    pathResolution?: PathResolutionOptions;
    /** 
     * Configuration for how array fields should be merged in hierarchical mode.
     * Only applies when the 'hierarchical' feature is enabled.
     * If not specified, all arrays use 'override' behavior (default).
     */
    fieldOverlaps?: FieldOverlapOptions;
    /** 
     * Security validation configuration (optional, uses development profile by default).
     * Enable security features to validate CLI arguments and config file values.
     */
    security?: Partial<SecurityValidationConfig>;
    /**
     * Optional source metadata for tracking where configuration came from.
     * Populated automatically when configuration is loaded.
     */
    source?: ConfigSource;
    /**
     * Allow executable configuration files (JavaScript/TypeScript).
     * 
     * **SECURITY WARNING**: Executable configs run with full Node.js permissions
     * in the same process as your application. Only enable this if you trust
     * the configuration files being loaded.
     * 
     * When disabled (default), JavaScript and TypeScript config files will be
     * ignored with a warning message.
     * 
     * @default false
     */
    allowExecutableConfig?: boolean;
}

/**
 * Complete options object passed to Cardigantime functions.
 * Combines defaults, features, schema shape, and logger.
 * 
 * @template T - The Zod schema shape type for configuration validation
 */
export interface Options<T extends z.ZodRawShape> {
    /** Default configuration options */
    defaults: DefaultOptions,
    /** Array of enabled features */
    features: Feature[],
    /** Zod schema shape for validating user configuration */
    configShape: T;
    /** Logger instance for debugging and error reporting */
    logger: Logger;
}

/**
 * Logger interface for Cardigantime's internal logging.
 * Compatible with popular logging libraries like Winston, Bunyan, etc.
 */
export interface Logger {
    /** Debug-level logging for detailed troubleshooting information */
    debug: (message: string, ...args: any[]) => void;
    /** Info-level logging for general information */
    info: (message: string, ...args: any[]) => void;
    /** Warning-level logging for non-critical issues */
    warn: (message: string, ...args: any[]) => void;
    /** Error-level logging for critical problems */
    error: (message: string, ...args: any[]) => void;
    /** Verbose-level logging for extensive detail */
    verbose: (message: string, ...args: any[]) => void;
    /** Silly-level logging for maximum detail */
    silly: (message: string, ...args: any[]) => void;
}

/**
 * Main Cardigantime interface providing configuration management functionality.
 * 
 * @template T - The Zod schema shape type for configuration validation
 */
export interface Cardigantime<T extends z.ZodRawShape> {
    /** 
     * Adds Cardigantime's CLI options to a Commander.js command.
     * This includes options like --config-directory for runtime config path overrides.
     */
    configure: (command: Command) => Promise<Command>;
    /** Sets a custom logger for debugging and error reporting */
    setLogger: (logger: Logger) => void;
    /** 
     * Reads configuration from files and merges with CLI arguments.
     * Returns a fully typed configuration object.
     */
    read: (args: Args) => Promise<z.infer<ZodObject<T & typeof ConfigSchema.shape>>>;
    /** 
     * Validates the merged configuration against the Zod schema.
     * Throws ConfigurationError if validation fails.
     */
    validate: (config: z.infer<ZodObject<T & typeof ConfigSchema.shape>>) => Promise<void>;
    /** 
     * Generates a configuration file with default values in the specified directory.
     * Creates the directory if it doesn't exist and writes a config file with all default values populated.
     */
    generateConfig: (configDirectory?: string) => Promise<void>;
    /** 
     * Checks and displays the resolved configuration with detailed source tracking.
     * Shows which file and hierarchical level contributed each configuration value in a git blame-like format.
     */
    checkConfig: (args: Args) => Promise<void>;
}

/**
 * Parsed command-line arguments object, typically from Commander.js opts().
 * Keys correspond to CLI option names with values from user input.
 */
export interface Args {
    [key: string]: any;
}

/**
 * Base Zod schema for core Cardigantime configuration.
 * Contains the minimum required configuration fields.
 */
export const ConfigSchema = z.object({
    /** The resolved configuration directory path */
    configDirectory: z.string(),
    /** Array of all directory paths that were discovered during hierarchical search */
    discoveredConfigDirs: z.array(z.string()),
    /** Array of directory paths that actually contained valid configuration files */
    resolvedConfigDirs: z.array(z.string()),
});

/**
 * Base configuration type derived from the core schema.
 */
export type Config = z.infer<typeof ConfigSchema>;
