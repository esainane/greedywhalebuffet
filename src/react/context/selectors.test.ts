import { describe, expect, it } from 'vitest';
import {
	initialSourceState,
	type AppSourceState,
} from './AppContext.js';
import {
	selectCatalog,
	selectCharacterView,
	selectDisplayScriptName,
	selectGenerationOptions,
	selectGenerationResult,
	selectGreedierSortBySet,
	selectIsLoading,
	selectSelectedCharacterIds,
	selectStatus,
	selectUnsatisfiedDependencyCharacterIds,
} from './state-selectors.js';
import {
	buildTestOptions,
	createTestCatalog,
} from '../../test-helpers.js';

function createSourceState(overrides: Partial<AppSourceState> = {}): AppSourceState {
	return {
		...initialSourceState,
		...overrides,
	};
}

describe('selectors', () => {
	it('derives loading and empty defaults when catalog is not ready', () => {
		const state = createSourceState();

		expect(selectIsLoading(state)).toBe(true);
		expect(selectCatalog(state)).toBeNull();
		expect(selectCharacterView(state)).toEqual({
			baseCharacters: [],
			greedierCharacters: [],
			visibleCharacters: [],
		});
		expect(selectGenerationResult(state)).toBeNull();
		expect(selectUnsatisfiedDependencyCharacterIds(state)).toEqual(new Set());
		expect(selectDisplayScriptName(state)).toBe('Loading...');
	});

	it('derives catalog and visible pool from preferences', () => {
		const catalog = createTestCatalog({
			baseScript: [
				{ id: '_meta', name: 'Selector Script' },
				'base_a',
			],
			rolesData: [
				{
					id: 'base_a',
					name: 'Base A',
					team: 'townsfolk',
					ability: 'Ability',
				},
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
					sourceSet: 1,
				},
			],
		});
		const state = createSourceState({
			catalogLoad: { kind: 'ready', catalog, loadedAt: 100 },
			preferences: {
				...initialSourceState.preferences,
				options: buildTestOptions({ addGreedierHomebrew: false }),
			},
		});

		const view = selectCharacterView(state);
		expect(selectCatalog(state)).toBe(catalog);
		expect(view.baseCharacters.length).toBeGreaterThan(0);
		expect(view.greedierCharacters.length).toBe(1);
		expect(view.visibleCharacters).toEqual(view.baseCharacters);

		const withGreedierState = createSourceState({
			...state,
			preferences: {
				...state.preferences,
				options: buildTestOptions({ addGreedierHomebrew: true }),
			},
		});
		const withGreedier = selectCharacterView(withGreedierState);
		expect(withGreedier.visibleCharacters.length).toBe(
			withGreedier.baseCharacters.length + withGreedier.greedierCharacters.length,
		);
	});

	it('surfaces status, options, and sort preferences directly from source state', () => {
		const options = buildTestOptions({
			addGreedierHomebrew: true,
			useNoDeathAtNightJinxes: true,
		});
		const selectedCharacterIds = new Set(['a', 'b']);
		const state = createSourceState({
			notification: { message: 'Loaded', tone: 'success' },
			preferences: {
				...initialSourceState.preferences,
				options,
				greedierSortBySet: true,
			},
			selectedCharacterIds,
		});

		expect(selectStatus(state)).toEqual({ message: 'Loaded', tone: 'success' });
		expect(selectGenerationOptions(state)).toBe(options);
		expect(selectGreedierSortBySet(state)).toBe(true);
		expect(selectSelectedCharacterIds(state)).toBe(selectedCharacterIds);
	});

	it('prefers generated script name when generation succeeds', () => {
		const catalog = createTestCatalog({
			baseScript: [
				{ id: '_meta', name: 'Base Name' },
				'base_a',
			],
			rolesData: [
				{
					id: 'base_a',
					name: 'Base A',
					team: 'townsfolk',
					ability: 'Ability',
				},
			],
		});
		const selectedCharacterIds = new Set<string>(['base_a']);
		const state = createSourceState({
			catalogLoad: { kind: 'ready', catalog, loadedAt: 101 },
			selectedCharacterIds,
			preferences: {
				...initialSourceState.preferences,
				options: buildTestOptions({ addGreedierHomebrew: false }),
			},
		});

		const generationResult = selectGenerationResult(state);
		expect(generationResult).not.toBeNull();
		expect(selectDisplayScriptName(state)).toBe(generationResult?.scriptName);
	});

	it('uses fallback labels for stale and error states', () => {
		const catalog = createTestCatalog({
			baseScript: [{ id: '_meta', name: 'Fallback Script' }],
		});
		const staleState = createSourceState({
			catalogLoad: { kind: 'stale', catalog, loadedAt: 102, errorMessage: 'Timeout' },
		});
		const errorState = createSourceState({
			catalogLoad: { kind: 'error', message: 'No source available' },
		});

		expect(selectDisplayScriptName(staleState)).toBe('Fallback Script');
		expect(selectDisplayScriptName(errorState)).toBe('Unavailable');
	});
});
