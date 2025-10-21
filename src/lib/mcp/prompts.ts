import { type MaybePromise, type OmitNever } from './types';
import { type StandardSchemaV1, validateInput } from './types/standardSchema';
import { mcpError } from './errors';
import type { Prompt as MCPPrompt } from './types/spec';
import { toJsonSchema } from './utils/toJsonSchema';

export type PromptPayload<Schema extends StandardSchemaV1 | undefined> = OmitNever<{
	input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<Schema> : never;
	sessionId: string;
	error: typeof error;
}>;

export type HandlePromptPayload<Schema extends StandardSchemaV1 | undefined> = (
	payload: PromptPayload<Schema>
) => MaybePromise<{
	description?: string;
	role?: 'assistant' | 'user';
	text: string;
}>;

type PromptConfig<
	Schema extends StandardSchemaV1 | undefined,
	H extends HandlePromptPayload<Schema>
> = {
	schema?: Schema;
	description: string;
	handler?: H;
};

export class Prompt<
	Schema extends StandardSchemaV1 | undefined,
	H extends HandlePromptPayload<Schema>
> {
	'~config': PromptConfig<Schema, H>;
	constructor(description: string) {
		this['~config'] = { description };
	}

	'~call' = (
		input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferInput<Schema> : undefined,
		sessionId: string
	) => {
		return this['~config'].handler?.({ input, sessionId, error } as PromptPayload<Schema>);
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
		return this as unknown as Prompt<SS, HandlePromptPayload<SS>>;
	};

	handle = <HH extends HandlePromptPayload<Schema>>(handler: HH) => {
		this['~config'].handler = handler as unknown as H;
		return this as unknown as Prompt<Schema, HH>;
	};
}

export const prompt = (description: string) => new Prompt(description);

export const definePrompts = (prompts: Record<string, Prompt<any, any>>) => {
	return Object.entries(prompts).map(([key, prompt]) => {
		return definePrompt(key, prompt);
	});
};

export const definePrompt = (name: string, prompt: Prompt<any, any>) => {
	const { schema, description } = prompt['~config'];
	const jsonSchema = schema
		? toJsonSchema(schema)
		: { type: 'object', properties: {}, required: [] };

	const { properties, required } = jsonSchema;
	return {
		name,
		description,
		arguments: Object.entries(properties ?? {}).map(([key, value]) => {
			const isRequired = required?.some((r) => r === key);
			return {
				name: key,
				description: (value as any).description ?? '',
				required: isRequired ?? false
			};
		})
	} satisfies MCPPrompt;
};

const error = (code: 'INVALID_PARAMS' | 'INTERNAL_ERROR', message: string) => {
	return mcpError(code, message);
};
