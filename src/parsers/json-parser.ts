import { ConfigFormat, ConfigParser } from '../types';
import { ConfigParseError } from '../error';

/**
 * JSON configuration parser.
 * Parses configuration from .json files using native JSON.parse.
 */
export const jsonParser: ConfigParser = {
    format: ConfigFormat.JSON,
    extensions: ['.json'],

    /**
     * Parses JSON configuration content.
     * 
     * @param content - Raw JSON string content
     * @param filePath - Path to the JSON file (for error reporting)
     * @returns Parsed configuration object
     * @throws {ConfigParseError} When JSON parsing fails
     */
    async parse(content: string, filePath: string): Promise<unknown> {
        try {
            // Use native JSON.parse for strict JSON parsing
            const parsed = JSON.parse(content);

            // Validate that the result is an object
            if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new ConfigParseError(
                    'Configuration must be a JSON object, not an array or primitive',
                    filePath
                );
            }

            return parsed;
        } catch (error) {
            // If it's already a ConfigParseError, re-throw it
            if (error instanceof ConfigParseError) {
                throw error;
            }

            // Wrap JSON parsing errors with file context
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new ConfigParseError(
                `Invalid JSON in configuration file: ${errorMessage}`,
                filePath,
                error instanceof Error ? error : undefined
            );
        }
    }
};
