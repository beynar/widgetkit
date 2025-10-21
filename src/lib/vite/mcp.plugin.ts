/**
 * MCP Svelte Plugin - Main entry point
 *
 * A Vite plugin that compiles .mcp.svelte files into self-contained, auto-mounting
 * JavaScript bundles with inlined CSS (including Tailwind utilities and custom plugins).
 *
 * Features:
 * - Compiles Svelte 5 components to standalone IIFE bundles
 * - Inlines all CSS (Svelte styles + Tailwind + custom plugins)
 * - Auto-mounts components when loaded in browser
 * - Supports custom Tailwind plugins via app.css
 * - Works in both development and production builds
 *
 * @module mcp-svelte-plugin
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { glob } from 'glob';
import type { Plugin, ResolvedConfig } from 'vite';

// Import modular components
import { PLUGIN_NAME, MCP_PATTERN, DEFAULT_OUTPUT_DIR, IGNORE_PATTERNS } from './constants.js';
import { MCPLogger } from './logger.js';
import { validateComponentName, toKebabCase } from './validators.js';
import { generateIndexContent } from './templates.js';
import { compileComponentInline } from './component-compiler.js';
import { handleFileChange } from './file-watcher.js';
import type { PluginOptions, MCPComponent } from './types.js';
import { ensureMCPHook } from './hook.js';

/**
 * Creates the MCP Svelte plugin
 *
 * @param options - Plugin configuration options
 * @returns Vite plugin instance
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { mcpSveltePlugin } from './src/lib/vite/mcp.plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     mcpSveltePlugin({
 *       outputDir: 'widgets',
 *       verbose: true
 *     })
 *   ]
 * });
 * ```
 */
export function mcpSveltePlugin(options: PluginOptions = {}): Plugin {
	const { outputDir = DEFAULT_OUTPUT_DIR, verbose = false } = options;

	const logger = new MCPLogger(verbose);
	let mcpComponents = new Map<string, MCPComponent>();
	let totalCompiled = 0;
	let totalFailed = 0;
	let isDevMode = false;
	let viteConfig: ResolvedConfig;
	let widgetsEnsured = false;

	/**
	 * Helper to write files in dev mode to static directory
	 */
	const writeDevFiles = async () => {
		try {
			const publicDir = path.join(process.cwd(), 'static', outputDir);
			await fs.mkdir(publicDir, { recursive: true });

			// Write each component file
			for (const [, component] of mcpComponents) {
				const filePath = path.join(publicDir, `${component.name}.js`);
				await fs.writeFile(filePath, component.code, 'utf-8');
				logger.success(`📝 Wrote: static/${outputDir}/${component.name}.js`);
			}

			// Write index file
			const indexContent = generateIndexContent(mcpComponents);
			const indexPath = path.join(publicDir, 'index.js');
			await fs.writeFile(indexPath, indexContent, 'utf-8');
			logger.success(`📝 Wrote: static/${outputDir}/index.js`);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.warn(`Could not write dev files: ${err.message}`);
		}
	};

	return {
		name: PLUGIN_NAME,

		configResolved(config) {
			viteConfig = config;
			isDevMode = config.command === 'serve';
			if (verbose) {
				logger.info(`🔧 Running in ${isDevMode ? 'dev' : 'build'} mode`);
			}
		},

		/**
		 * buildStart hook - scans and compiles all .mcp.svelte files
		 */
		async buildStart() {
			logger.info('🔍 Scanning for .mcp.svelte files...');
			mcpComponents.clear();
			totalCompiled = 0;
			totalFailed = 0;

			try {
				// Find all .mcp.svelte files
				const files = await glob(MCP_PATTERN, {
					cwd: process.cwd(),
					ignore: IGNORE_PATTERNS
				});

				if (files.length === 0) {
					logger.info('No .mcp.svelte files found');
					return;
				}

				logger.info(`Found ${files.length} .mcp.svelte file(s)`);

				// Compile each component with full bundling
				for (const file of files) {
					try {
						const absolutePath = path.resolve(process.cwd(), file);
						const rawComponentName = path
							.basename(file, '.mcp.svelte')
							.replace(/[^a-zA-Z0-9]/g, '_');
						const componentName = toKebabCase(rawComponentName);

						// Validate component name (validate raw name, then use kebab version)
						const nameValidation = validateComponentName(rawComponentName);
						if (!nameValidation.valid) {
							logger.error(`Invalid component name: ${nameValidation.error}`, file);
							totalFailed++;
							continue;
						}

						// Validate file exists
						try {
							await fs.access(absolutePath);
						} catch (error) {
							logger.error(`Cannot access file`, file);
							totalFailed++;
							continue;
						}

						logger.info(`Compiling ${componentName}...`);

						// Compile with full bundling (inline strategy)
						const result = await compileComponentInline(
							absolutePath,
							componentName,
							logger,
							viteConfig
						);

						if (result.success && result.component) {
							mcpComponents.set(file, result.component);
							totalCompiled++;
							logger.info(`✓ Compiled: ${file}`);
						} else {
							totalFailed++;
							const errorMsg = result.error?.message || 'Unknown error';
							logger.error(`Failed to compile ${file}`, errorMsg);
							this.warn(`[${PLUGIN_NAME}] Failed to compile ${file}: ${errorMsg}`);
						}
					} catch (error) {
						const err = error instanceof Error ? error : new Error(String(error));
						logger.error(`Unexpected error processing ${file}`, err.message);
						totalFailed++;
					}
				}

				// Log summary
				const summary = `Compilation complete: ${totalCompiled} succeeded, ${totalFailed} failed`;
				if (totalFailed === 0) {
					logger.success(summary);
				} else {
					logger.warn(summary);
				}

				// Ensure MCP hook and widget registry exist with all compiled components
				if (mcpComponents.size > 0 && !widgetsEnsured) {
					await ensureMCPHook(logger, mcpComponents);
					widgetsEnsured = true;
				}

				// In dev mode, write to static folder
				if (isDevMode && mcpComponents.size > 0) {
					await writeDevFiles();
				}

				// Fail build if all components failed (only in build mode)
				if (totalFailed > 0 && totalCompiled === 0 && !isDevMode) {
					throw new Error(`All component compilations failed (${totalFailed} files)`);
				}
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));
				logger.error('Fatal error during buildStart', err.message);
				if (!isDevMode) {
					throw error;
				}
			}
		},

		/**
		 * handleHotUpdate hook - watches for changes to .mcp.svelte files in dev mode
		 */
		async handleHotUpdate({ file, server }) {
			// Only process .mcp.svelte files
			if (!file.endsWith('.mcp.svelte')) {
				return;
			}

			logger.info(`📝 Change detected: ${path.relative(process.cwd(), file)}`);

			// Recompile the changed component
			const success = await handleFileChange(file, mcpComponents, viteConfig, logger, outputDir);

			if (success) {
				// Trigger a full page reload to load the new component
				server.ws.send({
					type: 'full-reload',
					path: '*'
				});
			}

			// Return empty array to prevent default HMR
			return [];
		},

		/**
		 * generateBundle hook - emits compiled components as assets
		 */
		async generateBundle() {
			try {
				// Emit all compiled components
				for (const [, component] of mcpComponents) {
					try {
						const fileName = `${outputDir}/${component.name}.js`;

						this.emitFile({
							type: 'asset',
							fileName,
							source: component.code
						});

						logger.info(`Emitted: ${fileName}`);
					} catch (error) {
						const err = error instanceof Error ? error : new Error(String(error));
						logger.error(`Failed to emit ${component.name}`, err.message);
					}
				}

				// Emit index file
				if (mcpComponents.size > 0) {
					try {
						const indexContent = generateIndexContent(mcpComponents);
						this.emitFile({
							type: 'asset',
							fileName: `${outputDir}/index.js`,
							source: indexContent
						});

						logger.info(`Emitted: ${outputDir}/index.js`);
					} catch (error) {
						const err = error instanceof Error ? error : new Error(String(error));
						logger.error('Failed to emit index.js', err.message);
					}
				}
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));
				logger.error('Fatal error during generateBundle', err.message);
			}
		}
	};
}

export default mcpSveltePlugin;
