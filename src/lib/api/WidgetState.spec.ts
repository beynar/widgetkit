import { describe, it, expect, beforeEach, vi } from 'vitest';
import { widgetStateProxy } from './widgetState.svelte.js';

describe('widgetStateProxy', () => {
	let onSave: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		onSave = vi.fn();
	});

	describe('Basic operations', () => {
		it('should initialize with initial state', () => {
			const initialState = { name: 'John', age: 30 };
			const stateManager = widgetStateProxy(initialState, onSave);
			const state = stateManager.value;

			expect(state.name).toBe('John');
			expect(state.age).toBe(30);
		});

		it('should set top-level properties', () => {
			const stateManager = widgetStateProxy({ count: 0 }, onSave);
			stateManager.value.count = 5;

			expect(stateManager.value.count).toBe(5);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should not trigger save if value did not change', () => {
			const stateManager = widgetStateProxy({ count: 5 }, onSave);
			stateManager.value.count = 5;

			expect(onSave).not.toHaveBeenCalled();
		});

		it('should trigger save only once for value change', () => {
			const stateManager = widgetStateProxy({ count: 0 }, onSave);
			stateManager.value.count = 10;

			expect(onSave).toHaveBeenCalledOnce();
		});
	});

	describe('Nested objects', () => {
		it('should access nested object properties', () => {
			const initialState = { user: { name: 'Alice', age: 25 } };
			const stateManager = widgetStateProxy(initialState, onSave);
			const state = stateManager.value;

			expect(state.user.name).toBe('Alice');
			expect(state.user.age).toBe(25);
		});

		it('should set nested object properties', () => {
			const stateManager = widgetStateProxy({ user: { name: 'Bob' } }, onSave);
			stateManager.value.user.name = 'Charlie';

			expect(stateManager.value.user.name).toBe('Charlie');
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should handle deep nesting', () => {
			const initialState = { a: { b: { c: { d: 'value' } } } };
			const stateManager = widgetStateProxy(initialState, onSave);
			stateManager.value.a.b.c.d = 'new value';

			expect(stateManager.value.a.b.c.d).toBe('new value');
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should replace entire nested object', () => {
			const stateManager = widgetStateProxy({ user: { name: 'John' } }, onSave);
			stateManager.value.user = { name: 'Jane', email: 'jane@example.com' };

			expect(stateManager.value.user.name).toBe('Jane');
			expect(stateManager.value.user.email).toBe('jane@example.com');
			expect(onSave).toHaveBeenCalledOnce();
		});
	});

	describe('Arrays', () => {
		it('should access array elements', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3] }, onSave);
			const state = stateManager.value;

			expect(state.items[0]).toBe(1);
			expect(state.items.length).toBe(3);
		});

		it('should set array elements', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3] }, onSave);
			stateManager.value.items[0] = 10;

			expect(stateManager.value.items[0]).toBe(10);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should support array spread operator', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3] }, onSave);
			const copy = [...stateManager.value.items];

			expect(copy).toEqual([1, 2, 3]);
		});

		it('should support object spread operator', () => {
			const stateManager = widgetStateProxy({ name: 'John', age: 30 }, onSave);
			const copy = { ...stateManager.value };

			expect(copy).toEqual({ name: 'John', age: 30 });
		});
	});

	describe('Mutative array methods', () => {
		it('should trigger save on push', () => {
			const stateManager = widgetStateProxy({ items: [1, 2] }, onSave);
			stateManager.value.items.push(3);

			expect(stateManager.value.items).toEqual([1, 2, 3]);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should trigger save on pop', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3] }, onSave);
			stateManager.value.items.pop();

			expect(stateManager.value.items).toEqual([1, 2]);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should trigger save on shift', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3] }, onSave);
			stateManager.value.items.shift();

			expect(stateManager.value.items).toEqual([2, 3]);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should trigger save on unshift', () => {
			const stateManager = widgetStateProxy({ items: [2, 3] }, onSave);
			stateManager.value.items.unshift(1);

			expect(stateManager.value.items).toEqual([1, 2, 3]);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should trigger save on splice', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3, 4] }, onSave);
			stateManager.value.items.splice(1, 2, 5, 6);

			expect(stateManager.value.items).toEqual([1, 5, 6, 4]);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should trigger save on sort', () => {
			const stateManager = widgetStateProxy({ items: [3, 1, 2] }, onSave);
			stateManager.value.items.sort();

			expect(stateManager.value.items).toEqual([1, 2, 3]);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should trigger save on reverse', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3] }, onSave);
			stateManager.value.items.reverse();

			expect(stateManager.value.items).toEqual([3, 2, 1]);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should trigger save on fill', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3] }, onSave);
			stateManager.value.items.fill(0);

			expect(stateManager.value.items).toEqual([0, 0, 0]);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should trigger save on copyWithin', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3, 4] }, onSave);
			stateManager.value.items.copyWithin(0, 2);

			expect(stateManager.value.items).toEqual([3, 4, 3, 4]);
			expect(onSave).toHaveBeenCalledOnce();
		});
	});

	describe('Non-mutative array methods', () => {
		it('should not trigger save on map', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3] }, onSave);
			const result = stateManager.value.items.map((x: number) => x * 2);

			expect(result).toEqual([2, 4, 6]);
			expect(onSave).not.toHaveBeenCalled();
		});

		it('should not trigger save on filter', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3, 4] }, onSave);
			const result = stateManager.value.items.filter((x: number) => x > 2);

			expect(result).toEqual([3, 4]);
			expect(onSave).not.toHaveBeenCalled();
		});

		it('should not trigger save on find', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3] }, onSave);
			const result = stateManager.value.items.find((x: number) => x === 2);

			expect(result).toBe(2);
			expect(onSave).not.toHaveBeenCalled();
		});

		it('should not trigger save on slice', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3] }, onSave);
			const result = stateManager.value.items.slice(0, 2);

			expect(result).toEqual([1, 2]);
			expect(onSave).not.toHaveBeenCalled();
		});

		it('should not trigger save on includes', () => {
			const stateManager = widgetStateProxy({ items: [1, 2, 3] }, onSave);
			const result = stateManager.value.items.includes(2);

			expect(result).toBe(true);
			expect(onSave).not.toHaveBeenCalled();
		});
	});

	describe('Delete operations', () => {
		it('should delete properties and trigger save', () => {
			const stateManager = widgetStateProxy({ name: 'John', age: 30 }, onSave);
			delete stateManager.value.age;

			expect(stateManager.value.age).toBeUndefined();
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should handle deleting non-existent properties', () => {
			const stateManager = widgetStateProxy({ name: 'John' }, onSave);
			delete stateManager.value.nonexistent;

			expect(onSave).not.toHaveBeenCalled();
		});

		it('should delete from nested objects', () => {
			const stateManager = widgetStateProxy({ user: { name: 'John', age: 30 } }, onSave);
			delete stateManager.value.user.age;

			expect(stateManager.value.user.age).toBeUndefined();
			expect(onSave).toHaveBeenCalledOnce();
		});
	});

	describe('Property checking', () => {
		it('should check property existence with "in" operator', () => {
			const stateManager = widgetStateProxy({ name: 'John', age: 30 }, onSave);
			const proxy = stateManager.value;

			expect('name' in proxy).toBe(true);
			expect('nonexistent' in proxy).toBe(false);
		});

		it('should get own property names', () => {
			const stateManager = widgetStateProxy({ name: 'John', age: 30 }, onSave);
			const keys = Object.keys(stateManager.value);

			expect(keys).toContain('name');
			expect(keys).toContain('age');
		});

		it('should get own property descriptor', () => {
			const stateManager = widgetStateProxy({ name: 'John' }, onSave);
			const descriptor = Object.getOwnPropertyDescriptor(stateManager.value, 'name');

			expect(descriptor?.value).toBe('John');
		});
	});

	describe('Setter API', () => {
		it('should use value setter to replace entire state', () => {
			const stateManager = widgetStateProxy({ count: 0 }, onSave);
			stateManager.value = { count: 10 } as any;

			expect(stateManager.value.count).toBe(10);
			expect(onSave).toHaveBeenCalledWith({ count: 10 });
		});

		it('should recreate proxy after setting new state', () => {
			const stateManager = widgetStateProxy({ count: 0 }, onSave);
			const firstProxy = stateManager.value;

			stateManager.value = { count: 10 } as any;
			const secondProxy = stateManager.value;

			// Proxies should be different instances
			expect(firstProxy).not.toBe(secondProxy);
			// But should have same value
			expect(secondProxy.count).toBe(10);
		});
	});

	describe('Complex scenarios', () => {
		it('should handle array of objects', () => {
			const initialState = {
				users: [
					{ id: 1, name: 'John' },
					{ id: 2, name: 'Jane' }
				]
			};
			const stateManager = widgetStateProxy(initialState, onSave);
			stateManager.value.users[0].name = 'Jonathan';

			expect(stateManager.value.users[0].name).toBe('Jonathan');
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should handle adding to array of objects', () => {
			const stateManager = widgetStateProxy({ users: [{ id: 1, name: 'John' }] }, onSave);
			stateManager.value.users.push({ id: 2, name: 'Jane' });

			expect(stateManager.value.users).toHaveLength(2);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should track multiple mutations', () => {
			const stateManager = widgetStateProxy({ count: 0, items: [] }, onSave);

			stateManager.value.count = 1;
			expect(onSave).toHaveBeenCalledTimes(1);

			stateManager.value.items.push('item1');
			expect(onSave).toHaveBeenCalledTimes(2);

			stateManager.value.count = 2;
			expect(onSave).toHaveBeenCalledTimes(3);
		});

		it('should handle nested array mutations', () => {
			const initialState = {
				matrix: [
					[1, 2],
					[3, 4]
				]
			};
			const stateManager = widgetStateProxy(initialState, onSave);
			stateManager.value.matrix[0].push(5);

			expect(stateManager.value.matrix[0]).toEqual([1, 2, 5]);
			expect(onSave).toHaveBeenCalledOnce();
		});

		it('should handle mixed mutations', () => {
			const initialState = {
				config: {
					name: 'MyApp',
					settings: { theme: 'light', notifications: true }
				},
				data: [{ id: 1, value: 100 }]
			};
			const stateManager = widgetStateProxy(initialState, onSave);

			// Modify nested property
			stateManager.value.config.settings.theme = 'dark';
			expect(onSave).toHaveBeenCalledTimes(1);

			// Add to array
			stateManager.value.data.push({ id: 2, value: 200 });
			expect(onSave).toHaveBeenCalledTimes(2);

			// Modify array element
			stateManager.value.data[0].value = 150;
			expect(onSave).toHaveBeenCalledTimes(3);

			// Change top-level property
			stateManager.value.config.name = 'NewApp';
			expect(onSave).toHaveBeenCalledTimes(4);
		});
	});
});
