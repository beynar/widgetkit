<script lang="ts">
	import { Theme } from 'svelai';
	import { useOpenAI } from './api';

	interface Props {
		pdfUrl?: string;
		fileName?: string;
		onDownload?: () => void;
		onCopyLink?: () => void;
	}

	const openai = useOpenAI({
		widgetState: {
			test: false,
			hello: false,
			caca: true
		}
	});
	let {
		pdfUrl = 'https://example.com/downloads/generated_document.pdf',
		fileName = 'generated_document.pdf',
		onDownload,
		onCopyLink
	}: Props = {
		pdfUrl: 'https://example.com/downloads/generated_document.pdf',
		fileName: 'generated_document.pdf',
		onDownload: () => {},
		onCopyLink: () => {}
	};

	let copied = $state(false);

	const handleOpenPDF = () => {
		openai.openExternal(pdfUrl);
	};

	const handleCopyLink = async () => {
		try {
			const textArea = document.createElement('textarea');
			textArea.value = pdfUrl;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			copied = true;
			onCopyLink?.();
			setTimeout(() => {
				copied = false;
			}, 1000);
			openai.widgetState.test = !openai.widgetState.test;
		} catch (error) {
			console.error('Failed to copy link:', error);
		}
	};
</script>

<Theme forcedTheme={openai.theme || 'light'}>
	<button
		class="absolute top-4 right-4 z-10 rounded-full bg-success p-1 px-2 text-success-fg hover:bg-success-muted"
		onclick={() => {
			openai.requestDisplayMode(openai.displayMode === 'fullscreen' ? 'inline' : 'fullscreen');
		}}
	>
		{openai.displayMode === 'fullscreen' ? 'Inline' : 'Fullscreen'} yo
	</button>
	{#if openai.displayMode === 'fullscreen'}
		<!-- https://gen-pdf.com/example.pdf -->
		coucou
	{:else}
		<div class="flex items-end justify-start p-4">
			<div class="w-full max-w-md gap-4 rounded-2xl bg-surface p-8 shadow-lg">
				<!-- Header with Icon -->
				<div class="flex items-start gap-4">
					<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500">
						<svg
							class="h-6 w-6 text-white"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
						>
							<g fill-rule="evenodd" clip-rule="evenodd" fill="currentColor">
								<path
									d="M8 10a1 1 0 0 1 1-1h6a1 1 0 0 1 0 2H9a1 1 0 0 1-1-1Zm0 4a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Z"
								></path>
								<path
									d="M14.724 4.055c-.203-.049-.43-.055-1.212-.055H9.3c-.857 0-1.439 0-1.889.038-.438.035-.663.1-.819.18a2 2 0 0 0-.874.874c-.08.156-.145.38-.18.82C5.5 6.361 5.5 6.942 5.5 7.8v8.4c0 .857 0 1.439.038 1.889.035.438.1.663.18.819a2 2 0 0 0 .874.874c.156.08.38.145.819.18C7.861 20 8.443 20 9.3 20h5.4c.857 0 1.439 0 1.889-.038.438-.035.663-.1.819-.18a2 2 0 0 0 .874-.874c.08-.156.145-.38.18-.819.037-.45.038-1.032.038-1.889V8.988c0-.781-.006-1.009-.055-1.212-.05-.204-.13-.4-.24-.578-.109-.179-.265-.344-.818-.897l-1.188-1.188c-.553-.552-.718-.709-.897-.818a2.002 2.002 0 0 0-.578-.24ZM13.614 2c.635 0 1.114 0 1.577.11a4 4 0 0 1 1.156.48c.406.248.745.588 1.194 1.037l.072.072 1.188 1.188.072.072c.45.449.789.788 1.038 1.194a4 4 0 0 1 .479 1.156c.11.463.11.942.11 1.577v7.355c0 .805 0 1.47-.044 2.01-.046.563-.145 1.08-.392 1.565a4 4 0 0 1-1.748 1.748c-.485.247-1.002.346-1.564.392-.541.044-1.206.044-2.01.044H9.258c-.805 0-1.47 0-2.01-.044-.563-.046-1.08-.145-1.565-.392a4 4 0 0 1-1.748-1.748c-.247-.485-.346-1.002-.392-1.564-.044-.541-.044-1.206-.044-2.01V7.758c0-.805 0-1.47.044-2.01.046-.563.145-1.08.392-1.565a4 4 0 0 1 1.748-1.748c.485-.247 1.002-.346 1.564-.392C7.79 2 8.454 2 9.258 2h4.356Z"
								></path>
							</g>
						</svg>
					</div>

					<!-- Text Content -->
					<div class="min-w-0 flex-1">
						<h2 class="text-lg leading-none font-semibold text-contrast">PDF ready</h2>
						<p class="mt-1 truncate text-sm font-medium text-contrast-muted">{fileName}</p>
						<p class="mt-0.5 truncate text-xs text-contrast-muted">{pdfUrl}</p>
					</div>
				</div>
				<!-- Divider -->
				<hr class="my-4 h-px border-surface-muted" />

				<!-- Buttons -->
				<div class="flex justify-between gap-3">
					<button
						onclick={handleOpenPDF}
						class="inline-flex items-center justify-center gap-2 rounded-full bg-contrast px-2 py-1 font-semibold text-contrast text-surface transition-colors duration-200 hover:opacity-90"
					>
						<svg
							class="h-4 w-4"
							xmlns="http://www.w3.org/2000/svg"
							width="1em"
							height="1em"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								fill-rule="evenodd"
								d="M15 5a1 1 0 1 1 0-2h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V6.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L17.586 5H15ZM4 7a3 3 0 0 1 3-3h3a1 1 0 1 1 0 2H7a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3a1 1 0 1 1 2 0v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Z"
								clip-rule="evenodd"
							></path>
						</svg>
						<span>Open PDF</span>
					</button>

					<button
						onclick={handleCopyLink}
						class="inline-flex items-center justify-center gap-2 rounded-full border-2 border-surface-muted px-2 py-1 font-semibold text-contrast transition-colors duration-200 hover:bg-surface-muted/50"
					>
						<svg
							class="h-4 w-4"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
							<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
						</svg>
						<span>{copied ? 'Copied' : 'Copy link'}</span>
					</button>
				</div>

				<button
					onclick={() => {
						(window as any).reloadWidget();
					}}
					class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-surface-muted px-2 py-1 font-semibold text-contrast transition-colors duration-200 hover:bg-surface-muted/50"
				>
					Reload
				</button>
				<button
					onclick={async () => {
						const result = await window.openai.callTool('exposed', { name: 'John Doe' });
						console.log(result);
					}}
					class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-surface-muted px-2 py-1 font-semibold text-contrast transition-colors duration-200 hover:bg-surface-muted/50"
				>
					Call Tool
				</button>
			</div>
		</div>
	{/if}
</Theme>
