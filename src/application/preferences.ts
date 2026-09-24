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

type StoredPreferencesV2 = {
	version: 2;
	options?: unknown;
	bannedCharacterIds?: unknown;
	greedierSortBySet?: unknown;
};

type StoredPreferencesLegacy = {
	options?: unknown;
	bannedCharacterIds?: unknown;
	greedierSortBySet?: unknown;
};

export const CURRENT_PREFERENCES_VERSION = 2;

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

function normalizeStoredPreferences(
	raw: StoredPreferencesLegacy | StoredPreferencesV1 | StoredPreferencesV2,
): Preferences {
	return {
		options: normalizeOptions(raw.options),
		bannedCharacterIds: normalizeBannedCharacterIds(raw.bannedCharacterIds),
		greedierSortBySet: normalizeGreedierSortBySet(raw.greedierSortBySet),
	};
}

function migrateCharacterIdToV2(id: string): string {
	const exceptionalRenames: Readonly<Record<string, string>> = {
		choose_your_chars: 'choosechars',
		choose_your_chars_dummy: 'choosecharsdummy',
		choose_a_own_trv: 'choosetravs',
		mayor_mayor: 'mayorbalance',
		vortox_poppppp: 'vortoxclean',
		yaggababble_poppppp: 'yaggababbleclean',
	};
	if (id in exceptionalRenames) {
		return exceptionalRenames[id];
	}
	if (id.endsWith('_popppp')) {
		return `${id.slice(0, -'_popppp'.length)}clean`;
	}
	if (id.endsWith('_ultimate')) {
		return `${id.slice(0, -'_ultimate'.length)}balance`;
	}
	if (id.endsWith('_wewew')) {
		return `${id.slice(0, -'_wewew'.length)}fun`;
	}
	if (id.endsWith('_winningclub')) {
		return id.slice(0, -'_winningclub'.length);
	}
	return id;
}

function migratePreferencesToV2(
	raw: StoredPreferencesLegacy | StoredPreferencesV1,
): Preferences {
	const preferences = normalizeStoredPreferences(raw);
	preferences.bannedCharacterIds = [
		...new Set(preferences.bannedCharacterIds.map(migrateCharacterIdToV2)),
	];
	return preferences;
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
			preferences: normalizeStoredPreferences(parsedRecord as StoredPreferencesV2),
			migrated: false,
			parseError: false,
		};
	}

	if (version === 1 || !hasVersion) {
		return {
			preferences: migratePreferencesToV2(
				parsedRecord as StoredPreferencesLegacy | StoredPreferencesV1,
			),
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
