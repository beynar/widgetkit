import { handleMCP, tool } from '$lib/mcp';
import type { Handle } from '@sveltejs/kit';
import * as widgets from './widgets';
import z from 'zod/v4';
import { dev } from '$app/environment';
/**
 * SvelteKit Server Hook
 *
 * Handles MCP widget requests and server-side initialization
 */

const exposed = tool('test')
	.input(
		z.object({
			name: z.string()
		})
	)
	.output(
		z.object({
			message: z.string()
		})
	)
	.handle(async ({ input }) => {
		return {
			message: `Hello ${input.name}`
		};
	});

export const mcpHandle: Handle = async ({ event, resolve }) => {
	// Add any MCP-specific server logic here
	return handleMCP({
		tools: {
			test: tool('test')
				.widget(widgets.testWidget)
				.handle(async () => {
					return {
						type: 'text',
						text: 'test'
					};
				}),
			exposed
		},
		resources: {},
		prompts: {},
		widgets,
		name: 'test',
		version: '1.0.0',
		domain: dev ? 'https://tutu.beynar.dev' : 'https://chat-app-kit.beynar.workers.dev'
	})({ event, resolve });
};
