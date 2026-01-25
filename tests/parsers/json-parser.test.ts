import { describe, it, expect } from 'vitest';
import { jsonParser } from '../../src/parsers/json-parser';
import { ConfigParseError } from '../../src/error';
import { ConfigFormat } from '../../src/types';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

describe('JSON Parser', () => {
    describe('metadata', () => {
        it('should have correct format', () => {
            expect(jsonParser.format).toBe(ConfigFormat.JSON);
        });

        it('should support .json extension', () => {
            expect(jsonParser.extensions).toContain('.json');
        });
    });

    describe('parse', () => {
        it('should parse valid JSON object', async () => {
            const content = '{"name": "test", "value": 42}';
            const result = await jsonParser.parse(content, 'test.json');
            
            expect(result).toEqual({ name: 'test', value: 42 });
        });

        it('should parse empty JSON object', async () => {
            const content = '{}';
            const result = await jsonParser.parse(content, 'test.json');
            
            expect(result).toEqual({});
        });

        it('should parse nested JSON objects', async () => {
            const content = JSON.stringify({
                database: {
                    host: 'localhost',
                    port: 5432,
                    credentials: {
                        username: 'admin'
                    }
                }
            });
            const result = await jsonParser.parse(content, 'test.json');
            
            expect(result).toHaveProperty('database.host', 'localhost');
            expect(result).toHaveProperty('database.credentials.username', 'admin');
        });

        it('should parse JSON with arrays', async () => {
            const content = '{"features": ["auth", "api", "logging"]}';
            const result = await jsonParser.parse(content, 'test.json');
            
            expect(result).toHaveProperty('features');
            expect((result as any).features).toEqual(['auth', 'api', 'logging']);
        });

        it('should parse JSON with various data types', async () => {
            const content = JSON.stringify({
                string: 'value',
                number: 42,
                boolean: true,
                nullValue: null,
                array: [1, 2, 3],
                object: { nested: true }
            });
            const result = await jsonParser.parse(content, 'test.json');
            
            expect(result).toMatchObject({
                string: 'value',
                number: 42,
                boolean: true,
                nullValue: null,
                array: [1, 2, 3],
                object: { nested: true }
            });
        });

        it('should throw ConfigParseError for invalid JSON syntax', async () => {
            const content = '{"name": "test", "missing": "comma" "error": true}';
            
            await expect(jsonParser.parse(content, 'test.json'))
                .rejects.toThrow(ConfigParseError);
        });

        it('should throw ConfigParseError for JSON arrays', async () => {
            const content = '["array", "not", "object"]';
            
            await expect(jsonParser.parse(content, 'test.json'))
                .rejects.toThrow(ConfigParseError);
            
            await expect(jsonParser.parse(content, 'test.json'))
                .rejects.toThrow('must be a JSON object');
        });

        it('should throw ConfigParseError for JSON primitives', async () => {
            const content = '"just a string"';
            
            await expect(jsonParser.parse(content, 'test.json'))
                .rejects.toThrow(ConfigParseError);
            
            await expect(jsonParser.parse(content, 'test.json'))
                .rejects.toThrow('must be a JSON object');
        });

        it('should throw ConfigParseError for null', async () => {
            const content = 'null';
            
            await expect(jsonParser.parse(content, 'test.json'))
                .rejects.toThrow(ConfigParseError);
        });

        it('should include file path in error', async () => {
            const content = 'invalid json';
            const filePath = '/path/to/config.json';
            
            try {
                await jsonParser.parse(content, filePath);
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(ConfigParseError);
                expect((error as ConfigParseError).filePath).toBe(filePath);
            }
        });

        it('should handle malformed JSON with helpful error', async () => {
            const content = '{"unclosed": "string';
            
            await expect(jsonParser.parse(content, 'test.json'))
                .rejects.toThrow(ConfigParseError);
        });
    });

    describe('integration with fixtures', () => {
        const fixturesDir = path.join(__dirname, '..', 'fixtures');

        it('should parse valid-config.json fixture', async () => {
            const content = await fs.readFile(
                path.join(fixturesDir, 'valid-config.json'),
                'utf-8'
            );
            const result = await jsonParser.parse(content, 'valid-config.json');
            
            expect(result).toHaveProperty('appName', 'test-app');
            expect(result).toHaveProperty('version', '1.0.0');
            expect(result).toHaveProperty('features');
            expect(result).toHaveProperty('database.host', 'localhost');
        });

        it('should parse empty-config.json fixture', async () => {
            const content = await fs.readFile(
                path.join(fixturesDir, 'empty-config.json'),
                'utf-8'
            );
            const result = await jsonParser.parse(content, 'empty-config.json');
            
            expect(result).toEqual({});
        });

        it('should reject invalid-json.json fixture', async () => {
            const content = await fs.readFile(
                path.join(fixturesDir, 'invalid-json.json'),
                'utf-8'
            );
            
            await expect(jsonParser.parse(content, 'invalid-json.json'))
                .rejects.toThrow(ConfigParseError);
        });

        it('should reject json-array.json fixture', async () => {
            const content = await fs.readFile(
                path.join(fixturesDir, 'json-array.json'),
                'utf-8'
            );
            
            await expect(jsonParser.parse(content, 'json-array.json'))
                .rejects.toThrow(ConfigParseError);
        });

        it('should reject json-primitive.json fixture', async () => {
            const content = await fs.readFile(
                path.join(fixturesDir, 'json-primitive.json'),
                'utf-8'
            );
            
            await expect(jsonParser.parse(content, 'json-primitive.json'))
                .rejects.toThrow(ConfigParseError);
        });
    });
});
