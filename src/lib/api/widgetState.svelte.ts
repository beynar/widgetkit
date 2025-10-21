import type { UnknownObject } from './types.js';

const MUTATIVE_ARRAY_METHODS = new Set([
	'push',
	'pop',
	'shift',
	'unshift',
	'splice',
	'reverse',
	'sort',
	'fill',
	'copyWithin'
]);

export class WidgetStateProxy<WidgetState extends UnknownObject> {
	value = $state<WidgetState>({} as WidgetState);
	proxy: WidgetState;

	createDeepProxy = (
		target: UnknownObject,
		root: UnknownObject,
		onSave: (state: UnknownObject) => void
	): UnknownObject => {
		return new Proxy(target, {
			get: (target, prop: string | symbol) => {
				const value = target[prop as keyof UnknownObject];

				// Handle array methods - only trigger save for mutative methods
				if (Array.isArray(target) && typeof value === 'function') {
					const methodName = String(prop);
					if (MUTATIVE_ARRAY_METHODS.has(methodName)) {
						return function (...args: unknown[]) {
							const result = (value as Function).apply(target, args);
							// Trigger save after mutative array method execution
							onSave(root);
							return result;
						};
					}
				}

				// If the value is an object or array, wrap it in a proxy too for deep interception
				if (value !== null && typeof value === 'object') {
					return this.createDeepProxy(value as UnknownObject, root, onSave);
				}
				return value;
			},
			set: (target, prop: string | symbol, newValue: unknown) => {
				// Only update if the value actually changed
				if (target[prop as keyof UnknownObject] !== newValue) {
					console.log('widget state changed', prop, newValue);
					target[prop as keyof UnknownObject] = newValue as unknown;
					// Trigger save function with the entire state and trigger reactivity
					onSave(root);
				}
				return true;
			},
			deleteProperty: (target, prop: string | symbol) => {
				// Only trigger save if property existed
				if (prop in target) {
					delete target[prop as keyof UnknownObject];
					// Trigger save after deletion
					onSave(root);
				}
				return true;
			},
			has: (target, prop: string | symbol) => {
				return prop in target;
			},
			ownKeys: (target) => {
				return Reflect.ownKeys(target);
			},
			getOwnPropertyDescriptor: (target, prop: string | symbol) => {
				return Reflect.getOwnPropertyDescriptor(target, prop);
			},
			getPrototypeOf: (target) => {
				return Reflect.getPrototypeOf(target);
			},
			setPrototypeOf: (target, proto) => {
				return Reflect.setPrototypeOf(target, proto);
			},
			isExtensible: (target) => {
				return Reflect.isExtensible(target);
			},
			preventExtensions: (target) => {
				return Reflect.preventExtensions(target);
			}
		});
	};

	constructor(initialState: WidgetState) {
		this.value = { ...(window.openai.widgetState || initialState) } as unknown as WidgetState;
		this.proxy = this.createDeepProxy(this.value, this.value, () => {
			console.log('widget state changed', this.value, window.openai.widgetState);
			window.openai.setWidgetState($state.snapshot(this.value)).then(() => {
				console.log('widget state saved');
			});
		}) as unknown as WidgetState;
	}
}
