import type { MaybePromise } from './types';
import type { StandardSchemaV1 } from './types/standardSchema';
import { validateInput } from './types/standardSchema';
import { toJsonSchema } from './utils/toJsonSchema';
import { safeStringify } from './utils/utils';
import type { Tool as SpecTool, ToolAnnotations, CallToolResult } from './types/spec';
import type { AudioMimeType, ImageMimeType, MimeType } from './mime';
import { toDataUrl } from './resources';
import type { RequestEvent } from '@sveltejs/kit';
import type { Widget } from './widget';

export type ToolPayload<Schema extends StandardSchemaV1 | undefined> = {
	input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<Schema> : never;
	event: RequestEvent;
	sessionId: string;
	error: typeof error;
	blob: typeof BlobResult.blob;
	resource: typeof ResourceResult.resource;
};

export type HandleToolFunction<Schema extends StandardSchemaV1 | undefined> = (
	payload: ToolPayload<Schema>
) => MaybePromise<any>;

type ToolConfig<
	Schema extends StandardSchemaV1 | undefined = StandardSchemaV1 | undefined,
	H extends HandleToolFunction<Schema> = any
> = {
	schema?: Schema;
	description: string;
	output?: StandardSchemaV1;
	handler?: H;
	meta?: { [key: string]: unknown };
	title?: string;
	annotations?: ToolAnnotations;
	widget?: Widget;
};

export class Tool<
	Schema extends StandardSchemaV1 | undefined = StandardSchemaV1 | undefined,
	H extends HandleToolFunction<Schema> = any
> {
	'~config': ToolConfig<Schema, H>;
	constructor(description: string) {
		this['~config'] = { description };
	}

	'~call' = async (
		input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferInput<Schema> : undefined,
		event: RequestEvent,
		sessionId?: string
	): Promise<CallToolResult> => {
		try {
			const result = await this['~config'].handler?.({
				input,
				sessionId,
				error,
				event,
				blob: BlobResult.blob,
				resource: ResourceResult.resource
			} as ToolPayload<Schema>);

			if (result instanceof ToolError) {
				return result.result;
			}

			if (result instanceof BlobResult) {
				return await result.result;
			}

			// if (result instanceof Widget) {
			// 	return result;
			// }

			if (typeof result === 'string') {
				return {
					content: [
						{
							type: 'text' as const,
							text: result
						}
					]
				};
			}
			// May be an object
			return {
				content: [
					{
						type: 'text' as const,
						text: safeStringify(result)
					}
				],
				...(this['~config'].output ? { structuredContent: result } : {})
			};
		} catch (err) {
			if (err instanceof ToolError) {
				return err.result;
			}
			return new ToolError(err instanceof Error ? err.message || 'Unknown error' : 'Unknown error')
				.result;
		}
	};

	'~validate' = async (
		input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferInput<Schema> : undefined
	) => {
		if (!this['~config'].schema) {
			return undefined;
		}
		return validateInput(this['~config'].schema, input);
	};

	input = <SS extends StandardSchemaV1>(standardStandardSchemaV1: SS) => {
		this['~config'].schema = standardStandardSchemaV1 as unknown as Schema;
		return this as unknown as Tool<SS, HandleToolFunction<SS>>;
	};

	output = (schema: StandardSchemaV1) => {
		this['~config'].output = schema;
		return this as unknown as Tool<Schema, H>;
	};

	handle = <HH extends HandleToolFunction<Schema>>(handler: HH) => {
		this['~config'].handler = handler as unknown as H;
		return this as unknown as Tool<Schema, HH>;
	};

	meta = (meta: { [key: string]: unknown }) => {
		this['~config'].meta = meta;
		return this as unknown as Tool<Schema, H>;
	};

	title = (title: string) => {
		this['~config'].title = title;
		return this as unknown as Tool<Schema, H>;
	};

	annotations = (annotations: ToolAnnotations) => {
		this['~config'].annotations = annotations;
		return this as unknown as Tool<Schema, H>;
	};

	widget = (widget: Widget) => {
		this['~config'].widget = widget;
		return this as unknown as Tool<Schema, H>;
	};
}

export const tool = (description: string) => new Tool(description);

export const defineTools = (tools: Record<string, Tool<any, any>>) => {
	return Object.entries(tools).map(([key, tool]) => {
		return defineTool(key, tool);
	});
};

export const defineTool = (name: string, tool: Tool<any, any>): SpecTool => {
	const { schema, description, output, meta = {}, title, annotations } = tool['~config'];
	console.log(tool['~config'].widget?.toolMetadata);
	return {
		name,
		description,
		_meta: {
			...meta,
			...(tool['~config'].widget?.toolMetadata || {})
		},
		title,
		annotations,
		outputSchema: output ? toJsonSchema(output) : undefined,
		inputSchema: schema ? toJsonSchema(schema) : { type: 'object' }
	};
};

export class ToolError {
	constructor(public message?: string) {}
	get result() {
		return {
			content: [
				{
					type: 'text' as const,
					text: this.message || 'An error occurred during tool execution'
				}
			],
			isError: true
		};
	}
}

const error = (message?: string) => {
	return new ToolError(message);
};

class BlobResult {
	result: Promise<CallToolResult>;
	constructor(
		data: string | ArrayBuffer | Uint8Array | Blob | File,
		mimeType: MimeType,
		_meta?: { [key: string]: unknown }
	) {
		this.result = new Promise(async (resolve) => {
			const base64Data = await toDataUrl(data, mimeType);
			return resolve({
				content: [
					{
						type: mimeType.startsWith('audio/') ? 'audio' : 'image',
						mimeType,
						data: base64Data
					}
				],
				...(_meta ? { _meta } : {})
			});
		});
	}

	static blob = (params: {
		data: string | ArrayBuffer | Uint8Array | Blob | File;
		mimeType: AudioMimeType | ImageMimeType;
		_meta?: { [key: string]: unknown };
	}) => {
		return new BlobResult(params.data, params.mimeType, params._meta);
	};
}

class ResourceResult {
	result: CallToolResult;
	constructor(uri: string, name: string, mimeType: MimeType, _meta?: { [key: string]: unknown }) {
		this.result = {
			content: [
				{
					type: 'resource_link',
					name,
					uri,
					mimeType
				}
			],
			...(_meta ? { _meta } : {})
		};
	}
	static resource = (params: {
		uri: string;
		name: string;
		mimeType: MimeType;
		_meta?: { [key: string]: unknown };
	}) => {
		return new ResourceResult(params.uri, params.name, params.mimeType, params._meta);
	};
}
