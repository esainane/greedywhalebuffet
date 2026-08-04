import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { SelectableCharacter, GenerationOptions, GenerationResult } from '../../types.js';
import type { Catalog } from '../../data/catalog.js';
import {
	defaultGenerationOptions,
	getDependentOptionNames,
} from '../../options.js';
import {
	createBrowserCatalogRepository,
	createLocalStoragePreferencesRepository,
	createNavigatorClipboardPort,
} from '../../application/browser-adapters.js';
import {
	CatalogLoadingService,
	catalogToViewModel,
	copyGeneratedScript,
	generateScript,
	loadPreferences,
	savePreferences,
} from '../../application/services.js';

const PREFERENCES_STORAGE_KEY = 'gwb:preferences:v1';

const preferencesRepository = createLocalStoragePreferencesRepository(PREFERENCES_STORAGE_KEY);
const catalogLoadingService = new CatalogLoadingService(createBrowserCatalogRepository());
const clipboardPort = createNavigatorClipboardPort();

type StatusTone = 'info' | 'success' | 'error';

type AppState = {
	loading: boolean;
	status: string;
	statusTone: StatusTone;
	scriptName: string;
	lastLoadedAt: number | null;
	usingStaleData: boolean;
	catalog: Catalog | null;
	baseCharacters: SelectableCharacter[];
	greedierCharacters: SelectableCharacter[];
	characters: SelectableCharacter[];
	selectedCharacterIds: Set<string>;
	generationResult: GenerationResult | null;
	unsatisfiedDependencyCharacterIds: Set<string>;
	options: GenerationOptions;
	greedierSortBySet: boolean;
};

type AppAction =
	| { type: 'load_start'; status: string }
	| {
			type: 'load_success';
			loadedAt: number;
			catalog: Catalog;
			scriptName: string;
			baseCharacters: SelectableCharacter[];
			greedierCharacters: SelectableCharacter[];
			bannedCharacterIds: Set<string>;
	  }
	| { type: 'load_stale'; message: string }
	| { type: 'load_error'; message: string }
	| { type: 'set_status'; message: string; tone: StatusTone }
	| { type: 'reset_preferences' }
	| { type: 'set_greedier_sort_by_set'; checked: boolean }
	| { type: 'toggle_option'; optionName: keyof GenerationOptions; checked: boolean }
	| { type: 'toggle_character'; id: string; checked: boolean };

type AppActions = {
	reload: () => Promise<void>;
	setStatus: (message: string, tone?: StatusTone) => void;
	resetPreferences: () => void;
	setGreedierSortBySet: (checked: boolean) => void;
	toggleOption: (optionName: keyof GenerationOptions, checked: boolean) => void;
	toggleCharacter: (id: string, checked: boolean) => void;
	copyToClipboard: () => Promise<void>;
};

const storedPreferencesAtStartup = loadPreferences(preferencesRepository).preferences;

const initialState: AppState = {
	loading: true,
	status: 'Loading latest script...',
	statusTone: 'info',
	scriptName: 'Loading...',
	lastLoadedAt: null,
	usingStaleData: false,
	catalog: null,
	baseCharacters: [],
	greedierCharacters: [],
	characters: [],
	selectedCharacterIds: new Set<string>(),
	generationResult: null,
	unsatisfiedDependencyCharacterIds: new Set<string>(),
	options: storedPreferencesAtStartup.options,
	greedierSortBySet: storedPreferencesAtStartup.greedierSortBySet,
};

function buildCharacterPool(
	baseCharacters: SelectableCharacter[],
	greedierCharacters: SelectableCharacter[],
	options: GenerationOptions,
): SelectableCharacter[] {
	if (!options.addGreedierHomebrew) {
		return baseCharacters;
	}

	return [...baseCharacters, ...greedierCharacters];
}

function formatLoadTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
	});
}

function applyDependentOptionRules(
	nextOptions: GenerationOptions,
	changedOptionName: keyof GenerationOptions,
	checked: boolean,
): GenerationOptions {
	if (checked) {
		return nextOptions;
	}

	const dependentOptionNames = getDependentOptionNames(changedOptionName);
	if (dependentOptionNames.length === 0) {
		return nextOptions;
	}

	const adjusted = { ...nextOptions };
	for (const dependentOptionName of dependentOptionNames) {
		adjusted[dependentOptionName] = false;
	}
	return adjusted;
}

function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case 'load_start': {
			return {
				...state,
				loading: true,
				status: action.status,
				statusTone: 'info',
			};
		}
		case 'load_success': {
			const allCharacters = [...action.baseCharacters, ...action.greedierCharacters];
			const characters = buildCharacterPool(
				action.baseCharacters,
				action.greedierCharacters,
				state.options,
			);
			const selectedCharacterIds = new Set(
				allCharacters
					.map((character) => character.id)
					.filter((characterId) => !action.bannedCharacterIds.has(characterId)),
			);
			return {
				...state,
				loading: false,
				status: 'Script loaded.',
				statusTone: 'success',
				scriptName: action.scriptName,
				lastLoadedAt: action.loadedAt,
				usingStaleData: false,
				catalog: action.catalog,
				baseCharacters: action.baseCharacters,
				greedierCharacters: action.greedierCharacters,
				characters,
				selectedCharacterIds,
			};
		}
		case 'load_stale': {
			return {
				...state,
				loading: false,
				status: action.message,
				statusTone: 'error',
				usingStaleData: true,
			};
		}
		case 'load_error': {
			return {
				...state,
				loading: false,
				status: `Initial load failed: ${action.message}`,
				statusTone: 'error',
				scriptName: 'Unavailable',
				lastLoadedAt: null,
				usingStaleData: false,
				catalog: null,
				baseCharacters: [],
				greedierCharacters: [],
				characters: [],
				selectedCharacterIds: new Set<string>(),
			};
		}
		case 'set_status': {
			return {
				...state,
				status: action.message,
				statusTone: action.tone,
			};
		}
		case 'reset_preferences': {
			const options = defaultGenerationOptions();
			const characters = buildCharacterPool(state.baseCharacters, state.greedierCharacters, options);
			const allCharacterIds = [...state.baseCharacters, ...state.greedierCharacters].map(
				(character) => character.id,
			);

			return {
				...state,
				status: 'Preferences reset to defaults.',
				statusTone: 'success',
				options,
				greedierSortBySet: true,
				characters,
				selectedCharacterIds: new Set(allCharacterIds),
			};
		}
		case 'set_greedier_sort_by_set': {
			return {
				...state,
				greedierSortBySet: action.checked,
			};
		}
		case 'toggle_option': {
			const nextOptions = { ...state.options, [action.optionName]: action.checked };
			const adjustedOptions = applyDependentOptionRules(nextOptions, action.optionName, action.checked);

			if (action.optionName !== 'addGreedierHomebrew') {
				return {
					...state,
					options: adjustedOptions,
				};
			}

			if (adjustedOptions.addGreedierHomebrew) {
				const nextCharacters = buildCharacterPool(
					state.baseCharacters,
					state.greedierCharacters,
					adjustedOptions,
				);
				return {
					...state,
					options: adjustedOptions,
					characters: nextCharacters,
					selectedCharacterIds: new Set(state.selectedCharacterIds),
				};
			}
			return {
				...state,
				options: adjustedOptions,
				characters: state.baseCharacters,
				selectedCharacterIds: new Set(state.selectedCharacterIds),
			};
		}
		case 'toggle_character': {
			const nextSelected = new Set(state.selectedCharacterIds);
			if (action.checked) {
				nextSelected.add(action.id);
			} else {
				nextSelected.delete(action.id);
			}
			return {
				...state,
				selectedCharacterIds: nextSelected,
			};
		}
		default:
			return state;
	}
}

const AppStateContext = createContext<AppState | null>(null);
const AppActionsContext = createContext<AppActions | null>(null);

export function useAppState(): AppState {
	const context = useContext(AppStateContext);
	if (!context) {
		throw new Error('useAppState must be used inside AppStateContext provider.');
	}
	return context;
}

export function useAppActions(): AppActions {
	const context = useContext(AppActionsContext);
	if (!context) {
		throw new Error('useAppActions must be used inside AppActionsContext provider.');
	}
	return context;
}

type AppProviderProps = {
	children: React.ReactNode;
};

export function AppProvider(props: AppProviderProps): React.JSX.Element {
	const { children } = props;
	const [state, dispatch] = useReducer(appReducer, initialState);
	const generationResult = useMemo(() => {
		if (!state.catalog) {
			return null;
		}

		const generated = generateScript(
			{ selectedCharacterIds: state.selectedCharacterIds, options: state.options },
			state.catalog,
		);
		return generated.kind === 'success' ? generated.result : null;
	}, [state.catalog, state.options, state.selectedCharacterIds]);
	const unsatisfiedDependencyCharacterIds = useMemo(() => {
		if (!generationResult) {
			return new Set<string>();
		}

		return new Set(generationResult.diagnostics.map((d) => d.characterId));
	}, [generationResult]);

	const appState = useMemo<AppState>(
		() => ({
			...state,
			generationResult,
			unsatisfiedDependencyCharacterIds,
		}),
		[state, generationResult, unsatisfiedDependencyCharacterIds],
	);

	const setStatus = useCallback((message: string, tone: StatusTone = 'info') => {
		dispatch({ type: 'set_status', message, tone });
	}, []);

	const reload = useCallback(async () => {
		dispatch({ type: 'load_start', status: 'Loading latest script...' });
		const loadResult = await catalogLoadingService.reload();
		if (loadResult.kind === 'aborted') {
			return;
		}

		if (loadResult.kind === 'error') {
			dispatch({
				type: 'load_error',
				message: loadResult.error.message,
			});
			return;
		}

		const preferencesResult = loadPreferences(preferencesRepository);
		const { scriptName, baseCharacters, greedierCharacters } = catalogToViewModel(loadResult.catalog);

		dispatch({
			type: 'load_success',
			loadedAt: loadResult.loadedAt,
			catalog: loadResult.catalog,
			scriptName,
			baseCharacters,
			greedierCharacters,
			bannedCharacterIds: new Set(preferencesResult.preferences.bannedCharacterIds),
		});

		if (loadResult.kind === 'stale') {
			dispatch({
				type: 'load_stale',
				message: `Reload failed; continuing to use data loaded at ${formatLoadTime(loadResult.loadedAt)}. (${loadResult.error.message})`,
			});
		}

		if (preferencesResult.error?.code === 'preferences_parse_failed') {
			setStatus(preferencesResult.error.message, 'info');
		}
	}, [setStatus]);

	const toggleOption = useCallback((optionName: keyof GenerationOptions, checked: boolean) => {
		dispatch({ type: 'toggle_option', optionName, checked });
	}, []);

	const setGreedierSortBySet = useCallback((checked: boolean) => {
		dispatch({ type: 'set_greedier_sort_by_set', checked });
	}, []);

	const resetPreferences = useCallback(() => {
		dispatch({ type: 'reset_preferences' });
	}, []);

	const toggleCharacter = useCallback((id: string, checked: boolean) => {
		dispatch({ type: 'toggle_character', id, checked });
	}, []);

	const copyToClipboard = useCallback(async () => {
		const copyResult = await copyGeneratedScript(clipboardPort, generationResult);
		if (copyResult.kind === 'copied') {
			setStatus('Copied!', 'success');
			return;
		}

		if (copyResult.kind === 'missing_generation') {
			setStatus('No script data loaded yet.', 'error');
			return;
		}

		setStatus(copyResult.error.message, 'error');
	}, [generationResult, setStatus]);

	useEffect(() => {
		void reload();
		return () => {
			catalogLoadingService.dispose();
		};
	}, [reload]);

	useEffect(() => {
		if (!state.catalog) {
			return;
		}

		const allKnownCharacters = [...state.baseCharacters, ...state.greedierCharacters];
		const bannedCharacterIds = allKnownCharacters
			.filter((character) => !state.selectedCharacterIds.has(character.id))
			.map((character) => character.id);

		savePreferences(preferencesRepository, {
			options: state.options,
			bannedCharacterIds,
			greedierSortBySet: state.greedierSortBySet,
		});
	}, [state.catalog, state.greedierSortBySet, state.options, state.selectedCharacterIds]);

	const actions = useMemo<AppActions>(
		() => ({
			reload,
			setStatus,
			resetPreferences,
			setGreedierSortBySet,
			toggleOption,
			toggleCharacter,
			copyToClipboard,
		}),
		[
			copyToClipboard,
			reload,
			resetPreferences,
			setGreedierSortBySet,
			setStatus,
			toggleCharacter,
			toggleOption,
		],
	);

	return (
		<AppStateContext.Provider value={appState}>
			<AppActionsContext.Provider value={actions}>{children}</AppActionsContext.Provider>
		</AppStateContext.Provider>
	);
}
