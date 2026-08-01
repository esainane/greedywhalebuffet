import { describe, expect, it } from 'vitest';
import type { CharacterEntry, JinxEntry, NightsheetData, ScriptData } from '../../../types.js';
import { FetchedData } from '../../../data/fetched.js';
import { deriveGreedyHomebrew } from './greedyReferenceData.js';

function buildFetchedData(greedierCharactersData: CharacterEntry[]): FetchedData {
	return new FetchedData({
		greedyJson: [] as ScriptData,
		rolesData: [] as CharacterEntry[],
		jinxData: [] as JinxEntry[],
		greedyJinxData: [] as JinxEntry[],
		greedyToBaseID: {},
		nightsheetData: { firstNight: [], otherNight: [] } as NightsheetData,
		greedierCharactersData,
	});
}

describe('deriveGreedyHomebrew', () => {
	it('preserves source set order by default', () => {
		const fetchedData = buildFetchedData([
			{ id: 'omega', name: 'Omega', team: 'demon', edition: 'greedier' },
			{ id: 'alpha', name: 'Alpha', team: 'townsfolk', edition: 'greedier' },
			{ id: 'beta', name: 'Beta', team: 'townsfolk', edition: 'greedier' },
		]);

		expect(deriveGreedyHomebrew(fetchedData).map((entry) => entry.character.id)).toEqual([
			'omega',
			'alpha',
			'beta',
		]);
	});

	it('sorts by canonical team and name when sort-by-set is disabled', () => {
		const fetchedData = buildFetchedData([
			{ id: 'omega', name: 'Omega', team: 'demon', edition: 'greedier' },
			{ id: 'beta', name: 'Beta', team: 'townsfolk', edition: 'greedier' },
			{ id: 'alpha', name: 'Alpha', team: 'townsfolk', edition: 'greedier' },
			{ id: 'zed', name: 'Zed', team: 'minion', edition: 'greedier' },
		]);

		expect(deriveGreedyHomebrew(fetchedData, false).map((entry) => entry.character.id)).toEqual([
			'alpha',
			'beta',
			'zed',
			'omega',
		]);
	});
});
