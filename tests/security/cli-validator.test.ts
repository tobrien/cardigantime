import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { CLIValidator, createCLIValidator, CLIOptionSecurityMeta } from '../../src/security/cli-validator';

describe('CLIValidator', () => {
    describe('constructor', () => {
        it('should create validator with default config', () => {
            const validator = new CLIValidator();
            expect(validator).toBeInstanceOf(CLIValidator);
        });

        it('should create validator with custom config', () => {
            const validator = new CLIValidator({
                failOnError: true,
                profile: 'production',
            });
            expect(validator).toBeInstanceOf(CLIValidator);
        });
    });

    describe('registerOption', () => {
        it('should register a single option', () => {
            const validator = new CLIValidator();
            const meta: CLIOptionSecurityMeta = {
                name: '--config-file',
                type: 'path',
            };
            
            const result = validator.registerOption(meta);
            expect(result).toBe(validator); // chainable
        });
    });

    describe('registerOptions', () => {
        it('should register multiple options', () => {
            const validator = new CLIValidator();
            const metas: CLIOptionSecurityMeta[] = [
                { name: '--config-file', type: 'path' },
                { name: '--timeout', type: 'number', bounds: { min: 0, max: 60000 } },
            ];
            
            const result = validator.registerOptions(metas);
            expect(result).toBe(validator); // chainable
        });
    });

    describe('registerFromSchema', () => {
        it('should extract string fields from schema', () => {
            const validator = new CLIValidator();
            const schema = z.object({
                model: z.string(),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateArgs({ model: 'gpt-4' });
            expect(result.valid).toBe(true);
        });

        it('should extract path fields from schema by name', () => {
            const validator = new CLIValidator();
            const schema = z.object({
                configDirectory: z.string(),
                configFile: z.string(),
                outputPath: z.string(),
            });
            
            validator.registerFromSchema(schema);
            // These should be detected as paths
            const result = validator.validateArgs({
                configDirectory: './config',
                configFile: 'config.yaml',
                outputPath: '/output',
            });
            expect(result.valid).toBe(true);
        });

        it('should extract number fields with bounds', () => {
            const validator = new CLIValidator();
            const schema = z.object({
                timeout: z.number().min(0).max(60000),
                retries: z.number().int().min(0).max(10),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateArgs({
                timeout: 5000,
                retries: 3,
            });
            expect(result.valid).toBe(true);
        });

        it('should extract enum fields', () => {
            const validator = new CLIValidator();
            const schema = z.object({
                logLevel: z.enum(['debug', 'info', 'warn', 'error']),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateArgs({ logLevel: 'info' });
            expect(result.valid).toBe(true);
        });

        it('should extract boolean fields', () => {
            const validator = new CLIValidator();
            const schema = z.object({
                verbose: z.boolean(),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateArgs({ verbose: true });
            expect(result.valid).toBe(true);
        });

        it('should handle optional fields', () => {
            const validator = new CLIValidator();
            const schema = z.object({
                optional: z.string().optional(),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateArgs({});
            expect(result.valid).toBe(true);
        });

        it('should handle nullable fields', () => {
            const validator = new CLIValidator();
            const schema = z.object({
                nullable: z.string().nullable(),
            });
            
            validator.registerFromSchema(schema);
            const result = validator.validateArgs({ nullable: null });
            expect(result.valid).toBe(true);
        });

        it('should use custom option mapping', () => {
            const validator = new CLIValidator();
            const schema = z.object({
                configFile: z.string(),
            });
            
            validator.registerFromSchema(schema, {
                configFile: '-c',
            });
            
            // The mapping should work
            const result = validator.validateArgs({ configFile: 'test.yaml' });
            expect(result.valid).toBe(true);
        });
    });

    describe('validateArgs', () => {
        it('should validate path arguments', () => {
            const validator = new CLIValidator();
            validator.registerOption({
                name: '--config-file',
                type: 'path',
            });
            
            const result = validator.validateArgs({ configFile: 'config.yaml' });
            expect(result.valid).toBe(true);
            expect(result.source).toBe('cli');
        });

        it('should reject path traversal', () => {
            const validator = new CLIValidator({ failOnError: true });
            validator.registerOption({
                name: '--config-file',
                type: 'path',
            });
            
            const result = validator.validateArgs({ configFile: '../../../etc/passwd' });
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should validate numeric arguments', () => {
            const validator = new CLIValidator();
            validator.registerOption({
                name: '--timeout',
                type: 'number',
                bounds: { min: 0, max: 60000 },
            });
            
            const result = validator.validateArgs({ timeout: 5000 });
            expect(result.valid).toBe(true);
        });

        it('should reject out-of-bounds numbers', () => {
            const validator = new CLIValidator({ failOnError: true });
            validator.registerOption({
                name: '--timeout',
                type: 'number',
                bounds: { min: 0, max: 60000 },
            });
            
            const result = validator.validateArgs({ timeout: 999999 });
            expect(result.valid).toBe(false);
        });

        it('should validate string arguments with pattern', () => {
            const validator = new CLIValidator();
            validator.registerOption({
                name: '--model',
                type: 'string',
                pattern: /^[a-z0-9-]+$/,
            });
            
            const result = validator.validateArgs({ model: 'gpt-4' });
            expect(result.valid).toBe(true);
        });

        it('should reject strings not matching pattern', () => {
            const validator = new CLIValidator({ failOnError: true });
            validator.registerOption({
                name: '--model',
                type: 'string',
                pattern: /^[a-z0-9-]+$/,
            });
            
            const result = validator.validateArgs({ model: 'invalid model!' });
            expect(result.valid).toBe(false);
        });

        it('should validate enum arguments', () => {
            const validator = new CLIValidator();
            validator.registerOption({
                name: '--log-level',
                type: 'enum',
                allowedValues: ['debug', 'info', 'warn', 'error'],
            });
            
            const result = validator.validateArgs({ logLevel: 'info' });
            expect(result.valid).toBe(true);
        });

        it('should reject invalid enum values', () => {
            const validator = new CLIValidator({ failOnError: true });
            validator.registerOption({
                name: '--log-level',
                type: 'enum',
                allowedValues: ['debug', 'info', 'warn', 'error'],
            });
            
            const result = validator.validateArgs({ logLevel: 'invalid' });
            expect(result.valid).toBe(false);
        });

        it('should handle required fields', () => {
            const validator = new CLIValidator({ failOnError: true });
            validator.registerOption({
                name: '--config-file',
                type: 'path',
                required: true,
            });
            
            const result = validator.validateArgs({});
            expect(result.valid).toBe(false);
            expect(result.errors[0].message).toContain('required');
        });

        it('should skip undefined optional fields', () => {
            const validator = new CLIValidator();
            validator.registerOption({
                name: '--config-file',
                type: 'path',
                required: false,
            });
            
            const result = validator.validateArgs({});
            expect(result.valid).toBe(true);
        });

        it('should warn about unregistered options in production', () => {
            const validator = new CLIValidator({ profile: 'production' });
            validator.registerOption({
                name: '--known-option',
                type: 'string',
            });
            
            const result = validator.validateArgs({
                knownOption: 'value',
                unknownOption: 'value',
            });
            
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings[0].message).toContain('Unregistered option');
        });

        it('should handle boolean arguments', () => {
            const validator = new CLIValidator();
            validator.registerOption({
                name: '--verbose',
                type: 'boolean',
            });
            
            const result = validator.validateArgs({ verbose: true });
            expect(result.valid).toBe(true);
        });

        it('should validate isPath fields additionally', () => {
            const validator = new CLIValidator({ failOnError: true });
            validator.registerOption({
                name: '--output',
                type: 'string',
                isPath: true,
            });
            
            const result = validator.validateArgs({ output: '../../../etc/passwd' });
            expect(result.valid).toBe(false);
        });
    });

    describe('createCLIValidator', () => {
        it('should create validator with factory function', () => {
            const validator = createCLIValidator();
            expect(validator).toBeInstanceOf(CLIValidator);
        });

        it('should create validator with config', () => {
            const validator = createCLIValidator({ failOnError: true });
            expect(validator).toBeInstanceOf(CLIValidator);
        });
    });

    describe('camelCase to kebab-case conversion', () => {
        it('should convert field names to option names', () => {
            const validator = new CLIValidator();
            const schema = z.object({
                configDirectory: z.string(),
                maxRetryCount: z.number(),
            });
            
            validator.registerFromSchema(schema);
            
            // Validate with camelCase keys (as Commander.js provides)
            const result = validator.validateArgs({
                configDirectory: './config',
                maxRetryCount: 3,
            });
            expect(result.valid).toBe(true);
        });
    });
});

