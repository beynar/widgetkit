import type { MaybePromise, MCPServer } from './types';
import { defineTools, type Tool, ToolError } from './tools';
import { definePrompts, type Prompt } from './prompts';
import { defineResources, defineResourceTemplates, type Resource } from './resources';
import { MCPError, mcpError } from './errors.js';
import type {
	ClientRequest,
	InitializeResult,
	ListPromptsResult,
	ListResourcesResult,
	ReadResourceResult,
	CompleteResult,
	EmptyResult,
	CallToolResult,
	ListToolsResult,
	GetPromptResult,
	InitializeRequest,
	GetPromptRequest,
	ListPromptsRequest,
	SetLevelRequest,
	ListResourcesRequest,
	ReadResourceRequest,
	CallToolRequest,
	CompleteRequest,
	PingRequest,
	ListToolsRequest,
	SubscribeRequest,
	UnsubscribeRequest,
	RequestId,
	PaginatedResult,
	Tool as SpecTool,
	ListResourceTemplatesRequest,
	ListResourceTemplatesResult,
	InitializedNotification,
	ServerCapabilities
} from './types/spec';
import { defineWidgets, Widget } from './widget.js';
import type { RequestEvent } from '@sveltejs/kit';

export interface ListToolsOutputResult extends PaginatedResult {
	tools: (SpecTool & {
		outputSchema: SpecTool['inputSchema'];
	})[];
}

type MCPHandlerInterface = {
	initialize: (payload: InitializeRequest['params']) => MaybePromise<InitializeResult | MCPError>;
	notifications: {
		initialized: (
			payload: InitializedNotification['params']
		) => MaybePromise<EmptyResult | MCPError>;
	};
	prompts: {
		get: (payload: GetPromptRequest['params']) => MaybePromise<GetPromptResult | MCPError>;
		list: (payload: ListPromptsRequest['params']) => MaybePromise<ListPromptsResult | MCPError>;
	};
	completion?: {
		complete?: (payload: CompleteRequest['params']) => MaybePromise<CompleteResult | MCPError>;
	};
	logging?: {
		setLevel?: (payload: SetLevelRequest['params']) => MaybePromise<EmptyResult | MCPError>;
	};
	resources: {
		list: (payload: ListResourcesRequest['params']) => MaybePromise<ListResourcesResult | MCPError>;
		read: (payload: ReadResourceRequest['params']) => MaybePromise<ReadResourceResult | MCPError>;
		subscribe?: (payload: SubscribeRequest['params']) => MaybePromise<EmptyResult | MCPError>;
		unsubscribe?: (payload: UnsubscribeRequest['params']) => MaybePromise<EmptyResult | MCPError>;
		templates: {
			list: (
				payload: ListResourceTemplatesRequest['params']
			) => MaybePromise<ListResourceTemplatesResult | MCPError>;
		};
	};
	tools: {
		call: (payload: CallToolRequest['params']) => MaybePromise<CallToolResult | MCPError>;
		list: (payload: ListToolsRequest['params']) => MaybePromise<ListToolsResult | MCPError>;
	};
	ping?: (payload: PingRequest) => MaybePromise<EmptyResult | MCPError>;
};

export type RPCRequest = ClientRequest & { id: RequestId };

export class MCPHandler {
	private server: MCPServer;
	private domain: string;
	private hasTools: boolean;
	private hasResources: boolean;
	private hasPrompts: boolean;
	private hasWidgets: boolean;
	constructor(
		server: MCPServer,
		private event: RequestEvent,
		domain: string,
		private sessionId: string
	) {
		const { tools, resources, prompts, widgets } = server;
		this.server = server;
		this.domain = domain;
		this.hasTools = !!tools && Object.keys(tools).length > 0;
		this.hasResources = !!resources && Object.keys(resources).length > 0;
		this.hasPrompts = !!prompts && Object.keys(prompts).length > 0;
		this.hasWidgets = !!widgets && Object.keys(widgets).length > 0;
	}

	public get mpcHandler(): MCPHandlerInterface {
		return {
			initialize: async () => {
				const result: InitializeResult = {
					serverInfo: {
						name: this.server.name,
						version: this.server.version
					},
					protocolVersion: '2025-06-18',
					capabilities: {}
				};

				if (this.hasTools) {
					Object.assign(result.capabilities, {
						tools: {
							listChanged: true
						}
					} satisfies ServerCapabilities);
				}

				if (this.hasResources || this.hasWidgets) {
					Object.assign(result.capabilities, {
						resources: {
							listChanged: true
						} satisfies ServerCapabilities['resources']
					});
				}

				if (this.hasPrompts) {
					Object.assign(result.capabilities, {
						prompts: {
							listChanged: true
						} satisfies ServerCapabilities['prompts']
					});
				}
				return result;
			},
			notifications: {
				initialized: async () => {
					return {};
				}
			},
			prompts: {
				get: async (payload) => {
					if (!this.hasPrompts) {
						return mcpError('METHOD_NOT_FOUND');
					}

					const prompt = this.server.prompts?.[payload.name];

					if (!prompt) {
						return mcpError('METHOD_NOT_FOUND');
					}

					let validatedPayload: any;
					try {
						validatedPayload = await prompt['~validate'](payload.arguments);
					} catch (err) {
						return err instanceof MCPError ? err : mcpError('INTERNAL_ERROR');
					}
					const result = await prompt['~call'](validatedPayload, this.sessionId);
					if (result instanceof MCPError) {
						return result;
					}
					return {
						description: result.description,
						messages: [
							{
								content: {
									type: 'text',
									text: result.text
								},
								role: result.role || 'assistant'
							}
						]
					};
				},
				list: async (payload) => {
					if (!this.hasPrompts) {
						return mcpError('METHOD_NOT_FOUND');
					}
					return {
						prompts: definePrompts(this.server.prompts || {})
					};
				}
			},
			resources: {
				list: async (payload) => {
					if (!this.hasResources && !this.hasWidgets) {
						return mcpError('METHOD_NOT_FOUND');
					}
					const resources = this.hasResources ? defineResources(this.server.resources || {}) : [];
					const widgets = this.hasWidgets
						? defineWidgets(this.server.widgets || {}, this.domain)
						: [];
					return {
						resources: [...resources, ...widgets]
					};
				},
				templates: {
					list: async (payload) => {
						if (!this.hasResources) {
							return mcpError('METHOD_NOT_FOUND');
						}

						return {
							resourceTemplates: defineResourceTemplates(this.server.resources || {})
						};
					}
				},
				read: async (payload) => {
					if (!this.hasResources && !this.hasWidgets) {
						return mcpError('METHOD_NOT_FOUND');
					}

					if (payload.uri.startsWith('widget://')) {
						const widget = Object.values(this.server.widgets || {}).find((widget) => {
							console.log(widget.id, payload.uri.split('//')[1]);
							return widget.id.includes(payload.uri.split('//')[1].split('.')[0]);
						});

						if (!widget) {
							return mcpError('RESOURCE_NOT_FOUND');
						}
						return widget.result(this.domain);
					}

					const resource = Object.values(this.server.resources || {}).find(
						(resource) => resource['~config'].uri === payload.uri
					);
					const templatedResource = resource
						? null
						: Object.values(this.server.resources || {}).find((resource) => {
								const templateRegex = /\{[^{}]*\}/g;
								return templateRegex.test(resource['~config'].uri || '');
							}) || null;

					if (!(resource || templatedResource)) {
						return mcpError('RESOURCE_NOT_FOUND');
					}

					const result = await (resource || templatedResource)!['~call'](
						payload.uri,
						this.sessionId
					);

					return result;
				}
				// subscribe: async (payload) => {
				//   return Server.resources.subscribe(payload, ctx);
				// },
				// unsubscribe: async (payload) => {
				//   return Server.resources.unsubscribe(payload, ctx);
				// }
			},
			tools: {
				call: async (payload) => {
					if (!this.hasTools) {
						return mcpError('METHOD_NOT_FOUND');
					}

					const tool = this.server.tools?.[payload.name];

					if (!tool) {
						return mcpError('METHOD_NOT_FOUND');
					}

					let validatedPayload: any;
					try {
						validatedPayload = await tool['~validate'](payload.arguments);
					} catch (err) {
						return err instanceof MCPError ? err : mcpError('INVALID_PARAMS');
					}

					const result = await tool['~call'](validatedPayload, this.event, this.sessionId);
					const toolWidget = tool['~config'].widget;
					if (toolWidget) {
						return {
							...result,
							_meta: {
								...result._meta,
								...toolWidget.toolMetadata
							}
						};
					}

					return result;
				},
				list: async (payload) => {
					if (!this.hasTools) {
						return mcpError('METHOD_NOT_FOUND');
					}
					return {
						tools: defineTools(this.server.tools || {})
					};
				}
			},
			ping: async (payload) => {
				return {};
			}
		};
	}
}
