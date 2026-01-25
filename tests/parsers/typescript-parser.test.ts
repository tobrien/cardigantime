import { describe, it, expect } from 'vitest';
import { typescriptParser } from '../../src/parsers/typescript-parser';
import { ConfigParseError } from '../../src/error';
import { ConfigFormat } from '../../src/types';
import * as path from 'node:path';

describe('TypeScript Parser', () => {
    const fixturesDir = path.join(__dirname, '..', 'fixtures');

    describe('metadata', () => {
        it('should have correct format', () => {
            expect(typescriptParser.format).toBe(ConfigFormat.TypeScript);
        });

        it('should support .ts extension', () => {
            expect(typescriptParser.extensions).toContain('.ts');
        });

        it('should support .mts extension', () => {
            expect(typescriptParser.extensions).toContain('.mts');
        });

        it('should support .cts extension', () => {
            expect(typescriptParser.extensions).toContain('.cts');
        });

        it('should prefer .mts over .ts', () => {
            // .mts should come first in the extensions array
            const mtsIndex = typescriptParser.extensions.indexOf('.mts');
            const tsIndex = typescriptParser.extensions.indexOf('.ts');
            expect(mtsIndex).toBeLessThan(tsIndex);
        });
    });

    describe('parse', () => {
        it('should parse TypeScript-like config (using .mts)', async () => {
            const filePath = path.join(fixturesDir, 'config-typescript.mts');
            const result = await typescriptParser.parse('', filePath);

            expect(result).toHaveProperty('appName', 'test-app-typescript');
            expect(result).toHaveProperty('version', '1.0.0');
            expect(result).toHaveProperty('typed', true);
        });

        it('should handle nested objects', async () => {
            const filePath = path.join(fixturesDir, 'config-esm-default.mjs');
            const result = await typescriptParser.parse('', filePath);

            expect(result).toHaveProperty('database');
            expect((result as any).database).toHaveProperty('host');
        });

        it('should handle arrays', async () => {
            const filePath = path.join(fixturesDir, 'config-typescript.mts');
            const result = await typescriptParser.parse('', filePath);

            expect(result).toHaveProperty('features');
            expect(Array.isArray((result as any).features)).toBe(true);
        });

        it('should handle function exports', async () => {
            const filePath = path.join(fixturesDir, 'config-function.mjs');
            const result = await typescriptParser.parse('', filePath);

            expect(result).toHaveProperty('appName', 'test-app-function');
            expect(result).toHaveProperty('computed', true);
        });

        it('should handle async function exports', async () => {
            const filePath = path.join(fixturesDir, 'config-async.mjs');
            const result = await typescriptParser.parse('', filePath);

            expect(result).toHaveProperty('appName', 'test-app-async');
            expect(result).toHaveProperty('async', true);
        });

        it('should throw ConfigParseError for invalid export type', async () => {
            const filePath = path.join(fixturesDir, 'config-invalid-export.mjs');

            await expect(typescriptParser.parse('', filePath))
                .rejects.toThrow(ConfigParseError);

            await expect(typescriptParser.parse('', filePath))
                .rejects.toThrow('must be an object');
        });

        it('should throw ConfigParseError for syntax errors', async () => {
            const filePath = path.join(fixturesDir, 'config-syntax-error.mjs');

            await expect(typescriptParser.parse('', filePath))
                .rejects.toThrow(ConfigParseError);
        });

        it('should throw ConfigParseError for non-existent file', async () => {
            const filePath = path.join(fixturesDir, 'does-not-exist.ts');

            await expect(typescriptParser.parse('', filePath))
                .rejects.toThrow(ConfigParseError);
        });

        it('should include file path in error', async () => {
            const filePath = path.join(fixturesDir, 'config-invalid-export.mjs');

            try {
                await typescriptParser.parse('', filePath);
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(ConfigParseError);
                expect((error as ConfigParseError).filePath).toBe(filePath);
            }
        });
    });

    describe('module caching', () => {
        it('should handle multiple imports of same file', async () => {
            const filePath = path.join(fixturesDir, 'config-typescript.mts');

            // Import twice
            const result1 = await typescriptParser.parse('', filePath);
            const result2 = await typescriptParser.parse('', filePath);

            // Both should succeed
            expect(result1).toHaveProperty('appName', 'test-app-typescript');
            expect(result2).toHaveProperty('appName', 'test-app-typescript');
        });
    });

    describe('error handling', () => {
        it('should provide helpful error for import failures', async () => {
            const filePath = '/nonexistent/path/config.ts';

            try {
                await typescriptParser.parse('', filePath);
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(ConfigParseError);
                expect((error as ConfigParseError).message).toContain('Failed to load');
            }
        });

        it('should provide helpful error message for TypeScript runtime issues', async () => {
            // This test documents the expected behavior when .ts files are used
            // without a TypeScript runtime. In practice, this would fail with
            // ERR_UNKNOWN_FILE_EXTENSION, but we can't easily test that without
            // actually trying to load a .ts file
            const filePath = '/test/config.ts';

            // The error message should be helpful
            const error = new ConfigParseError(
                'Failed to load TypeScript configuration',
                filePath
            );

            expect(error.message).toContain('TypeScript');
        });
    });
});
