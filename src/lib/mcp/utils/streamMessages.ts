// This method will be used to send a sse response to the client
// It will take in a list of messages and send them to the client as a stream
// I do not know if this is MCP compliant, but we will see

// The use case is when we want to notify the client of a change in the resources list when a tool is called and should render a dynamic component
export const streamMessages = (messages: any[]) => {
	const stream = new ReadableStream({
		start(controller) {
			for (const message of messages) {
				const data = `data: ${JSON.stringify(message)}\n\n`;
				controller.enqueue(new TextEncoder().encode(data));
			}
			controller.close();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
