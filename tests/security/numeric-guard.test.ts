import { describe, it, expect } from 'vitest';
import { NumericGuard, createNumericGuard, getNumericGuard, SAFE_RANGES } from '../../src/security/numeric-guard';

describe('NumericGuard Security Tests', () => {
  const guard = createNumericGuard({});

  describe('edge case handling', () => {
    it('should reject NaN', () => {
      expect(() => guard.validate(NaN, { min: 0, max: 100 }))
        .toThrow('NaN');
    });

    it('should reject Infinity', () => {
      expect(() => guard.validate(Infinity, { min: 0, max: 100 }))
        .toThrow('infinite');
      expect(() => guard.validate(-Infinity, { min: 0, max: 100 }))
        .toThrow('infinite');
    });

    it('should reject non-numeric types', () => {
      expect(() => guard.validate('not a number', { min: 0, max: 100 }))
        .toThrow('NaN');
      expect(() => guard.validate({}, { min: 0, max: 100 }))
        .toThrow('must be a number');
    });
  });

  describe('bounds enforcement', () => {
    it('should enforce minimum', () => {
      expect(() => guard.validate(-1, { min: 0, max: 100 }))
        .toThrow('at least 0');
    });

    it('should enforce maximum', () => {
      expect(() => guard.validate(101, { min: 0, max: 100 }))
        .toThrow('at most 100');
    });

    it('should accept values within bounds', () => {
      expect(guard.validate(50, { min: 0, max: 100 })).toBe(50);
    });

    it('should accept boundary values', () => {
      expect(guard.validate(0, { min: 0, max: 100 })).toBe(0);
      expect(guard.validate(100, { min: 0, max: 100 })).toBe(100);
    });
  });

  describe('integer constraint', () => {
    it('should enforce integer constraint', () => {
      expect(() => guard.validate(3.14, { min: 0, max: 100, integer: true }))
        .toThrow('integer');
    });

    it('should accept integers when required', () => {
      expect(guard.validate(42, { min: 0, max: 100, integer: true })).toBe(42);
    });
  });

  describe('safe range presets', () => {
    it('should validate ports correctly', () => {
      expect(guard.validateRange(1, 'port')).toBe(1);
      expect(guard.validateRange(8080, 'port')).toBe(8080);
      expect(guard.validateRange(65535, 'port')).toBe(65535);
      expect(() => guard.validateRange(0, 'port')).toThrow();
      expect(() => guard.validateRange(65536, 'port')).toThrow();
    });

    it('should validate timeouts correctly', () => {
      expect(guard.validateRange(0, 'timeout')).toBe(0);
      expect(guard.validateRange(5000, 'timeout')).toBe(5000);
      expect(() => guard.validateRange(-1, 'timeout')).toThrow();
      expect(() => guard.validateRange(999999999, 'timeout')).toThrow();
    });

    it('should validate percentages correctly', () => {
      expect(guard.validateRange(0, 'percentage')).toBe(0);
      expect(guard.validateRange(50, 'percentage')).toBe(50);
      expect(guard.validateRange(100, 'percentage')).toBe(100);
      expect(() => guard.validateRange(-1, 'percentage')).toThrow();
      expect(() => guard.validateRange(101, 'percentage')).toThrow();
    });
  });

  describe('CLI parsing', () => {
    it('should parse valid numeric strings', () => {
      expect(guard.validate('42', { min: 0, max: 100, integer: true })).toBe(42);
      expect(guard.validate('3.14', { min: 0, max: 10 })).toBeCloseTo(3.14);
    });

    it('should reject invalid numeric strings', () => {
      expect(() => guard.validate('not a number', { min: 0, max: 100 }))
        .toThrow('NaN');
    });

    it('should use defaults in parseCliArg', () => {
      expect(guard.parseCliArg(undefined, { min: 0, max: 100, default: 50 }, 'opt'))
        .toBe(50);
    });

    it('should throw when required and no default', () => {
      expect(() => guard.parseCliArg(undefined, { min: 0, max: 100 }, 'opt'))
        .toThrow('required');
    });
  });

  describe('validateWithDefault', () => {
    it('should return default for undefined', () => {
      expect(guard.validateWithDefault(undefined, { min: 0, max: 100 }, 50)).toBe(50);
    });

    it('should return default for null', () => {
      expect(guard.validateWithDefault(null, { min: 0, max: 100 }, 50)).toBe(50);
    });

    it('should validate provided values', () => {
      expect(guard.validateWithDefault(75, { min: 0, max: 100 }, 50)).toBe(75);
    });
  });

  describe('validateMany', () => {
    it('should validate multiple fields', () => {
      const result = guard.validateMany(
        { port: 8080, timeout: 5000 },
        {
          port: { min: 1, max: 65535, integer: true },
          timeout: { min: 0, max: 300000, integer: true },
        }
      );
      expect(result.port).toBe(8080);
      expect(result.timeout).toBe(5000);
    });

    it('should collect all errors', () => {
      expect(() => guard.validateMany(
        { port: 0, timeout: -1 },
        {
          port: { min: 1, max: 65535, integer: true },
          timeout: { min: 0, max: 300000, integer: true },
        }
      )).toThrow();
    });

    it('should handle optional fields', () => {
      const result = guard.validateMany(
        { port: 8080 },
        {
          port: { min: 1, max: 65535, integer: true },
          timeout: { min: 0, max: 300000, integer: true, optional: true },
        }
      );
      expect(result.port).toBe(8080);
      expect(result.timeout).toBeUndefined();
    });
  });

  describe('global instance', () => {
    it('should provide a default NumericGuard instance', () => {
      const guard = getNumericGuard();
      expect(guard).toBeInstanceOf(NumericGuard);
    });
  });

  describe('SAFE_RANGES', () => {
    it('should have expected ranges', () => {
      expect(SAFE_RANGES.port).toEqual({ min: 1, max: 65535 });
      expect(SAFE_RANGES.timeout).toEqual({ min: 0, max: 300000 });
      expect(SAFE_RANGES.percentage).toEqual({ min: 0, max: 100 });
    });
  });
});

