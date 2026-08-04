import {
	defaultGenerationOptions,
	isGenerationOptionName,
} from '../options.js';
import type { GenerationOptions } from '../types.js';

export type Preferences = {
	options: GenerationOptions;
	bannedCharacterIds: string[];
	greedierSortBySet: boolean;
};

type StoredPreferencesV1 = {
	version: 1;
	options?: unknown;
	bannedCharacterIds?: unknown;
	greedierSortBySet?: unknown;
};

type StoredPreferencesLegacy = {
	options?: unknown;
	bannedCharacterIds?: unknown;
	greedierSortBySet?: unknown;
};

export const CURRENT_PREFERENCES_VERSION = 1;

export function defaultPreferences(): Preferences {
	return {
		options: defaultGenerationOptions(),
		bannedCharacterIds: [],
		greedierSortBySet: true,
	};
}

function normalizeOptions(rawOptions: unknown): GenerationOptions {
	const options = defaultGenerationOptions();
	if (!rawOptions || typeof rawOptions !== 'object') {
		return options;
	}

	for (const [key, value] of Object.entries(rawOptions)) {
		if (!isGenerationOptionName(key) || typeof value !== 'boolean') {
			continue;
		}
		options[key] = value;
	}

	return options;
}

function normalizeBannedCharacterIds(rawValue: unknown): string[] {
	if (!Array.isArray(rawValue)) {
		return [];
	}

	const uniqueIds = new Set<string>();
	for (const value of rawValue) {
		if (typeof value === 'string') {
			uniqueIds.add(value);
		}
	}

	return [...uniqueIds];
}

function normalizeGreedierSortBySet(rawValue: unknown): boolean {
	return typeof rawValue === 'boolean' ? rawValue : true;
}

function normalizeStoredPreferences(raw: StoredPreferencesLegacy | StoredPreferencesV1): Preferences {
	return {
		options: normalizeOptions(raw.options),
		bannedCharacterIds: normalizeBannedCharacterIds(raw.bannedCharacterIds),
		greedierSortBySet: normalizeGreedierSortBySet(raw.greedierSortBySet),
	};
}

export type ParsedPreferences = {
	preferences: Preferences;
	migrated: boolean;
	parseError: boolean;
};

export function parseStoredPreferences(serialized: string | null): ParsedPreferences {
	if (!serialized) {
		return {
			preferences: defaultPreferences(),
			migrated: false,
			parseError: false,
		};
	}

	let parsedUnknown: unknown;
	try {
		parsedUnknown = JSON.parse(serialized) as unknown;
	} catch {
		return {
			preferences: defaultPreferences(),
			migrated: false,
			parseError: true,
		};
	}

	if (!parsedUnknown || typeof parsedUnknown !== 'object' || Array.isArray(parsedUnknown)) {
		return {
			preferences: defaultPreferences(),
			migrated: false,
			parseError: true,
		};
	}

	const parsedRecord = parsedUnknown as Record<string, unknown>;
	const hasVersion = 'version' in parsedRecord;
	const version = hasVersion ? parsedRecord.version : undefined;

	if (version === CURRENT_PREFERENCES_VERSION) {
		return {
			preferences: normalizeStoredPreferences(parsedRecord as StoredPreferencesV1),
			migrated: false,
			parseError: false,
		};
	}

	if (!hasVersion) {
		return {
			preferences: normalizeStoredPreferences(parsedRecord as StoredPreferencesLegacy),
			migrated: true,
			parseError: false,
		};
	}

	return {
		preferences: defaultPreferences(),
		migrated: false,
		parseError: true,
	};
}

export function serializePreferences(preferences: Preferences): string {
	return JSON.stringify({
		version: CURRENT_PREFERENCES_VERSION,
		options: preferences.options,
		bannedCharacterIds: preferences.bannedCharacterIds,
		greedierSortBySet: preferences.greedierSortBySet,
	});
}
