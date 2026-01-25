import { ConfigFormat, ConfigParser } from '../types';
import { ConfigParseError } from '../error';
import { pathToFileURL } from 'node:url';

/**
 * JavaScript configuration parser.
 * Loads and executes JavaScript configuration files using dynamic import.
 * 
 * Supports:
 * - ESM default exports: `export default { ... }`
 * - CommonJS exports: `module.exports = { ... }`
 * - Async function exports: `export default async () => ({ ... })`
 * - Named exports as fallback
 */
export const javascriptParser: ConfigParser = {
    format: ConfigFormat.JavaScript,
    extensions: ['.mjs', '.js', '.cjs'],

    /**
     * Parses JavaScript configuration by dynamically importing the file.
     * 
     * @param content - Raw file content (not used, file is imported directly)
     * @param filePath - Absolute path to the JavaScript file
     * @returns Parsed configuration object
     * @throws {ConfigParseError} When import fails or config is invalid
     */
    async parse(_content: string, filePath: string): Promise<unknown> {
        try {
            // Convert file path to file:// URL for dynamic import
            // This is required for Windows compatibility and proper module resolution
            const fileUrl = pathToFileURL(filePath).href;

            // Add cache-busting query parameter to avoid module caching issues
            // This ensures we always get fresh config even if the file changed
            const importUrl = `${fileUrl}?t=${Date.now()}`;

            // Dynamically import the JavaScript module
            const module = await import(importUrl);

            // Extract the configuration from the module
            let config = module.default ?? module;

            // If the export is a function, call it to get the config
            // This supports: export default () => ({ ... })
            // And async: export default async () => ({ ... })
            if (typeof config === 'function') {
                config = await config();
            }

            // Validate that the result is an object
            if (config === null || config === undefined) {
                throw new ConfigParseError(
                    'JavaScript configuration must export an object or function that returns an object',
                    filePath
                );
            }

            if (typeof config !== 'object' || Array.isArray(config)) {
                throw new ConfigParseError(
                    `JavaScript configuration must be an object, got ${typeof config}`,
                    filePath
                );
            }

            return config;
        } catch (error) {
            // If it's already a ConfigParseError, re-throw it
            if (error instanceof ConfigParseError) {
                throw error;
            }

            // Wrap import/execution errors with file context
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new ConfigParseError(
                `Failed to load JavaScript configuration: ${errorMessage}`,
                filePath,
                error instanceof Error ? error : undefined
            );
        }
    }
};
