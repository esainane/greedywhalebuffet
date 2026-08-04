import type { Catalog } from '../data/catalog.js';

export interface CatalogRepository {
	load(signal?: AbortSignal): Promise<Catalog>;
}

export interface PreferencesRepository {
	load(): string | null;
	save(serialized: string): void;
}

export interface ClipboardPort {
	writeText(value: string): Promise<void>;
}
