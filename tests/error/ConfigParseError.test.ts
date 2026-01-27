import { describe, it, expect } from 'vitest';
import { ConfigParseError } from '../../src/error/ConfigParseError';

describe('ConfigParseError', () => {
    it('should create error with message and file path', () => {
        const error = new ConfigParseError('Parse failed', '/path/to/config.json');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ConfigParseError');
        expect(error.message).toBe('Parse failed');
        expect(error.filePath).toBe('/path/to/config.json');
    });

    it('should create error with cause', () => {
        const cause = new Error('Underlying error');
        const error = new ConfigParseError('Parse failed', '/path/to/config.json', cause);
        
        expect(error.cause).toBe(cause);
    });

    it('should create error without cause', () => {
        const error = new ConfigParseError('Parse failed', '/path/to/config.json');
        
        expect(error.cause).toBeUndefined();
    });

    it('should have proper toString representation', () => {
        const error = new ConfigParseError('Parse failed', '/path/to/config.json');
        const str = error.toString();
        
        expect(str).toContain('ConfigParseError');
        expect(str).toContain('Parse failed');
        expect(str).toContain('/path/to/config.json');
    });

    it('should include cause in toString', () => {
        const cause = new Error('Syntax error');
        const error = new ConfigParseError('Parse failed', '/path/to/config.json', cause);
        const str = error.toString();
        
        expect(str).toContain('ConfigParseError');
        expect(str).toContain('Parse failed');
        expect(str).toContain('/path/to/config.json');
        expect(str).toContain('Syntax error');
    });

    it('should be catchable as Error', () => {
        try {
            throw new ConfigParseError('Test error', '/test.json');
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ConfigParseError);
        }
    });

    it('should maintain stack trace', () => {
        const error = new ConfigParseError('Test error', '/test.json');
        
        expect(error.stack).toBeDefined();
        expect(error.stack).toContain('ConfigParseError');
    });
});
