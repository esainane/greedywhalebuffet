import { loadLatestJson } from '../data/loader.js';
import type { Catalog } from '../data/catalog.js';
import type {
	CatalogRepository,
	ClipboardPort,
	PreferencesRepository,
} from './ports.js';

export class ClipboardUnavailableError extends Error {
	constructor(message = 'Clipboard is unavailable in this browser.') {
		super(message);
		this.name = 'ClipboardUnavailableError';
	}
}

export function createBrowserCatalogRepository(): CatalogRepository {
	return {
		async load(signal?: AbortSignal): Promise<Catalog> {
			const { catalog } = await loadLatestJson({ signal });
			return catalog;
		},
	};
}

export function createLocalStoragePreferencesRepository(storageKey: string): PreferencesRepository {
	return {
		load(): string | null {
			if (typeof window === 'undefined') {
				return null;
			}

			try {
				return window.localStorage.getItem(storageKey);
			} catch {
				return null;
			}
		},
		save(serialized: string): void {
			if (typeof window === 'undefined') {
				return;
			}

			try {
				window.localStorage.setItem(storageKey, serialized);
			} catch {
				// Ignore persistence failures (private mode, storage quota, etc.)
			}
		},
	};
}

export function createNavigatorClipboardPort(): ClipboardPort {
	return {
		async writeText(value: string): Promise<void> {
			if (
				typeof navigator === 'undefined' ||
				navigator.clipboard === undefined ||
				typeof navigator.clipboard.writeText !== 'function'
			) {
				throw new ClipboardUnavailableError();
			}

			await navigator.clipboard.writeText(value);
		},
	};
}
