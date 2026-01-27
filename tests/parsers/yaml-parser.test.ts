import { describe, it, expect } from 'vitest';
import { yamlParser } from '../../src/parsers/yaml-parser';
import { ConfigParseError } from '../../src/error';
import { ConfigFormat } from '../../src/types';

describe('YAML Parser', () => {
    describe('metadata', () => {
        it('should have correct format', () => {
            expect(yamlParser.format).toBe(ConfigFormat.YAML);
        });

        it('should support .yaml extension', () => {
            expect(yamlParser.extensions).toContain('.yaml');
        });

        it('should support .yml extension', () => {
            expect(yamlParser.extensions).toContain('.yml');
        });
    });

    describe('parse', () => {
        it('should parse valid YAML object', async () => {
            const content = 'name: test\nvalue: 42';
            const result = await yamlParser.parse(content, 'test.yaml');
            
            expect(result).toEqual({ name: 'test', value: 42 });
        });

        it('should parse empty YAML as empty object', async () => {
            const content = '';
            const result = await yamlParser.parse(content, 'test.yaml');
            
            expect(result).toEqual({});
        });

        it('should parse nested YAML objects', async () => {
            const content = `
database:
  host: localhost
  port: 5432
  credentials:
    username: admin
`;
            const result = await yamlParser.parse(content, 'test.yaml');
            
            expect(result).toHaveProperty('database.host', 'localhost');
            expect(result).toHaveProperty('database.credentials.username', 'admin');
        });

        it('should parse YAML with arrays', async () => {
            const content = `
features:
  - auth
  - api
  - logging
`;
            const result = await yamlParser.parse(content, 'test.yaml');
            
            expect(result).toHaveProperty('features');
            expect((result as any).features).toEqual(['auth', 'api', 'logging']);
        });

        it('should parse YAML with various data types', async () => {
            const content = `
string: value
number: 42
boolean: true
nullValue: null
array:
  - 1
  - 2
  - 3
object:
  nested: true
`;
            const result = await yamlParser.parse(content, 'test.yaml');
            
            expect(result).toMatchObject({
                string: 'value',
                number: 42,
                boolean: true,
                nullValue: null,
                array: [1, 2, 3],
                object: { nested: true }
            });
        });

        it('should throw ConfigParseError for invalid YAML syntax', async () => {
            // Use truly invalid YAML - tabs are not allowed for indentation in YAML
            const invalidContent = 'key:\n\tvalue: bad';
            
            await expect(yamlParser.parse(invalidContent, 'test.yaml'))
                .rejects.toThrow(ConfigParseError);
        });

        it('should throw ConfigParseError for YAML arrays at root', async () => {
            const content = '- array\n- not\n- object';
            
            await expect(yamlParser.parse(content, 'test.yaml'))
                .rejects.toThrow(ConfigParseError);
            
            await expect(yamlParser.parse(content, 'test.yaml'))
                .rejects.toThrow('must be a YAML object');
        });

        it('should throw ConfigParseError for YAML primitives', async () => {
            const content = 'just a string';
            
            await expect(yamlParser.parse(content, 'test.yaml'))
                .rejects.toThrow(ConfigParseError);
            
            await expect(yamlParser.parse(content, 'test.yaml'))
                .rejects.toThrow('must be a YAML object');
        });

        it('should include file path in error', async () => {
            const content = '- invalid array';
            const filePath = '/path/to/config.yaml';
            
            try {
                await yamlParser.parse(content, filePath);
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(ConfigParseError);
                expect((error as ConfigParseError).filePath).toBe(filePath);
            }
        });

        it('should handle YAML with comments', async () => {
            const content = `
# This is a comment
name: test  # inline comment
# Another comment
value: 42
`;
            const result = await yamlParser.parse(content, 'test.yaml');
            
            expect(result).toEqual({ name: 'test', value: 42 });
        });

        it('should handle multi-line strings', async () => {
            const content = `
description: |
  This is a multi-line
  string in YAML
  with preserved newlines
`;
            const result = await yamlParser.parse(content, 'test.yaml');
            
            expect(result).toHaveProperty('description');
            expect((result as any).description).toContain('multi-line');
        });

        it('should handle YAML anchors and aliases', async () => {
            const content = `
defaults: &defaults
  timeout: 30
  retries: 3

production:
  <<: *defaults
  host: prod.example.com

development:
  <<: *defaults
  host: dev.example.com
`;
            const result = await yamlParser.parse(content, 'test.yaml');
            
            expect(result).toHaveProperty('production.timeout', 30);
            expect(result).toHaveProperty('development.timeout', 30);
            expect(result).toHaveProperty('production.host', 'prod.example.com');
        });
    });
});
