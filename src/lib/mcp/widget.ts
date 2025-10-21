import { defineResource, resource } from './resources';
import { type ReadResourceResult } from './types/spec';

type WidgetOptions = {
	name: string;
	invoking: string;
	invoked: string;
	description: string;
	prefersBorder: boolean;
};
export class Widget {
	options: WidgetOptions;
	constructor(
		public id: string,
		options: WidgetOptions
	) {
		this.options = options;
	}

	resource = (domain: string) => {
		return resource(this.options.name)
			.description(this.options.description)
			.uri(`widget://${this.id}.js`)
			.type('text/html+skybridge')
			.meta({
				'openai/widgetDescription': this.options.description,
				'openai/widgetPrefersBorder': this.options.prefersBorder
			})
			.handle(() => {
				return this.result(domain);
			});
	};

	get toolMetadata() {
		return {
			'openai/outputTemplate': `widget://${this.id}.js`,
			'openai/toolInvocation/invoking': this.options.invoking,
			'openai/toolInvocation/invoked': this.options.invoked,
			'openai/widgetAccessible': false,
			'openai/resultCanProduceWidget': true
		};
	}

	result = (domain: string) => {
		return {
			contents: [
				{
					uri: `widget://${this.id}`,
					mimeType: 'text/html+skybridge',
					text: /*html*/ `			
			<html>
				<head>
					<script>
						const reloadWidget = () => {
							const previousScript = document.getElementById("widget-script");
							if (previousScript) {
								// Delete all page content and the script, then load the script again.
								document.body.innerHTML = '';
								previousScript.remove();
							}

							const script = document.createElement('script');
							script.id = "widget-script";
							const nonce = Math.random().toString(36).substring(2);
							script.src = '${domain}/widgets/${this.options.name}.js?v=' + nonce;
							script.nonce = nonce;
							document.head.appendChild(script);
						};
						reloadWidget();
						window.reloadWidget = reloadWidget;
					</script>
				</head>
				<body></body>
			</html>
			`,
					_meta: {
						'openai/widgetDescription': this.options.description || 'A widget',
						'openai/widgetPrefersBorder': this.options.prefersBorder || false,
						'openai/widgetDomain': domain
					}
				}
			]
		} satisfies ReadResourceResult;
	};
}
export const widget = (id: string, options: WidgetOptions) => {
	return new Widget(id, options);
};

export const defineWidgets = (widgets: Record<string, Widget>, domain: string) => {
	return Object.entries(widgets).map(([key, widget]) => {
		return defineResource(widget.id, widget.resource(domain));
	});
};
