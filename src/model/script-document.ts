import type { MetaEntry, ScriptDocument, ScriptEntry, ScriptFile } from '../types.js';

function isMetaEntry(value: unknown): value is MetaEntry {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	const entry = value as { id?: unknown; name?: unknown };
	return entry.id === '_meta' && typeof entry.name === 'string';
}

function isScriptEntry(value: unknown): value is ScriptEntry {
	if (typeof value === 'string') {
		return true;
	}

	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	const entry = value as { id?: unknown };
	return typeof entry.id === 'string' && entry.id !== '_meta';
}

export function parseScriptFile(file: Readonly<ScriptFile>, sourceName = 'script'): ScriptDocument {
	if (file.length === 0) {
		throw new Error(`${sourceName} must include a leading _meta entry.`);
	}

	const [first, ...restRaw] = file;
	if (!isMetaEntry(first)) {
		throw new Error(`${sourceName} must begin with an object entry with id "_meta" and a string name.`);
	}

	const rest: ScriptEntry[] = [];

	for (const entry of restRaw) {
		if (isMetaEntry(entry)) {
			throw new Error(`${sourceName} must include only one _meta entry, and it must be the first item.`);
		}

		if (!isScriptEntry(entry)) {
			throw new Error(`${sourceName} contains an invalid script entry.`);
		}

		rest.push(entry);
	}

	return {
		meta: first,
		entries: rest,
	};
}

export function serializeScriptDocument(document: ScriptDocument): ScriptFile {
	return [document.meta, ...document.entries];
}
