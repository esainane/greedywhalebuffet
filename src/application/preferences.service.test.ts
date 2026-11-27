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
				bannedCharacterIds: ['po', 42, 'po', 'recluse_wewew', 'goblin'],
				greedierSortBySet: false,
			}),
		);

		const result = loadPreferences(repository);

		expect(result.migrated).toBe(true);
		expect(result.error).toBeNull();
		expect(result.preferences.options.addGreedierHomebrew).toBe(true);
		expect(result.preferences.bannedCharacterIds).toEqual(['po', 'reclusefun', 'goblinquote']);
		expect(result.preferences.greedierSortBySet).toBe(false);
		expect(result.preferences.greedierLoricDefaultsApplied).toBe(false);

		const saved = getSavedValues();
		expect(saved).toHaveLength(1);
		expect(JSON.parse(saved[0])).toMatchObject({
			version: 4,
			options: expect.any(Object),
			bannedCharacterIds: ['po', 'reclusefun', 'goblinquote'],
			greedierSortBySet: false,
			greedierLoricDefaultsApplied: false,
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
					'snakecharmer_custom',
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
			'snakecharmercustom',
		]);
		expect(JSON.parse(getSavedValues()[0])).toMatchObject({
			version: 4,
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
				'snakecharmercustom',
			],
			greedierLoricDefaultsApplied: false,
		});
	});

	it('migrates v2 preferences to initialize Greedier Loric defaults', () => {
		const { repository, getSavedValues } = createInMemoryPreferencesRepository(
			JSON.stringify({
				version: 2,
				bannedCharacterIds: ['loric_a', 'organgrinder'],
			}),
		);

		const result = loadPreferences(repository);

		expect(result.migrated).toBe(true);
		expect(result.preferences.bannedCharacterIds).toEqual(['loric_a', 'organgrinderqol']);
		expect(result.preferences.greedierLoricDefaultsApplied).toBe(false);
		expect(JSON.parse(getSavedValues()[0])).toMatchObject({
			version: 4,
			bannedCharacterIds: ['loric_a', 'organgrinderqol'],
			greedierLoricDefaultsApplied: false,
		});
	});

	it('migrates v3 banned IDs to the renamed greedy character IDs', () => {
		const { repository, getSavedValues } = createInMemoryPreferencesRepository(
			JSON.stringify({
				version: 3,
				bannedCharacterIds: ['damsel', 'po', 'goblin', 'organgrinder', 'damselquote'],
				greedierLoricDefaultsApplied: true,
			}),
		);

		const result = loadPreferences(repository);

		expect(result.migrated).toBe(true);
		expect(result.error).toBeNull();
		expect(result.preferences.bannedCharacterIds).toEqual([
			'damselquote',
			'po',
			'goblinquote',
			'organgrinderqol',
		]);
		expect(result.preferences.greedierLoricDefaultsApplied).toBe(true);
		expect(JSON.parse(getSavedValues()[0])).toMatchObject({
			version: 4,
			bannedCharacterIds: ['damselquote', 'po', 'goblinquote', 'organgrinderqol'],
			greedierLoricDefaultsApplied: true,
		});
	});

	it('does not rename IDs already stored at the current version', () => {
		const { repository, getSavedValues } = createInMemoryPreferencesRepository(
			JSON.stringify({
				version: 4,
				bannedCharacterIds: ['damsel'],
			}),
		);

		const result = loadPreferences(repository);

		expect(result.migrated).toBe(false);
		expect(result.preferences.bannedCharacterIds).toEqual(['damsel']);
		expect(getSavedValues()).toHaveLength(0);
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
