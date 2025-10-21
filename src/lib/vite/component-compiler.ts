/**
 * Component compilation logic for the MCP Svelte Plugin
 *
 * Handles the complete compilation pipeline:
 * 1. Creates temporary build files
 * 2. Runs Vite build with Svelte and Tailwind
 * 3. Extracts and injects CSS
 * 4. Wraps with auto-mount logic
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import type { ResolvedConfig } from 'vite';
import { build as viteBuild } from 'vite';
import type { Rollup } from 'vite';
import { TEMP_DIR_NAME } from './constants.js';
import { wrapComponentForRegistration, generateEntryPoint } from './templates.js';
import { compileTailwindForComponent } from './tailwind-compiler.js';
import type { MCPLogger } from './logger.js';
import type { CompilationResult } from './types.js';
import { minify } from '@swc/core';

/**
 * Compiles a single .mcp.svelte component into a self-contained bundle
 *
 * This function:
 * 1. Creates temporary files for the build
 * 2. Runs Vite to bundle the component with Svelte compiler
 * 3. Extracts CSS from build output (Svelte styles + Tailwind theme/plugins)
 * 4. Compiles additional Tailwind utilities programmatically
 * 5. Injects all CSS into the JavaScript bundle
 * 6. Wraps with auto-mount and registration code
 *
 * @param filePath - Absolute path to the .mcp.svelte file
 * @param componentName - Valid JavaScript identifier for the component
 * @param logger - Logger instance for status messages
 * @param viteConfig - Resolved Vite configuration
 * @returns Compilation result with bundled code or error
 */
export async function compileComponentInline(
	filePath: string,
	componentName: string,
	logger: MCPLogger,
	viteConfig: ResolvedConfig
): Promise<CompilationResult> {
	const tempDir = path.join(process.cwd(), TEMP_DIR_NAME);

	try {
		// Create temp directory
		await fs.mkdir(tempDir, { recursive: true });

		// Read the component source for Tailwind class extraction
		const componentSource = await fs.readFile(filePath, 'utf-8');

		// Create temporary files for the build
		const { tempEntry, tempCSS, tempHTML } = await createTempFiles(
			tempDir,
			componentName,
			componentSource,
			filePath
		);

		// Detect Tailwind plugin in parent config
		const hasTailwind = viteConfig.plugins?.find(
			(p: any) => p && p.name && (p.name.includes('tailwind') || p.name === '@tailwindcss/vite')
		);

		// Build the component with Vite
		const output = await buildComponent(tempEntry, componentName, hasTailwind, viteConfig, logger);

		// Extract CSS from build output
		const buildOutputCSS = extractBuildCSS(output, logger);

		// Compile Tailwind utilities programmatically
		let tailwindCSS = '';
		if (hasTailwind) {
			tailwindCSS = await compileTailwindForComponent(componentSource, componentName, logger);
		}

		// Find the JavaScript chunk
		const jsChunk = output.find((o) => o.type === 'chunk' && o.isEntry);
		if (!jsChunk || jsChunk.type !== 'chunk') {
			throw new Error('Build produced no JavaScript entry chunk');
		}

		const finalCode = injectCSS(jsChunk.code, buildOutputCSS, tailwindCSS, componentName, logger);

		// Wrap with registration and auto-mount logic
		const wrappedCode = wrapComponentForRegistration(finalCode, componentName);
		// minify the JavaScript chunk
		const minifiedCode = await minify(wrappedCode, {
			mangle: true,
			compress: true
		});

		return {
			success: true,
			component: {
				name: componentName,
				code: minifiedCode.code,
				// code: wrappedCode,
				source: '',
				filePath
			}
		};
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		logger.error(`Failed to compile ${componentName}`, err.message);
		return {
			success: false,
			error: new Error(`Failed to compile ${filePath}: ${err.message}`),
			filePath
		};
	} finally {
		// Clean up temp directory
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
		} catch (e) {
			// Ignore cleanup errors
		}
	}
}

/**
 * Creates temporary files needed for the Vite build
 */
async function createTempFiles(
	tempDir: string,
	componentName: string,
	componentSource: string,
	componentPath: string
) {
	// Create a temp HTML file with component source for Tailwind scanning
	const tempHTML = path.join(tempDir, `${componentName}.scan.html`);
	await fs.writeFile(tempHTML, componentSource, 'utf-8');

	// Create CSS entry point
	const tempCSS = path.join(tempDir, `${componentName}.entry.css`);
	const cssEntryCode = `@import 'tailwindcss';`;
	await fs.writeFile(tempCSS, cssEntryCode, 'utf-8');

	// Create JavaScript entry point
	const tempEntry = path.join(tempDir, `${componentName}.entry.js`);
	const entryCode = generateEntryPoint(
		path.basename(tempCSS),
		path.basename(tempHTML),
		componentPath
	);
	await fs.writeFile(tempEntry, entryCode, 'utf-8');

	return { tempEntry, tempCSS, tempHTML };
}

/**
 * Builds the component using Vite with Svelte compiler
 */
async function buildComponent(
	tempEntry: string,
	componentName: string,
	hasTailwind: any,
	viteConfig: ResolvedConfig,
	logger: MCPLogger
) {
	// Import Svelte plugin
	const { svelte } = await import('@sveltejs/vite-plugin-svelte');

	const plugins: any[] = [
		svelte({
			configFile: false,
			emitCss: true,

			compilerOptions: {
				dev: false,
				css: 'external' // External CSS for extraction
			}
		})
	];

	// Add Tailwind plugin if detected
	if (hasTailwind) {
		logger.info(`Tailwind CSS detected for ${componentName}`);
		const tailwindcss = await import('@tailwindcss/vite');
		plugins.unshift(tailwindcss.default());
	}

	// Run Vite build
	const buildResult = await viteBuild({
		configFile: false,
		logLevel: 'silent',

		css: {
			transformer: 'lightningcss'
		},
		build: {
			write: false,
			minify: false,
			cssMinify: false,

			lib: {
				entry: tempEntry,
				name: `__mcp_${componentName}`,
				formats: ['iife']
			},
			rollupOptions: {
				output: {
					format: 'iife',
					inlineDynamicImports: true
				},

				external: []
			},
			cssCodeSplit: false,
			assetsInlineLimit: 100000000
		},
		resolve: viteConfig.resolve,
		plugins
	});

	logger.info(
		`Build result type: ${typeof buildResult}, has output: ${buildResult && 'output' in buildResult}`
	);

	if (!buildResult) {
		throw new Error('Build produced no result');
	}

	// Extract output from build result
	let output: (Rollup.OutputChunk | Rollup.OutputAsset)[];
	if (Array.isArray(buildResult)) {
		const firstBuild = buildResult[0];
		if (!firstBuild || !('output' in firstBuild)) {
			throw new Error('Build array has no valid output');
		}
		output = (firstBuild as Rollup.RollupOutput).output;
	} else if ('output' in buildResult) {
		output = (buildResult as Rollup.RollupOutput).output;
	} else {
		throw new Error(
			`Unexpected build result structure: ${JSON.stringify(Object.keys(buildResult))}`
		);
	}

	return output;
}

/**
 * Extracts CSS from Vite build output
 *
 * This includes Svelte component styles and Tailwind theme/custom plugins
 */
function extractBuildCSS(
	output: (Rollup.OutputChunk | Rollup.OutputAsset)[],
	logger: MCPLogger
): string {
	const cssAssets = output.filter(
		(o): o is Rollup.OutputAsset => o.type === 'asset' && o.fileName.endsWith('.css')
	);

	if (cssAssets.length > 0) {
		const css = cssAssets
			.map((asset) => (typeof asset.source === 'string' ? asset.source : asset.source.toString()))
			.join('\n');
		logger.info(
			`Extracted ${css.length} bytes of CSS from build (Svelte styles + Tailwind theme/custom plugins)`
		);
		return css;
	}

	return '';
}

/**
 * Injects CSS into the JavaScript bundle as a style tag
 *
 * Combines build output CSS with programmatically compiled Tailwind utilities
 */
function injectCSS(
	jsCode: string,
	buildOutputCSS: string,
	tailwindCSS: string,
	componentName: string,
	logger: MCPLogger
): string {
	// Combine CSS (build output first for theme vars, then utilities)
	const cssCode = [buildOutputCSS, tailwindCSS].filter(Boolean).join('\n');

	if (!cssCode || cssCode.trim().length === 0) {
		logger.warn(`No CSS content to inject for ${componentName}`);
		return jsCode;
	}

	logger.info(`Injecting ${cssCode.length} bytes of CSS for ${componentName}`);

	// Create CSS injection code
	const cssInjection = `
  // Inject component CSS
  (function() {
    if (typeof document !== 'undefined' && !document.querySelector('style[data-mcp-component="${componentName}"]')) {
      var style = document.createElement('style');
      style.setAttribute('data-mcp-component', '${componentName}');
      style.textContent = ${JSON.stringify(cssCode)};
      document.head.appendChild(style);
    }
  })();
`;

	// Inject CSS at the beginning of the IIFE
	const iiffePattern = /^(var __mcp_\w+ = \(function\(exports\) \{\s*\n)/;
	if (iiffePattern.test(jsCode)) {
		const result = jsCode.replace(iiffePattern, `$1${cssInjection}`);
		logger.success(`CSS successfully injected for ${componentName}`);
		return result;
	} else {
		logger.warn(`Could not find IIFE pattern to inject CSS for ${componentName}`);
		logger.info(`First 200 chars: ${jsCode.substring(0, 200)}`);
		return jsCode;
	}
}
