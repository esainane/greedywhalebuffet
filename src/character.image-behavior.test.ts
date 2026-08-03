import { describe, expect, it } from 'vitest';
import { GenerationContext, type CharacterResolver } from './data/catalog-entry.js';
import { Catalog, OneToOneIdMap, NightOrderIndex } from './data/catalog.js';
import { parseScriptFile, serializeScriptDocument } from './model/script-document.js';
import type { CharacterEntry } from './types.js';

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

function makeResolver(catalog: Catalog): CharacterResolver {
	return {
		catalog,
		generationContext: new GenerationContext(),
	};
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
		const catalog = makeCatalog(role);
		const resolver = makeResolver(catalog);
		const data = structuredClone(serializeScriptDocument(catalog.baseScript));

		const expanded = resolver.generationContext.findOrExpandCharacter('clockmaker', data, resolver.catalog);
		expect(expanded).not.toBeNull();
		expect(expanded?.image).toBe('https://greedy.antihype.space/icons/carousel/clockmaker_g.webp');

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
