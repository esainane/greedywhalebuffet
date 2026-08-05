import { useMemo } from 'react';
import {
	useCatalogLoadState,
	useNotificationState,
	usePreferencesState,
	useSelectedCharacterIdsState,
} from './AppContext.js';
import type { GenerationOptions, GenerationResult, SelectableCharacter } from '../../types.js';
import type { Catalog } from '../../data/catalog.js';
import type { AppSourceState, CatalogLoadState, StatusTone } from './AppContext.js';
import type { Preferences } from '../../application/preferences.js';
import {
	selectCharacterView,
	selectDependencyDiagnostics,
	selectDisplayScriptName,
	selectGenerationResult,
	selectUnsatisfiedDependencyCharacterIds,
} from './state-selectors.js';
import type { GenerationDiagnostic } from '../../types.js';

const EMPTY_SELECTED_CHARACTER_IDS = new Set<string>();

type GenerationDerivedState = {
	generationResult: GenerationResult | null;
	dependencyDiagnostics: readonly GenerationDiagnostic[];
	unsatisfiedDependencyCharacterIds: Set<string>;
	displayScriptName: string;
};

type CharacterView = {
	baseCharacters: SelectableCharacter[];
	greedierCharacters: SelectableCharacter[];
	visibleCharacters: SelectableCharacter[];
};

type PreferencesView = {
	options: GenerationOptions;
	greedierSortBySet: boolean;
};

function buildState(
	catalogLoad: CatalogLoadState,
	preferences: Preferences,
	selectedCharacterIds: Set<string>,
): AppSourceState {
	return {
		catalogLoad,
		preferences,
		selectedCharacterIds,
		notification: null,
	};
}

function deriveGenerationState(state: AppSourceState): GenerationDerivedState {
	const generationResult = selectGenerationResult(state);
	const dependencyDiagnostics = selectDependencyDiagnostics(state);
	const unsatisfiedDependencyCharacterIds = selectUnsatisfiedDependencyCharacterIds(state);
	const displayScriptName = generationResult?.scriptName ?? selectDisplayScriptName(state);

	return {
		generationResult,
		dependencyDiagnostics,
		unsatisfiedDependencyCharacterIds,
		displayScriptName,
	};
}

export function useGenerationDerivedState(): GenerationDerivedState {
	const catalogLoad = useCatalogLoadState();
	const preferences = usePreferencesState();
	const selectedCharacterIds = useSelectedCharacterIdsState();

	return useMemo(() => {
		const state = buildState(catalogLoad, preferences, selectedCharacterIds);
		return deriveGenerationState(state);
	}, [catalogLoad, preferences, selectedCharacterIds]);
}

export function useCharacterView(): CharacterView {
	const catalogLoad = useCatalogLoadState();
	const preferences = usePreferencesState();

	return useMemo(() => {
		const state = buildState(catalogLoad, preferences, EMPTY_SELECTED_CHARACTER_IDS);
		return selectCharacterView(state);
	}, [catalogLoad, preferences]);
}

export function usePreferencesView(): PreferencesView {
	const preferences = usePreferencesState();

	return useMemo(
		() => ({
			options: preferences.options,
			greedierSortBySet: preferences.greedierSortBySet,
		}),
		[preferences],
	);
}

export function useCatalog(): Catalog | null {
	const catalogLoad = useCatalogLoadState();
	return useMemo(() => {
		if (catalogLoad.kind === 'ready' || catalogLoad.kind === 'stale') {
			return catalogLoad.catalog;
		}

		return null;
	}, [catalogLoad]);
}

export function useIsLoading(): boolean {
	const catalogLoad = useCatalogLoadState();
	return useMemo(() => catalogLoad.kind === 'loading', [catalogLoad]);
}

export function useStatus(): { message: string; tone: StatusTone } {
	const notification = useNotificationState();
	return useMemo(
		() => ({
			message: notification?.message ?? '',
			tone: notification?.tone ?? 'info',
		}),
		[notification],
	);
}

export function useSelectedCharacterIds(): Set<string> {
	const selectedCharacterIds = useSelectedCharacterIdsState();
	return useMemo(() => selectedCharacterIds, [selectedCharacterIds]);
}
