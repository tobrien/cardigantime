import { describe, it, expect } from 'vitest';
import { PathGuard, createPathGuard, getPathGuard, configurePathGuard } from '../../src/security/path-guard';
import { PATH_TRAVERSAL_VECTORS } from './test-utils';

describe('PathGuard Security Tests', () => {
  describe('path traversal prevention', () => {
    const guard = createPathGuard({});

    it('should block all known traversal patterns', () => {
      for (const vector of PATH_TRAVERSAL_VECTORS) {
        expect(() => guard.validate(vector), `Failed to block: ${vector}`)
          .toThrow();
      }
    });

    it('should accept valid paths', () => {
      const validPaths = [
        'config/app.yaml',
        'src/index.ts',
        './relative/path.txt',
        'file.json',
      ];

      for (const path of validPaths) {
        expect(() => guard.validate(path)).not.toThrow();
      }
    });

    it('should block null byte injection', () => {
      expect(() => guard.validate('file.txt\0.jpg')).toThrow('dangerous');
    });
  });

  describe('base directory enforcement', () => {
    const guard = createPathGuard({
      allowedBaseDirs: ['/app/config', '/app/data'],
    });

    it('should allow paths within base directories', () => {
      expect(() => guard.validate('/app/config/settings.yaml')).not.toThrow();
      expect(() => guard.validate('/app/data/cache.json')).not.toThrow();
    });

    it('should block paths outside base directories', () => {
      expect(() => guard.validate('/etc/passwd')).toThrow('outside allowed');
      expect(() => guard.validate('/app/secrets/key.pem')).toThrow('outside allowed');
    });
  });

  describe('extension filtering', () => {
    const guard = createPathGuard({
      allowedExtensions: ['.yaml', '.yml', '.json'],
    });

    it('should allow permitted extensions', () => {
      expect(() => guard.validate('config.yaml')).not.toThrow();
      expect(() => guard.validate('config.yml')).not.toThrow();
      expect(() => guard.validate('data.json')).not.toThrow();
    });

    it('should block unpermitted extensions', () => {
      expect(() => guard.validate('script.sh')).toThrow('extension');
      expect(() => guard.validate('binary.exe')).toThrow('extension');
    });
  });

  describe('hidden file handling', () => {
    it('should block hidden files by default', () => {
      const guard = createPathGuard({ allowHiddenFiles: false });
      expect(() => guard.validate('.env')).toThrow('Hidden');
      expect(() => guard.validate('.gitignore')).toThrow('Hidden');
      expect(() => guard.validate('dir/.hidden/file.txt')).toThrow('Hidden');
    });

    it('should allow hidden files when configured', () => {
      const guard = createPathGuard({ allowHiddenFiles: true });
      expect(() => guard.validate('.env')).not.toThrow();
    });
  });

  describe('path length limits', () => {
    it('should block paths exceeding max length', () => {
      const guard = createPathGuard({ maxPathLength: 100 });
      const longPath = 'a'.repeat(101);
      expect(() => guard.validate(longPath)).toThrow('length');
    });
  });

  describe('absolute path handling', () => {
    it('should allow absolute paths by default', () => {
      const guard = createPathGuard({ allowAbsolutePaths: true });
      expect(() => guard.validate('/etc/config')).not.toThrow();
    });

    it('should block absolute paths when configured', () => {
      const guard = createPathGuard({ allowAbsolutePaths: false });
      expect(() => guard.validate('/etc/config')).toThrow('Absolute');
    });
  });

  describe('validateSafe', () => {
    it('should return valid result for valid paths', () => {
      const guard = createPathGuard({});
      const result = guard.validateSafe('config/app.yaml');
      expect(result.valid).toBe(true);
      expect(result.path).toBe('config/app.yaml');
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid result for invalid paths', () => {
      const guard = createPathGuard({});
      const result = guard.validateSafe('../etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('global instance', () => {
    it('should provide a default PathGuard instance', () => {
      const guard = getPathGuard();
      expect(guard).toBeInstanceOf(PathGuard);
    });

    it('should allow configuring the default instance', () => {
      configurePathGuard({ maxPathLength: 200 });
      const guard = getPathGuard();
      expect(() => guard.validate('a'.repeat(201))).toThrow('length');
    });
  });
});

