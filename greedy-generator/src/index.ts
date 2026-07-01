const DUPLICATE_LINE = 'Duplicate characters might be in play.';
const LATEST_JSON_URL = './latest.json';

type MetaEntry = {
	name?: string;
	bootlegger?: string[];
};

type ScriptData = MetaEntry[];

function requireElement<T extends Element>(selector: string, ctor: { new (): T }): T {
	const element = document.querySelector(selector);

	if (!(element instanceof ctor)) {
		throw new Error(`Expected element ${selector} to be a ${ctor.name}.`);
	}

	return element;
}

const form = requireElement('#copy-form', HTMLFormElement);
const appendDuplicateLineInput = requireElement('#append-duplicate-line', HTMLInputElement);
const reloadButton = requireElement('#reload-button', HTMLButtonElement);
const statusElement = requireElement('#status', HTMLParagraphElement);
const scriptName = requireElement('#script-name', HTMLElement);
const characterCount = requireElement('#character-count', HTMLElement);

let latestJson: ScriptData | null = null;

function setStatus(message: string, tone: 'info' | 'success' | 'error' = 'info'): void {
	statusElement.textContent = message;
	statusElement.dataset.tone = tone;
}

function cloneJson(value: ScriptData): ScriptData {
	return structuredClone(value);
}

function getMetaEntry(data: ScriptData): MetaEntry | null {
	return Array.isArray(data) ? data[0] ?? null : null;
}

function getBootleggerEntries(data: ScriptData, shouldAppendLine = false): string[] {
	const metaEntry = getMetaEntry(data);
	const entries = Array.isArray(metaEntry?.bootlegger) ? [...metaEntry.bootlegger] : [];

	if (shouldAppendLine) {
		entries.push(DUPLICATE_LINE);
	}

	return entries;
}

function buildCopyPayload(data: ScriptData, shouldAppendLine: boolean): string {
	const nextData = cloneJson(data);
	const metaEntry = getMetaEntry(nextData);

	if (metaEntry && Array.isArray(metaEntry.bootlegger) && shouldAppendLine) {
		metaEntry.bootlegger.push(DUPLICATE_LINE);
	}

	return JSON.stringify(nextData, null, 2);
}

function renderPreview(): void {
    // TODO
}

async function loadLatestJson(): Promise<void> {
	setStatus('Loading latest script...');

	const response = await fetch(LATEST_JSON_URL, { cache: 'no-store' });
	if (!response.ok) {
		throw new Error(`Failed to load latest.json (${response.status})`);
	}

	const parsed = (await response.json()) as unknown;
	if (!Array.isArray(parsed)) {
		throw new Error('latest.json has an unexpected shape.');
	}

	latestJson = parsed as ScriptData;

	const metaEntry = getMetaEntry(latestJson);
	scriptName.textContent = metaEntry?.name ?? 'Unknown script';
	renderPreview();
	setStatus('Script loaded.', 'success');
}

async function copyJson(event: SubmitEvent): Promise<void> {
	event.preventDefault();

	if (!latestJson) {
		setStatus('Load latest.json before copying.', 'error');
		return;
	}

	const shouldAppendLine = appendDuplicateLineInput.checked;
	const payload = buildCopyPayload(latestJson, shouldAppendLine);

	await navigator.clipboard.writeText(payload);
	setStatus('Copied!', 'success');
}

appendDuplicateLineInput.addEventListener('change', renderPreview);
reloadButton.addEventListener('click', async () => {
	try {
		await loadLatestJson();
	} catch (error: unknown) {
		setStatus(error instanceof Error ? error.message : 'Unable to reload latest.json.', 'error');
	}
});

form.addEventListener('submit', async (event) => {
	try {
		await copyJson(event as SubmitEvent);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Copy failed.';
		setStatus(message, 'error');
	}
});

async function bootstrap(): Promise<void> {
	try {
		await loadLatestJson();
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unable to load latest.json.';
		setStatus(message, 'error');
	}
}

void bootstrap();