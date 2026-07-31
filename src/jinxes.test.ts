import { describe, expect, it } from 'vitest';
import type { CharacterEntry, JinxEntry, ScriptData } from './types.js';
import { FetchedData } from './data/fetched.js';
import { applySelectedJinxes } from './jinxes.js';

function makeFetchedData(params: {
	rolesData: CharacterEntry[];
	official: JinxEntry[];
	greedy: JinxEntry[];
}): FetchedData {
	return new FetchedData({
		greedyJson: [{ id: '_meta', name: 'Test Script' }, 'heretic'],
		greedyJinxData: params.greedy,
		greedierCharactersData: [],
		greedyToBaseID: {},
		rolesData: params.rolesData,
		nightsheetData: { firstNight: [], otherNight: [] },
		jinxData: params.official,
	});
}

function getSourceEntry(data: ScriptData): CharacterEntry | undefined {
	return data.find(
		(entry) =>
			typeof entry === 'object' &&
			entry !== null &&
			'id' in entry &&
			typeof (entry as CharacterEntry).id === 'string' &&
			(entry as CharacterEntry).id.startsWith('heretic'),
	) as CharacterEntry | undefined;
}

describe('applySelectedJinxes', () => {
	it('lets greedy jinx reasons override official reasons', () => {
		const rolesData: CharacterEntry[] = [
			{ id: 'heretic', name: 'Heretic', team: 'outsider' },
			{ id: 'baron', name: 'Baron', team: 'minion' },
		];
		const official: JinxEntry[] = [
			{ id: 'heretic', jinx: [{ id: 'baron', reason: 'Official reason' }] },
		];
		const greedy: JinxEntry[] = [
			{ id: 'heretic', jinx: [{ id: 'baron', reason: 'Greedy reason' }] },
		];

		const fetchedData = makeFetchedData({ rolesData, official, greedy });
		const data = fetchedData.cloneGreedyJson();

		applySelectedJinxes(data, fetchedData, { includeOfficial: true, includeGreedy: true });

		const source = getSourceEntry(data);
		expect(source?.jinxes).toEqual([{ id: 'baron', reason: 'Greedy reason' }]);
	});

	it('treats blank greedy reason as a tombstone that removes official jinx', () => {
		const rolesData: CharacterEntry[] = [
			{ id: 'heretic', name: 'Heretic', team: 'outsider' },
			{ id: 'baron', name: 'Baron', team: 'minion' },
		];
		const official: JinxEntry[] = [
			{ id: 'heretic', jinx: [{ id: 'baron', reason: 'Official reason' }] },
		];
		const greedy: JinxEntry[] = [
			{ id: 'heretic', jinx: [{ id: 'baron', reason: '' }] },
		];

		const fetchedData = makeFetchedData({ rolesData, official, greedy });
		const data = fetchedData.cloneGreedyJson();

		applySelectedJinxes(data, fetchedData, { includeOfficial: true, includeGreedy: true });

		const source = getSourceEntry(data);
		expect(source?.jinxes ?? []).toEqual([]);
	});
});
