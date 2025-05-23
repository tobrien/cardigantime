import { beforeEach, describe, expect, test, vi } from 'vitest';
import type * as yaml from 'js-yaml';
import type * as path from 'path';
import type * as StorageUtil from '../src/util/storage';
import { z } from 'zod';
import { Options } from '../src/types';

// --- Mock Dependencies ---

// Mock js-yaml
const mockYamlLoad = vi.fn<typeof yaml.load>();
vi.mock('js-yaml', () => ({
    load: mockYamlLoad,
}));

// Mock path
const mockPathJoin = vi.fn<typeof path.join>();
vi.mock('path', () => ({
    join: mockPathJoin,
    // Mock other path functions if needed, default is fine for join
    default: {
        join: mockPathJoin,
    },
}));

// Mock storage
const mockReadFile = vi.fn<StorageUtil.Utility['readFile']>();
const mockStorageCreate = vi.fn<typeof StorageUtil.create>().mockReturnValue({
    readFile: mockReadFile,
    // Add other methods if needed, mocked or otherwise
    // @ts-ignore
    isDirectoryReadable: vi.fn(),
    // @ts-ignore
    isDirectoryWritable: vi.fn(),
    // @ts-ignore
    forEachFileIn: vi.fn(),
    // @ts-ignore
    writeFile: vi.fn(),
    // @ts-ignore
    ensureDir: vi.fn(),
    // @ts-ignore
    remove: vi.fn(),
    // @ts-ignore
    pathExists: vi.fn(),
    // @ts-ignore
    copyFile: vi.fn(),
    // @ts-ignore
    moveFile: vi.fn(),
    // @ts-ignore
    listFiles: vi.fn(),
    // @ts-ignore
    createReadStream: vi.fn(),
    // @ts-ignore
    createWriteStream: vi.fn(),
});
vi.mock('../src/util/storage', () => ({
    create: mockStorageCreate,
}));

// --- Dynamically Import Module Under Test ---
// Needs to be imported *after* mocks are set up
const { read } = await import('../src/read');


// --- Test Suite ---

describe('read', () => {
    let baseArgs: any; // Use 'any' for simplicity in tests or define a specific mock type
    let baseOptions: Options<any>; // Use 'any' for the Zod schema shape for simplicity

    const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        verbose: vi.fn(),
        silly: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks(); // Clear mocks before each test

        // Reset base args and options
        baseArgs = {};
        baseOptions = {
            logger: mockLogger,
            defaults: {
                configDirectory: '.',
                configFile: 'config.yaml',
                isRequired: false,
                encoding: 'utf8',
            }, // Explicitly set defaults if testing them
            features: [], // Add required features array (can be empty)
            configShape: z.object({}), // Add required empty Zod object shape
        };

        // Default mock implementations
        mockPathJoin.mockImplementation((...args) => args.join('/')); // Simple join mock
        mockYamlLoad.mockReturnValue({ fileKey: 'fileValue' }); // Default valid YAML
        mockReadFile.mockResolvedValue('fileKey: fileValue'); // Default valid file content
    });

    test('should use default config directory if none provided', async () => {
        const expectedConfigPath = `${baseOptions.defaults.configDirectory}/${baseOptions.defaults.configFile}`;
        mockPathJoin.mockReturnValue(expectedConfigPath);

        await read(baseArgs, baseOptions);

        expect(mockPathJoin).toHaveBeenCalledWith(baseOptions.defaults.configDirectory, baseOptions.defaults.configFile);
        expect(mockReadFile).toHaveBeenCalledWith(expectedConfigPath, baseOptions.defaults.encoding);
    });

    test('should use configDirectory from args if provided', async () => {
        const argsDir = '/args/config/dir';
        const expectedConfigPath = `${argsDir}/${baseOptions.defaults.configFile}`;
        mockPathJoin.mockReturnValue(expectedConfigPath);

        await read({ ...baseArgs, configDirectory: argsDir }, baseOptions);

        expect(mockPathJoin).toHaveBeenCalledWith(argsDir, baseOptions.defaults.configFile);
        expect(mockReadFile).toHaveBeenCalledWith(expectedConfigPath, baseOptions.defaults.encoding);
    });

    test('should use configDirectory from options.defaults if provided and args not', async () => {
        const defaultsDir = '/defaults/config/dir';
        const expectedConfigPath = `${defaultsDir}/${baseOptions.defaults.configFile}`;
        mockPathJoin.mockReturnValue(expectedConfigPath);

        await read(baseArgs, { ...baseOptions, defaults: { configDirectory: defaultsDir, configFile: baseOptions.defaults.configFile, isRequired: baseOptions.defaults.isRequired, encoding: baseOptions.defaults.encoding } });

        expect(mockPathJoin).toHaveBeenCalledWith(defaultsDir, baseOptions.defaults.configFile);
        expect(mockReadFile).toHaveBeenCalledWith(expectedConfigPath, baseOptions.defaults.encoding);
    });

    test('should prioritize args.configDirectory over options.defaults.configDirectory', async () => {
        const argsDir = '/args/config/dir';
        const defaultsDir = '/defaults/config/dir';
        const expectedConfigPath = `${argsDir}/${baseOptions.defaults.configFile}`; // Args should win
        mockPathJoin.mockReturnValue(expectedConfigPath);

        await read({ ...baseArgs, configDirectory: argsDir }, { ...baseOptions, defaults: { configDirectory: defaultsDir, configFile: baseOptions.defaults.configFile, isRequired: baseOptions.defaults.isRequired, encoding: baseOptions.defaults.encoding } });

        expect(mockPathJoin).toHaveBeenCalledWith(argsDir, baseOptions.defaults.configFile);
        expect(mockReadFile).toHaveBeenCalledWith(expectedConfigPath, baseOptions.defaults.encoding);
    });

    test('should load and parse valid YAML config file', async () => {
        const yamlContent = `key1: value1
key2: 123`;
        const parsedYaml = { key1: 'value1', key2: 123 };
        mockReadFile.mockResolvedValue(yamlContent);
        mockYamlLoad.mockReturnValue(parsedYaml);

        const config = await read(baseArgs, baseOptions);

        expect(mockYamlLoad).toHaveBeenCalledWith(yamlContent);
        expect(config).toEqual({
            ...parsedYaml,
            configDirectory: baseOptions.defaults.configDirectory // Should be added
        });
    });

    test('should warn and ignore if parsed YAML is not an object', async () => {
        const yamlContent = 'just a string';
        mockReadFile.mockResolvedValue(yamlContent);
        mockYamlLoad.mockReturnValue(yamlContent); // Simulate js-yaml parsing to a string

        const config = await read(baseArgs, baseOptions);

        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Ignoring invalid configuration format'));
        expect(config).toEqual({
            configDirectory: baseOptions.defaults.configDirectory // Only default values applied
        });
    });

    test('should warn and ignore if parsed YAML is null', async () => {
        const yamlContent = 'null'; // YAML representation of null
        mockReadFile.mockResolvedValue(yamlContent);
        mockYamlLoad.mockReturnValue(null); // Simulate js-yaml parsing to null

        const config = await read(baseArgs, baseOptions);

        // No warning needed for null, it's handled gracefully
        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(config).toEqual({
            configDirectory: baseOptions.defaults.configDirectory // Only default values applied
        });
    });


    test('should handle config file not found (ENOENT)', async () => {
        const error = new Error('File not found') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        mockReadFile.mockRejectedValue(error);

        const config = await read(baseArgs, baseOptions);

        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Configuration file not found'));
        expect(mockLogger.error).not.toHaveBeenCalled();
        expect(config).toEqual({
            configDirectory: baseOptions.defaults.configDirectory // Only default values applied
        });
    });

    test('should handle config file not found (message based)', async () => {
        const error = new Error(`ENOENT: no such file or directory, open '/path/to/config.yaml'`);
        mockReadFile.mockRejectedValue(error);

        const config = await read(baseArgs, baseOptions);

        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Configuration file not found'));
        expect(mockLogger.error).not.toHaveBeenCalled();
        expect(config).toEqual({
            configDirectory: baseOptions.defaults.configDirectory // Only default values applied
        });
    });

    test('should log error for other file read errors', async () => {
        const error = new Error('Permission denied');
        mockReadFile.mockRejectedValue(error);

        const config = await read(baseArgs, baseOptions);

        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Failed to load or parse configuration`));
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(error.message));
        expect(mockLogger.debug).not.toHaveBeenCalledWith(expect.stringContaining('Configuration file not found'));
        expect(config).toEqual({
            configDirectory: baseOptions.defaults.configDirectory // Only default values applied even on error
        });
    });

    test('should log error for YAML parsing errors', async () => {
        const error = new Error('Invalid YAML syntax');
        mockReadFile.mockResolvedValue('invalid: yaml: content');
        mockYamlLoad.mockImplementation(() => {
            throw error;
        });

        const config = await read(baseArgs, baseOptions);

        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Failed to load or parse configuration`));
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(error.message));
        expect(config).toEqual({
            configDirectory: baseOptions.defaults.configDirectory // Only default values applied even on error
        });
    });

    test('should clean undefined values from the final config object', async () => {
        const yamlContent = `key1: value1
key2: null
key3: undefined`;
        const parsedYaml = { key1: 'value1', key2: null, key3: undefined, explicitUndefined: undefined };
        mockReadFile.mockResolvedValue(yamlContent);
        mockYamlLoad.mockReturnValue(parsedYaml);

        const config = await read(baseArgs, baseOptions);

        // undefined values should be removed by the 'clean' function
        expect(config).toEqual({
            key1: 'value1',
            key2: null, // null is a valid JSON/YAML value, should remain
            configDirectory: baseOptions.defaults.configDirectory
        });
        expect(config).not.toHaveProperty('key3');
        expect(config).not.toHaveProperty('explicitUndefined');
    });

});
