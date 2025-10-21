const httpErrorMap = {
	BAD_REQUEST: { code: 400, message: 'Bad Request' },
	UNAUTHORIZED: { code: 401, message: 'Unauthorized' },
	FORBIDDEN: { code: 403, message: 'Forbidden' },
	NOT_FOUND: { code: 404, message: 'Not Found' },
	METHOD_NOT_SUPPORTED: { code: 405, message: 'Method Not Supported' },
	TIMEOUT: { code: 408, message: 'Timeout' },
	CONFLICT: { code: 409, message: 'Conflict' },
	PRECONDITION_FAILED: { code: 412, message: 'Precondition Failed' },
	PAYLOAD_TOO_LARGE: { code: 413, message: 'Payload Too Large' },
	UNSUPPORTED_MEDIA_TYPE: { code: 415, message: 'Unsupported Media Type' },
	UNPROCESSABLE_CONTENT: { code: 422, message: 'Unprocessable Content' },
	TOO_MANY_REQUESTS: { code: 429, message: 'Too Many Requests' },
	CLIENT_CLOSED_REQUEST: { code: 499, message: 'Client Closed Request' },
	INTERNAL_SERVER_ERROR: { code: 500, message: 'Internal Server Error' },
	NOT_IMPLEMENTED: { code: 501, message: 'Not Implemented' },
	BAD_GATEWAY: { code: 502, message: 'Bad Gateway' },
	SERVICE_UNAVAILABLE: { code: 503, message: 'Service Unavailable' },
	GATEWAY_TIMEOUT: { code: 504, message: 'Gateway Timeout' },
} as const;

export const error = (code: keyof typeof httpErrorMap) => {
	const error = httpErrorMap[code];
	return new Response(JSON.stringify({ error: error.message }, null, 2), {
		status: error.code,
		headers: { 'Content-Type': 'application/json' },
	});
};

export const ok = (body: any) => {
	return new Response(JSON.stringify(body, null, 2), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const safeStringify = (value: any) => {
	try {
		return JSON.stringify(value);
	} catch (error) {
		return `${value}`;
	}
};
