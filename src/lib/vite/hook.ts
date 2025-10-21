import path from 'node:path';
import fs from 'node:fs/promises';
import type { MCPLogger } from './logger.js';
import type { MCPComponent } from './types.js';
import { toKebabCase } from './validators.js';

/**
 * Ensures the MCP folder structure exists with hook and widget registry
 *
 * Creates:
 * - src/mcp folder
 * - src/mcp/hook.ts (SvelteKit hook)
 * - src/mcp/widgets.ts (widget registry)
 *
 * @param logger - Logger instance
 * @param components - Map of compiled components for widget registration
 * @returns true if setup was successful
 */
export async function ensureMCPHook(
	logger: MCPLogger,
	components?: Map<string, MCPComponent>
): Promise<boolean> {
	try {
		const mcpFolderPath = path.join(process.cwd(), 'src', 'mcp');
		const hookFilePath = path.join(mcpFolderPath, 'hook.ts');
		const widgetsFilePath = path.join(mcpFolderPath, 'widgets.ts');

		// Ensure folder exists
		try {
			await fs.access(mcpFolderPath);
			logger.info(`MCP folder exists at ${mcpFolderPath}`);
		} catch {
			await fs.mkdir(mcpFolderPath, { recursive: true });
			logger.success(`Created MCP folder: src/mcp`);
		}

		// Ensure hook.ts exists
		try {
			await fs.access(hookFilePath);
			logger.info(`MCP hook file exists at ${hookFilePath}`);
		} catch {
			const hookCode = generateHookCode();
			await fs.writeFile(hookFilePath, hookCode, 'utf-8');
			logger.success(`Created MCP hook file: src/mcp/hook.ts`);
		}

		// Ensure widgets.ts exists and register components
		try {
			await fs.access(widgetsFilePath);
			logger.info(`MCP widgets file exists at ${widgetsFilePath}`);

			// If components provided, register them if not already present
			if (components && components.size > 0) {
				await registerWidgetExports(widgetsFilePath, components, logger);
			}
		} catch {
			// Create new widgets.ts with component exports
			const widgetsCode = generateWidgetsCode(components || new Map(), logger);
			await fs.writeFile(widgetsFilePath, widgetsCode, 'utf-8');
			logger.success(`Created MCP widgets file: src/mcp/widgets.ts`);
		}

		return true;
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		logger.error(`Failed to ensure MCP hook`, err.message);
		return false;
	}
}

/**
 * Registers widget exports for compiled components, preserving existing exports
 */
async function registerWidgetExports(
	filePath: string,
	components: Map<string, MCPComponent>,
	logger: MCPLogger
): Promise<void> {
	try {
		let currentContent = await fs.readFile(filePath, 'utf-8');
		let updatedContent = currentContent;
		let modified = false;

		// For each component, check if its export already exists
		for (const [, component] of components) {
			// Convert to kebab-case for the export
			const kebabName = toKebabCase(component.name);
			// Use simple string matching to check if export exists
			const exportPattern = `export const ${kebabName}Widget = widget`;
			const exportCount = (
				currentContent.match(
					new RegExp(exportPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
				) || []
			).length;

			if (exportCount === 0) {
				// Export doesn't exist, add it
				const exportCode = `\nexport const ${kebabName}Widget = widget('${kebabName}', {
	name: '${kebabName}',
	description: '',
	invoking: '',
	invoked: '',
	prefersBorder: false
});`;
				updatedContent += exportCode;
				modified = true;
				logger.info(`Registered widget export: ${kebabName}Widget`);
			} else if (exportCount > 1) {
				logger.warn(`Multiple exports found for ${kebabName}Widget, skipping to avoid duplicates`);
			} else {
				logger.info(`Widget export already exists: ${kebabName}Widget`);
			}
		}

		// Write if there were changes
		if (modified) {
			await fs.writeFile(filePath, updatedContent, 'utf-8');
			logger.success(`Updated widget registry with new exports`);
		}
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		logger.warn(`Could not register widget exports: ${err.message}`);
	}
}

/**
 * Generates the SvelteKit hook.ts code
 */
function generateHookCode(): string {
	return `import type { Handle } from '@sveltejs/kit';
import * as widgets from './widgets';

/**
 * SvelteKit Server Hook
 * 
 * Handles MCP widget requests and server-side initialization
 * Automatically imports all registered widgets
 */

export const handle: Handle = async ({ event, resolve }) => {
	// Widgets are imported and registered above
	return await resolve(event);
};
`;
}

/**
 * Generates the widgets.ts registry code with initial component exports
 */
function generateWidgetsCode(components: Map<string, MCPComponent>, logger: MCPLogger): string {
	const widgetImports = `import { widget } from '$lib/mcp/widget';

/**
 * MCP Widget Registry
 * 
 * This file registers all compiled MCP components as widgets.
 * Exports follow the pattern: export const {Name}Widget = widget('{Name}', {...options})
 */
`;

	let exports = '';
	for (const [, component] of components) {
		const kebabName = toKebabCase(component.name);
		exports += `\nexport const ${kebabName}Widget = widget('${kebabName}', {
	name: '${kebabName}',
	description: '',
	invoking: '',
	invoked: '',
	prefersBorder: false
});`;
		logger.info(`Registered widget export: ${kebabName}Widget`);
	}

	return widgetImports + exports + '\n';
}
