import { Command } from "commander";
import { z } from "zod";
import { ArgumentError } from "./error/ArgumentError";
import { Options } from "./types";
export { ArgumentError };

/**
 * Validates a config directory path argument
 */
function validateConfigDirectory(configDirectory: string): string {
    if (!configDirectory) {
        throw new ArgumentError('configDirectory', 'Configuration directory cannot be empty');
    }

    if (typeof configDirectory !== 'string') {
        throw new ArgumentError('configDirectory', 'Configuration directory must be a string');
    }

    const trimmed = configDirectory.trim();
    if (trimmed.length === 0) {
        throw new ArgumentError('configDirectory', 'Configuration directory cannot be empty or whitespace only');
    }

    // Check for obviously invalid paths
    if (trimmed.includes('\0')) {
        throw new ArgumentError('configDirectory', 'Configuration directory contains invalid null character');
    }

    // Validate path length (reasonable limit)
    if (trimmed.length > 1000) {
        throw new ArgumentError('configDirectory', 'Configuration directory path is too long (max 1000 characters)');
    }

    return trimmed;
}

export const configure = async <T extends z.ZodRawShape>(command: Command, options: Options<T>): Promise<Command> => {
    // Validate the command object
    if (!command) {
        throw new ArgumentError('command', 'Command instance is required');
    }

    if (typeof command.option !== 'function') {
        throw new ArgumentError('command', 'Command must be a valid Commander.js Command instance');
    }

    // Validate options
    if (!options) {
        throw new ArgumentError('options', 'Options object is required');
    }

    if (!options.defaults) {
        throw new ArgumentError('options.defaults', 'Options must include defaults configuration');
    }

    if (!options.defaults.configDirectory) {
        throw new ArgumentError('options.defaults.configDirectory', 'Default config directory is required');
    }

    // Validate the default config directory
    const validatedDefaultDir = validateConfigDirectory(options.defaults.configDirectory);

    let retCommand = command;

    // Add the config directory option with validation
    retCommand = retCommand.option(
        '-c, --config-directory <configDirectory>',
        'Configuration directory path',
        (value: string) => {
            try {
                return validateConfigDirectory(value);
            } catch (error) {
                if (error instanceof ArgumentError) {
                    // Re-throw with more specific context for CLI usage
                    throw new ArgumentError('config-directory', `Invalid --config-directory: ${error.message}`);
                }
                throw error;
            }
        },
        validatedDefaultDir
    );

    return retCommand;
}




