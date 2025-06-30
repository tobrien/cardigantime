import { describe, expect, beforeEach, test, vi } from 'vitest';
import { Command } from 'commander';
import { z } from 'zod';
import { configure } from '../src/configure';
import { ArgumentError } from '../src/error/ArgumentError';
import type { Options } from '../src/types';

// No mocking needed - using real Command instances


// --- Test Suite ---

describe('configure', () => {
    let mockCommand: Command;
    let baseOptions: Options<any>; // Use 'any' for the Zod schema shape for simplicity

    beforeEach(() => {
        vi.clearAllMocks(); // Clear mocks before each test

        // Create a real Command instance for testing
        mockCommand = new Command();

        // Reset base options
        baseOptions = {
            logger: { // Provide a mock logger
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
                verbose: vi.fn(),
                silly: vi.fn(),
            },
            defaults: {
                configDirectory: './config',
                configFile: 'test.yaml',
                isRequired: false,
                encoding: 'utf8',
            }, // Explicitly set defaults if testing them
            features: ['config'], // Add required features array (can be empty)
            configShape: z.object({}).shape, // Add required empty Zod object shape
        };
    });

    test('should add config-directory option to command', async () => {
        const result = await configure(mockCommand, baseOptions);

        expect(result).toBe(mockCommand);
        // Verify the option was added by checking if it's in the options
        const options = result.options;
        const configDirOption = options.find(opt => opt.long === '--config-directory');
        expect(configDirOption).toBeDefined();
        expect(configDirOption?.short).toBe('-c');
    });

    test('should return the same command instance', async () => {
        const result = await configure(mockCommand, baseOptions);
        expect(result).toBe(mockCommand);
    });

    test('should use default config directory as default value', async () => {
        const result = await configure(mockCommand, baseOptions);
        const options = result.options;
        const configDirOption = options.find(opt => opt.long === '--config-directory');
        expect(configDirOption?.defaultValue).toBe('./config');
    });

    // New validation tests
    describe('argument validation', () => {
        test('should throw ArgumentError when command is null', async () => {
            await expect(configure(null as any, baseOptions))
                .rejects
                .toThrow(ArgumentError);

            try {
                await configure(null as any, baseOptions);
            } catch (error) {
                expect(error).toBeInstanceOf(ArgumentError);
                expect((error as ArgumentError).argument).toBe('command');
                expect((error as ArgumentError).message).toBe('Command instance is required');
            }
        });

        test('should throw ArgumentError when command is undefined', async () => {
            await expect(configure(undefined as any, baseOptions))
                .rejects
                .toThrow(ArgumentError);
        });

        test('should throw ArgumentError when command is not a valid Commander instance', async () => {
            const invalidCommand = { notACommand: true } as any;

            await expect(configure(invalidCommand, baseOptions))
                .rejects
                .toThrow(ArgumentError);

            try {
                await configure(invalidCommand, baseOptions);
            } catch (error) {
                expect(error).toBeInstanceOf(ArgumentError);
                expect((error as ArgumentError).argument).toBe('command');
                expect((error as ArgumentError).message).toBe('Command must be a valid Commander.js Command instance');
            }
        });

        test('should throw ArgumentError when options is null', async () => {
            await expect(configure(mockCommand, null as any))
                .rejects
                .toThrow(ArgumentError);

            try {
                await configure(mockCommand, null as any);
            } catch (error) {
                expect(error).toBeInstanceOf(ArgumentError);
                expect((error as ArgumentError).argument).toBe('options');
                expect((error as ArgumentError).message).toBe('Options object is required');
            }
        });

        test('should throw ArgumentError when options.defaults is missing', async () => {
            const invalidOptions = { ...baseOptions, defaults: undefined } as any;

            await expect(configure(mockCommand, invalidOptions))
                .rejects
                .toThrow(ArgumentError);

            try {
                await configure(mockCommand, invalidOptions);
            } catch (error) {
                expect(error).toBeInstanceOf(ArgumentError);
                expect((error as ArgumentError).argument).toBe('options.defaults');
                expect((error as ArgumentError).message).toBe('Options must include defaults configuration');
            }
        });

        test('should throw ArgumentError when configDirectory is missing from defaults', async () => {
            const invalidOptions = {
                ...baseOptions,
                defaults: {
                    ...baseOptions.defaults,
                    configDirectory: undefined
                }
            } as any;

            await expect(configure(mockCommand, invalidOptions))
                .rejects
                .toThrow(ArgumentError);

            try {
                await configure(mockCommand, invalidOptions);
            } catch (error) {
                expect(error).toBeInstanceOf(ArgumentError);
                expect((error as ArgumentError).argument).toBe('options.defaults.configDirectory');
            }
        });
    });

    describe('config directory validation', () => {
        test('should validate default config directory', async () => {
            const optionsWithInvalidDefault = {
                ...baseOptions,
                defaults: {
                    ...baseOptions.defaults,
                    configDirectory: '' // Empty string should fail
                }
            };

            await expect(configure(mockCommand, optionsWithInvalidDefault))
                .rejects
                .toThrow(ArgumentError);
        });

        test('should reject empty config directory', async () => {
            const result = await configure(mockCommand, baseOptions);
            const options = result.options;
            const configDirOption = options.find(opt => opt.long === '--config-directory');

            expect(() => {
                // Simulate Commander.js calling the transform function with empty value
                configDirOption?.parseArg?.('', '');
            }).toThrow(ArgumentError);
        });

        test('should reject whitespace-only config directory', async () => {
            const result = await configure(mockCommand, baseOptions);
            const options = result.options;
            const configDirOption = options.find(opt => opt.long === '--config-directory');

            expect(() => {
                configDirOption?.parseArg?.('   ', '   ');
            }).toThrow(ArgumentError);
        });

        test('should reject config directory with null character', async () => {
            const result = await configure(mockCommand, baseOptions);
            const options = result.options;
            const configDirOption = options.find(opt => opt.long === '--config-directory');

            expect(() => {
                configDirOption?.parseArg?.('path/with\0null', 'path/with\0null');
            }).toThrow(ArgumentError);
        });

        test('should reject extremely long config directory path', async () => {
            const result = await configure(mockCommand, baseOptions);
            const options = result.options;
            const configDirOption = options.find(opt => opt.long === '--config-directory');

            const longPath = 'a'.repeat(1001); // Exceeds 1000 character limit

            expect(() => {
                configDirOption?.parseArg?.(longPath, longPath);
            }).toThrow(ArgumentError);
        });

        test('should accept valid config directory path', async () => {
            const result = await configure(mockCommand, baseOptions);
            const options = result.options;
            const configDirOption = options.find(opt => opt.long === '--config-directory');

            const validPath = './valid/config/path';

            expect(() => {
                const parsed = configDirOption?.parseArg?.(validPath, validPath);
                expect(parsed).toBe(validPath);
            }).not.toThrow();
        });

        test('should trim whitespace from valid config directory', async () => {
            const result = await configure(mockCommand, baseOptions);
            const options = result.options;
            const configDirOption = options.find(opt => opt.long === '--config-directory');

            const pathWithWhitespace = '  ./config  ';
            const parsed = configDirOption?.parseArg?.(pathWithWhitespace, pathWithWhitespace);

            expect(parsed).toBe('./config');
        });

        test('should throw ArgumentError with config-directory context for CLI validation failures', async () => {
            const result = await configure(mockCommand, baseOptions);
            const options = result.options;
            const configDirOption = options.find(opt => opt.long === '--config-directory');

            try {
                configDirOption?.parseArg?.('', '');
            } catch (error) {
                expect(error).toBeInstanceOf(ArgumentError);
                expect((error as ArgumentError).argument).toBe('config-directory');
                expect((error as ArgumentError).message).toContain('Invalid --config-directory:');
            }
        });

        test('should reject non-string config directory', async () => {
            const optionsWithInvalidDefault = {
                ...baseOptions,
                defaults: {
                    ...baseOptions.defaults,
                    configDirectory: 123 as any // Number instead of string
                }
            };

            await expect(configure(mockCommand, optionsWithInvalidDefault))
                .rejects
                .toThrow(ArgumentError);

            try {
                await configure(mockCommand, optionsWithInvalidDefault);
            } catch (error) {
                expect(error).toBeInstanceOf(ArgumentError);
                expect((error as ArgumentError).message).toBe('Configuration directory must be a string');
            }
        });
    });
});
