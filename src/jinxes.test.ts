import { describe, expect, it } from 'vitest';
import type { CatalogCharacter, CharacterEntry, JinxFile, ScriptFile } from './types.js';
import { applySelectedJinxes } from './jinxes.js';
import { cloneSerializedScript, createTestCatalog, createTestResolver } from './test-helpers.js';

function getSourceEntry(data: ScriptFile): CharacterEntry | undefined {
	return data.find(
		(entry) =>
			typeof entry === 'object' &&
			entry !== null &&
			'id' in entry &&
			typeof (entry as CharacterEntry).id === 'string' &&
			(entry as CharacterEntry).id.startsWith('heretic'),
	) as CharacterEntry | undefined;
}

function getCharacterEntryById(data: ScriptFile, id: string): CharacterEntry | undefined {
	return data.find(
		(entry) =>
			typeof entry === 'object' &&
			entry !== null &&
			'id' in entry &&
			typeof (entry as CharacterEntry).id === 'string' &&
			(entry as CharacterEntry).id === id,
	) as CharacterEntry | undefined;
}

describe('applySelectedJinxes', () => {
	it('lets greedy jinx reasons override official reasons', () => {
		const rolesData: CharacterEntry[] = [
			{ id: 'heretic', name: 'Heretic', team: 'outsider', ability: 'Heretic ability' },
			{ id: 'baron', name: 'Baron', team: 'minion', ability: 'Baron ability' },
		];
		const official: JinxFile = [
			{ id: 'heretic', jinx: [{ id: 'baron', reason: 'Official reason' }] },
		];
		const greedy: JinxFile = [
			{ id: 'heretic', jinx: [{ id: 'baron', reason: 'Greedy reason' }] },
		];

		const catalog = createTestCatalog({
			baseScript: [{ id: '_meta', name: 'Test Script' }, 'heretic'],
			rolesData,
			official,
			greedy,
		});
		const resolver = createTestResolver(catalog);
		const data = cloneSerializedScript(catalog);

		applySelectedJinxes(data, resolver, {
			includeOfficial: true,
			includeGreedy: true,
			includeGreedier: false,
			includeNoDeathAtNight: true,
		});

		const source = getSourceEntry(data);
		expect(source?.jinxes).toEqual([{ id: 'baron', reason: 'Greedy reason' }]);
	});

	it('treats blank greedy reason as a tombstone that removes official jinx', () => {
		const rolesData: CharacterEntry[] = [
			{ id: 'heretic', name: 'Heretic', team: 'outsider', ability: 'Heretic ability' },
			{ id: 'baron', name: 'Baron', team: 'minion', ability: 'Baron ability' },
		];
		const official: JinxFile = [
			{ id: 'heretic', jinx: [{ id: 'baron', reason: 'Official reason' }] },
		];
		const greedy: JinxFile = [
			{ id: 'heretic', jinx: [{ id: 'baron', reason: '' }] },
		];

		const catalog = createTestCatalog({
			baseScript: [{ id: '_meta', name: 'Test Script' }, 'heretic'],
			rolesData,
			official,
			greedy,
		});
		const resolver = createTestResolver(catalog);
		const data = cloneSerializedScript(catalog);

		applySelectedJinxes(data, resolver, {
			includeOfficial: true,
			includeGreedy: true,
			includeGreedier: false,
			includeNoDeathAtNight: true,
		});

		const source = getSourceEntry(data);
		expect(source?.jinxes ?? []).toEqual([]);
	});

	it('sorts final jinxes by canonical target order for a source', () => {
		const rolesData: CharacterEntry[] = [
			{ id: 'heretic', name: 'Heretic', team: 'outsider', ability: 'Heretic ability' },
			{ id: 'empath', name: 'Empath', team: 'townsfolk', ability: 'Empath ability' },
			{ id: 'baron', name: 'Baron', team: 'minion', ability: 'Baron ability' },
			{ id: 'devilsadvocate', name: 'Devil\'s Advocate', team: 'minion', ability: 'Devil\'s Advocate ability' },
			{ id: 'imp', name: 'Imp', team: 'demon', ability: 'Imp ability' },
		];
		const official: JinxFile = [];
		const greedy: JinxFile = [
			{
				id: 'heretic',
				jinx: [
					{ id: 'imp', reason: 'Demon jinx' },
					{ id: 'devilsadvocate', reason: 'Minion jinx B' },
					{ id: 'empath', reason: 'Townsfolk jinx' },
					{ id: 'baron', reason: 'Minion jinx A' },
				],
			},
		];

		const catalog = createTestCatalog({
			baseScript: [{ id: '_meta', name: 'Test Script' }, 'heretic'],
			rolesData,
			official,
			greedy,
		});
		const resolver = createTestResolver(catalog);
		const data = cloneSerializedScript(catalog);

		applySelectedJinxes(data, resolver, {
			includeOfficial: true,
			includeGreedy: true,
			includeGreedier: false,
			includeNoDeathAtNight: true,
		});

		const source = getSourceEntry(data);
		expect(source?.jinxes).toEqual([
			{ id: 'empath', reason: 'Townsfolk jinx' },
			{ id: 'baron', reason: 'Minion jinx A' },
			{ id: 'devilsadvocate', reason: 'Minion jinx B' },
			{ id: 'imp', reason: 'Demon jinx' },
		]);
	});

	it('filters no-death-at-night jinxes unless explicitly enabled', () => {
		const catalog = createTestCatalog({
			baseScript: [{ id: '_meta', name: 'Test Script' }, 'leviathan'],
			greedy: [],
			greedier: [],
			greedierCharactersData: [],
			rolesData: [
				{ id: 'leviathan', name: 'Leviathan', team: 'demon', ability: 'Leviathan ability' },
				{ id: 'soldier', name: 'Soldier', team: 'townsfolk', ability: 'Soldier ability' },
				{ id: 'baron', name: 'Baron', team: 'minion', ability: 'Baron ability' },
			],
			official: [
				{
					id: 'leviathan',
					jinx: [
						{ id: 'soldier', reason: 'No-death-at-night pair' },
						{ id: 'baron', reason: 'Unrelated pair' },
					],
				},
			],
		});
		const filtered = cloneSerializedScript(catalog);
		applySelectedJinxes(filtered, createTestResolver(catalog), {
			includeOfficial: true,
			includeGreedy: false,
			includeGreedier: false,
			includeNoDeathAtNight: false,
		});
		expect(getCharacterEntryById(filtered, 'leviathan_custom')?.jinxes).toEqual([
			{ id: 'baron', reason: 'Unrelated pair' },
		]);

		const included = cloneSerializedScript(catalog);
		applySelectedJinxes(included, createTestResolver(catalog), {
			includeOfficial: true,
			includeGreedy: false,
			includeGreedier: false,
			includeNoDeathAtNight: true,
		});
		expect(getCharacterEntryById(included, 'leviathan_custom')?.jinxes).toEqual([
			{ id: 'soldier', reason: 'No-death-at-night pair' },
			{ id: 'baron', reason: 'Unrelated pair' },
		]);
	});

	it('includes Greedier jinxes when Greedier export is enabled', () => {
		const rolesData: CharacterEntry[] = [
			{ id: 'heretic', name: 'Heretic', team: 'outsider', ability: 'Heretic ability' },
			{ id: 'baron', name: 'Baron', team: 'minion', ability: 'Baron ability' },
		];
		const greedierCharactersData: CatalogCharacter[] = [
			{
				entry: {
					id: 'journalist_winningclub',
					name: 'Journalist',
					team: 'townsfolk',
					ability: 'Journalist ability',
					edition: 'greedier',
				},
			},
		];
		const greedier: JinxFile = [
			{ id: 'heretic', jinx: [{ id: 'journalist_winningclub', reason: 'Greedier reason' }] },
		];

		const catalog = createTestCatalog({
			baseScript: [{ id: '_meta', name: 'Test Script' }, 'heretic'],
			rolesData,
			official: [],
			greedy: [{ id: 'heretic', jinx: [{ id: 'baron', reason: 'Greedy reason' }] }],
			greedier,
			greedierCharactersData,
		});
		const withoutGreedier = cloneSerializedScript(catalog);
		applySelectedJinxes(withoutGreedier, createTestResolver(catalog), {
			includeOfficial: false,
			includeGreedy: true,
			includeGreedier: false,
			includeNoDeathAtNight: true,
		});
		expect(getSourceEntry(withoutGreedier)?.jinxes).toEqual([
			{ id: 'baron', reason: 'Greedy reason' },
		]);

		const withGreedier = cloneSerializedScript(catalog);
		applySelectedJinxes(withGreedier, createTestResolver(catalog), {
			includeOfficial: false,
			includeGreedy: true,
			includeGreedier: true,
			includeNoDeathAtNight: true,
		});
		expect(getSourceEntry(withGreedier)?.jinxes).toEqual([
			{ id: 'journalist_winningclub', reason: 'Greedier reason' },
			{ id: 'baron', reason: 'Greedy reason' },
		]);
	});
});
