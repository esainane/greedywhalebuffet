import { describe, expect, it } from 'vitest';
import { loadPreferences } from './services.js';
import type { PreferencesRepository } from './ports.js';

function createInMemoryPreferencesRepository(initialRaw: string | null): {
	repository: PreferencesRepository;
	getSavedValues: () => string[];
} {
	let rawValue = initialRaw;
	const savedValues: string[] = [];

	return {
		repository: {
			load(): string | null {
				return rawValue;
			},
			save(serialized: string): void {
				rawValue = serialized;
				savedValues.push(serialized);
			},
		},
		getSavedValues: () => savedValues,
	};
}

describe('preferences service', () => {
	it('migrates legacy stored preferences and persists the migrated versioned payload', () => {
		const { repository, getSavedValues } = createInMemoryPreferencesRepository(
			JSON.stringify({
				options: { addGreedierHomebrew: true, notAnOption: true },
				bannedCharacterIds: ['po', 42, 'po'],
				greedierSortBySet: false,
			}),
		);

		const result = loadPreferences(repository);

		expect(result.migrated).toBe(true);
		expect(result.error).toBeNull();
		expect(result.preferences.options.addGreedierHomebrew).toBe(true);
		expect(result.preferences.bannedCharacterIds).toEqual(['po']);
		expect(result.preferences.greedierSortBySet).toBe(false);

		const saved = getSavedValues();
		expect(saved).toHaveLength(1);
		expect(JSON.parse(saved[0])).toMatchObject({
			version: 1,
			options: expect.any(Object),
			bannedCharacterIds: ['po'],
			greedierSortBySet: false,
		});
	});

	it('falls back to defaults and surfaces a parse error for malformed data', () => {
		const { repository } = createInMemoryPreferencesRepository('{oops');

		const result = loadPreferences(repository);

		expect(result.migrated).toBe(false);
		expect(result.error?.code).toBe('preferences_parse_failed');
		expect(result.preferences.bannedCharacterIds).toEqual([]);
		expect(result.preferences.greedierSortBySet).toBe(true);
	});

	it('returns defaults when storage is empty', () => {
		const { repository } = createInMemoryPreferencesRepository(null);

		const result = loadPreferences(repository);

		expect(result.migrated).toBe(false);
		expect(result.error).toBeNull();
		expect(result.preferences.bannedCharacterIds).toEqual([]);
		expect(result.preferences.greedierSortBySet).toBe(true);
	});
});
