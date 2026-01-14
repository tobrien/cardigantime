import { describe, it, expect } from 'vitest';
import {
  securePath,
  secureDirectory,
  secureNumber,
  securePort,
  secureTimeout,
  securePercentage,
  secureRetryCount,
  secureString,
  secureModelName,
  secureEnvVarName,
  secureIdentifier,
  secureUrl,
  secureEnum,
} from '../../src/security';

describe('Secure Zod Extensions', () => {
  describe('securePath', () => {
    it('should reject path traversal', () => {
      const schema = securePath();
      expect(() => schema.parse('../etc/passwd')).toThrow('traversal');
    });

    it('should reject URL-encoded traversal', () => {
      const schema = securePath();
      expect(() => schema.parse('%2e%2e/etc/passwd')).toThrow('traversal');
    });

    it('should reject Windows-style traversal', () => {
      const schema = securePath();
      expect(() => schema.parse('..\\windows\\system32')).toThrow('traversal');
    });

    it('should reject hidden files when configured', () => {
      const schema = securePath({ allowHiddenFiles: false });
      expect(() => schema.parse('.env')).toThrow('Hidden files');
    });

    it('should allow hidden files when configured', () => {
      const schema = securePath({ allowHiddenFiles: true });
      expect(schema.parse('.env')).toBe('.env');
    });

    it('should accept valid paths', () => {
      const schema = securePath();
      expect(schema.parse('config/app.yaml')).toBe('config/app.yaml');
    });

    it('should reject paths exceeding max length', () => {
      const schema = securePath({ maxPathLength: 50 });
      const longPath = 'a'.repeat(51);
      expect(() => schema.parse(longPath)).toThrow('exceeds maximum length');
    });

    it('should reject absolute paths when configured', () => {
      const schema = securePath({ allowAbsolutePaths: false });
      expect(() => schema.parse('/etc/passwd')).toThrow('Absolute paths');
    });

    it('should allow absolute paths by default', () => {
      const schema = securePath();
      expect(schema.parse('/etc/passwd')).toBe('/etc/passwd');
    });

    it('should reject invalid extensions', () => {
      const schema = securePath({ allowedExtensions: ['.yaml', '.json'] });
      expect(() => schema.parse('config.txt')).toThrow('extension not allowed');
    });

    it('should accept valid extensions', () => {
      const schema = securePath({ allowedExtensions: ['.yaml', '.json'] });
      expect(schema.parse('config.yaml')).toBe('config.yaml');
      expect(schema.parse('config.json')).toBe('config.json');
    });

    it('should reject paths outside allowed directories', () => {
      const schema = securePath({ allowedBaseDirs: ['/app/config'] });
      expect(() => schema.parse('/etc/passwd')).toThrow('within allowed directories');
    });

    it('should accept paths within allowed directories', () => {
      const schema = securePath({ allowedBaseDirs: ['/app/config'] });
      expect(schema.parse('/app/config/app.yaml')).toBe('/app/config/app.yaml');
    });
  });

  describe('secureDirectory', () => {
    it('should work like securePath for directories', () => {
      const schema = secureDirectory();
      expect(schema.parse('config')).toBe('config');
      expect(() => schema.parse('../etc')).toThrow('traversal');
    });
  });

  describe('secureNumber', () => {
    it('should enforce min/max bounds', () => {
      const schema = secureNumber(0, 100);
      expect(() => schema.parse(101)).toThrow('at most 100');
      expect(() => schema.parse(-1)).toThrow('at least 0');
    });

    it('should accept values within bounds', () => {
      const schema = secureNumber(0, 100);
      expect(schema.parse(50)).toBe(50);
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse(100)).toBe(100);
    });

    it('should enforce integer constraint', () => {
      const schema = secureNumber(0, 100, { integer: true });
      expect(() => schema.parse(3.14)).toThrow('integer');
    });

    it('should accept integers when required', () => {
      const schema = secureNumber(0, 100, { integer: true });
      expect(schema.parse(42)).toBe(42);
    });

    it('should reject NaN by default', () => {
      const schema = secureNumber(0, 100);
      expect(() => schema.parse(NaN)).toThrow();
    });

    it('should reject Infinity by default', () => {
      const schema = secureNumber(0, 100);
      expect(() => schema.parse(Infinity)).toThrow();
    });
  });

  describe('securePort', () => {
    it('should validate port numbers', () => {
      const schema = securePort();
      expect(schema.parse(8080)).toBe(8080);
      expect(schema.parse(1)).toBe(1);
      expect(schema.parse(65535)).toBe(65535);
      expect(() => schema.parse(0)).toThrow();
      expect(() => schema.parse(65536)).toThrow();
    });
  });

  describe('secureTimeout', () => {
    it('should validate timeout values', () => {
      const schema = secureTimeout();
      expect(schema.parse(5000)).toBe(5000);
      expect(schema.parse(0)).toBe(0);
      expect(() => schema.parse(-1)).toThrow();
      expect(() => schema.parse(400000)).toThrow();
    });

    it('should accept custom max timeout', () => {
      const schema = secureTimeout(10000);
      expect(schema.parse(10000)).toBe(10000);
      expect(() => schema.parse(10001)).toThrow();
    });
  });

  describe('securePercentage', () => {
    it('should validate percentage values', () => {
      const schema = securePercentage();
      expect(schema.parse(50)).toBe(50);
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse(100)).toBe(100);
      expect(() => schema.parse(-1)).toThrow();
      expect(() => schema.parse(101)).toThrow();
    });
  });

  describe('secureRetryCount', () => {
    it('should validate retry counts', () => {
      const schema = secureRetryCount();
      expect(schema.parse(3)).toBe(3);
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse(10)).toBe(10);
      expect(() => schema.parse(-1)).toThrow();
      expect(() => schema.parse(11)).toThrow();
    });
  });

  describe('secureString', () => {
    it('should reject null bytes', () => {
      const schema = secureString();
      expect(() => schema.parse('hello\0world')).toThrow('null bytes');
    });

    it('should reject control characters', () => {
      const schema = secureString();
      expect(() => schema.parse('hello\x07world')).toThrow('control characters');
    });

    it('should enforce patterns', () => {
      const schema = secureString({ pattern: /^[a-z]+$/ });
      expect(schema.parse('hello')).toBe('hello');
      expect(() => schema.parse('Hello123')).toThrow('pattern');
    });

    it('should enforce min length', () => {
      const schema = secureString({ minLength: 5 });
      expect(() => schema.parse('abc')).toThrow('at least 5');
    });

    it('should enforce max length', () => {
      const schema = secureString({ maxLength: 10 });
      expect(() => schema.parse('a'.repeat(11))).toThrow('at most 10');
    });
  });

  describe('secureModelName', () => {
    it('should accept valid model names', () => {
      const schema = secureModelName();
      expect(schema.parse('gpt-4o')).toBe('gpt-4o');
      expect(schema.parse('claude-3-opus-20240229')).toBe('claude-3-opus-20240229');
      expect(schema.parse('llama-2-70b')).toBe('llama-2-70b');
      expect(schema.parse('model:version')).toBe('model:version');
      expect(schema.parse('org/model')).toBe('org/model');
    });

    it('should reject invalid model names', () => {
      const schema = secureModelName();
      expect(() => schema.parse('../bad')).toThrow('pattern');
      expect(() => schema.parse('')).toThrow();
      expect(() => schema.parse('-starts-with-dash')).toThrow('pattern');
    });
  });

  describe('secureEnvVarName', () => {
    it('should accept valid env var names', () => {
      const schema = secureEnvVarName();
      expect(schema.parse('MY_VAR')).toBe('MY_VAR');
      expect(schema.parse('_PRIVATE')).toBe('_PRIVATE');
      expect(schema.parse('VAR123')).toBe('VAR123');
    });

    it('should reject invalid env var names', () => {
      const schema = secureEnvVarName();
      expect(() => schema.parse('my_var')).toThrow('pattern');
      expect(() => schema.parse('123VAR')).toThrow('pattern');
      expect(() => schema.parse('VAR-NAME')).toThrow('pattern');
    });
  });

  describe('secureIdentifier', () => {
    it('should accept valid identifiers', () => {
      const schema = secureIdentifier();
      expect(schema.parse('myVar')).toBe('myVar');
      expect(schema.parse('_private')).toBe('_private');
      expect(schema.parse('var123')).toBe('var123');
    });

    it('should reject invalid identifiers', () => {
      const schema = secureIdentifier();
      expect(() => schema.parse('123var')).toThrow('pattern');
      expect(() => schema.parse('my-var')).toThrow('pattern');
    });
  });

  describe('secureUrl', () => {
    it('should accept valid URLs', () => {
      const schema = secureUrl();
      expect(schema.parse('https://example.com')).toBe('https://example.com');
      expect(schema.parse('http://localhost:8080')).toBe('http://localhost:8080');
    });

    it('should reject invalid URLs', () => {
      const schema = secureUrl();
      expect(() => schema.parse('not-a-url')).toThrow('Invalid URL');
    });

    it('should reject disallowed protocols', () => {
      const schema = secureUrl({ allowedProtocols: ['https'] });
      expect(() => schema.parse('http://example.com')).toThrow('protocol');
    });

    it('should reject URLs exceeding max length', () => {
      const schema = secureUrl();
      const longUrl = 'https://example.com/' + 'a'.repeat(2050);
      expect(() => schema.parse(longUrl)).toThrow('maximum length');
    });
  });

  describe('secureEnum', () => {
    it('should accept valid enum values', () => {
      const schema = secureEnum(['debug', 'info', 'warn', 'error'] as const);
      expect(schema.parse('debug')).toBe('debug');
      expect(schema.parse('error')).toBe('error');
    });

    it('should reject invalid enum values', () => {
      const schema = secureEnum(['debug', 'info', 'warn', 'error'] as const);
      expect(() => schema.parse('invalid')).toThrow();
    });

    it('should handle case-insensitive matching', () => {
      const schema = secureEnum(['json', 'yaml', 'xml'] as const, { caseSensitive: false });
      expect(schema.parse('JSON')).toBe('json');
      expect(schema.parse('Yaml')).toBe('yaml');
    });
  });
});

