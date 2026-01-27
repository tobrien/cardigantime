import { describe, it, expect } from 'vitest';
import { 
    getParserForExtension, 
    getParserForFormat, 
    getAllParsers,
    jsonParser,
    yamlParser,
    javascriptParser,
    typescriptParser
} from '../../src/parsers';
import { ConfigFormat } from '../../src/types';

describe('Parser Registry', () => {
    describe('getParserForExtension', () => {
        it('should return JSON parser for .json extension', () => {
            const parser = getParserForExtension('.json');
            
            expect(parser).toBeDefined();
            expect(parser?.format).toBe(ConfigFormat.JSON);
        });

        it('should return YAML parser for .yaml extension', () => {
            const parser = getParserForExtension('.yaml');
            
            expect(parser).toBeDefined();
            expect(parser?.format).toBe(ConfigFormat.YAML);
        });

        it('should return YAML parser for .yml extension', () => {
            const parser = getParserForExtension('.yml');
            
            expect(parser).toBeDefined();
            expect(parser?.format).toBe(ConfigFormat.YAML);
        });

        it('should return undefined for unsupported extension', () => {
            const parser = getParserForExtension('.txt');
            
            expect(parser).toBeUndefined();
        });

        it('should return JavaScript parser for .js extension', () => {
            const parser = getParserForExtension('.js');
            
            expect(parser).toBeDefined();
            expect(parser?.format).toBe(ConfigFormat.JavaScript);
        });
    });

    describe('getParserForFormat', () => {
        it('should return JSON parser for JSON format', () => {
            const parser = getParserForFormat(ConfigFormat.JSON);
            
            expect(parser).toBeDefined();
            expect(parser?.format).toBe(ConfigFormat.JSON);
        });

        it('should return YAML parser for YAML format', () => {
            const parser = getParserForFormat(ConfigFormat.YAML);
            
            expect(parser).toBeDefined();
            expect(parser?.format).toBe(ConfigFormat.YAML);
        });

        it('should return JavaScript parser for JavaScript format', () => {
            const parser = getParserForFormat(ConfigFormat.JavaScript);
            
            expect(parser).toBeDefined();
            expect(parser?.format).toBe(ConfigFormat.JavaScript);
        });

        it('should return TypeScript parser for TypeScript format', () => {
            const parser = getParserForFormat(ConfigFormat.TypeScript);
            
            expect(parser).toBeDefined();
            expect(parser?.format).toBe(ConfigFormat.TypeScript);
        });
    });

    describe('getAllParsers', () => {
        it('should return all registered parsers', () => {
            const parsers = getAllParsers();
            
            expect(parsers).toBeInstanceOf(Array);
            expect(parsers.length).toBeGreaterThanOrEqual(4);
        });

        it('should include JSON parser', () => {
            const parsers = getAllParsers();
            const hasJsonParser = parsers.some(p => p.format === ConfigFormat.JSON);
            
            expect(hasJsonParser).toBe(true);
        });

        it('should include YAML parser', () => {
            const parsers = getAllParsers();
            const hasYamlParser = parsers.some(p => p.format === ConfigFormat.YAML);
            
            expect(hasYamlParser).toBe(true);
        });

        it('should include JavaScript parser', () => {
            const parsers = getAllParsers();
            const hasJavaScriptParser = parsers.some(p => p.format === ConfigFormat.JavaScript);
            
            expect(hasJavaScriptParser).toBe(true);
        });

        it('should include TypeScript parser', () => {
            const parsers = getAllParsers();
            const hasTypeScriptParser = parsers.some(p => p.format === ConfigFormat.TypeScript);
            
            expect(hasTypeScriptParser).toBe(true);
        });

        it('should return unique parsers', () => {
            const parsers = getAllParsers();
            const formats = parsers.map(p => p.format);
            const uniqueFormats = new Set(formats);
            
            expect(formats.length).toBe(uniqueFormats.size);
        });
    });

    describe('exported parsers', () => {
        it('should export jsonParser', () => {
            expect(jsonParser).toBeDefined();
            expect(jsonParser.format).toBe(ConfigFormat.JSON);
            expect(jsonParser.extensions).toContain('.json');
        });

        it('should export yamlParser', () => {
            expect(yamlParser).toBeDefined();
            expect(yamlParser.format).toBe(ConfigFormat.YAML);
            expect(yamlParser.extensions).toContain('.yaml');
            expect(yamlParser.extensions).toContain('.yml');
        });

        it('should export javascriptParser', () => {
            expect(javascriptParser).toBeDefined();
            expect(javascriptParser.format).toBe(ConfigFormat.JavaScript);
            expect(javascriptParser.extensions).toContain('.js');
            expect(javascriptParser.extensions).toContain('.mjs');
        });

        it('should export typescriptParser', () => {
            expect(typescriptParser).toBeDefined();
            expect(typescriptParser.format).toBe(ConfigFormat.TypeScript);
            expect(typescriptParser.extensions).toContain('.ts');
            expect(typescriptParser.extensions).toContain('.mts');
        });
    });
});
