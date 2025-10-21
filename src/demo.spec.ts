import { describe, it, expect } from 'vitest';
import { tool } from '$lib/mcp/tools';
import { prompt } from '$lib/mcp/prompts';
import { resource } from '$lib/mcp/resources';
import * as v from 'arktype';

describe('Tool, Prompt, Resource Config Refactoring', () => {
	describe('Tool type inference', () => {
		it('preserves input schema type inference', () => {
			const schema = v.type({ name: v.string, age: v.number });

			const myTool = tool('A test tool')
				.input(schema)
				.handle(({ input }) => {
					// Type inference should work here
					expect(input).toBeDefined();
					if (input) {
						expect(typeof input.name).toBe('string');
						expect(typeof input.age).toBe('number');
					}
					return 'success';
				});

			expect(myTool['~config'].description).toBe('A test tool');
			expect(myTool['~config'].schema).toBeDefined();
			expect(myTool['~config'].handler).toBeDefined();
		});

		it('stores tool config in ~config property', () => {
			const myTool = tool('Test description')
				.title('Test Title')
				.meta({ version: '1.0' })
				.handle(() => 'result');

			expect(myTool['~config'].description).toBe('Test description');
			expect(myTool['~config'].title).toBe('Test Title');
			expect(myTool['~config'].meta).toEqual({ version: '1.0' });
			expect(typeof myTool['~config'].handler).toBe('function');
		});
	});

	describe('Prompt type inference', () => {
		it('preserves input schema type inference for prompts', () => {
			const schema = v.type({ topic: v.string });

			const myPrompt = prompt('Generate content')
				.input(schema)
				.handle(({ input }) => ({
					text: `Content about ${input?.topic || 'general'}`,
					role: 'assistant'
				}));

			expect(myPrompt['~config'].description).toBe('Generate content');
			expect(myPrompt['~config'].schema).toBeDefined();
			expect(myPrompt['~config'].handler).toBeDefined();
		});
	});

	describe('Resource config storage', () => {
		it('stores resource config in ~config property', () => {
			const myResource = resource('A test resource')
				.uri('file:///test')
				.type('text/plain')
				.meta({ cached: true })
				.handle(async () => 'content');

			expect(myResource['~config'].description).toBe('A test resource');
			expect(myResource['~config'].uri).toBe('file:///test');
			expect(myResource['~config'].type).toBe('text/plain');
			expect(myResource['~config'].meta).toEqual({ cached: true });
			expect(typeof myResource['~config'].handler).toBe('function');
		});
	});

	describe('Chaining and fluent API', () => {
		it('maintains fluent API for tools', () => {
			const myTool = tool('Chainable tool')
				.title('My Tool')
				.meta({ version: '2.0' })
				.handle(() => 'done');

			expect(myTool['~config'].title).toBe('My Tool');
			expect(myTool['~config'].meta?.version).toBe('2.0');
		});

		it('maintains fluent API for resources', () => {
			const myResource = resource('Chainable resource')
				.uri('custom:///resource')
				.type('application/json')
				.handle(() => '{}');

			expect(myResource['~config'].uri).toBe('custom:///resource');
			expect(myResource['~config'].type).toBe('application/json');
		});
	});
});
