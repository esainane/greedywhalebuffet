import { describe, expect, it } from 'vitest';
import {
	findOrExpandCharacter,
} from './character.js';
import { FetchedData } from './data/fetched.js';
import { Catalog, OneToOneIdMap, NightOrderIndex } from './data/catalog.js';
import { parseScriptFile } from './model/script-document.js';
import type { CharacterEntry } from './types.js';

function makeFetchedData(role: CharacterEntry): FetchedData {
	return FetchedData.fromRaw({
		greedyJson: [{ id: '_meta', name: 'Test Script' }, role.id],
		greedyJinxData: [],
		greedierJinxData: [],
		greedierCharactersData: [],
		greedyToBaseID: {},
		rolesData: [role],
		nightsheetFile: { firstNight: [], otherNight: [] },
		jinxData: [],
	});
}

function makeCatalog(role: CharacterEntry): Catalog {
	return Catalog.create({
		baseScript: parseScriptFile([{ id: '_meta', name: 'Test Script' }, role.id]),
		roles: [role],
		greedierCharacters: [],
		idMappings: OneToOneIdMap.fromRecord({}),
		nightOrder: new NightOrderIndex({ firstNight: [], otherNight: [] }),
		officialJinxes: [],
		greedyJinxes: [],
		greedierJinxes: [],
	});
}

describe('character image behavior', () => {
	it('keeps script image URLs unnormalized for payload expansion', () => {
		const role: CharacterEntry = {
			id: 'clockmaker',
			name: 'Clockmaker',
			team: 'townsfolk',
			ability: 'Test ability',
			image: 'https://greedy.antihype.space/icons/carousel/clockmaker_g.webp',
		};
		const fetchedData = makeFetchedData(role);
		const data = fetchedData.cloneGreedyJson();

		const expanded = findOrExpandCharacter('clockmaker', data, fetchedData);
		expect(expanded).not.toBeNull();
		expect(expanded?.image).toBe('https://greedy.antihype.space/icons/carousel/clockmaker_g.webp');

		const catalog = makeCatalog(role);
		expect(catalog.lookupById('clockmaker')?.scriptImageUrls()).toEqual([
			'https://greedy.antihype.space/icons/carousel/clockmaker_g.webp',
		]);
	});

	it('normalizes image URLs only for card display', () => {
		const role: CharacterEntry = {
			id: 'clockmaker',
			name: 'Clockmaker',
			team: 'townsfolk',
			ability: 'Test ability',
			image: 'https://greedy.antihype.space/icons/carousel/clockmaker_g.webp',
		};
		const catalog = makeCatalog(role);

		expect(catalog.lookupById('clockmaker')?.displayImageUrls()).toEqual([
			'icons/carousel/clockmaker_g.webp',
		]);
	});
});
