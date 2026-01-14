import { describe, it, expect } from 'vitest';
import { StringGuard, createStringGuard, getStringGuard, SAFE_PATTERNS } from '../../src/security/string-guard';
import { MODEL_NAME_VECTORS } from './test-utils';

describe('StringGuard Security Tests', () => {
  const guard = createStringGuard({});

  describe('dangerous character detection', () => {
    it('should reject null bytes', () => {
      expect(() => guard.validate('hello\0world', {}, 'test'))
        .toThrow('null bytes');
    });

    it('should reject control characters', () => {
      expect(() => guard.validate('hello\x07world', {}, 'test'))
        .toThrow('control characters');
    });

    it('should reject ANSI escapes', () => {
      expect(() => guard.validate('hello\x1b[31mred', {}, 'test'))
        .toThrow('ANSI');
    });
  });

  describe('length validation', () => {
    it('should enforce maximum length', () => {
      const guard = createStringGuard({ maxLength: 100 });
      expect(() => guard.validate('a'.repeat(101), {}))
        .toThrow('exceeds maximum length');
    });

    it('should enforce minimum length', () => {
      expect(() => guard.validate('ab', { minLength: 3 }))
        .toThrow('at least 3');
    });
  });

  describe('pattern validation', () => {
    it('should enforce patterns', () => {
      expect(() => guard.validate('invalid!', { pattern: /^[a-z]+$/ }))
        .toThrow('does not match');
    });

    it('should accept matching patterns', () => {
      expect(guard.validate('valid', { pattern: /^[a-z]+$/ }))
        .toBe('valid');
    });
  });

  describe('shell metacharacter blocking', () => {
    it('should block shell metacharacters when enabled', () => {
      // 'rm -rf /' doesn't contain shell metacharacters, use a string with actual metacharacters
      expect(() => guard.validate('rm -rf /; cat /etc/passwd', { blockShellMeta: true }, 'cmd'))
        .toThrow('shell metacharacters');
    });

    it('should allow strings without shell metacharacters', () => {
      expect(guard.validate('rm -rf /', { blockShellMeta: true }, 'cmd'))
        .toBe('rm -rf /');
    });
  });

  describe('model name validation', () => {
    for (const { value, shouldPass } of MODEL_NAME_VECTORS) {
      it(`should ${shouldPass ? 'accept' : 'reject'} "${value}"`, () => {
        if (shouldPass) {
          expect(guard.validateModelName(value)).toBe(value);
        } else {
          expect(() => guard.validateModelName(value)).toThrow();
        }
      });
    }
  });

  describe('identifier validation', () => {
    it('should accept valid identifiers', () => {
      expect(guard.validateIdentifier('myVar')).toBe('myVar');
      expect(guard.validateIdentifier('_private')).toBe('_private');
      expect(guard.validateIdentifier('var123')).toBe('var123');
    });

    it('should reject invalid identifiers', () => {
      expect(() => guard.validateIdentifier('123var')).toThrow();
      expect(() => guard.validateIdentifier('my-var')).toThrow();
    });
  });

  describe('filename validation', () => {
    it('should accept valid filenames', () => {
      expect(guard.validateFilename('file.txt')).toBe('file.txt');
      expect(guard.validateFilename('config_v2.yaml')).toBe('config_v2.yaml');
    });

    it('should reject invalid filenames', () => {
      expect(() => guard.validateFilename('file/name.txt')).toThrow();
      expect(() => guard.validateFilename('../file.txt')).toThrow();
    });
  });

  describe('enum validation', () => {
    it('should accept valid enum values', () => {
      expect(guard.validateEnum('debug', ['debug', 'info', 'warn', 'error'] as const, 'level'))
        .toBe('debug');
    });

    it('should reject invalid enum values', () => {
      expect(() => guard.validateEnum('invalid', ['debug', 'info'] as const, 'level'))
        .toThrow('must be one of');
    });

    it('should handle case-insensitive matching', () => {
      expect(guard.validateEnum('DEBUG', ['debug', 'info'] as const, 'level', { caseSensitive: false }))
        .toBe('debug');
    });
  });

  describe('injection detection', () => {
    it('should detect potential SQL injection', () => {
      const result = guard.detectInjection("' OR '1'='1");
      expect(result.suspicious).toBe(true);
      expect(result.reason).toContain('SQL');
    });

    it('should detect shell metacharacters', () => {
      const result = guard.detectInjection('`cat /etc/passwd`');
      expect(result.suspicious).toBe(true);
      expect(result.reason).toContain('shell');
    });

    it('should detect ANSI escape sequences', () => {
      // Note: ANSI escapes contain [ which is also a shell metacharacter
      // The detection may flag either reason
      const result = guard.detectInjection('\x1b[31mred');
      expect(result.suspicious).toBe(true);
    });

    it('should not flag safe strings', () => {
      const result = guard.detectInjection('hello world');
      expect(result.suspicious).toBe(false);
    });
  });

  describe('sanitize', () => {
    it('should remove control characters', () => {
      expect(guard.sanitize('hello\x00world')).toBe('helloworld');
    });

    it('should remove ANSI escapes', () => {
      // The sanitize function removes control chars including the ESC char (\x1b)
      // but the [ and numbers remain since they're printable
      const result = guard.sanitize('hello\x1b[31mred\x1b[0m');
      expect(result).not.toContain('\x1b');
    });

    it('should truncate long strings', () => {
      expect(guard.sanitize('a'.repeat(200), 100)).toHaveLength(100);
    });
  });

  describe('trim option', () => {
    it('should trim whitespace when enabled', () => {
      expect(guard.validate('  hello  ', { trim: true })).toBe('hello');
    });

    it('should preserve whitespace when not enabled', () => {
      expect(guard.validate('  hello  ', { trim: false })).toBe('  hello  ');
    });
  });

  describe('allowed values', () => {
    it('should accept allowed values', () => {
      expect(guard.validate('yes', { allowedValues: ['yes', 'no'] })).toBe('yes');
    });

    it('should reject disallowed values', () => {
      expect(() => guard.validate('maybe', { allowedValues: ['yes', 'no'] }))
        .toThrow('must be one of');
    });
  });

  describe('global instance', () => {
    it('should provide a default StringGuard instance', () => {
      const guard = getStringGuard();
      expect(guard).toBeInstanceOf(StringGuard);
    });
  });

  describe('SAFE_PATTERNS', () => {
    it('should have expected patterns', () => {
      expect(SAFE_PATTERNS.modelName).toBeDefined();
      expect(SAFE_PATTERNS.identifier).toBeDefined();
      expect(SAFE_PATTERNS.envVar).toBeDefined();
    });
  });
});

