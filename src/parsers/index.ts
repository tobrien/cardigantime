import { ConfigFormat, ConfigParser } from '../types';
import { jsonParser } from './json-parser';
import { yamlParser } from './yaml-parser';
import { javascriptParser } from './javascript-parser';
import { typescriptParser } from './typescript-parser';

/**
 * Registry of all available configuration parsers.
 * Maps file extensions to their corresponding parsers.
 */
const parserRegistry = new Map<string, ConfigParser>();

/**
 * Registers a configuration parser for its supported extensions.
 * 
 * @param parser - The parser to register
 */
function registerParser(parser: ConfigParser): void {
    for (const ext of parser.extensions) {
        parserRegistry.set(ext, parser);
    }
}

/**
 * Gets a parser for a given file extension.
 * 
 * @param extension - File extension (e.g., '.json', '.yaml')
 * @returns The parser for this extension, or undefined if not found
 */
export function getParserForExtension(extension: string): ConfigParser | undefined {
    return parserRegistry.get(extension);
}

/**
 * Gets a parser for a given format.
 * 
 * @param format - Configuration format
 * @returns The parser for this format, or undefined if not found
 */
export function getParserForFormat(format: ConfigFormat): ConfigParser | undefined {
    for (const parser of parserRegistry.values()) {
        if (parser.format === format) {
            return parser;
        }
    }
    return undefined;
}

/**
 * Gets all registered parsers.
 * 
 * @returns Array of all registered parsers
 */
export function getAllParsers(): ConfigParser[] {
    // Return unique parsers (since multiple extensions map to the same parser)
    const uniqueParsers = new Set(parserRegistry.values());
    return Array.from(uniqueParsers);
}

// Register all built-in parsers
registerParser(yamlParser);
registerParser(jsonParser);
registerParser(javascriptParser);
registerParser(typescriptParser);

// Export parsers for direct use
export { jsonParser } from './json-parser';
export { yamlParser } from './yaml-parser';
export { javascriptParser } from './javascript-parser';
export { typescriptParser } from './typescript-parser';
