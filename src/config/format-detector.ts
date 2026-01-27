import * as path from 'node:path';
import { ConfigFormat, Logger } from '../types';
import { getParserForExtension } from '../parsers';

/**
 * Priority order for configuration file formats.
 * Higher index = higher priority.
 */
const FORMAT_PRIORITY: ConfigFormat[] = [
    ConfigFormat.YAML,        // Lowest priority (legacy default)
    ConfigFormat.JSON,        // Higher than YAML
    ConfigFormat.JavaScript,  // Higher than JSON
    ConfigFormat.TypeScript   // Highest priority
];

/**
 * File extensions to check for each format, in order of preference.
 */
const FORMAT_EXTENSIONS: Record<ConfigFormat, string[]> = {
    [ConfigFormat.YAML]: ['.yaml', '.yml'],
    [ConfigFormat.JSON]: ['.json'],
    [ConfigFormat.JavaScript]: ['.mjs', '.js', '.cjs'],
    [ConfigFormat.TypeScript]: ['.mts', '.ts', '.cts']
};

/**
 * Options for format detection.
 */
export interface FormatDetectorOptions {
    /** Base configuration file name without extension (e.g., 'config') */
    configFileName: string;
    /** Directory to search for configuration files */
    configDirectory: string;
    /** Optional format override to force a specific format */
    formatOverride?: ConfigFormat;
    /** Logger for debugging */
    logger?: Logger;
    /** Storage interface for file system operations */
    storage: {
        exists(filePath: string): Promise<boolean>;
        isFileReadable(filePath: string): Promise<boolean>;
    };
}

/**
 * Result of format detection.
 */
export interface DetectedFormat {
    /** The detected or overridden format */
    format: ConfigFormat;
    /** Full path to the configuration file */
    filePath: string;
    /** Whether this was an override or auto-detected */
    wasOverridden: boolean;
}

/**
 * Detects the configuration file format to use.
 * 
 * Searches for configuration files in priority order:
 * 1. TypeScript (.ts, .mts, .cts)
 * 2. JavaScript (.js, .mjs, .cjs)
 * 3. JSON (.json)
 * 4. YAML (.yaml, .yml)
 * 
 * If a format override is provided, only that format is checked.
 * 
 * @param options - Format detection options
 * @returns Promise resolving to detected format info, or null if no config found
 */
export async function detectConfigFormat(
    options: FormatDetectorOptions
): Promise<DetectedFormat | null> {
    const { configFileName, configDirectory, formatOverride, logger, storage } = options;

    // Remove extension from config file name if present
    const baseName = path.basename(configFileName, path.extname(configFileName));

    // If format is overridden, only check that format
    if (formatOverride) {
        logger?.debug(`Format override specified: ${formatOverride}`);
        
        const extensions = FORMAT_EXTENSIONS[formatOverride];
        for (const ext of extensions) {
            const filePath = path.join(configDirectory, baseName + ext);
            
            if (await storage.exists(filePath) && await storage.isFileReadable(filePath)) {
                logger?.info(`Using overridden format ${formatOverride}: ${filePath}`);
                return {
                    format: formatOverride,
                    filePath,
                    wasOverridden: true
                };
            }
        }
        
        logger?.warn(`Format override ${formatOverride} specified but no matching file found`);
        return null;
    }

    // Check formats in priority order (highest priority first)
    const formatsToCheck = [...FORMAT_PRIORITY].reverse();
    
    for (const format of formatsToCheck) {
        // Skip formats that don't have a registered parser yet
        const extensions = FORMAT_EXTENSIONS[format];
        const hasParser = extensions.some(ext => getParserForExtension(ext) !== undefined);
        
        if (!hasParser) {
            logger?.debug(`Skipping format ${format} - no parser registered`);
            continue;
        }

        for (const ext of extensions) {
            const filePath = path.join(configDirectory, baseName + ext);
            
            logger?.debug(`Checking for config file: ${filePath}`);
            
            if (await storage.exists(filePath) && await storage.isFileReadable(filePath)) {
                logger?.info(`Detected config format ${format}: ${filePath}`);
                return {
                    format,
                    filePath,
                    wasOverridden: false
                };
            }
        }
    }

    logger?.verbose(`No configuration file found in ${configDirectory}`);
    return null;
}

/**
 * Gets the priority value for a format (higher = more priority).
 * 
 * @param format - The configuration format
 * @returns Priority value (0-based index)
 */
export function getFormatPriority(format: ConfigFormat): number {
    return FORMAT_PRIORITY.indexOf(format);
}

/**
 * Gets all file extensions for a given format.
 * 
 * @param format - The configuration format
 * @returns Array of file extensions (e.g., ['.yaml', '.yml'])
 */
export function getFormatExtensions(format: ConfigFormat): string[] {
    return FORMAT_EXTENSIONS[format] || [];
}
