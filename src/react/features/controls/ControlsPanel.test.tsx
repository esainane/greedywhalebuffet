import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOTC_SCRIPT_ENTRY_LIMIT } from '../../../constants.js';
import { defaultGenerationOptions } from '../../../options.js';
import { ControlsPanel } from './ControlsPanel.js';

const mocks = vi.hoisted(() => ({
	exportedEntryCount: 0,
}));

vi.mock('../../context/AppContext.js', () => ({
	useAppActions: () => ({
		copyToClipboard: async () => {},
		reload: async () => {},
		resetPreferences: () => {},
		toggleOption: () => {},
	}),
}));

vi.mock('../../context/selectors.js', () => ({
	useCharacterView: () => ({ visibleCharacters: [] }),
	useGenerationDerivedState: () => ({
		displayScriptName: 'Test Script',
		generationResult: {
			script: Array.from({ length: mocks.exportedEntryCount }, () => 'character'),
			scriptName: 'Test Script',
			diagnostics: [],
		},
		unsatisfiedDependencyCharacterIds: new Set<string>(),
	}),
	useIsLoading: () => false,
	usePreferencesView: () => ({ options: defaultGenerationOptions() }),
	useSelectedCharacterIds: () => new Set<string>(),
	useStatus: () => ({ message: 'Script loaded.', tone: 'success' }),
}));

describe('ControlsPanel script size warning', () => {
	beforeEach(() => {
		mocks.exportedEntryCount = BOTC_SCRIPT_ENTRY_LIMIT;
	});

	it('does not warn for a schema-compliant script', () => {
		const html = renderToStaticMarkup(<ControlsPanel />);

		expect(html).not.toContain('id="script-size-warning"');
		expect(html).not.toContain('class="copy-warning-icon"');
		expect(html).not.toContain('aria-describedby="script-size-warning"');
	});

	it('reports how many characters must be removed from an oversized script', () => {
		mocks.exportedEntryCount = BOTC_SCRIPT_ENTRY_LIMIT + 3;

		const html = renderToStaticMarkup(<ControlsPanel />);

		expect(html).toContain('id="script-size-warning"');
		expect(html).toContain('class="copy-warning-icon"');
		expect(html).toContain('aria-describedby="script-size-warning"');
		expect(html).toContain('There are too many characters selected');
		expect(html).toContain('Remove at least 3 more characters for the BotC App to accept it.');
	});

	it('uses singular wording for one excess entry', () => {
		mocks.exportedEntryCount = BOTC_SCRIPT_ENTRY_LIMIT + 1;

		const html = renderToStaticMarkup(<ControlsPanel />);

		expect(html).toContain('Remove at least 1 more character for the BotC App to accept it.');
	});
});
