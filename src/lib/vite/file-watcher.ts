/**
 * File watching utilities for the MCP Svelte Plugin
 * 
 * Provides hot reloading in development mode by watching .mcp.svelte files
 * and recompiling them on change.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import type { ResolvedConfig } from 'vite';
import type { MCPLogger } from './logger.js';
import type { MCPComponent } from './types.js';
import { validateComponentName } from './validators.js';
import { compileComponentInline } from './component-compiler.js';
import { generateIndexContent } from './templates.js';

/**
 * Handles a file change event for an .mcp.svelte file
 * 
 * @param filePath - Absolute path to the changed file
 * @param mcpComponents - Map of currently compiled components
 * @param viteConfig - Resolved Vite configuration
 * @param logger - Logger instance
 * @param outputDir - Directory for output files
 * @returns true if recompilation succeeded
 */
export async function handleFileChange(
	filePath: string,
	mcpComponents: Map<string, MCPComponent>,
	viteConfig: ResolvedConfig,
	logger: MCPLogger,
	outputDir: string
): Promise<boolean> {
	try {
		// Get component name from file path
		const fileName = path.basename(filePath);
		const componentName = fileName.replace('.mcp.svelte', '').replace(/[^a-zA-Z0-9]/g, '_');

		// Validate component name
		const nameValidation = validateComponentName(componentName);
		if (!nameValidation.valid) {
			logger.error(`Invalid component name: ${nameValidation.error}`, fileName);
			return false;
		}

		logger.info(`🔄 Recompiling ${componentName}...`);

		// Compile the component
		const result = await compileComponentInline(
			filePath,
			componentName,
			logger,
			viteConfig
		);

		if (result.success && result.component) {
			// Update the components map
			const relPath = path.relative(process.cwd(), filePath);
			mcpComponents.set(relPath, result.component);

			// Write to static directory
			await writeComponentFiles(mcpComponents, outputDir, logger);

			logger.success(`✅ Recompiled ${componentName}`);
			return true;
		} else {
			const errorMsg = result.error?.message || 'Unknown error';
			logger.error(`Failed to recompile ${fileName}`, errorMsg);
			return false;
		}
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		logger.error(`Error handling file change`, err.message);
		return false;
	}
}

/**
 * Writes all component files to the static directory
 */
async function writeComponentFiles(
	mcpComponents: Map<string, MCPComponent>,
	outputDir: string,
	logger: MCPLogger
) {
	try {
		const publicDir = path.join(process.cwd(), 'static', outputDir);
		await fs.mkdir(publicDir, { recursive: true });

		// Write each component file
		for (const [, component] of mcpComponents) {
			const filePath = path.join(publicDir, `${component.name}.js`);
			await fs.writeFile(filePath, component.code, 'utf-8');
		}

		// Write index file
		const indexContent = generateIndexContent(mcpComponents);
		const indexPath = path.join(publicDir, 'index.js');
		await fs.writeFile(indexPath, indexContent, 'utf-8');
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		logger.warn(`Could not write dev files: ${err.message}`);
	}
}
