/**
 * Tailwind CSS compilation utilities for the MCP Svelte Plugin
 * 
 * Handles programmatic Tailwind CSS compilation with support for custom plugins.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { compile as compileTailwind } from 'tailwindcss';
import type { MCPLogger } from './logger.js';

/**
 * Extracts all CSS class candidates from a Svelte component's source code
 * 
 * Scans for class attributes and extracts individual class names.
 * 
 * @param componentSource - The component's source code
 * @returns Set of unique class names found in the component
 */
export function extractClassCandidates(componentSource: string): Set<string> {
	const classMatches = componentSource.matchAll(/class(?:Name)?=["']([^"']*)["']/g);
	const candidates = new Set<string>();
	
	for (const match of classMatches) {
		const classes = match[1].split(/\s+/);
		classes.forEach(cls => cls && candidates.add(cls));
	}
	
	return candidates;
}

/**
 * Compiles Tailwind CSS for specific class candidates
 * 
 * Uses the programmatic Tailwind compiler to generate CSS for only the classes
 * used in the component. Supports custom plugins defined in app.css.
 * 
 * @param componentSource - Source code to extract classes from
 * @param componentName - Name of the component (for logging)
 * @param logger - Logger instance
 * @returns Compiled CSS string
 */
export async function compileTailwindForComponent(
	componentSource: string,
	componentName: string,
	logger: MCPLogger
): Promise<string> {
	try {
		logger.info(`Compiling Tailwind CSS for ${componentName}...`);
		
		// Extract all class names from the component source
		const candidates = extractClassCandidates(componentSource);
		logger.info(`Found ${candidates.size} Tailwind class candidates`);
		
		// Use the project's app.css which includes custom plugins
		const appCSSPath = path.join(process.cwd(), 'src', 'app.css');
		let cssSource = '@import "tailwindcss";';
		
		try {
			cssSource = await fs.readFile(appCSSPath, 'utf-8');
			logger.info(`Using custom CSS configuration from app.css`);
		} catch (e) {
			logger.info(`No app.css found, using default Tailwind CSS`);
		}
		
		// Compile Tailwind with custom loader functions
		const compiler = await compileTailwind(cssSource, {
			base: path.dirname(appCSSPath),
			loadStylesheet: createStylesheetLoader(),
			loadModule: createModuleLoader()
		});
		
		const css = compiler.build(Array.from(candidates));
		logger.info(`Generated ${css.length} bytes of Tailwind CSS (with custom plugins)`);
		
		return css;
	} catch (error) {
		logger.warn(`Failed to compile Tailwind CSS: ${error}`);
		return '';
	}
}

/**
 * Creates a stylesheet loader for Tailwind's @import resolution
 * 
 * Handles loading CSS files referenced in @import statements.
 */
function createStylesheetLoader() {
	return async (id: string, base: string) => {
		// For 'tailwindcss' imports, resolve to node_modules
		if (id === 'tailwindcss') {
			const tailwindCSSPath = path.join(process.cwd(), 'node_modules', 'tailwindcss', 'index.css');
			const content = await fs.readFile(tailwindCSSPath, 'utf-8');
			return {
				path: tailwindCSSPath,
				content,
				base: path.dirname(tailwindCSSPath)
			};
		}
		
		// Try to resolve relative to base
		try {
			const resolvedPath = path.resolve(base, id);
			const content = await fs.readFile(resolvedPath, 'utf-8');
			return {
				path: resolvedPath,
				content,
				base: path.dirname(resolvedPath)
			};
		} catch (e) {
			throw new Error(`Cannot load stylesheet: ${id}`);
		}
	};
}

/**
 * Creates a module loader for Tailwind's @plugin resolution
 * 
 * Handles loading JavaScript/TypeScript plugin modules with proper package.json
 * exports resolution.
 */
function createModuleLoader() {
	return async (id: string, base: string) => {
		try {
			let modulePath: string;
			
			if (id.startsWith('.')) {
				// Relative import
				modulePath = path.resolve(base, id);
			} else {
				// Package import like 'svelai/tailwind-plugin'
				const [pkgName, ...subpath] = id.split('/');
				const pkgPath = path.join(process.cwd(), 'node_modules', pkgName);
				
				if (subpath.length > 0) {
					// Has subpath, check package.json exports
					const pkgJsonPath = path.join(pkgPath, 'package.json');
					const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));
					const exportPath = pkgJson.exports?.[`./${subpath.join('/')}`]?.default;
					
					if (exportPath) {
						modulePath = path.join(pkgPath, exportPath);
					} else {
						modulePath = path.join(pkgPath, ...subpath);
					}
				} else {
					modulePath = pkgPath;
				}
			}
			
			// Import the module
			const module = await import(modulePath);
			return {
				path: modulePath,
				base: path.dirname(modulePath),
				module: module.default || module
			};
		} catch (error) {
			throw new Error(`Cannot load module: ${id} - ${error}`);
		}
	};
}
