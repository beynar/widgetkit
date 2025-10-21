export const load = async () => {
	const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
		const result = await fetch(`${baseUrl}${path}`);
		return await result.text();
	};

	const html = await getAppsSdkCompatibleHtml('http://localhost:5180/embed', '/');
	return {
		html: `<html>${html}</html>`
	};
};
