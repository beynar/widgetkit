import { type StandardSchemaV1 } from '../types/standardSchema';
import { toJsonSchema as valibotToJsonSchema } from '@valibot/to-json-schema';
import { type Type as ArktypeSchema } from 'arktype';
import { type AnySchema as ValibotSchema } from 'valibot';
import { type ZodType } from 'zod/v4';
import { toJSONSchema as zodToJsonSchema } from 'zod/v4/core';
import { type JSONSchema7 } from 'json-schema';
import { type Schema as EffectSchema, JSONSchema } from 'effect';

const isArktypeSchema = (schema: StandardSchemaV1): schema is ArktypeSchema => {
	return schema['~standard'].vendor === 'arktype';
};

const isValibotSchema = (schema: StandardSchemaV1): schema is ValibotSchema => {
	return schema['~standard'].vendor === 'valibot';
};

const isZodSchema = (schema: StandardSchemaV1): schema is ZodType => {
	return schema['~standard'].vendor === 'zod';
};

const isEffectSchema = (
	schema: StandardSchemaV1
	// @ts-ignore
): schema is EffectSchema.Schema<unknown, unknown, never> => {
	return schema['~standard'].vendor === 'effect';
};

export const toJsonSchema = (schema: StandardSchemaV1): JSONSchema7.Object => {
	let jsonSchema: JSONSchema7.Object;
	if (isArktypeSchema(schema)) {
		jsonSchema = schema.toJsonSchema() as JSONSchema7.Object;
	}
	if (isValibotSchema(schema)) {
		jsonSchema = valibotToJsonSchema(schema) as JSONSchema7.Object;
	}
	if (isZodSchema(schema)) {
		jsonSchema = zodToJsonSchema(schema) as JSONSchema7.Object;
	}
	if (isEffectSchema(schema)) {
		jsonSchema = JSONSchema.make(schema) as JSONSchema7.Object;
	}

	if (!jsonSchema) {
		throw new Error('Unsupported schema validation library');
	}
	if (jsonSchema.type !== 'object') {
		throw new Error('Schema is not an object');
	}

	return jsonSchema;
};
