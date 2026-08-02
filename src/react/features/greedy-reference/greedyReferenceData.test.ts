import { describe, expect, it } from 'vitest';
import type { CharacterEntry, JinxEntry, NightsheetData, ScriptData } from '../../../types.js';
import { FetchedData } from '../../../data/fetched.js';
import { deriveGreedyHomebrew, deriveGreedyJinxes } from './greedyReferenceData.js';

function buildFetchedData(greedierCharactersData: CharacterEntry[]): FetchedData {
	return new FetchedData({
		greedyJson: [] as ScriptData,
		rolesData: [] as CharacterEntry[],
		jinxData: [] as JinxEntry[],
		greedyJinxData: [] as JinxEntry[],
		greedierJinxData: [] as JinxEntry[],
		greedyToBaseID: {},
		nightsheetData: { firstNight: [], otherNight: [] } as NightsheetData,
		greedierCharactersData,
	});
}

function buildFetchedDataWithJinxes(params: {
	greedyJson: ScriptData;
	rolesData?: CharacterEntry[];
	greedyJinxData: JinxEntry[];
	greedierJinxData?: JinxEntry[];
	greedierCharactersData?: CharacterEntry[];
}): FetchedData {
	return new FetchedData({
		greedyJson: params.greedyJson,
		rolesData: params.rolesData ?? [],
		jinxData: [] as JinxEntry[],
		greedyJinxData: params.greedyJinxData,
		greedierJinxData: params.greedierJinxData ?? [],
		greedyToBaseID: {},
		nightsheetData: { firstNight: [], otherNight: [] } as NightsheetData,
		greedierCharactersData: params.greedierCharactersData ?? [],
	});
}

describe('deriveGreedyHomebrew', () => {
	it('preserves source set order by default', () => {
		const fetchedData = buildFetchedData([
			{ id: 'omega', name: 'Omega', team: 'demon', edition: 'greedier', sourceSet: 3 },
			{ id: 'alpha', name: 'Alpha', team: 'townsfolk', edition: 'greedier', sourceSet: 1 },
			{ id: 'beta', name: 'Beta', team: 'townsfolk', edition: 'greedier', sourceSet: 1 },
		]);

		expect(deriveGreedyHomebrew(fetchedData).map((entry) => entry.character.id)).toEqual([
			'omega',
			'alpha',
			'beta',
		]);
		expect(deriveGreedyHomebrew(fetchedData).map((entry) => entry.character.sourceSet)).toEqual([
			3,
			1,
			1,
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

describe('deriveGreedyJinxes', () => {
	it('includes greedier homebrew jinxes only when enabled', () => {
		const fetchedData = buildFetchedDataWithJinxes({
			greedyJson: [
				{ id: 'clockmaker', name: 'Clockmaker', team: 'townsfolk' },
				{ id: 'imp', name: 'Imp', team: 'demon' },
			],
			greedyJinxData: [
				{ id: 'clockmaker', jinx: [{ id: 'imp', reason: 'Greedy jinx reason' }] },
			],
			greedierJinxData: [
				{ id: 'homebrew_a', jinx: [{ id: 'homebrew_b', reason: 'Greedier jinx reason' }] },
			],
			greedierCharactersData: [
				{ id: 'homebrew_a', name: 'Homebrew A', team: 'townsfolk', edition: 'greedier' },
				{ id: 'homebrew_b', name: 'Homebrew B', team: 'demon', edition: 'greedier' },
			],
		});

		const baseOnly = deriveGreedyJinxes(fetchedData, { includeGreedierHomebrew: false });
		expect(baseOnly.map((entry) => entry.reason)).toEqual(['Greedy jinx reason']);
		expect(baseOnly.map((entry) => entry.origin)).toEqual(['greedy']);

		const withGreedier = deriveGreedyJinxes(fetchedData, { includeGreedierHomebrew: true });
		expect(withGreedier.map((entry) => entry.reason)).toEqual([
			'Greedy jinx reason',
			'Greedier jinx reason',
		]);
		expect(withGreedier.map((entry) => entry.origin)).toEqual([
			'greedy',
			'greedier-homebrew',
		]);
	});
});
