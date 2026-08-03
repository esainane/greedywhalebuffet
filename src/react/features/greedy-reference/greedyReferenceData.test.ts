import { describe, expect, it } from 'vitest';
import { deriveGreedyHomebrew, deriveGreedyJinxes } from './greedyReferenceData.js';
import { createTestCatalog } from '../../../test-helpers.js';

describe('deriveGreedyHomebrew', () => {
	it('preserves source set order by default', () => {
		const catalog = createTestCatalog({
			greedierCharactersData: [
				{ entry: { id: 'omega', name: 'Omega', team: 'demon', ability: 'Omega ability', edition: 'greedier' }, sourceSet: 3 },
				{ entry: { id: 'alpha', name: 'Alpha', team: 'townsfolk', ability: 'Alpha ability', edition: 'greedier' }, sourceSet: 1 },
				{ entry: { id: 'beta', name: 'Beta', team: 'townsfolk', ability: 'Beta ability', edition: 'greedier' }, sourceSet: 1 },
			],
		});

		expect(deriveGreedyHomebrew(catalog).map((entry) => entry.character.id)).toEqual([
			'omega',
			'alpha',
			'beta',
		]);
		expect(deriveGreedyHomebrew(catalog).map((entry) => entry.character.sourceSet)).toEqual([
			3,
			1,
			1,
		]);
	});

	it('sorts by canonical team and name when sort-by-set is disabled', () => {
		const catalog = createTestCatalog({
			greedierCharactersData: [
				{ entry: { id: 'omega', name: 'Omega', team: 'demon', ability: 'Omega ability', edition: 'greedier' } },
				{ entry: { id: 'beta', name: 'Beta', team: 'townsfolk', ability: 'Beta ability', edition: 'greedier' } },
				{ entry: { id: 'alpha', name: 'Alpha', team: 'townsfolk', ability: 'Alpha ability', edition: 'greedier' } },
				{ entry: { id: 'zed', name: 'Zed', team: 'minion', ability: 'Zed ability', edition: 'greedier' } },
			],
		});

		expect(deriveGreedyHomebrew(catalog, false).map((entry) => entry.character.id)).toEqual([
			'alpha',
			'beta',
			'zed',
			'omega',
		]);
	});
});

describe('deriveGreedyJinxes', () => {
	it('includes greedier homebrew jinxes only when enabled', () => {
		const catalog = createTestCatalog({
			greedyJson: [
				{ id: 'clockmaker', name: 'Clockmaker', team: 'townsfolk', ability: "Clockmaker ability" },
				{ id: 'imp', name: 'Imp', team: 'demon', ability: "Imp ability" },
			],
			greedy: [
				{ id: 'clockmaker', jinx: [{ id: 'imp', reason: 'Greedy jinx reason' }] },
			],
			greedier: [
				{ id: 'homebrew_a', jinx: [{ id: 'homebrew_b', reason: 'Greedier jinx reason' }] },
			],
			greedierCharactersData: [
				{ entry: { id: 'homebrew_a', name: 'Homebrew A', team: 'townsfolk', ability: 'Homebrew A ability', edition: 'greedier' } },
				{ entry: { id: 'homebrew_b', name: 'Homebrew B', team: 'demon', ability: 'Homebrew B ability', edition: 'greedier' } },
			],
		});

		const baseOnly = deriveGreedyJinxes(catalog, { includeGreedierHomebrew: false });
		expect(baseOnly.map((entry) => entry.reason)).toEqual(['Greedy jinx reason']);
		expect(baseOnly.map((entry) => entry.origin)).toEqual(['greedy']);

		const withGreedier = deriveGreedyJinxes(catalog, { includeGreedierHomebrew: true });
		expect(withGreedier.map((entry) => entry.reason)).toEqual([
			'Greedy jinx reason',
			'Greedier jinx reason',
		]);
		expect(withGreedier.map((entry) => entry.origin)).toEqual([
			'greedy',
			'greedier-homebrew',
		]);
	});

	it('hides no-death-at-night jinx combinations unless explicitly enabled', () => {
		const catalog = createTestCatalog({
			greedyJson: [
				{ id: 'leviathan', name: 'Leviathan', team: 'demon', ability: 'Leviathan ability' },
				{ id: 'soldier', name: 'Soldier', team: 'townsfolk', ability: 'Soldier ability' },
				{ id: 'baron', name: 'Baron', team: 'minion', ability: 'Baron ability' },
			],
			greedy: [
				{
					id: 'leviathan',
					jinx: [
						{ id: 'soldier', reason: 'No-death-at-night pair' },
						{ id: 'baron', reason: 'Unrelated pair' },
					],
				},
			],
		});

		const filtered = deriveGreedyJinxes(catalog, { includeNoDeathAtNightJinxes: false });
		expect(filtered.map((entry) => entry.reason)).toEqual(['Unrelated pair']);

		const included = deriveGreedyJinxes(catalog, { includeNoDeathAtNightJinxes: true });
		expect(included.map((entry) => entry.reason)).toEqual([
			'No-death-at-night pair',
			'Unrelated pair',
		]);
	});
});
