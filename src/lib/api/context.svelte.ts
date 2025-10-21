import { DEV } from 'esm-env';
import { getContext, hasContext, onMount, setContext } from 'svelte';

import {
	SET_GLOBALS_EVENT_TYPE,
	type DisplayMode,
	type OpenAIGlobals,
	type SafeArea,
	type Theme,
	type UnknownObject,
	type UserAgent
} from './types.js';
import { mockOpenAI } from './mock.js';
import { WidgetStateProxy } from './widgetState.svelte.js';
import type { Page } from '@sveltejs/kit';

const stateKeys = [
	'theme',
	'userAgent',
	'locale',
	'maxHeight',
	'displayMode',
	'safeArea',
	'toolInput',
	'toolOutput',
	'toolResponseMetadata',
	'widgetState'
] as const;

export interface OpenAI {
	page: Page;
}

export function setTransparentBackground(theme: Theme, context: string) {
	console.log('setTransparentBackground', theme, window.openai.theme, context);
	document.documentElement.style.backgroundColor =
		window.openai.theme === 'light' ? '#ffffff' : '#212121';
	document.documentElement.setAttribute('data-theme', theme);
}
export class OpenAI<
	ToolInput = UnknownObject,
	ToolOutput = UnknownObject,
	ToolResponseMetadata = UnknownObject,
	WidgetState extends UnknownObject = UnknownObject
> {
	#theme: Theme = $state('light');

	get theme() {
		return this.#theme;
	}
	set theme(value: Theme) {
		window.document.documentElement.setAttribute('data-theme', value);
		this.#theme = value;
	}

	userAgent: UserAgent = $state({
		device: { type: 'desktop' },
		capabilities: {
			hover: true,
			touch: true
		}
	});
	locale: string = $state('en-US');

	// layout
	maxHeight: number = $state(100);
	displayMode: DisplayMode = $state('inline');
	safeArea: SafeArea = $state({
		insets: {
			top: 0,
			bottom: 0,
			left: 0,
			right: 0
		}
	});

	test = $state(false);

	// state
	toolInput: ToolInput = $state({} as ToolInput);
	toolOutput: ToolOutput | null = $state(null);
	toolResponseMetadata: ToolResponseMetadata | null = $state(null);
	#widgetStateProxy: WidgetStateProxy<WidgetState>;

	get widgetState() {
		return this.#widgetStateProxy.proxy;
	}
	set widgetState(value: WidgetState) {
		this.#widgetStateProxy.value = value;
		window.openai.setWidgetState(value);
	}

	isChatGptApp = $state(false);

	constructor({ widgetState }: { widgetState: WidgetState }) {
		this.isChatGptApp = !!window.openai;
		if (!this.isChatGptApp) {
			console.log('mocking openai !');
			mockOpenAI();
		}

		this.#widgetStateProxy = new WidgetStateProxy(widgetState);

		stateKeys.forEach((key) => {
			if (key !== 'widgetState') {
				// @ts-ignore
				this[key] = window.openai[key as keyof OpenAIGlobals];
			}
		});
		setTransparentBackground(this.theme, 'constructor');

		window.addEventListener(SET_GLOBALS_EVENT_TYPE, this.setGlobals, {
			passive: true
		});
	}

	setGlobals = (event: CustomEvent<{ globals: Partial<OpenAIGlobals> }>) => {
		for (const key of Object.keys(event.detail.globals).filter((key) =>
			stateKeys.includes(key as any)
		)) {
			if (key === 'widgetState') {
				this.#widgetStateProxy.value = event.detail.globals[
					key as keyof OpenAIGlobals
				] as unknown as WidgetState;
			} else {
				// @ts-ignore
				this[key] = event.detail.globals[key as keyof OpenAIGlobals];
			}
			if (key === 'theme' || key === 'displayMode') {
				setTransparentBackground(this.theme, 'setGlobals');
			}
		}
	};

	requestDisplayMode(mode: DisplayMode) {
		this.displayMode = mode;
		window.openai.requestDisplayMode({ mode });
	}

	callTool(name: string, args: Record<string, unknown>) {
		return window.openai.callTool(name, args);
	}

	sendFollowUpMessage(prompt: string) {
		return window.openai.sendFollowUpMessage({ prompt });
	}

	openExternal(href: string) {
		return window.openai.openExternal({ href });
	}
}

export const useOpenAI = <
	ToolInput = UnknownObject,
	ToolOutput = UnknownObject,
	ToolResponseMetadata = UnknownObject,
	WidgetState extends UnknownObject = UnknownObject
>({
	widgetState
}: {
	widgetState: WidgetState;
}) => {
	if (hasContext('openai')) {
		return getContext('openai') as OpenAI<ToolInput, ToolOutput, ToolResponseMetadata, WidgetState>;
	} else {
		let openai = new OpenAI<ToolInput, ToolOutput, ToolResponseMetadata, WidgetState>({
			widgetState
		});
		setContext('openai', openai);
		return openai as OpenAI<ToolInput, ToolOutput, ToolResponseMetadata, WidgetState>;
	}
};
