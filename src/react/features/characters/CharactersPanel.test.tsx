import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharactersPanel } from './CharactersPanel.js';

const mocks = vi.hoisted(() => ({
	addGreedierHomebrew: false,
}));

vi.mock('../../context/AppContext.js', () => ({
	useAppActions: () => ({
		toggleCharacter: () => {},
		setSelectedCharacterIds: () => {},
		setGreedierSortBySet: () => {},
	}),
}));

vi.mock('../../context/selectors.js', () => ({
	useCatalog: () => ({
		lookupById: (id: string) => {
			if (id === 'required_alpha') {
				return {
					entry: { id, name: 'Required Alpha' },
				};
			}

			return null;
		},
	}),
	useCharacterView: () => ({
		baseCharacters: [
			{
				id: 'chef',
				name: 'Chef',
				team: 'townsfolk',
				imageUrl: 'chef.png',
			},
		],
		greedierCharacters: [
			{
				id: 'aha',
				name: 'Aha',
				team: 'loric',
				imageUrl: 'aha.png',
			},
			{
				id: 'wanderer',
				name: 'Wanderer',
				team: 'traveller',
				imageUrl: 'wanderer.png',
			},
		],
		visibleCharacters: [],
	}),
	useGenerationDerivedState: () => ({
		unsatisfiedDependencyCharacterIds: new Set<string>(['chef']),
		dependencyDiagnostics: [
			{
				characterId: 'chef',
				missingDependencyIds: ['required_alpha'],
			},
		],
		generationResult: null,
		displayScriptName: 'Test Script',
	}),
	useIsLoading: () => false,
	usePreferencesView: () => ({
		options: { addGreedierHomebrew: mocks.addGreedierHomebrew },
		greedierSortBySet: false,
	}),
	useSelectedCharacterIds: () => new Set<string>(['chef']),
}));

describe('CharactersPanel', () => {
	it('renders explicit checkbox labeling and visible dependency text', () => {
		mocks.addGreedierHomebrew = false;
		const html = renderToStaticMarkup(<CharactersPanel />);

		expect(html).toContain('id="character-toggle-chef"');
		expect(html).toContain('aria-labelledby="character-label-chef"');
		expect(html).toContain('aria-describedby="character-dependencies-chef"');
		expect(html).toContain('Missing: Required Alpha');
		expect(html).not.toContain('<label class="inline-switch-control"');
		expect(html).not.toContain('greedier-character-list');
	});

	it('shows Greedier special teams only when enabled and leaves them deselected', () => {
		mocks.addGreedierHomebrew = true;
		const html = renderToStaticMarkup(<CharactersPanel />);
		const loricCheckbox = html.match(/<input[^>]*id="character-toggle-aha"[^>]*>/)?.[0];
		const travellerCheckbox = html.match(/<input[^>]*id="character-toggle-wanderer"[^>]*>/)?.[0];

		expect(loricCheckbox).toBeDefined();
		expect(loricCheckbox).not.toContain('checked=""');
		expect(html).toContain('<p class="team-label team-loric">Loric</p>');
		expect(travellerCheckbox).toBeDefined();
		expect(travellerCheckbox).not.toContain('checked=""');
		expect(html).toContain('<p class="team-label team-traveller">Traveller</p>');
	});
});
