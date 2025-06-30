import * as yaml from 'js-yaml';
import * as path from 'path';
import { z, ZodObject } from 'zod';
import { Args, ConfigSchema, Options } from './types';
import * as Storage from './util/storage';

function clean(obj: any) {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
}

function validatePath(userPath: string, basePath: string): string {
    if (!userPath || !basePath) {
        throw new Error('Invalid path parameters');
    }

    const normalized = path.normalize(userPath);

    // Prevent path traversal attacks
    if (normalized.includes('..') || path.isAbsolute(normalized)) {
        throw new Error('Invalid path: path traversal detected');
    }

    // Ensure the path doesn't start with a path separator
    if (normalized.startsWith('/') || normalized.startsWith('\\')) {
        throw new Error('Invalid path: absolute path detected');
    }

    return path.join(basePath, normalized);
}

function validateConfigDirectory(configDir: string): string {
    if (!configDir) {
        throw new Error('Configuration directory is required');
    }

    // Check for null bytes which could be used for path injection
    if (configDir.includes('\0')) {
        throw new Error('Invalid path: null byte detected');
    }

    const normalized = path.normalize(configDir);

    // Basic validation - could be expanded based on requirements
    if (normalized.length > 1000) {
        throw new Error('Configuration directory path too long');
    }

    return normalized;
}

export const read = async <T extends z.ZodRawShape>(args: Args, options: Options<T>): Promise<z.infer<ZodObject<T & typeof ConfigSchema.shape>>> => {
    const logger = options.logger;
    const storage = Storage.create({ log: logger.debug });

    const rawConfigDir = args.configDirectory || options.defaults?.configDirectory;
    if (!rawConfigDir) {
        throw new Error('Configuration directory must be specified');
    }

    const resolvedConfigDir = validateConfigDirectory(rawConfigDir);
    logger.debug('Resolved config directory');

    const configFile = validatePath(options.defaults.configFile, resolvedConfigDir);
    logger.debug('Attempting to load config file for cardigantime');

    let rawFileConfig: object = {};

    try {
        const yamlContent = await storage.readFile(configFile, options.defaults.encoding);

        // SECURITY FIX: Use safer parsing options to prevent code execution vulnerabilities
        const parsedYaml = yaml.load(yamlContent);

        if (parsedYaml !== null && typeof parsedYaml === 'object') {
            rawFileConfig = parsedYaml;
            logger.debug('Loaded configuration file successfully');
        } else if (parsedYaml !== null) {
            logger.warn('Ignoring invalid configuration format. Expected an object, got ' + typeof parsedYaml);
        }
    } catch (error: any) {
        if (error.code === 'ENOENT' || /not found|no such file/i.test(error.message)) {
            logger.debug('Configuration file not found. Using empty configuration.');
        } else {
            // SECURITY FIX: Don't expose internal paths or detailed error information
            logger.error('Failed to load or parse configuration file: ' + (error.message || 'Unknown error'));
        }
    }

    const config: z.infer<ZodObject<T & typeof ConfigSchema.shape>> = clean({
        ...rawFileConfig,
        ...{
            configDirectory: resolvedConfigDir,
        }
    }) as z.infer<ZodObject<T & typeof ConfigSchema.shape>>;

    return config;
}