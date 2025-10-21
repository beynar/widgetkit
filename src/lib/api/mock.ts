import { DEV } from 'esm-env';
import { type API, type DisplayMode, type OpenAIGlobals } from './types.js';

const MOCK_OPENAI = {
	theme: 'light',
	userAgent: {
		device: { type: 'desktop' },
		capabilities: {
			hover: true,
			touch: true
		}
	},
	locale: 'en-US',
	maxHeight: 100,
	displayMode: 'inline',
	safeArea: {
		insets: {
			top: 0,
			bottom: 0,
			left: 0,
			right: 0
		}
	},
	toolInput: {},
	toolOutput: null,
	toolResponseMetadata: null,
	widgetState: null,
	setWidgetState: async (...args: unknown[]) => {
		console.log('setWidgetState', args);
	},
	requestDisplayMode: async ({ mode }: { mode: DisplayMode }) => {
		console.log('requestDisplayMode', mode);
		return {
			mode
		};
	},
	callTool: async (name: string, args: Record<string, unknown>) => {
		console.log('callTool', name, args);
		return {
			result: 'success'
		};
	},
	sendFollowUpMessage: async ({ prompt }: { prompt: string }) => {
		console.log('sendFollowUpMessage', prompt);
	},
	openExternal: ({ href }: { href: string }) => {
		console.log('openExternal', href);
	}
} satisfies OpenAIGlobals & API;

export const mockOpenAI = () => {
	if (DEV && !window.openai) {
		window.openai = MOCK_OPENAI;
	}
};
