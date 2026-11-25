import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestOptions, createTestCatalog } from '../../../test-helpers.js';
import { GreedyReferencePanel } from './GreedyReferencePanel.js';

const state = {
	catalog: createTestCatalog({
		baseScript: [
			{ id: '_meta', name: 'Reference Script', bootlegger: ['The Demon receives no bluffs.'] },
			{ id: 'summoner', name: 'Summoner', team: 'minion', ability: 'Greedy ability.' },
		],
		rolesData: [
			{ id: 'summoner', name: 'Summoner', team: 'minion', ability: 'You get 3 bluffs. Official ability.' },
		],
	}),
	options: buildTestOptions({ noDemonBluffs: true }),
};

vi.mock('../../context/selectors.js', () => ({
	useCatalog: () => state.catalog,
	useIsLoading: () => false,
	usePreferencesView: () => ({ options: state.options, greedierSortBySet: true }),
}));

vi.mock('../../context/AppContext.js', () => ({
	useAppActions: () => ({ setGreedierSortBySet: () => {} }),
}));

afterEach(cleanup);

describe('GreedyReferencePanel', () => {
	it('updates the displayed differences when generation options change', () => {
		state.options = buildTestOptions({ noDemonBluffs: true });
		const { container, rerender } = render(<GreedyReferencePanel />);
		const removedText = () => [...container.querySelectorAll('#section-greedy-characters .diff-removed')]
			.map((element) => element.textContent).join('');

		expect(removedText()).toContain('You get 3 bluffs.');

		state.options = buildTestOptions({ noDemonBluffs: false });
		rerender(<GreedyReferencePanel />);
		expect(removedText()).not.toContain('You get 3 bluffs.');
		expect(container.querySelector('#section-greedy-characters')?.textContent).toContain('You get 3 bluffs.');
	});
});
