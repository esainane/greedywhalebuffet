import { catalogToViewModel, generateScript } from '../../application/services.js';
import type { Catalog } from '../../data/catalog.js';
import type { GenerationDiagnostic, GenerationOptions, GenerationResult, SelectableCharacter } from '../../types.js';
import type { AppSourceState, StatusTone } from './AppContext.js';

type GeneratedProjection = {
	catalog: Catalog | null;
	generationResult: GenerationResult | null;
};

export function selectCatalog(state: AppSourceState): Catalog | null {
	if (state.catalogLoad.kind === 'ready' || state.catalogLoad.kind === 'stale') {
		return state.catalogLoad.catalog;
	}

	return null;
}

export function selectIsLoading(state: AppSourceState): boolean {
	return state.catalogLoad.kind === 'loading';
}

export function selectStatus(state: AppSourceState): { message: string; tone: StatusTone } {
	return {
		message: state.notification?.message ?? '',
		tone: state.notification?.tone ?? 'info',
	};
}

export function selectCharacterView(state: AppSourceState): {
	baseCharacters: SelectableCharacter[];
	greedierCharacters: SelectableCharacter[];
	visibleCharacters: SelectableCharacter[];
} {
	const catalog = selectCatalog(state);
	if (!catalog) {
		return {
			baseCharacters: [],
			greedierCharacters: [],
			visibleCharacters: [],
		};
	}

	const { baseCharacters, greedierCharacters } = catalogToViewModel(catalog);
	const visibleCharacters = state.preferences.options.addGreedierHomebrew
		? [...baseCharacters, ...greedierCharacters]
		: baseCharacters;

	return {
		baseCharacters,
		greedierCharacters,
		visibleCharacters,
	};
}

function deriveGeneratedProjection(state: AppSourceState): GeneratedProjection {
	const catalog = selectCatalog(state);
	if (!catalog) {
		return {
			catalog: null,
			generationResult: null,
		};
	}

	const generated = generateScript(
		{ selectedCharacterIds: state.selectedCharacterIds, options: state.preferences.options },
		catalog,
	);

	return {
		catalog,
		generationResult: generated.kind === 'success' ? generated.result : null,
	};
}

export function selectGenerationResult(state: AppSourceState): GenerationResult | null {
	return deriveGeneratedProjection(state).generationResult;
}

export function selectDependencyDiagnostics(state: AppSourceState): readonly GenerationDiagnostic[] {
	const generationResult = selectGenerationResult(state);
	return generationResult?.diagnostics ?? [];
}

export function selectUnsatisfiedDependencyCharacterIds(state: AppSourceState): Set<string> {
	return new Set(selectDependencyDiagnostics(state).map((diagnostic) => diagnostic.characterId));
}

export function selectDisplayScriptName(state: AppSourceState): string {
	const { catalog, generationResult } = deriveGeneratedProjection(state);
	if (generationResult) {
		return generationResult.scriptName;
	}

	if (catalog) {
		return catalog.baseScript.meta.name;
	}

	return state.catalogLoad.kind === 'error' ? 'Unavailable' : 'Loading...';
}

export function selectGenerationOptions(state: AppSourceState): GenerationOptions {
	return state.preferences.options;
}

export function selectGreedierSortBySet(state: AppSourceState): boolean {
	return state.preferences.greedierSortBySet;
}

export function selectSelectedCharacterIds(state: AppSourceState): Set<string> {
	return state.selectedCharacterIds;
}
