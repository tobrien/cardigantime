# Cardigantime

A robust TypeScript library for configuration management in command-line applications. Cardigantime provides type-safe configuration loading, validation, and CLI integration with Commander.js and Zod schemas.

## What is Cardigantime?

Cardigantime is a configuration management library designed to solve the common problem of handling configuration in CLI applications. It provides a unified way to:

- **Read configuration from YAML files** with intelligent file discovery
- **Validate configuration** using Zod schemas for type safety
- **Integrate with CLI frameworks** like Commander.js seamlessly
- **Merge configuration sources** (files, CLI args, defaults) with proper precedence
- **Handle errors gracefully** with comprehensive logging and user-friendly error messages

## Why Cardigantime?

Building CLI applications with proper configuration management is harder than it should be. You need to:

1. **Parse command-line arguments** - handled by Commander.js
2. **Read configuration files** - usually YAML or JSON
3. **Validate the configuration** - ensure required fields exist and types are correct
4. **Merge multiple sources** - CLI args should override file config, which should override defaults
5. **Handle errors gracefully** - file not found, invalid YAML, validation failures
6. **Provide good developer experience** - TypeScript support, IntelliSense, etc.

Cardigantime handles all of this for you with a simple, type-safe API.

## Installation

```bash
npm install @theunwalked/cardigantime
# or
pnpm add @theunwalked/cardigantime
# or
yarn add @theunwalked/cardigantime
```

## Quick Start

Here's a complete example of building a CLI tool with Cardigantime:

```typescript
import { Command } from 'commander';
import { create } from '@theunwalked/cardigantime';
import { z } from 'zod';

// Define your configuration schema using Zod
const MyConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  timeout: z.number().min(1000).default(5000),
  retries: z.number().min(0).max(10).default(3),
  debug: z.boolean().default(false),
});

// Create a Cardigantime instance
const cardigantime = create({
  defaults: {
    configDirectory: './config', // Required: where to look for config files
    configFile: 'myapp.yaml',   // Optional: defaults to 'config.yaml'
    isRequired: false,          // Optional: whether config directory must exist
  },
  configShape: MyConfigSchema.shape, // Your Zod schema
  features: ['config'],              // Optional: enabled features
});

// Set up your CLI with Commander.js
async function main() {
  const program = new Command();
  
  program
    .name('myapp')
    .description('My awesome CLI application')
    .version('1.0.0');

  // Let Cardigantime add its CLI options (like --config-directory)
  await cardigantime.configure(program);
  
  // Add your own CLI options
  program
    .option('-k, --api-key <key>', 'API key for authentication')
    .option('-t, --timeout <ms>', 'Request timeout in milliseconds', parseInt)
    .option('--debug', 'Enable debug mode');

  program.parse();
  const args = program.opts();

  try {
    // Read and validate configuration
    const config = await cardigantime.read(args);
    await cardigantime.validate(config);

    console.log('Configuration loaded successfully:', config);
    
    // Your application logic here
    await runMyApp(config);
    
  } catch (error) {
    console.error('Configuration error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
```

### Example Configuration File (`config/myapp.yaml`)

```yaml
apiKey: "your-secret-api-key"
timeout: 10000
retries: 5
debug: true
```

### Example Usage

```bash
# Use config from file
./myapp

# Override config with CLI arguments
./myapp --api-key "different-key" --timeout 15000

# Use different config directory
./myapp --config-directory /etc/myapp

# Enable debug mode
./myapp --debug
```

## Core Concepts

### 1. Configuration Sources & Precedence

Cardigantime merges configuration from multiple sources in this order (highest to lowest priority):

1. **Command-line arguments** (highest priority)
2. **Configuration file** (medium priority)  
3. **Default values** (lowest priority)

```typescript
// If you have this config file:
// timeout: 5000
// debug: false

// And run: ./myapp --timeout 10000

// The final config will be:
// timeout: 10000  (from CLI, overrides file)
// debug: false    (from file)
```

### 2. Schema Validation

All configuration is validated against your Zod schema:

```typescript
const ConfigSchema = z.object({
  port: z.number().min(1).max(65535),
  host: z.string().ip().or(z.literal('localhost')),
  database: z.object({
    url: z.string().url(),
    maxConnections: z.number().positive().default(10),
  }),
  features: z.array(z.enum(['auth', 'analytics', 'logging'])).default([]),
});

const cardigantime = create({
  defaults: { configDirectory: './config' },
  configShape: ConfigSchema.shape,
});
```

### 3. Type Safety

Cardigantime provides full TypeScript support:

```typescript
// The config object is fully typed
const config = await cardigantime.read(args);
// config.database.maxConnections is number
// config.features is ('auth' | 'analytics' | 'logging')[]
// config.port is number

// IntelliSense works everywhere
if (config.features.includes('auth')) {
  // Setup authentication
}
```

### 4. Error Handling

Cardigantime provides detailed error messages for common issues:

```typescript
try {
  await cardigantime.validate(config);
} catch (error) {
  // Detailed validation errors:
  // "Configuration validation failed: port must be between 1 and 65535"
  // "Unknown configuration keys found: typoKey. Allowed keys are: port, host, database"
  // "Config directory does not exist and is required: /nonexistent/path"
}
```

## API Reference

### `create(options)`

Creates a new Cardigantime instance.

**Parameters:**
- `options.defaults` (required): Default configuration options
  - `configDirectory` (required): Directory to look for config files
  - `configFile` (optional): Config filename, defaults to `'config.yaml'`
  - `isRequired` (optional): Whether config directory must exist, defaults to `false`
  - `encoding` (optional): File encoding, defaults to `'utf8'`
- `options.configShape` (required): Zod schema shape for validation
- `options.features` (optional): Array of features to enable, defaults to `['config']`
- `options.logger` (optional): Custom logger implementation

**Returns:** `Cardigantime` instance

### `cardigantime.configure(command)`

Adds Cardigantime's CLI options to a Commander.js command.

**Parameters:**
- `command`: Commander.js Command instance

**Returns:** Promise<Command> - The modified command

**Added Options:**
- `-c, --config-directory <path>`: Override config directory

### `cardigantime.read(args)`

Reads and merges configuration from all sources.

**Parameters:**
- `args`: Parsed command-line arguments object

**Returns:** Promise<Config> - Merged and typed configuration object

### `cardigantime.validate(config)`

Validates configuration against the schema.

**Parameters:**
- `config`: Configuration object to validate

**Returns:** Promise<void> - Throws on validation failure

### `cardigantime.setLogger(logger)`

Sets a custom logger for debugging and error reporting.

**Parameters:**
- `logger`: Logger implementing the Logger interface

## Advanced Usage

### Custom Logger

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'app.log' }),
    new winston.transports.Console(),
  ],
});

const cardigantime = create({
  defaults: { configDirectory: './config' },
  configShape: MyConfigSchema.shape,
  logger, // Use Winston for logging
});
```

### Complex Configuration Schema

```typescript
const DatabaseConfig = z.object({
  host: z.string(),
  port: z.number().min(1).max(65535),
  username: z.string(),
  password: z.string(),
  ssl: z.boolean().default(false),
});

const AppConfigSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.string(),
    environment: z.enum(['development', 'staging', 'production']),
  }),
  database: DatabaseConfig,
  redis: z.object({
    url: z.string().url(),
    ttl: z.number().positive().default(3600),
  }),
  features: z.record(z.boolean()).default({}), // Dynamic feature flags
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    file: z.string().optional(),
  }),
});
```

### Environment-Specific Configuration

```typescript
// Use different config directories for different environments
const environment = process.env.NODE_ENV || 'development';

const cardigantime = create({
  defaults: {
    configDirectory: `./config/${environment}`,
    configFile: 'app.yaml',
  },
  configShape: AppConfigSchema.shape,
});
```

### Configuration File Discovery

```typescript
// Cardigantime will look for config files in this order:
// 1. CLI argument: --config-directory /path/to/config
// 2. Default directory: ./config
// 3. If not found and isRequired: false, continues with empty config
// 4. If not found and isRequired: true, throws error
```

## Error Messages and Troubleshooting

### Common Errors

**Configuration file not found:**
```
Configuration file not found at ./config/config.yaml. Returning empty object.
```
*Solution:* Create the config file or set `isRequired: false` to make it optional.

**Schema validation failed:**
```
Configuration validation failed: {
  "port": {
    "_errors": ["Number must be greater than or equal to 1"]
  }
}
```
*Solution:* Fix the configuration values to match your schema requirements.

**Unknown configuration keys:**
```
Unknown configuration keys found: databse. Allowed keys are: database, port, host
```
*Solution:* Fix typos in your configuration file or update your schema.

**Config directory not readable:**
```
Config directory exists but is not readable: /etc/restricted
```
*Solution:* Check file permissions or use a different directory.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

Apache-2.0 - see [LICENSE](LICENSE) file for details.

## Why "Cardigantime"?

Because configuration management should be as comfortable and reliable as your favorite cardigan. Just like a good cardigan keeps you warm and comfortable, Cardigantime keeps your application configuration cozy and well-organized.

