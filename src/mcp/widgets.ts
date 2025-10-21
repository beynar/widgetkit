import { widget } from '$lib/mcp/widget';

/**
 * MCP Widget Registry
 * 
 * This file registers all compiled MCP components as widgets.
 * Exports follow the pattern: export const {Name}Widget = widget('{Name}', {...options})
 */

export const testWidget = widget('test', {
	name: 'test',
	description: '',
	invoking: '',
	invoked: '',
	prefersBorder: false
});
