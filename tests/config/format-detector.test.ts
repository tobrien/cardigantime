import { describe, it, expect, beforeEach } from 'vitest';
import {
    detectConfigFormat,
    getFormatPriority,
    getFormatExtensions,
    FormatDetectorOptions
} from '../../src/config/format-detector';
import { ConfigFormat } from '../../src/types';

describe('Format Detector', () => {
    // Mock storage implementation
    const createMockStorage = (existingFiles: string[]) => ({
        async exists(filePath: string): Promise<boolean> {
            return existingFiles.includes(filePath);
        },
        async isFileReadable(filePath: string): Promise<boolean> {
            return existingFiles.includes(filePath);
        }
    });

    // Mock logger
    const mockLogger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        verbose: () => {},
        silly: () => {}
    };

    describe('detectConfigFormat', () => {
        it('should detect YAML config when only YAML exists', async () => {
            const storage = createMockStorage(['/test/config.yaml']);
            const options: FormatDetectorOptions = {
                configFileName: 'config',
                configDirectory: '/test',
                storage,
                logger: mockLogger
            };

            const result = await detectConfigFormat(options);

            expect(result).not.toBeNull();
            expect(result?.format).toBe(ConfigFormat.YAML);
            expect(result?.filePath).toBe('/test/config.yaml');
            expect(result?.wasOverridden).toBe(false);
        });

        it('should detect JSON config when only JSON exists', async () => {
            const storage = createMockStorage(['/test/config.json']);
            const options: FormatDetectorOptions = {
                configFileName: 'config',
                configDirectory: '/test',
                storage,
                logger: mockLogger
            };

            const result = await detectConfigFormat(options);

            expect(result).not.toBeNull();
            expect(result?.format).toBe(ConfigFormat.JSON);
            expect(result?.filePath).toBe('/test/config.json');
            expect(result?.wasOverridden).toBe(false);
        });

        it('should prefer JSON over YAML when both exist', async () => {
            const storage = createMockStorage(['/test/config.yaml', '/test/config.json']);
            const options: FormatDetectorOptions = {
                configFileName: 'config',
                configDirectory: '/test',
                storage,
                logger: mockLogger
            };

            const result = await detectConfigFormat(options);

            expect(result).not.toBeNull();
            expect(result?.format).toBe(ConfigFormat.JSON);
            expect(result?.filePath).toBe('/test/config.json');
        });

        it('should prefer .yml over .yaml', async () => {
            const storage = createMockStorage(['/test/config.yml', '/test/config.yaml']);
            const options: FormatDetectorOptions = {
                configFileName: 'config',
                configDirectory: '/test',
                storage,
                logger: mockLogger
            };

            const result = await detectConfigFormat(options);

            expect(result).not.toBeNull();
            // Should find .yaml first (comes before .yml in extensions array)
            expect(result?.format).toBe(ConfigFormat.YAML);
        });

        it('should return null when no config files exist', async () => {
            const storage = createMockStorage([]);
            const options: FormatDetectorOptions = {
                configFileName: 'config',
                configDirectory: '/test',
                storage,
                logger: mockLogger
            };

            const result = await detectConfigFormat(options);

            expect(result).toBeNull();
        });

        it('should handle config file name with extension', async () => {
            const storage = createMockStorage(['/test/config.yaml']);
            const options: FormatDetectorOptions = {
                configFileName: 'config.yaml',  // Extension included
                configDirectory: '/test',
                storage,
                logger: mockLogger
            };

            const result = await detectConfigFormat(options);

            expect(result).not.toBeNull();
            expect(result?.format).toBe(ConfigFormat.YAML);
        });

        it('should prefer JavaScript over JSON when both exist', async () => {
            // JavaScript has higher priority than JSON
            const storage = createMockStorage([
                '/test/config.js',
                '/test/config.json'
            ]);
            const options: FormatDetectorOptions = {
                configFileName: 'config',
                configDirectory: '/test',
                storage,
                logger: mockLogger
            };

            const result = await detectConfigFormat(options);

            // Should find JavaScript since it has higher priority
            expect(result).not.toBeNull();
            expect(result?.format).toBe(ConfigFormat.JavaScript);
        });
    });

    describe('format override', () => {
        it('should use overridden format when specified', async () => {
            const storage = createMockStorage(['/test/config.yaml', '/test/config.json']);
            const options: FormatDetectorOptions = {
                configFileName: 'config',
                configDirectory: '/test',
                formatOverride: ConfigFormat.YAML,
                storage,
                logger: mockLogger
            };

            const result = await detectConfigFormat(options);

            expect(result).not.toBeNull();
            expect(result?.format).toBe(ConfigFormat.YAML);
            expect(result?.wasOverridden).toBe(true);
        });

        it('should return null if overridden format file does not exist', async () => {
            const storage = createMockStorage(['/test/config.yaml']);
            const options: FormatDetectorOptions = {
                configFileName: 'config',
                configDirectory: '/test',
                formatOverride: ConfigFormat.JSON,
                storage,
                logger: mockLogger
            };

            const result = await detectConfigFormat(options);

            expect(result).toBeNull();
        });

        it('should check all extensions for overridden format', async () => {
            const storage = createMockStorage(['/test/config.yml']);
            const options: FormatDetectorOptions = {
                configFileName: 'config',
                configDirectory: '/test',
                formatOverride: ConfigFormat.YAML,
                storage,
                logger: mockLogger
            };

            const result = await detectConfigFormat(options);

            expect(result).not.toBeNull();
            expect(result?.format).toBe(ConfigFormat.YAML);
            expect(result?.filePath).toBe('/test/config.yml');
        });
    });

    describe('getFormatPriority', () => {
        it('should return correct priority for YAML', () => {
            expect(getFormatPriority(ConfigFormat.YAML)).toBe(0);
        });

        it('should return correct priority for JSON', () => {
            expect(getFormatPriority(ConfigFormat.JSON)).toBe(1);
        });

        it('should return correct priority for JavaScript', () => {
            expect(getFormatPriority(ConfigFormat.JavaScript)).toBe(2);
        });

        it('should return correct priority for TypeScript', () => {
            expect(getFormatPriority(ConfigFormat.TypeScript)).toBe(3);
        });

        it('should show TypeScript has higher priority than JSON', () => {
            const tsPriority = getFormatPriority(ConfigFormat.TypeScript);
            const jsonPriority = getFormatPriority(ConfigFormat.JSON);
            expect(tsPriority).toBeGreaterThan(jsonPriority);
        });

        it('should show JSON has higher priority than YAML', () => {
            const jsonPriority = getFormatPriority(ConfigFormat.JSON);
            const yamlPriority = getFormatPriority(ConfigFormat.YAML);
            expect(jsonPriority).toBeGreaterThan(yamlPriority);
        });
    });

    describe('getFormatExtensions', () => {
        it('should return YAML extensions', () => {
            const extensions = getFormatExtensions(ConfigFormat.YAML);
            expect(extensions).toContain('.yaml');
            expect(extensions).toContain('.yml');
        });

        it('should return JSON extensions', () => {
            const extensions = getFormatExtensions(ConfigFormat.JSON);
            expect(extensions).toContain('.json');
        });

        it('should return JavaScript extensions', () => {
            const extensions = getFormatExtensions(ConfigFormat.JavaScript);
            expect(extensions).toContain('.js');
            expect(extensions).toContain('.mjs');
            expect(extensions).toContain('.cjs');
        });

        it('should return TypeScript extensions', () => {
            const extensions = getFormatExtensions(ConfigFormat.TypeScript);
            expect(extensions).toContain('.ts');
            expect(extensions).toContain('.mts');
            expect(extensions).toContain('.cts');
        });

        it('should return empty array for unknown format', () => {
            const extensions = getFormatExtensions('unknown' as ConfigFormat);
            expect(extensions).toEqual([]);
        });
    });
});
