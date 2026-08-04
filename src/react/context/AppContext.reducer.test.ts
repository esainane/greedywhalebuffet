import { describe, expect, it } from 'vitest';
import { appReducer, initialSourceState, type AppSourceState } from './AppContext.js';
import { createTestCatalog, buildTestOptions } from '../../test-helpers.js';
import { defaultPreferences } from '../../application/preferences.js';

function createSourceState(overrides: Partial<AppSourceState> = {}): AppSourceState {
	return {
		...initialSourceState,
		...overrides,
	};
}

describe('appReducer', () => {
	it('applies load_success selections from banned IDs', () => {
		const catalog = createTestCatalog({
			baseScript: [{ id: '_meta', name: 'Reducer Script' }],
		});
		const action = {
			type: 'load_success' as const,
			loadedAt: 500,
			catalog,
			allCharacterIds: ['a', 'b', 'c'],
			bannedCharacterIds: new Set(['b']),
		};

		const next = appReducer(initialSourceState, action);

		expect(next.catalogLoad).toEqual({ kind: 'ready', catalog, loadedAt: 500 });
		expect(next.selectedCharacterIds).toEqual(new Set(['a', 'c']));
		expect(next.notification).toEqual({ message: 'Script loaded.', tone: 'success' });
	});

	it('resets preferences and reselects all known characters in one transition', () => {
		const catalog = createTestCatalog({
			baseScript: [
				{ id: '_meta', name: 'Reducer Script' },
				'base_a',
			],
			rolesData: [
				{ id: 'base_a', name: 'Base A', team: 'townsfolk', ability: 'Ability' },
			],
			greedierCharactersData: [
				{
					entry: {
						id: 'greedier_a',
						name: 'Greedier A',
						team: 'outsider',
						ability: 'Ability',
						edition: 'greedier',
					},
					sourceSet: 2,
				},
			],
		});
		const state = createSourceState({
			catalogLoad: { kind: 'ready', catalog, loadedAt: 100 },
			preferences: {
				...initialSourceState.preferences,
				options: buildTestOptions({ addGreedierHomebrew: false, listGreedyJinxes: true }),
				greedierSortBySet: false,
			},
			selectedCharacterIds: new Set<string>(),
			notification: null,
		});

		const next = appReducer(state, { type: 'reset_preferences' });

		expect(next.preferences).toEqual(defaultPreferences());
		expect(next.selectedCharacterIds).toEqual(new Set(['base_a', 'greedier_a']));
		expect(next.notification).toEqual({
			message: 'Preferences reset to defaults.',
			tone: 'success',
		});
	});

	it('stores a cloned selected-ID set for bulk updates', () => {
		const selected = new Set<string>(['alpha']);
		const next = appReducer(initialSourceState, {
			type: 'set_selected_character_ids',
			selectedCharacterIds: selected,
		});

		selected.add('beta');
		expect(next.selectedCharacterIds).toEqual(new Set(['alpha']));
	});

	it('does not create a new selected-ID set when toggling options', () => {
		const state = createSourceState({
			selectedCharacterIds: new Set<string>(['base_a']),
		});

		const next = appReducer(state, {
			type: 'toggle_option',
			optionName: 'addGreedierHomebrew',
			checked: true,
		});

		expect(next.selectedCharacterIds).toBe(state.selectedCharacterIds);
		expect(next.preferences.options.addGreedierHomebrew).toBe(true);
	});

	it('ignores load_stale transitions when not in ready state', () => {
		const state = createSourceState({ catalogLoad: { kind: 'loading' } });
		const next = appReducer(state, { type: 'load_stale', message: 'Network issue' });

		expect(next).toBe(state);
	});
});
