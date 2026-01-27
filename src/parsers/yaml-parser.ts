import * as yaml from 'js-yaml';
import { ConfigFormat, ConfigParser } from '../types';
import { ConfigParseError } from '../error';

/**
 * YAML configuration parser.
 * Parses configuration from .yaml and .yml files using js-yaml.
 */
export const yamlParser: ConfigParser = {
    format: ConfigFormat.YAML,
    extensions: ['.yaml', '.yml'],

    /**
     * Parses YAML configuration content.
     * 
     * @param content - Raw YAML string content
     * @param filePath - Path to the YAML file (for error reporting)
     * @returns Parsed configuration object
     * @throws {ConfigParseError} When YAML parsing fails
     */
    async parse(content: string, filePath: string): Promise<unknown> {
        try {
            // Use js-yaml with safe loading to prevent code execution
            const parsed = yaml.load(content);

            // Validate that the result is an object
            if (parsed === null || parsed === undefined) {
                // Empty YAML file is acceptable, return empty object
                return {};
            }

            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new ConfigParseError(
                    'Configuration must be a YAML object, not an array or primitive',
                    filePath
                );
            }

            return parsed;
        } catch (error) {
            // If it's already a ConfigParseError, re-throw it
            if (error instanceof ConfigParseError) {
                throw error;
            }

            // Wrap YAML parsing errors with file context
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new ConfigParseError(
                `Invalid YAML in configuration file: ${errorMessage}`,
                filePath,
                error instanceof Error ? error : undefined
            );
        }
    }
};
