import { type MaybePromise } from './types';
import { type MimeType, validateMimeType } from './mime';
import { MCPError, mcpError } from './errors';
import type { ReadResourceResult, ResourceTemplate, Resource as SpecResource } from './types/spec';

export type ResourcePayload = {
	uri: string;
	sessionId: string;

	error: typeof error;
};

export type HandleResourceFunction = (
	payload: ResourcePayload
) => MaybePromise<string | Blob | ArrayBuffer | File | ReadResourceResult>;

export const toDataUrl = async (
	data: string | ArrayBuffer | Uint8Array | Blob | File,
	mimeType: MimeType
) => {
	if (typeof data === 'string') {
		return data;
	}
	const buffer =
		data instanceof ArrayBuffer
			? data
			: data instanceof Uint8Array
				? data.buffer
				: data instanceof Blob
					? await data.arrayBuffer()
					: new ArrayBuffer(0);
	const bytes = new Uint8Array(buffer);
	const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
	return `data:${mimeType};base64,${btoa(binary)}`;
};

type ResourceConfig<H extends HandleResourceFunction> = {
	name: string;
	type?: MimeType;
	uri?: string;
	description?: string;
	handler?: H;
	meta?: { [key: string]: unknown };
};

export class Resource<H extends HandleResourceFunction> {
	'~config': ResourceConfig<H>;
	constructor(name: string) {
		this['~config'] = { name };
	}

	'~call' = async (uri: string, sessionId: string): Promise<ReadResourceResult | MCPError> => {
		const result = await this['~config'].handler?.({ uri, sessionId, error } as ResourcePayload);

		if (typeof result === 'string') {
			return {
				contents: [
					{
						text: result,
						mimeType: this['~config'].type,
						uri
					}
				]
			} satisfies ReadResourceResult;
		}

		const isBlob = typeof Blob !== 'undefined' && result instanceof Blob;
		const isArrayBuffer = typeof ArrayBuffer !== 'undefined' && result instanceof ArrayBuffer;
		const isFile = typeof File !== 'undefined' && result instanceof File;
		const isUint8Array = typeof Uint8Array !== 'undefined' && result instanceof Uint8Array;
		if (isFile || isBlob || isArrayBuffer || isUint8Array) {
			if (!this['~config'].type) {
				return error('INTERNAL_ERROR', 'Resource mimeType not set', { uri });
			}
			const dataUrl = await toDataUrl(result, this['~config'].type);
			return {
				contents: [
					{
						text: dataUrl,
						mimeType: this['~config'].type,
						uri
					}
				]
			} satisfies ReadResourceResult;
		}

		return error('RESOURCE_NOT_FOUND');
	};

	type = (type: MimeType) => {
		const mime = validateMimeType(type);

		if (!mime) {
			throw new Error(`Invalid mime type: ${type}`);
		}
		this['~config'].type = type;
		return this;
	};

	uri = (uri: string) => {
		this['~config'].uri = uri;
		return this;
	};

	handle = <HH extends HandleResourceFunction>(handler: HH) => {
		this['~config'].handler = handler as unknown as H;
		return this as unknown as Resource<HH>;
	};
	description = (description: string) => {
		this['~config'].description = description;
		return this;
	};

	meta = (meta: { [key: string]: unknown }) => {
		this['~config'].meta = meta;
		return this;
	};
}

export const resource = (name: string) => new Resource(name);

const isTemplate = (uri: string) => {
	const templateRegex = /\{[^{}]*\}/g;
	return templateRegex.test(uri);
};

export const defineResources = (resources: Record<string, Resource<any>>) => {
	return Object.entries(resources).reduce((acc, [key, resource]) => {
		if (!isTemplate(resource['~config'].uri || '')) {
			acc.push(defineResource(key, resource));
		}
		return acc;
	}, [] as SpecResource[]);
};

export const defineResourceTemplates = (resources: Record<string, Resource<any>>) => {
	return Object.entries(resources).reduce((acc, [key, resource]) => {
		if (isTemplate(resource['~config'].uri || '')) {
			acc.push(defineResourceTemplate(key, resource));
		}
		return acc;
	}, [] as ResourceTemplate[]);
};

export const defineResource = (name: string, resource: Resource<any>) => {
	const { uri, description, type, meta } = resource['~config'];
	const definition = {
		name,
		uri: uri || name,
		description,
		mimeType: type,
		_meta: meta
	} as SpecResource;
	return definition;
};

export const defineResourceTemplate = (name: string, resource: Resource<any>) => {
	const { uri, description, type, meta } = resource['~config'];
	const definition = {
		name,
		uriTemplate: uri || name,
		description,
		mimeType: type,
		_meta: meta
	} as ResourceTemplate;
	return definition;
};

const error = (
	code: 'RESOURCE_NOT_FOUND' | 'INTERNAL_ERROR',
	message?: string,
	data?: {
		uri: string;
	}
) => {
	return mcpError(code, message, data);
};
