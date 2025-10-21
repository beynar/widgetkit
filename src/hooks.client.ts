// Patch URL constructor for srcdoc iframes
const OriginalURL = window.URL;

if (location.protocol === 'about:') {
	// Override URL constructor to handle srcdoc case
	// When SvelteKit tries to do new URL(".", location), provide a fallback
	(window as any).URL = class URL extends OriginalURL {
		constructor(url: string, base?: string | URL) {
			// If base is location and we're in srcdoc, provide a valid base
			if (base === location || String(base).includes('about:srcdoc')) {
				try {
					super(url, 'https://localhost/');
				} catch {
					super(url, base);
				}
			} else {
				super(url, base);
			}
		}
	};
}


