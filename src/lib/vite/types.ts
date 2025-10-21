/**
 * TypeScript type definitions for the MCP Svelte Plugin
 *
 * This module contains all interfaces and types used throughout the plugin.
 */

/**
 * Represents a compiled MCP component ready for deployment
 */
export interface MCPComponent {
	/** Component identifier (valid JavaScript identifier) */
	name: string;

	/** Compiled JavaScript code with inlined CSS and auto-mount logic */
	code: string;

	/** Original source code (may be empty after compilation) */
	source: string;

	/** Absolute path to the source .mcp.svelte file */
	filePath: string;
}

/**
 * Configuration options for the MCP Svelte plugin
 */
export interface PluginOptions {
	/** Directory where compiled components will be output (default: 'widgets') */
	outputDir?: string;

	/** Enable verbose logging for debugging (default: false) */
	verbose?: boolean;
}

/**
 * Result of compiling a single component
 */
export interface CompilationResult {
	/** Whether compilation succeeded */
	success: boolean;

	/** Compiled component (only present if success is true) */
	component?: MCPComponent;

	/** Error details (only present if success is false) */
	error?: Error;

	/** Path to the file that was compiled */
	filePath?: string;
}

/**
 * Validation result for component names
 */
export interface ValidationResult {
	/** Whether the name is valid */
	valid: boolean;

	/** Error message if validation failed */
	error?: string;
}
