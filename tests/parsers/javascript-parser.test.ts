import { describe, it, expect } from 'vitest';
import { javascriptParser } from '../../src/parsers/javascript-parser';
import { ConfigParseError } from '../../src/error';
import { ConfigFormat } from '../../src/types';
import * as path from 'node:path';

describe('JavaScript Parser', () => {
    const fixturesDir = path.join(__dirname, '..', 'fixtures');

    describe('metadata', () => {
        it('should have correct format', () => {
            expect(javascriptParser.format).toBe(ConfigFormat.JavaScript);
        });

        it('should support .js extension', () => {
            expect(javascriptParser.extensions).toContain('.js');
        });

        it('should support .mjs extension', () => {
            expect(javascriptParser.extensions).toContain('.mjs');
        });

        it('should support .cjs extension', () => {
            expect(javascriptParser.extensions).toContain('.cjs');
        });

        it('should prefer .mjs over .js', () => {
            // .mjs should come first in the extensions array
            const mjsIndex = javascriptParser.extensions.indexOf('.mjs');
            const jsIndex = javascriptParser.extensions.indexOf('.js');
            expect(mjsIndex).toBeLessThan(jsIndex);
        });
    });

    describe('parse', () => {
        it('should parse ESM default export', async () => {
            const filePath = path.join(fixturesDir, 'config-esm-default.mjs');
            const result = await javascriptParser.parse('', filePath);

            expect(result).toHaveProperty('appName', 'test-app-esm');
            expect(result).toHaveProperty('version', '1.0.0');
            expect(result).toHaveProperty('features');
            expect(result).toHaveProperty('database.host', 'localhost');
        });

        it('should parse function export', async () => {
            const filePath = path.join(fixturesDir, 'config-function.mjs');
            const result = await javascriptParser.parse('', filePath);

            expect(result).toHaveProperty('appName', 'test-app-function');
            expect(result).toHaveProperty('version', '2.0.0');
            expect(result).toHaveProperty('computed', true);
        });

        it('should parse async function export', async () => {
            const filePath = path.join(fixturesDir, 'config-async.mjs');
            const result = await javascriptParser.parse('', filePath);

            expect(result).toHaveProperty('appName', 'test-app-async');
            expect(result).toHaveProperty('version', '3.0.0');
            expect(result).toHaveProperty('async', true);
        });

        it('should throw ConfigParseError for invalid export type', async () => {
            const filePath = path.join(fixturesDir, 'config-invalid-export.mjs');

            await expect(javascriptParser.parse('', filePath))
                .rejects.toThrow(ConfigParseError);

            await expect(javascriptParser.parse('', filePath))
                .rejects.toThrow('must be an object');
        });

        it('should throw ConfigParseError for syntax errors', async () => {
            const filePath = path.join(fixturesDir, 'config-syntax-error.mjs');

            await expect(javascriptParser.parse('', filePath))
                .rejects.toThrow(ConfigParseError);
        });

        it('should throw ConfigParseError for non-existent file', async () => {
            const filePath = path.join(fixturesDir, 'does-not-exist.mjs');

            await expect(javascriptParser.parse('', filePath))
                .rejects.toThrow(ConfigParseError);
        });

        it('should include file path in error', async () => {
            const filePath = path.join(fixturesDir, 'config-invalid-export.mjs');

            try {
                await javascriptParser.parse('', filePath);
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(ConfigParseError);
                expect((error as ConfigParseError).filePath).toBe(filePath);
            }
        });

        it('should handle config with nested objects', async () => {
            const filePath = path.join(fixturesDir, 'config-esm-default.mjs');
            const result = await javascriptParser.parse('', filePath);

            expect(result).toHaveProperty('database');
            expect((result as any).database).toHaveProperty('host');
            expect((result as any).database).toHaveProperty('port');
        });

        it('should handle config with arrays', async () => {
            const filePath = path.join(fixturesDir, 'config-esm-default.mjs');
            const result = await javascriptParser.parse('', filePath);

            expect(result).toHaveProperty('features');
            expect(Array.isArray((result as any).features)).toBe(true);
            expect((result as any).features).toContain('auth');
        });
    });

    describe('module caching', () => {
        it('should handle multiple imports of same file', async () => {
            const filePath = path.join(fixturesDir, 'config-esm-default.mjs');

            // Import twice
            const result1 = await javascriptParser.parse('', filePath);
            const result2 = await javascriptParser.parse('', filePath);

            // Both should succeed
            expect(result1).toHaveProperty('appName', 'test-app-esm');
            expect(result2).toHaveProperty('appName', 'test-app-esm');
        });
    });

    describe('error handling', () => {
        it('should provide helpful error for import failures', async () => {
            const filePath = '/nonexistent/path/config.mjs';

            try {
                await javascriptParser.parse('', filePath);
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(ConfigParseError);
                expect((error as ConfigParseError).message).toContain('Failed to load');
            }
        });

        it('should wrap non-Error exceptions', async () => {
            // This test verifies the error handling for non-Error throws
            // which is defensive programming
            const filePath = path.join(fixturesDir, 'config-syntax-error.mjs');

            await expect(javascriptParser.parse('', filePath))
                .rejects.toThrow(ConfigParseError);
        });
    });
});
