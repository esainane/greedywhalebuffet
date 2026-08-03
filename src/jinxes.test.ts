import { describe, expect, it } from 'vitest';
import type { CharacterEntry, JinxFile, ScriptFile } from './types.js';
import { FetchedData } from './data/fetched.js';
import { applySelectedJinxes } from './jinxes.js';

function makeFetchedData(params: {
	rolesData: CharacterEntry[];
	official: JinxFile;
	greedy: JinxFile;
}): FetchedData {
	return new FetchedData({
		greedyJson: [{ id: '_meta', name: 'Test Script' }, 'heretic'],
		greedyJinxData: params.greedy,
		greedierJinxData: [],
		greedierCharactersData: [],
		greedyToBaseID: {},
		rolesData: params.rolesData,
		nightsheetFile: { firstNight: [], otherNight: [] },
		jinxData: params.official,
	});
}

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

		const fetchedData = makeFetchedData({ rolesData, official, greedy });
		const data = fetchedData.cloneGreedyJson();

		applySelectedJinxes(data, fetchedData, {
			includeOfficial: true,
			includeGreedy: true,
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

		const fetchedData = makeFetchedData({ rolesData, official, greedy });
		const data = fetchedData.cloneGreedyJson();

		applySelectedJinxes(data, fetchedData, {
			includeOfficial: true,
			includeGreedy: true,
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

		const fetchedData = makeFetchedData({ rolesData, official, greedy });
		const data = fetchedData.cloneGreedyJson();

		applySelectedJinxes(data, fetchedData, {
			includeOfficial: true,
			includeGreedy: true,
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
		const fetchedData = new FetchedData({
			greedyJson: [{ id: '_meta', name: 'Test Script' }, 'leviathan'],
			greedyJinxData: [],
			greedierJinxData: [],
			greedierCharactersData: [],
			greedyToBaseID: {},
			rolesData: [
				{ id: 'leviathan', name: 'Leviathan', team: 'demon', ability: 'Leviathan ability' },
				{ id: 'soldier', name: 'Soldier', team: 'townsfolk', ability: 'Soldier ability' },
				{ id: 'baron', name: 'Baron', team: 'minion', ability: 'Baron ability' },
			],
			nightsheetFile: { firstNight: [], otherNight: [] },
			jinxData: [
				{
					id: 'leviathan',
					jinx: [
						{ id: 'soldier', reason: 'No-death-at-night pair' },
						{ id: 'baron', reason: 'Unrelated pair' },
					],
				},
			],
		});

		const filtered = fetchedData.cloneGreedyJson();
		applySelectedJinxes(filtered, fetchedData, {
			includeOfficial: true,
			includeGreedy: false,
			includeNoDeathAtNight: false,
		});
		expect(getCharacterEntryById(filtered, 'leviathan_custom')?.jinxes).toEqual([
			{ id: 'baron', reason: 'Unrelated pair' },
		]);

		const included = fetchedData.cloneGreedyJson();
		applySelectedJinxes(included, fetchedData, {
			includeOfficial: true,
			includeGreedy: false,
			includeNoDeathAtNight: true,
		});
		expect(getCharacterEntryById(included, 'leviathan_custom')?.jinxes).toEqual([
			{ id: 'soldier', reason: 'No-death-at-night pair' },
			{ id: 'baron', reason: 'Unrelated pair' },
		]);
	});
});
