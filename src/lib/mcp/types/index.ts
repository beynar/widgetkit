import { Prompt } from '../prompts';
import { Resource } from '../resources';
import { Tool } from '../tools';
import type { Widget } from '../widget';
export { type StandardSchemaV1 } from './standardSchema';

export type OmitNever<T> = Pick<
	T,
	{
		[K in keyof T]: T[K] extends never ? never : K;
	}[keyof T]
>;
export type MaybePromise<T> = Promise<T> | T;

export type MCPServer = {
	domain?: string;
	widgets?: Record<string, Widget>;
	tools?: Record<string, Tool<any, any>>;
	prompts?: Record<string, Prompt<any, any>>;
	resources?: Record<string, Resource<any>>;
	name: string;
	version: string;
};
