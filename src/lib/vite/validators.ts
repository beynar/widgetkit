/**
 * Validation functions for the MCP Svelte Plugin
 *
 * Ensures component names and configurations meet requirements.
 */

import type { ValidationResult } from './types.js';

/**
 * Converts a component name to kebab-case
 *
 * @param name - The component name to convert
 * @returns Kebab-cased component name
 *
 * @example
 * ```ts
 * toKebabCase('TestComponent') // 'test-component'
 * toKebabCase('test_component') // 'test-component'
 * toKebabCase('test-component') // 'test-component'
 * ```
 */
export function toKebabCase(name: string): string {
	return (
		name
			// Insert hyphen before uppercase letters
			.replace(/([a-z])([A-Z])/g, '$1-$2')
			// Replace underscores with hyphens
			.replace(/_/g, '-')
			// Convert to lowercase
			.toLowerCase()
	);
}

/**
 * Validates that a component name is a valid JavaScript identifier
 *
 * Component names must:
 * - Not be empty
 * - Start with a letter, underscore, or dollar sign
 * - Contain only letters, numbers, underscores, or dollar signs
 *
 * @param name - The component name to validate
 * @returns Validation result with success status and optional error message
 *
 * @example
 * ```ts
 * validateComponentName('MyComponent') // { valid: true }
 * validateComponentName('123Invalid')  // { valid: false, error: '...' }
 * ```
 */
export function validateComponentName(name: string): ValidationResult {
	if (!name) {
		return { valid: false, error: 'Component name is empty' };
	}

	if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
		return {
			valid: false,
			error: `Component name "${name}" is not a valid JavaScript identifier. Use alphanumerics, _, or $.`
		};
	}

	return { valid: true };
}
