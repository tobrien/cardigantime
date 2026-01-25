import { ConfigFormat, ConfigParser } from '../types';
import { ConfigParseError } from '../error';
import { pathToFileURL } from 'node:url';

/**
 * TypeScript configuration parser.
 * Loads and executes TypeScript configuration files using dynamic import.
 * 
 * IMPORTANT: TypeScript files must be transpiled before they can be imported.
 * This parser relies on a TypeScript runtime being available (tsx, ts-node, etc.)
 * or the files being pre-compiled to JavaScript.
 * 
 * Supports:
 * - ESM default exports: `export default { ... }`
 * - Async function exports: `export default async () => ({ ... })`
 * - Type-safe configs with defineConfig helper
 */
export const typescriptParser: ConfigParser = {
    format: ConfigFormat.TypeScript,
    extensions: ['.mts', '.ts', '.cts'],

    /**
     * Parses TypeScript configuration by dynamically importing the file.
     * 
     * NOTE: This requires a TypeScript runtime (tsx, ts-node, etc.) to be
     * configured in your environment, OR the files to be pre-compiled.
     * 
     * @param content - Raw file content (not used, file is imported directly)
     * @param filePath - Absolute path to the TypeScript file
     * @returns Parsed configuration object
     * @throws {ConfigParseError} When import fails or config is invalid
     */
    async parse(_content: string, filePath: string): Promise<unknown> {
        try {
            // Convert file path to file:// URL for dynamic import
            const fileUrl = pathToFileURL(filePath).href;

            // Add cache-busting query parameter
            const importUrl = `${fileUrl}?t=${Date.now()}`;

            // Attempt to dynamically import the TypeScript module
            // This will work if:
            // 1. A TypeScript loader (tsx, ts-node) is registered
            // 2. The file has been pre-compiled to JavaScript
            // 3. Node.js has native TypeScript support (future)
            const module = await import(importUrl);

            // Extract the configuration from the module
            let config = module.default ?? module;

            // If the export is a function, call it to get the config
            if (typeof config === 'function') {
                config = await config();
            }

            // Validate that the result is an object
            if (config === null || config === undefined) {
                throw new ConfigParseError(
                    'TypeScript configuration must export an object or function that returns an object',
                    filePath
                );
            }

            if (typeof config !== 'object' || Array.isArray(config)) {
                throw new ConfigParseError(
                    `TypeScript configuration must be an object, got ${typeof config}`,
                    filePath
                );
            }

            return config;
        } catch (error) {
            // If it's already a ConfigParseError, re-throw it
            if (error instanceof ConfigParseError) {
                throw error;
            }

            // Check if this is a TypeScript runtime error
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Provide helpful error for missing TypeScript runtime
            if (errorMessage.includes('ERR_UNKNOWN_FILE_EXTENSION') || 
                errorMessage.includes('Cannot find module') ||
                errorMessage.includes('.ts')) {
                throw new ConfigParseError(
                    `Failed to load TypeScript configuration: ${filePath}\n\n` +
                    `TypeScript configuration files require a TypeScript runtime. ` +
                    `You can:\n` +
                    `1. Use 'tsx' to run your application: npx tsx your-app.ts\n` +
                    `2. Pre-compile TypeScript files to JavaScript\n` +
                    `3. Use ts-node with --loader or --require flags\n\n` +
                    `Original error: ${errorMessage}`,
                    filePath,
                    error instanceof Error ? error : undefined
                );
            }

            // Wrap other import/execution errors
            throw new ConfigParseError(
                `Failed to load TypeScript configuration: ${errorMessage}`,
                filePath,
                error instanceof Error ? error : undefined
            );
        }
    }
};
