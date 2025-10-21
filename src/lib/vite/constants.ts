/**
 * Constants used throughout the MCP Svelte Plugin
 *
 * This module defines all configuration constants, patterns, and defaults.
 */

/** Plugin identifier used in Vite and logging */
export const PLUGIN_NAME = 'vite:mcp-svelte';

/** Glob pattern to find .mcp.svelte component files */
export const MCP_PATTERN = '**/*.mcp.svelte';

/** Default output directory for compiled components */
export const DEFAULT_OUTPUT_DIR = 'widgets';

/** Temporary directory for build artifacts */
export const TEMP_DIR_NAME = '.svelte-kit/.mcp-temp';

/** Directories to ignore when scanning for components */
export const IGNORE_PATTERNS = [
	'node_modules/**',
	'**/node_modules/**',
	'.git/**',
	'.mcp-temp/**',
	'dist/**',
	'.svelte-kit/**'
];
