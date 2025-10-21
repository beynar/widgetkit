/**
 * Logging utility for the MCP Svelte Plugin
 * 
 * Provides consistent, emoji-enhanced logging with support for verbose mode.
 */

import { PLUGIN_NAME } from './constants.js';

/**
 * Logger class with different log levels and emoji indicators
 */
export class MCPLogger {
	private verbose: boolean;

	constructor(verbose: boolean = false) {
		this.verbose = verbose;
	}

	/**
	 * Log informational messages (only shown in verbose mode)
	 */
	info(message: string): void {
		if (this.verbose) {
			console.log(`[${PLUGIN_NAME}] ℹ️  ${message}`);
		}
	}

	/**
	 * Log success messages (always shown)
	 */
	success(message: string): void {
		console.log(`[${PLUGIN_NAME}] ✅ ${message}`);
	}

	/**
	 * Log warning messages (always shown)
	 */
	warn(message: string): void {
		console.warn(`[${PLUGIN_NAME}] ⚠️  ${message}`);
	}

	/**
	 * Log error messages with optional details (shown based on verbose setting)
	 */
	error(message: string, details?: string): void {
		console.error(`[${PLUGIN_NAME}] ❌ ${message}`);
		if (details && this.verbose) {
			console.error(`   ${details}`);
		}
	}
}
