import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    SECURITY_PROFILES,
    detectProfile,
    getProfileConfig,
    SecurityProfileBuilder,
    createProfile,
    presets,
    ProfileManager,
    getProfileManager,
} from '../../src/security/profiles';

describe('Security Profiles', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('SECURITY_PROFILES', () => {
        it('should have development profile', () => {
            expect(SECURITY_PROFILES.development).toBeDefined();
            expect(SECURITY_PROFILES.development.profile).toBe('development');
        });

        it('should have production profile', () => {
            expect(SECURITY_PROFILES.production).toBeDefined();
            expect(SECURITY_PROFILES.production.profile).toBe('production');
        });

        it('should have custom profile starting from development', () => {
            expect(SECURITY_PROFILES.custom).toBeDefined();
        });
    });

    describe('detectProfile', () => {
        it('should return development by default', () => {
            delete process.env.NODE_ENV;
            delete process.env.CARDIGANTIME_SECURITY_PROFILE;
            expect(detectProfile()).toBe('development');
        });

        it('should detect production from NODE_ENV=production', () => {
            process.env.NODE_ENV = 'production';
            expect(detectProfile()).toBe('production');
        });

        it('should detect production from NODE_ENV=prod', () => {
            process.env.NODE_ENV = 'prod';
            expect(detectProfile()).toBe('production');
        });

        it('should detect production from CARDIGANTIME_SECURITY_PROFILE=production', () => {
            process.env.CARDIGANTIME_SECURITY_PROFILE = 'production';
            expect(detectProfile()).toBe('production');
        });

        it('should detect production from CARDIGANTIME_SECURITY_PROFILE=strict', () => {
            process.env.CARDIGANTIME_SECURITY_PROFILE = 'strict';
            expect(detectProfile()).toBe('production');
        });

        it('should detect development from CARDIGANTIME_SECURITY_PROFILE=development', () => {
            process.env.NODE_ENV = 'production';
            process.env.CARDIGANTIME_SECURITY_PROFILE = 'development';
            expect(detectProfile()).toBe('development');
        });

        it('should detect development from CARDIGANTIME_SECURITY_PROFILE=permissive', () => {
            process.env.NODE_ENV = 'production';
            process.env.CARDIGANTIME_SECURITY_PROFILE = 'permissive';
            expect(detectProfile()).toBe('development');
        });

        it('should prioritize CARDIGANTIME_SECURITY_PROFILE over NODE_ENV', () => {
            process.env.NODE_ENV = 'production';
            process.env.CARDIGANTIME_SECURITY_PROFILE = 'development';
            expect(detectProfile()).toBe('development');
        });

        it('should be case insensitive', () => {
            process.env.NODE_ENV = 'PRODUCTION';
            expect(detectProfile()).toBe('production');
        });
    });

    describe('getProfileConfig', () => {
        it('should return development config', () => {
            const config = getProfileConfig('development');
            expect(config.profile).toBe('development');
            expect(config.failOnError).toBe(false);
        });

        it('should return production config', () => {
            const config = getProfileConfig('production');
            expect(config.profile).toBe('production');
            expect(config.failOnError).toBe(true);
        });

        it('should return a copy (not reference)', () => {
            const config1 = getProfileConfig('development');
            const config2 = getProfileConfig('development');
            config1.failOnError = true;
            expect(config2.failOnError).toBe(false);
        });
    });

    describe('SecurityProfileBuilder', () => {
        it('should create builder with development base', () => {
            const builder = new SecurityProfileBuilder('development');
            const config = builder.build();
            expect(config.profile).toBe('custom');
        });

        it('should create builder with production base', () => {
            const builder = new SecurityProfileBuilder('production');
            const config = builder.build();
            expect(config.profile).toBe('custom');
            expect(config.failOnError).toBe(true);
        });

        it('should enable fail fast', () => {
            const config = new SecurityProfileBuilder()
                .failFast(true)
                .build();
            expect(config.failOnError).toBe(true);
        });

        it('should disable fail fast', () => {
            const config = new SecurityProfileBuilder('production')
                .failFast(false)
                .build();
            expect(config.failOnError).toBe(false);
        });

        it('should enable audit logging', () => {
            const config = new SecurityProfileBuilder()
                .withAuditLogging(true)
                .build();
            expect(config.auditLogging).toBe(true);
        });

        it('should set path security options', () => {
            const config = new SecurityProfileBuilder()
                .withPathSecurity({ maxPathLength: 500 })
                .build();
            expect(config.paths.maxPathLength).toBe(500);
        });

        it('should set numeric security options', () => {
            const config = new SecurityProfileBuilder()
                .withNumericSecurity({ requireBounds: true })
                .build();
            expect(config.numbers.requireBounds).toBe(true);
        });

        it('should set string security options', () => {
            const config = new SecurityProfileBuilder()
                .withStringSecurity({ maxLength: 500 })
                .build();
            expect(config.strings.maxLength).toBe(500);
        });

        it('should restrict paths to directories', () => {
            const config = new SecurityProfileBuilder()
                .restrictPathsTo(['/app', '/data'])
                .build();
            expect(config.paths.allowedBaseDirs).toEqual(['/app', '/data']);
        });

        it('should allow specific extensions', () => {
            const config = new SecurityProfileBuilder()
                .allowExtensions(['.yaml', '.json'])
                .build();
            expect(config.paths.allowedExtensions).toEqual(['.yaml', '.json']);
        });

        it('should require numeric bounds', () => {
            const config = new SecurityProfileBuilder()
                .requireNumericBounds(true)
                .build();
            expect(config.numbers.requireBounds).toBe(true);
        });

        it('should set max string length', () => {
            const config = new SecurityProfileBuilder()
                .maxStringLength(1000)
                .build();
            expect(config.strings.maxLength).toBe(1000);
        });

        it('should create production-like profile', () => {
            const config = new SecurityProfileBuilder()
                .productionLike({ auditLogging: true })
                .build();
            expect(config.profile).toBe('custom');
            expect(config.failOnError).toBe(true);
            expect(config.auditLogging).toBe(true);
        });

        it('should chain multiple options', () => {
            const config = new SecurityProfileBuilder('development')
                .failFast(true)
                .withAuditLogging(true)
                .restrictPathsTo(['/safe'])
                .maxStringLength(500)
                .build();

            expect(config.failOnError).toBe(true);
            expect(config.auditLogging).toBe(true);
            expect(config.paths.allowedBaseDirs).toEqual(['/safe']);
            expect(config.strings.maxLength).toBe(500);
        });
    });

    describe('createProfile', () => {
        it('should create profile builder with development base', () => {
            const builder = createProfile('development');
            expect(builder).toBeInstanceOf(SecurityProfileBuilder);
        });

        it('should create profile builder with production base', () => {
            const builder = createProfile('production');
            const config = builder.build();
            expect(config.failOnError).toBe(true);
        });

        it('should default to development', () => {
            const builder = createProfile();
            const config = builder.build();
            expect(config.failOnError).toBe(false);
        });
    });

    describe('presets', () => {
        it('should create localDevelopment preset', () => {
            const config = presets.localDevelopment();
            expect(config.failOnError).toBe(false);
            expect(config.auditLogging).toBe(true);
        });

        it('should create testing preset', () => {
            const config = presets.testing();
            expect(config.failOnError).toBe(true);
            expect(config.auditLogging).toBe(true);
        });

        it('should create productionDeployment preset', () => {
            const config = presets.productionDeployment();
            expect(config.failOnError).toBe(true);
            expect(config.auditLogging).toBe(true);
            expect(config.paths.allowHiddenFiles).toBe(false);
            expect(config.paths.validateSymlinks).toBe(true);
        });

        it('should create libraryMode preset', () => {
            const config = presets.libraryMode();
            expect(config.failOnError).toBe(false);
            expect(config.auditLogging).toBe(false);
        });

        it('should create configFileOnly preset', () => {
            const config = presets.configFileOnly();
            expect(config.failOnError).toBe(true);
            expect(config.paths.allowedExtensions).toContain('.yaml');
            expect(config.paths.allowedExtensions).toContain('.yml');
            expect(config.paths.allowedExtensions).toContain('.json');
        });
    });

    describe('ProfileManager', () => {
        it('should initialize with detected profile', () => {
            delete process.env.NODE_ENV;
            delete process.env.CARDIGANTIME_SECURITY_PROFILE;
            const manager = new ProfileManager();
            expect(manager.getProfile()).toBe('development');
        });

        it('should initialize with specified profile', () => {
            const manager = new ProfileManager('production');
            expect(manager.getProfile()).toBe('production');
        });

        it('should get current config', () => {
            const manager = new ProfileManager('production');
            const config = manager.getConfig();
            expect(config.failOnError).toBe(true);
        });

        it('should return config copy', () => {
            const manager = new ProfileManager();
            const config1 = manager.getConfig();
            const config2 = manager.getConfig();
            config1.failOnError = true;
            expect(config2.failOnError).toBe(false);
        });

        it('should switch profile', () => {
            const manager = new ProfileManager('development');
            manager.switchProfile('production');
            expect(manager.getProfile()).toBe('production');
            expect(manager.getConfig().failOnError).toBe(true);
        });

        it('should apply custom config', () => {
            const manager = new ProfileManager();
            const customConfig = {
                ...getProfileConfig('development'),
                failOnError: true,
                auditLogging: true,
            };
            manager.applyCustomConfig(customConfig);
            expect(manager.getProfile()).toBe('custom');
            expect(manager.getConfig().failOnError).toBe(true);
        });

        it('should notify listeners on profile change', () => {
            const manager = new ProfileManager('development');
            const listener = vi.fn();
            manager.onProfileChange(listener);
            
            manager.switchProfile('production');
            
            expect(listener).toHaveBeenCalledWith('production', expect.any(Object));
        });

        it('should notify listeners on custom config', () => {
            const manager = new ProfileManager();
            const listener = vi.fn();
            manager.onProfileChange(listener);
            
            manager.applyCustomConfig(getProfileConfig('production'));
            
            expect(listener).toHaveBeenCalledWith('custom', expect.any(Object));
        });

        it('should unsubscribe listener', () => {
            const manager = new ProfileManager();
            const listener = vi.fn();
            const unsubscribe = manager.onProfileChange(listener);
            
            unsubscribe();
            manager.switchProfile('production');
            
            expect(listener).not.toHaveBeenCalled();
        });

        it('should handle multiple listeners', () => {
            const manager = new ProfileManager();
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            
            manager.onProfileChange(listener1);
            manager.onProfileChange(listener2);
            manager.switchProfile('production');
            
            expect(listener1).toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
        });
    });

    describe('getProfileManager', () => {
        it('should return global profile manager', () => {
            const manager1 = getProfileManager();
            const manager2 = getProfileManager();
            expect(manager1).toBe(manager2);
        });
    });
});

