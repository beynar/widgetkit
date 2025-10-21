export const handleGetDeleteMethodNotAllowed = async () => {
	return new Response(
		JSON.stringify({
			jsonrpc: '2.0',
			error: {
				code: -32000,
				message: 'Method not allowed.'
			},
			id: null
		}),
		{
			status: 405,
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
};
