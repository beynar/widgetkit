import { errorResponse, MCPError } from './errors';
import { MCPHandler, type RPCRequest } from './handler';
import { type MCPServer } from './types';
import { streamMessages } from './utils/streamMessages';
import { handleGetDeleteMethodNotAllowed } from './utils/handleGetDelete';
import type { Handle } from '@sveltejs/kit';
import { handleCors } from './utils/cors';
export { tool, defineTools } from './tools';
export { prompt, definePrompts } from './prompts';
export { resource, defineResources } from './resources';
export * from './types/spec';

export const handleMCP = (server: MCPServer): Handle => {
	return async ({ event, resolve }) => {
		if (event.url.pathname.startsWith('/mcp')) {
			if (event.request.method === 'OPTIONS') {
				return handleCors();
			}

			if (event.request.method === 'GET' || event.request.method === 'DELETE') {
				return handleGetDeleteMethodNotAllowed();
			}

			const sessionId = event.request.headers.get('Mcp-Session-Id') || crypto.randomUUID();
			let body: RPCRequest;
			const headers = {
				'Content-Type': 'application/json',
				'Mcp-Session-Id': sessionId
			};

			try {
				body = (await event.request.json()) as RPCRequest;
			} catch {
				return errorResponse('PARSE_ERROR', sessionId);
			}

			const handler = new MCPHandler(server, event, server.domain || event.url.origin, sessionId);
			const { method, params, id } = body;
			let handlerMethod = handler.mpcHandler as any;

			for (const key of method.split('/')) {
				if (key in handlerMethod) {
					handlerMethod = handlerMethod[key];
				}
			}

			if (!handlerMethod) {
				return errorResponse('METHOD_NOT_FOUND', sessionId);
			}

			try {
				const result = await handlerMethod(params, event);

				if (result instanceof MCPError) {
					return errorResponse(result, sessionId);
				} else {
					// if (result.length) {
					// 	console.log('render stream');
					// 	const [data, ...notifications] = result;
					// 	return streamMessages(
					// 		[
					// 			{
					// 				jsonrpc: '2.0',
					// 				id,
					// 				result: data
					// 			},
					// 			...notifications
					// 		],
					// 		id
					// 	);
					// } else {
					return new Response(
						JSON.stringify({
							jsonrpc: '2.0',
							id,
							result
						}),
						{
							headers
						}
					);
					// }
				}
			} catch (error) {
				return errorResponse('INTERNAL_ERROR', sessionId);
			}
			return resolve(event);
		}

		return resolve(event);
	};
};
