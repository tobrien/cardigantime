import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ConfigValidator, createConfigValidator, ConfigFieldSecurityMeta } from '../../src/security/config-validator';

describe('ConfigValidator', () => {
    describe('constructor', () => {
        it('should create validator with default config', () => {
            const validator = new ConfigValidator();
            expect(validator).toBeInstanceOf(ConfigValidator);
        });

        it('should create validator with custom config', () => {
            const validator = new ConfigValidator({
                failOnError: true,
                profile: 'production',
            });
            expect(validator).toBeInstanceOf(ConfigValidator);
        });
    });

    describe('registerField', () => {
        it('should register a single field', () => {
            const validator = new ConfigValidator();
            const meta: ConfigFieldSecurityMeta = {
                fieldPath: 'config.file',
                type: 'path',
            };
            
            const result = validator.registerField(meta);
            expect(result).toBe(validator); // chainable
        });
    });

    describe('registerFields', () => {
        it('should register multiple fields', () => {
            const validator = new ConfigValidator();
            const metas: ConfigFieldSecurityMeta[] = [
                { fieldPath: 'config.file', type: 'path' },
                { fieldPath: 'timeout', type: 'number', bounds: { min: 0, max: 60000 } },
            ];
            
            const result = validator.registerFields(metas);
            expect(result).toBe(validator); // chainable
        });
    });

    describe('registerFromSchema', () => {
        it('should extract string fields from schema', () => {
            const validator = new ConfigValidator();
            const schema = z.object({
                model: z.string(),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateConfig({ model: 'gpt-4' });
            expect(result.valid).toBe(true);
        });

        it('should extract path fields by name', () => {
            const validator = new ConfigValidator();
            const schema = z.object({
                configDirectory: z.string(),
                configFile: z.string(),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateConfig({
                configDirectory: './config',
                configFile: 'config.yaml',
            });
            expect(result.valid).toBe(true);
        });

        it('should extract number fields with bounds', () => {
            const validator = new ConfigValidator();
            const schema = z.object({
                timeout: z.number().min(0).max(60000),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateConfig({ timeout: 5000 });
            expect(result.valid).toBe(true);
        });

        it('should extract enum fields', () => {
            const validator = new ConfigValidator();
            const schema = z.object({
                logLevel: z.enum(['debug', 'info', 'warn', 'error']),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateConfig({ logLevel: 'info' });
            expect(result.valid).toBe(true);
        });

        it('should extract boolean fields', () => {
            const validator = new ConfigValidator();
            const schema = z.object({
                verbose: z.boolean(),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateConfig({ verbose: true });
            expect(result.valid).toBe(true);
        });

        it('should handle optional fields', () => {
            const validator = new ConfigValidator();
            const schema = z.object({
                optional: z.string().optional(),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateConfig({});
            expect(result.valid).toBe(true);
        });
    });

    describe('validateConfig', () => {
        it('should validate path fields', () => {
            const validator = new ConfigValidator();
            validator.registerField({
                fieldPath: 'configFile',
                type: 'path',
            });
            
            const result = validator.validateConfig({ configFile: 'config.yaml' });
            expect(result.valid).toBe(true);
            expect(result.source).toBe('config');
        });

        it('should reject path traversal with failOnError', () => {
            const validator = new ConfigValidator({ failOnError: true });
            validator.registerField({
                fieldPath: 'configFile',
                type: 'path',
            });
            
            const result = validator.validateConfig({ configFile: '../../../etc/passwd' });
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should validate numeric fields', () => {
            const validator = new ConfigValidator();
            validator.registerField({
                fieldPath: 'timeout',
                type: 'number',
                bounds: { min: 0, max: 60000 },
            });
            
            const result = validator.validateConfig({ timeout: 5000 });
            expect(result.valid).toBe(true);
        });

        it('should reject out-of-bounds numbers with failOnError', () => {
            const validator = new ConfigValidator({ failOnError: true });
            validator.registerField({
                fieldPath: 'timeout',
                type: 'number',
                bounds: { min: 0, max: 60000 },
            });
            
            const result = validator.validateConfig({ timeout: 999999 });
            expect(result.valid).toBe(false);
        });

        it('should validate string fields with pattern', () => {
            const validator = new ConfigValidator();
            validator.registerField({
                fieldPath: 'model',
                type: 'string',
                pattern: /^[a-z0-9-]+$/,
            });
            
            const result = validator.validateConfig({ model: 'gpt-4' });
            expect(result.valid).toBe(true);
        });

        it('should reject strings not matching pattern with failOnError', () => {
            const validator = new ConfigValidator({ failOnError: true });
            validator.registerField({
                fieldPath: 'model',
                type: 'string',
                pattern: /^[a-z0-9-]+$/,
            });
            
            const result = validator.validateConfig({ model: 'invalid model!' });
            expect(result.valid).toBe(false);
        });

        it('should validate enum fields', () => {
            const validator = new ConfigValidator();
            validator.registerField({
                fieldPath: 'logLevel',
                type: 'enum',
                allowedValues: ['debug', 'info', 'warn', 'error'],
            });
            
            const result = validator.validateConfig({ logLevel: 'info' });
            expect(result.valid).toBe(true);
        });

        it('should reject invalid enum values with failOnError', () => {
            const validator = new ConfigValidator({ failOnError: true });
            validator.registerField({
                fieldPath: 'logLevel',
                type: 'enum',
                allowedValues: ['debug', 'info', 'warn', 'error'],
            });
            
            const result = validator.validateConfig({ logLevel: 'invalid' });
            expect(result.valid).toBe(false);
        });

        it('should skip undefined optional fields', () => {
            const validator = new ConfigValidator();
            validator.registerField({
                fieldPath: 'configFile',
                type: 'path',
            });
            
            const result = validator.validateConfig({});
            expect(result.valid).toBe(true);
        });

        it('should handle boolean fields', () => {
            const validator = new ConfigValidator();
            // Booleans don't need security validation, but should not error
            const result = validator.validateConfig({ verbose: true });
            expect(result.valid).toBe(true);
        });

        it('should validate isPath fields additionally with failOnError', () => {
            const validator = new ConfigValidator({ failOnError: true });
            validator.registerField({
                fieldPath: 'output',
                type: 'string',
                isPath: true,
            });
            
            const result = validator.validateConfig({ output: '../../../etc/passwd' });
            expect(result.valid).toBe(false);
        });
    });

    describe('validateSingleFile', () => {
        it('should validate single file content', () => {
            const validator = new ConfigValidator();
            validator.registerField({
                fieldPath: 'model',
                type: 'string',
            });
            
            const result = validator.validateSingleFile(
                { model: 'gpt-4' },
                '/path/to/config.yaml',
                0
            );
            
            expect(result.valid).toBe(true);
            expect(result.source).toBe('config');
        });

        it('should include file info in errors', () => {
            const validator = new ConfigValidator({ failOnError: true });
            validator.registerField({
                fieldPath: 'configFile',
                type: 'path',
            });
            
            const result = validator.validateSingleFile(
                { configFile: '../../../etc/passwd' },
                '/path/to/config.yaml',
                0
            );
            
            expect(result.valid).toBe(false);
            expect(result.errors[0].field).toContain('config.yaml');
        });
    });

    describe('nested object validation', () => {
        it('should validate nested objects', () => {
            const validator = new ConfigValidator();
            validator.registerField({
                fieldPath: 'api.timeout',
                type: 'number',
                bounds: { min: 0, max: 60000 },
            });
            
            const result = validator.validateConfig({
                api: { timeout: 5000 },
            });
            expect(result.valid).toBe(true);
        });

        it('should validate deeply nested objects', () => {
            const validator = new ConfigValidator();
            validator.registerField({
                fieldPath: 'server.api.timeout',
                type: 'number',
                bounds: { min: 0, max: 60000 },
            });
            
            const result = validator.validateConfig({
                server: { api: { timeout: 5000 } },
            });
            expect(result.valid).toBe(true);
        });
    });

    describe('array validation', () => {
        it('should validate array elements', () => {
            const validator = new ConfigValidator();
            validator.registerField({
                fieldPath: 'files',
                type: 'array',
                arrayElementMeta: { type: 'path' },
            });
            
            const result = validator.validateConfig({
                files: ['file1.txt', 'file2.txt'],
            });
            expect(result.valid).toBe(true);
        });

        it('should reject invalid array elements with failOnError', () => {
            const validator = new ConfigValidator({ failOnError: true });
            validator.registerField({
                fieldPath: 'files',
                type: 'array',
                arrayElementMeta: { type: 'path' },
            });
            
            const result = validator.validateConfig({
                files: ['file1.txt', '../../../etc/passwd'],
            });
            expect(result.valid).toBe(false);
        });
    });

    describe('production mode warnings', () => {
        it('should warn about unregistered fields in production', () => {
            const validator = new ConfigValidator({ profile: 'production' });
            validator.registerField({
                fieldPath: 'known',
                type: 'string',
            });
            
            const result = validator.validateConfig({
                known: 'value',
                unknown: 'value',
            });
            
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings[0].message).toContain('Unregistered field');
        });
    });

    describe('createConfigValidator', () => {
        it('should create validator with factory function', () => {
            const validator = createConfigValidator();
            expect(validator).toBeInstanceOf(ConfigValidator);
        });

        it('should create validator with config', () => {
            const validator = createConfigValidator({ failOnError: true });
            expect(validator).toBeInstanceOf(ConfigValidator);
        });
    });
});
