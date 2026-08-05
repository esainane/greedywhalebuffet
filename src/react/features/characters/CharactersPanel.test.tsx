import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharactersPanel } from './CharactersPanel.js';

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
		greedierCharacters: [],
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
		options: { addGreedierHomebrew: false },
		greedierSortBySet: false,
	}),
	useSelectedCharacterIds: () => new Set<string>(['chef']),
}));

describe('CharactersPanel', () => {
	it('renders explicit checkbox labeling and visible dependency text', () => {
		const html = renderToStaticMarkup(<CharactersPanel />);

		expect(html).toContain('id="character-toggle-chef"');
		expect(html).toContain('aria-labelledby="character-label-chef"');
		expect(html).toContain('aria-describedby="character-dependencies-chef"');
		expect(html).toContain('Missing: Required Alpha');
		expect(html).not.toContain('<label class="inline-switch-control"');
	});
});
