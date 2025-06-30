import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '../../src/error/ConfigurationError';

describe('ConfigurationError', () => {
    it('should create a ConfigurationError with correct properties', () => {
        const error = new ConfigurationError('validation', 'Test message', { some: 'detail' }, '/config/path');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ConfigurationError');
        expect(error.message).toBe('Test message');
        expect(error.errorType).toBe('validation');
        expect(error.details).toEqual({ some: 'detail' });
        expect(error.configPath).toBe('/config/path');
    });

    it('should create a validation error using static method', () => {
        const zodError = { path: ['field'], message: 'Invalid value' };
        const error = ConfigurationError.validation('Validation failed', zodError, '/config');

        expect(error.errorType).toBe('validation');
        expect(error.message).toBe('Validation failed');
        expect(error.details).toBe(zodError);
        expect(error.configPath).toBe('/config');
    });

    it('should create an extra keys error using static method', () => {
        const extraKeys = ['unknown1', 'unknown2'];
        const allowedKeys = ['known1', 'known2'];
        const error = ConfigurationError.extraKeys(extraKeys, allowedKeys, '/config');

        expect(error.errorType).toBe('extra_keys');
        expect(error.message).toBe('Unknown configuration keys found: unknown1, unknown2. Allowed keys are: known1, known2');
        expect(error.details).toEqual({ extraKeys, allowedKeys });
        expect(error.configPath).toBe('/config');
    });

    it('should create a schema error using static method', () => {
        const details = { schemaPath: 'root.field' };
        const error = ConfigurationError.schema('Schema is invalid', details);

        expect(error.errorType).toBe('schema');
        expect(error.message).toBe('Schema is invalid');
        expect(error.details).toBe(details);
        expect(error.configPath).toBeUndefined();
    });

    it('should work without optional parameters', () => {
        const error = new ConfigurationError('validation', 'Simple error');

        expect(error.errorType).toBe('validation');
        expect(error.message).toBe('Simple error');
        expect(error.details).toBeUndefined();
        expect(error.configPath).toBeUndefined();
    });

    it('should be catchable as different error types', () => {
        const error = ConfigurationError.validation('Test error');

        expect(error instanceof Error).toBe(true);
        expect(error instanceof ConfigurationError).toBe(true);
    });
}); 