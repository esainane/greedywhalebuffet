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
				bannedCharacterIds: ['po', 42, 'po', 'recluse_wewew'],
				greedierSortBySet: false,
			}),
		);

		const result = loadPreferences(repository);

		expect(result.migrated).toBe(true);
		expect(result.error).toBeNull();
		expect(result.preferences.options.addGreedierHomebrew).toBe(true);
		expect(result.preferences.bannedCharacterIds).toEqual(['po', 'reclusefun']);
		expect(result.preferences.greedierSortBySet).toBe(false);

		const saved = getSavedValues();
		expect(saved).toHaveLength(1);
		expect(JSON.parse(saved[0])).toMatchObject({
			version: 2,
			options: expect.any(Object),
			bannedCharacterIds: ['po', 'reclusefun'],
			greedierSortBySet: false,
		});
	});

	it('migrates v1 character IDs to their underscore-free replacements', () => {
		const { repository, getSavedValues } = createInMemoryPreferencesRepository(
			JSON.stringify({
				version: 1,
				bannedCharacterIds: [
					'alchemist_popppp',
					'engineer_ultimate',
					'recluse_wewew',
					'journalist_winningclub',
					'choose_your_chars',
					'choose_your_chars_dummy',
					'choose_a_own_trv',
					'mayor_mayor',
					'vortox_poppppp',
					'yaggababble_poppppp',
					'alchemistclean',
				],
			}),
		);

		const result = loadPreferences(repository);

		expect(result.migrated).toBe(true);
		expect(result.error).toBeNull();
		expect(result.preferences.bannedCharacterIds).toEqual([
			'alchemistclean',
			'engineerbalance',
			'reclusefun',
			'journalist',
			'choosechars',
			'choosecharsdummy',
			'choosetravs',
			'mayorbalance',
			'vortoxclean',
			'yaggababbleclean',
		]);
		expect(JSON.parse(getSavedValues()[0])).toMatchObject({
			version: 2,
			bannedCharacterIds: [
				'alchemistclean',
				'engineerbalance',
				'reclusefun',
				'journalist',
				'choosechars',
				'choosecharsdummy',
				'choosetravs',
				'mayorbalance',
				'vortoxclean',
				'yaggababbleclean',
			],
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
