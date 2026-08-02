import { describe, expect, it } from 'vitest';
import {
	findOrExpandCharacter,
	getImageArray,
	getScriptImageArray,
} from './character.js';
import { FetchedData } from './data/fetched.js';
import type { CharacterEntry } from './types.js';

function makeFetchedData(role: CharacterEntry): FetchedData {
	return new FetchedData({
		greedyJson: [{ id: '_meta', name: 'Test Script' }, role.id],
		greedyJinxData: [],
		greedierJinxData: [],
		greedierCharactersData: [],
		greedyToBaseID: {},
		rolesData: [role],
		nightsheetData: { firstNight: [], otherNight: [] },
		jinxData: [],
	});
}

describe('character image behavior', () => {
	it('keeps script image URLs unnormalized for payload expansion', () => {
		const role: CharacterEntry = {
			id: 'clockmaker',
			name: 'Clockmaker',
			team: 'townsfolk',
			image: 'https://greedy.antihype.space/icons/carousel/clockmaker_g.webp',
		};
		const fetchedData = makeFetchedData(role);
		const data = fetchedData.cloneGreedyJson();

		const expanded = findOrExpandCharacter('clockmaker', data, fetchedData);
		expect(expanded).not.toBeNull();
		expect(expanded?.image).toBe('https://greedy.antihype.space/icons/carousel/clockmaker_g.webp');
		expect(getScriptImageArray(role, fetchedData)).toEqual([
			'https://greedy.antihype.space/icons/carousel/clockmaker_g.webp',
		]);
	});

	it('normalizes image URLs only for card display', () => {
		const role: CharacterEntry = {
			id: 'clockmaker',
			name: 'Clockmaker',
			team: 'townsfolk',
			image: 'https://greedy.antihype.space/icons/carousel/clockmaker_g.webp',
		};
		const fetchedData = makeFetchedData(role);

		expect(getImageArray(role, fetchedData)).toEqual([
			'icons/carousel/clockmaker_g.webp',
		]);
	});
});
