import { describe, expect, it } from 'vitest';
import type { CharacterEntry } from './types.js';
import { cloneSerializedScript, createTestCatalog, createTestResolver } from './test-helpers.js';

describe('character image behavior', () => {
	it('keeps script image URLs unnormalized for payload expansion', () => {
		const role: CharacterEntry = {
			id: 'clockmaker',
			name: 'Clockmaker',
			team: 'townsfolk',
			ability: 'Test ability',
			image: 'https://greedy.antihype.space/icons/carousel/clockmaker_g.webp',
		};
		const catalog = createTestCatalog({
			rolesData: [role],
			baseScript: [{ id: '_meta', name: 'Test Script' }, role.id],
		});
		const resolver = createTestResolver(catalog);
		const data = cloneSerializedScript(catalog);

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
		const catalog = createTestCatalog({
			rolesData: [role],
			baseScript: [{ id: '_meta', name: 'Test Script' }, role.id],
		});

		expect(catalog.lookupById('clockmaker')?.displayImageUrls()).toEqual([
			'icons/carousel/clockmaker_g.webp',
		]);
	});
});
