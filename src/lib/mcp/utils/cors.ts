export const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Allow-Credentials': 'true'
};
export const handleCors = () => {
	return new Response('OK', { headers: corsHeaders, status: 200 });
};
