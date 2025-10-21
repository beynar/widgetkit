/**
 * Code generation templates for the MCP Svelte Plugin
 * 
 * Generates runtime code for component registration, mounting, and indexing.
 */

import type { MCPComponent } from './types.js';

/**
 * Wraps compiled component code with global registration and auto-mount logic
 * 
 * This wrapper:
 * 1. Registers the component globally on window.SvelteComponents
 * 2. Creates a mount() helper function
 * 3. Auto-mounts the component when the DOM is ready
 * 4. Supports passing props via data-props attribute
 * 
 * @param bundledCode - The compiled IIFE bundle from Vite
 * @param componentName - Name of the component (used for global registration)
 * @returns Wrapped code ready for deployment
 */
export function wrapComponentForRegistration(
	bundledCode: string,
	componentName: string
): string {
	const containerId = componentName;

	return `${bundledCode}

// Register component globally and auto-mount
(function() {
	if (typeof window === 'undefined' || !window.__mcp_${componentName}) return;
	
	// Store the original mount function before we do anything
	const originalMount = window.__mcp_${componentName}.mount || window.__mcp_${componentName}.default?.mount;
	if (!originalMount) {
		console.error('[MCP] No mount function found for ${componentName}');
		return;
	}
	
	window.SvelteComponents = window.SvelteComponents || {};
	window.SvelteComponents['${componentName}'] = window.__mcp_${componentName};
	
	// Wrapper mount function that uses the stored original
	window.SvelteComponents['${componentName}'].mount = function(target, props = {}) {
		if (!target) throw new Error('Target element required');
		return originalMount(target, props);
	};
	
	console.log('[MCP] Registered component: ${componentName}');
	
	// Auto-mount when DOM is ready
	function autoMount() {
		// Look for container with component ID
		let container = document.getElementById('${containerId}');
		
		// If not found, mount directly to body
		if (!container) {
			container = document.createElement('div');
			container.id = '${containerId}';
			document.body.appendChild(container);
		}
		
		// Get props from data attributes if they exist
		const props = {};
		if (container.dataset.props) {
			try {
				Object.assign(props, JSON.parse(container.dataset.props));
			} catch (e) {
				console.warn('[MCP] Failed to parse data-props:', e);
			}
		}
		
		// Mount the component
		try {
			window.SvelteComponents['${componentName}'].mount(container, props);
			console.log('[MCP] Auto-mounted ${componentName}');
		} catch (error) {
			console.error('[MCP] Failed to auto-mount ${componentName}:', error);
		}
	}
	
	// Auto-mount when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', autoMount);
	} else {
		// DOM already loaded, mount immediately
		autoMount();
	}
})();
`;
}

/**
 * Generates an index file that lists all available MCP components
 * 
 * Creates a registry file that can be loaded to see which components are available.
 * 
 * @param components - Map of compiled components
 * @returns JavaScript code for the index file
 */
export function generateIndexContent(components: Map<string, MCPComponent>): string {
	const componentsList = Array.from(components.values()).map((c) => `  '${c.name}'`);

	return `// Auto-generated MCP Components Index
// This file lists all available MCP components

if (typeof window !== 'undefined') {
  window.SvelteComponents = window.SvelteComponents || {};
  window.mcpComponentsList = [
${componentsList.join(',\n')}
  ];
  console.log('[MCP] Available components:', window.mcpComponentsList);
}
`;
}

/**
 * Generates the temporary entry point for Vite bundling
 * 
 * @param cssFileName - Name of the CSS entry file
 * @param htmlFileName - Name of the HTML scan file
 * @param componentPath - Path to the source component
 * @returns JavaScript entry point code
 */
export function generateEntryPoint(
	cssFileName: string,
	htmlFileName: string,
	componentPath: string
): string {
	return `
import './${cssFileName}';
import './${htmlFileName}?raw';
import Component from '${componentPath}';
import { mount as svelteMount, hydrate, unmount } from 'svelte';

// Mount helper that properly handles Svelte 5 components
function mount(target, props = {}) {
	if (!target) throw new Error('Target element required for mount');
	
	// Clear the target first
	target.innerHTML = '';
	
	// Use Svelte 5's mount function
	return svelteMount(Component, {
		target,
		props
	});
}

// Export for IIFE
export { Component, mount, hydrate, unmount };
export default { Component, mount, hydrate, unmount };
`;
}
