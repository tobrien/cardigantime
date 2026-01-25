import { ConfigFormat, Logger } from '../types';

/**
 * Security error thrown when executable config is detected but not allowed.
 */
export class ExecutableConfigSecurityError extends Error {
    public readonly format: ConfigFormat;
    public readonly filePath: string;

    constructor(format: ConfigFormat, filePath: string) {
        super(
            `Executable configuration file detected but not allowed: ${filePath}\n\n` +
            `SECURITY: JavaScript and TypeScript configuration files execute code with full ` +
            `Node.js permissions. To use executable configs, you must explicitly opt-in by ` +
            `setting 'allowExecutableConfig: true' in your Cardigantime options.\n\n` +
            `Example:\n` +
            `  create({\n` +
            `    defaults: {\n` +
            `      configDirectory: './config',\n` +
            `      allowExecutableConfig: true  // Enable executable configs\n` +
            `    },\n` +
            `    // ... other options\n` +
            `  })\n\n` +
            `Only enable this if you trust the configuration files being loaded.`
        );
        this.name = 'ExecutableConfigSecurityError';
        this.format = format;
        this.filePath = filePath;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ExecutableConfigSecurityError);
        }
    }
}

/**
 * Checks if a configuration format is executable (JavaScript or TypeScript).
 * 
 * @param format - The configuration format to check
 * @returns True if the format is executable
 */
export function isExecutableFormat(format: ConfigFormat): boolean {
    return format === ConfigFormat.JavaScript || format === ConfigFormat.TypeScript;
}

/**
 * Validates that executable configuration is allowed before loading.
 * 
 * @param format - The configuration format being loaded
 * @param filePath - Path to the configuration file
 * @param allowExecutableConfig - Whether executable configs are allowed
 * @param logger - Optional logger for warnings
 * @throws {ExecutableConfigSecurityError} When executable config is not allowed
 */
export function validateExecutableConfig(
    format: ConfigFormat,
    filePath: string,
    allowExecutableConfig: boolean = false,
    logger?: Logger
): void {
    if (!isExecutableFormat(format)) {
        // Not an executable format, no validation needed
        return;
    }

    if (!allowExecutableConfig) {
        // Log warning before throwing
        if (logger) {
            logger.warn(
                `Detected ${format} configuration file but executable configs are disabled: ${filePath}`
            );
            logger.warn(
                'Set allowExecutableConfig: true in Cardigantime options to enable executable configs'
            );
        }

        throw new ExecutableConfigSecurityError(format, filePath);
    }

    // Log that we're loading an executable config
    if (logger) {
        logger.info(`Loading executable ${format} configuration: ${filePath}`);
        logger.debug(
            'SECURITY: Executable config has full Node.js permissions. ' +
            'Ensure you trust this configuration file.'
        );
    }
}

/**
 * Gets a user-friendly description of the security model for executable configs.
 * 
 * @returns Security model description
 */
export function getExecutableConfigSecurityModel(): string {
    return `
Executable Configuration Security Model
========================================

JavaScript and TypeScript configuration files are executed as Node.js code
with the following security characteristics:

PERMISSIONS:
- Full filesystem access (read/write)
- Full network access
- Access to environment variables
- Access to Node.js built-in modules
- Same permissions as the parent process

EXECUTION CONTEXT:
- Runs in the same Node.js process as your application
- No sandboxing or isolation
- Can import any available npm packages
- Can execute arbitrary code

TRUST MODEL:
- Executable configs must be explicitly enabled with allowExecutableConfig: true
- Only load configuration files from trusted sources
- Treat executable configs like you would treat application code
- Review configuration files before deployment

BEST PRACTICES:
1. Only enable executable configs if you need dynamic configuration
2. Use YAML or JSON for static configuration when possible
3. Store executable configs in version control
4. Review changes to executable configs in code review
5. Never load executable configs from user-provided or untrusted sources

FUTURE ENHANCEMENTS:
- Sandboxed execution using vm2 or worker threads
- Permission restrictions (filesystem, network)
- Allowlist/denylist for imports
- Configuration signing and verification
`.trim();
}
