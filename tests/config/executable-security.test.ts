import { describe, it, expect } from 'vitest';
import {
    ExecutableConfigSecurityError,
    isExecutableFormat,
    validateExecutableConfig,
    getExecutableConfigSecurityModel
} from '../../src/config/executable-security';
import { ConfigFormat } from '../../src/types';

describe('Executable Config Security', () => {
    const mockLogger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        verbose: () => {},
        silly: () => {}
    };

    describe('ExecutableConfigSecurityError', () => {
        it('should create error with format and file path', () => {
            const error = new ExecutableConfigSecurityError(
                ConfigFormat.JavaScript,
                '/path/to/config.js'
            );

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('ExecutableConfigSecurityError');
            expect(error.format).toBe(ConfigFormat.JavaScript);
            expect(error.filePath).toBe('/path/to/config.js');
        });

        it('should include security warning in message', () => {
            const error = new ExecutableConfigSecurityError(
                ConfigFormat.TypeScript,
                '/path/to/config.ts'
            );

            expect(error.message).toContain('SECURITY');
            expect(error.message).toContain('allowExecutableConfig');
            expect(error.message).toContain('full Node.js permissions');
        });

        it('should include example code in message', () => {
            const error = new ExecutableConfigSecurityError(
                ConfigFormat.JavaScript,
                '/path/to/config.js'
            );

            expect(error.message).toContain('Example:');
            expect(error.message).toContain('allowExecutableConfig: true');
        });

        it('should be catchable as Error', () => {
            try {
                throw new ExecutableConfigSecurityError(
                    ConfigFormat.JavaScript,
                    '/test.js'
                );
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect(error).toBeInstanceOf(ExecutableConfigSecurityError);
            }
        });
    });

    describe('isExecutableFormat', () => {
        it('should return true for JavaScript', () => {
            expect(isExecutableFormat(ConfigFormat.JavaScript)).toBe(true);
        });

        it('should return true for TypeScript', () => {
            expect(isExecutableFormat(ConfigFormat.TypeScript)).toBe(true);
        });

        it('should return false for YAML', () => {
            expect(isExecutableFormat(ConfigFormat.YAML)).toBe(false);
        });

        it('should return false for JSON', () => {
            expect(isExecutableFormat(ConfigFormat.JSON)).toBe(false);
        });
    });

    describe('validateExecutableConfig', () => {
        describe('non-executable formats', () => {
            it('should allow YAML without opt-in', () => {
                expect(() => {
                    validateExecutableConfig(
                        ConfigFormat.YAML,
                        '/config.yaml',
                        false,
                        mockLogger
                    );
                }).not.toThrow();
            });

            it('should allow JSON without opt-in', () => {
                expect(() => {
                    validateExecutableConfig(
                        ConfigFormat.JSON,
                        '/config.json',
                        false,
                        mockLogger
                    );
                }).not.toThrow();
            });
        });

        describe('executable formats without opt-in', () => {
            it('should throw for JavaScript when not allowed', () => {
                expect(() => {
                    validateExecutableConfig(
                        ConfigFormat.JavaScript,
                        '/config.js',
                        false,
                        mockLogger
                    );
                }).toThrow(ExecutableConfigSecurityError);
            });

            it('should throw for TypeScript when not allowed', () => {
                expect(() => {
                    validateExecutableConfig(
                        ConfigFormat.TypeScript,
                        '/config.ts',
                        false,
                        mockLogger
                    );
                }).toThrow(ExecutableConfigSecurityError);
            });

            it('should include file path in error', () => {
                const filePath = '/path/to/config.js';
                
                try {
                    validateExecutableConfig(
                        ConfigFormat.JavaScript,
                        filePath,
                        false,
                        mockLogger
                    );
                    expect.fail('Should have thrown');
                } catch (error) {
                    expect(error).toBeInstanceOf(ExecutableConfigSecurityError);
                    expect((error as ExecutableConfigSecurityError).filePath).toBe(filePath);
                }
            });

            it('should work without logger', () => {
                expect(() => {
                    validateExecutableConfig(
                        ConfigFormat.JavaScript,
                        '/config.js',
                        false
                    );
                }).toThrow(ExecutableConfigSecurityError);
            });
        });

        describe('executable formats with opt-in', () => {
            it('should allow JavaScript when opted-in', () => {
                expect(() => {
                    validateExecutableConfig(
                        ConfigFormat.JavaScript,
                        '/config.js',
                        true,
                        mockLogger
                    );
                }).not.toThrow();
            });

            it('should allow TypeScript when opted-in', () => {
                expect(() => {
                    validateExecutableConfig(
                        ConfigFormat.TypeScript,
                        '/config.ts',
                        true,
                        mockLogger
                    );
                }).not.toThrow();
            });

            it('should work without logger when opted-in', () => {
                expect(() => {
                    validateExecutableConfig(
                        ConfigFormat.JavaScript,
                        '/config.js',
                        true
                    );
                }).not.toThrow();
            });
        });

        describe('default behavior', () => {
            it('should default to not allowing executable configs', () => {
                expect(() => {
                    validateExecutableConfig(
                        ConfigFormat.JavaScript,
                        '/config.js'
                        // allowExecutableConfig not specified
                    );
                }).toThrow(ExecutableConfigSecurityError);
            });
        });
    });

    describe('getExecutableConfigSecurityModel', () => {
        it('should return security model documentation', () => {
            const model = getExecutableConfigSecurityModel();

            expect(model).toBeTruthy();
            expect(typeof model).toBe('string');
        });

        it('should document permissions', () => {
            const model = getExecutableConfigSecurityModel();

            expect(model).toContain('PERMISSIONS');
            expect(model).toContain('filesystem');
            expect(model).toContain('network');
        });

        it('should document execution context', () => {
            const model = getExecutableConfigSecurityModel();

            expect(model).toContain('EXECUTION CONTEXT');
            expect(model).toContain('same Node.js process');
        });

        it('should document trust model', () => {
            const model = getExecutableConfigSecurityModel();

            expect(model).toContain('TRUST MODEL');
            expect(model).toContain('allowExecutableConfig');
        });

        it('should include best practices', () => {
            const model = getExecutableConfigSecurityModel();

            expect(model).toContain('BEST PRACTICES');
            expect(model).toContain('trusted sources');
        });

        it('should mention future enhancements', () => {
            const model = getExecutableConfigSecurityModel();

            expect(model).toContain('FUTURE ENHANCEMENTS');
            expect(model).toContain('sandbox');
        });
    });
});
