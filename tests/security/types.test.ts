import { describe, it, expect } from 'vitest';
import {
  getSecurityConfig,
  mergeSecurityConfig,
  DEVELOPMENT_SECURITY_CONFIG,
  PRODUCTION_SECURITY_CONFIG,
} from '../../src/security/defaults';
import type {
  SecurityProfile,
  SecurityValidationConfig,
  SecurityErrorCode,
  SecurityWarningCode,
} from '../../src/security/types';

describe('Security Types', () => {
  describe('getSecurityConfig', () => {
    it('should provide development config with permissive defaults', () => {
      const config = getSecurityConfig('development');
      expect(config.failOnError).toBe(false);
      expect(config.paths.allowHiddenFiles).toBe(true);
      expect(config.paths.allowAbsolutePaths).toBe(true);
      expect(config.profile).toBe('development');
    });

    it('should provide production config with strict defaults', () => {
      const config = getSecurityConfig('production');
      expect(config.failOnError).toBe(true);
      expect(config.paths.allowHiddenFiles).toBe(false);
      expect(config.paths.allowAbsolutePaths).toBe(false);
      expect(config.profile).toBe('production');
    });
  });

  describe('mergeSecurityConfig', () => {
    it('should merge user config with profile defaults', () => {
      const merged = mergeSecurityConfig(
        { paths: { maxPathLength: 200 } },
        'production'
      );
      expect(merged.paths.maxPathLength).toBe(200);
      expect(merged.paths.allowHiddenFiles).toBe(false); // From production
    });

    it('should preserve unspecified profile settings', () => {
      const merged = mergeSecurityConfig(
        { failOnError: false },
        'production'
      );
      expect(merged.failOnError).toBe(false); // User override
      expect(merged.paths.validateSymlinks).toBe(true); // From production
    });

    it('should default to development profile', () => {
      const merged = mergeSecurityConfig({});
      expect(merged.profile).toBe('development');
      expect(merged.failOnError).toBe(false);
    });

    it('should deep merge path options', () => {
      const merged = mergeSecurityConfig(
        { 
          paths: { 
            allowedBaseDirs: ['/app/config'],
            maxPathLength: 300 
          } 
        },
        'development'
      );
      expect(merged.paths.allowedBaseDirs).toEqual(['/app/config']);
      expect(merged.paths.maxPathLength).toBe(300);
      expect(merged.paths.allowHiddenFiles).toBe(true); // From development
    });

    it('should deep merge numeric options', () => {
      const merged = mergeSecurityConfig(
        { numbers: { requireBounds: true } },
        'development'
      );
      expect(merged.numbers.requireBounds).toBe(true);
      expect(merged.numbers.allowNaN).toBe(false); // From development
    });

    it('should deep merge string options', () => {
      const merged = mergeSecurityConfig(
        { strings: { maxLength: 2000 } },
        'production'
      );
      expect(merged.strings.maxLength).toBe(2000);
      expect(merged.strings.allowNullBytes).toBe(false); // From production
    });
  });

  describe('DEVELOPMENT_SECURITY_CONFIG', () => {
    it('should have expected development values', () => {
      expect(DEVELOPMENT_SECURITY_CONFIG.profile).toBe('development');
      expect(DEVELOPMENT_SECURITY_CONFIG.failOnError).toBe(false);
      expect(DEVELOPMENT_SECURITY_CONFIG.auditLogging).toBe(true);
      expect(DEVELOPMENT_SECURITY_CONFIG.paths.maxPathLength).toBe(1000);
      expect(DEVELOPMENT_SECURITY_CONFIG.paths.allowHiddenFiles).toBe(true);
      expect(DEVELOPMENT_SECURITY_CONFIG.paths.validateSymlinks).toBe(false);
      expect(DEVELOPMENT_SECURITY_CONFIG.numbers.requireBounds).toBe(false);
      expect(DEVELOPMENT_SECURITY_CONFIG.strings.maxLength).toBe(10000);
    });
  });

  describe('PRODUCTION_SECURITY_CONFIG', () => {
    it('should have expected production values', () => {
      expect(PRODUCTION_SECURITY_CONFIG.profile).toBe('production');
      expect(PRODUCTION_SECURITY_CONFIG.failOnError).toBe(true);
      expect(PRODUCTION_SECURITY_CONFIG.auditLogging).toBe(true);
      expect(PRODUCTION_SECURITY_CONFIG.paths.maxPathLength).toBe(500);
      expect(PRODUCTION_SECURITY_CONFIG.paths.allowHiddenFiles).toBe(false);
      expect(PRODUCTION_SECURITY_CONFIG.paths.validateSymlinks).toBe(true);
      expect(PRODUCTION_SECURITY_CONFIG.numbers.requireBounds).toBe(true);
      expect(PRODUCTION_SECURITY_CONFIG.strings.maxLength).toBe(5000);
    });
  });

  describe('Type definitions', () => {
    it('should allow valid security profiles', () => {
      const profiles: SecurityProfile[] = ['development', 'production', 'custom'];
      expect(profiles).toHaveLength(3);
    });

    it('should have all expected error codes', () => {
      const errorCodes: SecurityErrorCode[] = [
        'PATH_TRAVERSAL',
        'PATH_TOO_LONG',
        'PATH_INVALID_EXTENSION',
        'PATH_HIDDEN_FILE',
        'PATH_SYMLINK_ESCAPE',
        'PATH_OUTSIDE_ALLOWED',
        'PATH_ABSOLUTE_NOT_ALLOWED',
        'NUMBER_OUT_OF_RANGE',
        'NUMBER_NAN',
        'NUMBER_INFINITY',
        'NUMBER_MISSING_BOUNDS',
        'STRING_TOO_LONG',
        'STRING_NULL_BYTE',
        'STRING_CONTROL_CHAR',
        'STRING_PATTERN_MISMATCH',
        'VALIDATION_FAILED',
      ];
      expect(errorCodes).toHaveLength(16);
    });

    it('should have all expected warning codes', () => {
      const warningCodes: SecurityWarningCode[] = [
        'MISSING_PATH_BOUNDS',
        'MISSING_NUMERIC_BOUNDS',
        'PERMISSIVE_PATTERN',
        'DEVELOPMENT_MODE',
      ];
      expect(warningCodes).toHaveLength(4);
    });
  });
});

