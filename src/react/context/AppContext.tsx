import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { GenerationOptions, GenerationResult } from '../../types.js';
import type { Catalog } from '../../data/catalog.js';
import {
	getDependentOptionNames,
} from '../../options.js';
import {
	createBrowserCatalogRepository,
	createLocalStoragePreferencesRepository,
	createNavigatorClipboardPort,
} from '../../application/browser-adapters.js';
import { defaultPreferences, type Preferences } from '../../application/preferences.js';
import {
	CatalogLoadingService,
	catalogToViewModel,
	copyGeneratedScript,
	loadPreferences,
	savePreferences,
} from '../../application/services.js';
import { selectCharacterView, selectGenerationResult } from './state-selectors.js';

const PREFERENCES_STORAGE_KEY = 'gwb:preferences:v1';

const preferencesRepository = createLocalStoragePreferencesRepository(PREFERENCES_STORAGE_KEY);
const catalogLoadingService = new CatalogLoadingService(createBrowserCatalogRepository());
const clipboardPort = createNavigatorClipboardPort();

export type StatusTone = 'info' | 'success' | 'error';

export type CatalogLoadState =
	| { kind: 'loading' }
	| { kind: 'ready'; catalog: Catalog; loadedAt: number }
	| { kind: 'stale'; catalog: Catalog; loadedAt: number; errorMessage: string }
	| { kind: 'error'; message: string };

export type Notification = {
	message: string;
	tone: StatusTone;
};

export type AppSourceState = {
	catalogLoad: CatalogLoadState;
	preferences: Preferences;
	selectedCharacterIds: Set<string>;
	notification: Notification | null;
};

export type AppAction =
	| { type: 'load_start' }
	| {
			type: 'load_success';
			loadedAt: number;
			catalog: Catalog;
			allCharacterIds: readonly string[];
			bannedCharacterIds: Set<string>;
	  }
	| { type: 'load_stale'; message: string }
	| { type: 'load_error'; message: string }
	| { type: 'set_status'; message: string; tone: StatusTone }
	| { type: 'reset_preferences' }
	| { type: 'set_greedier_sort_by_set'; checked: boolean }
	| { type: 'toggle_option'; optionName: keyof GenerationOptions; checked: boolean }
	| { type: 'set_selected_character_ids'; selectedCharacterIds: ReadonlySet<string> }
	| { type: 'toggle_character'; id: string; checked: boolean };

export type AppActions = {
	reload: () => Promise<void>;
	resetPreferences: () => void;
	setGreedierSortBySet: (checked: boolean) => void;
	toggleOption: (optionName: keyof GenerationOptions, checked: boolean) => void;
	setSelectedCharacterIds: (selectedCharacterIds: ReadonlySet<string>) => void;
	toggleCharacter: (id: string, checked: boolean) => void;
	copyToClipboard: () => Promise<void>;
};

const storedPreferencesAtStartup = loadPreferences(preferencesRepository).preferences;

export const initialSourceState: AppSourceState = {
	catalogLoad: { kind: 'loading' },
	preferences: storedPreferencesAtStartup,
	selectedCharacterIds: new Set<string>(),
	notification: {
		message: 'Loading latest script...',
		tone: 'info',
	},
};

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

export function appReducer(state: AppSourceState, action: AppAction): AppSourceState {
	switch (action.type) {
		case 'load_start': {
			return {
				...state,
				catalogLoad: { kind: 'loading' },
				notification: {
					message: 'Loading latest script...',
					tone: 'info',
				},
			};
		}
		case 'load_success': {
			const selectedCharacterIds = new Set(
				action.allCharacterIds.filter((characterId) => !action.bannedCharacterIds.has(characterId)),
			);
			return {
				...state,
				catalogLoad: {
					kind: 'ready',
					catalog: action.catalog,
					loadedAt: action.loadedAt,
				},
				selectedCharacterIds,
				notification: {
					message: 'Script loaded.',
					tone: 'success',
				},
			};
		}
		case 'load_stale': {
			if (state.catalogLoad.kind !== 'ready') {
				return state;
			}

			return {
				...state,
				catalogLoad: {
					kind: 'stale',
					catalog: state.catalogLoad.catalog,
					loadedAt: state.catalogLoad.loadedAt,
					errorMessage: action.message,
				},
				notification: {
					message: action.message,
					tone: 'error',
				},
			};
		}
		case 'load_error': {
			return {
				...state,
				catalogLoad: {
					kind: 'error',
					message: action.message,
				},
				selectedCharacterIds: new Set<string>(),
				notification: {
					message: `Initial load failed: ${action.message}`,
					tone: 'error',
				},
			};
		}
		case 'set_status': {
			return {
				...state,
				notification: {
					message: action.message,
					tone: action.tone,
				},
			};
		}
		case 'reset_preferences': {
			const nextPreferences = defaultPreferences();
			const catalogView =
				state.catalogLoad.kind === 'ready' || state.catalogLoad.kind === 'stale'
					? catalogToViewModel(state.catalogLoad.catalog)
					: null;
			const allCharacterIds = catalogView
				? [...catalogView.baseCharacters, ...catalogView.greedierCharacters].map((character) => character.id)
				: [];

			return {
				...state,
				preferences: nextPreferences,
				selectedCharacterIds: new Set(allCharacterIds),
				notification: {
					message: 'Preferences reset to defaults.',
					tone: 'success',
				},
			};
		}
		case 'set_greedier_sort_by_set': {
			return {
				...state,
				preferences: {
					...state.preferences,
					greedierSortBySet: action.checked,
				},
			};
		}
		case 'toggle_option': {
			const nextOptions = { ...state.preferences.options, [action.optionName]: action.checked };
			const adjustedOptions = applyDependentOptionRules(nextOptions, action.optionName, action.checked);

			return {
				...state,
				preferences: {
					...state.preferences,
					options: adjustedOptions,
				},
			};
		}
		case 'set_selected_character_ids': {
			return {
				...state,
				selectedCharacterIds: new Set(action.selectedCharacterIds),
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

const CatalogLoadContext = createContext<CatalogLoadState | null>(null);
const PreferencesContext = createContext<Preferences | null>(null);
const SelectedCharacterIdsContext = createContext<Set<string> | null>(null);
const MISSING_NOTIFICATION = Symbol('missing_notification_context');
const NotificationContext = createContext<Notification | null | typeof MISSING_NOTIFICATION>(
	MISSING_NOTIFICATION,
);
const AppActionsContext = createContext<AppActions | null>(null);

function deriveCatalog(catalogLoad: CatalogLoadState): Catalog | null {
	if (catalogLoad.kind === 'ready' || catalogLoad.kind === 'stale') {
		return catalogLoad.catalog;
	}

	return null;
}

export function useCatalogLoadState(): CatalogLoadState {
	const context = useContext(CatalogLoadContext);
	if (!context) {
		throw new Error('useCatalogLoadState must be used inside AppProvider.');
	}
	return context;
}

export function usePreferencesState(): Preferences {
	const context = useContext(PreferencesContext);
	if (!context) {
		throw new Error('usePreferencesState must be used inside AppProvider.');
	}
	return context;
}

export function useSelectedCharacterIdsState(): Set<string> {
	const context = useContext(SelectedCharacterIdsContext);
	if (!context) {
		throw new Error('useSelectedCharacterIdsState must be used inside AppProvider.');
	}
	return context;
}

export function useNotificationState(): Notification | null {
	const context = useContext(NotificationContext);
	if (context === MISSING_NOTIFICATION) {
		throw new Error('useNotificationState must be used inside AppProvider.');
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
	const [state, dispatch] = useReducer(appReducer, initialSourceState);
	const catalog = useMemo(() => deriveCatalog(state.catalogLoad), [state.catalogLoad]);
	const options = state.preferences.options;
	const greedierSortBySet = state.preferences.greedierSortBySet;
	const generationResult = useMemo<GenerationResult | null>(() => selectGenerationResult(state), [state]);
	const { baseCharacters, greedierCharacters } = useMemo(() => selectCharacterView(state), [state]);

	const setStatus = useCallback((message: string, tone: StatusTone = 'info') => {
		dispatch({ type: 'set_status', message, tone });
	}, []);

	const reload = useCallback(async () => {
		dispatch({ type: 'load_start' });
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
		const { baseCharacters, greedierCharacters } = catalogToViewModel(loadResult.catalog);
		const allCharacterIds = [...baseCharacters, ...greedierCharacters].map((character) => character.id);

		dispatch({
			type: 'load_success',
			loadedAt: loadResult.loadedAt,
			catalog: loadResult.catalog,
			allCharacterIds,
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

	const setSelectedCharacterIds = useCallback((selectedCharacterIds: ReadonlySet<string>) => {
		dispatch({ type: 'set_selected_character_ids', selectedCharacterIds });
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
		if (!catalog) {
			return;
		}
		const allKnownCharacters = [...baseCharacters, ...greedierCharacters];
		const bannedCharacterIds = allKnownCharacters
			.filter((character) => !state.selectedCharacterIds.has(character.id))
			.map((character) => character.id);

		savePreferences(preferencesRepository, {
			options,
			bannedCharacterIds,
			greedierSortBySet,
		});
	}, [
		baseCharacters,
		catalog,
		greedierCharacters,
		greedierSortBySet,
		options,
		state.selectedCharacterIds,
	]);

	const actions = useMemo<AppActions>(
		() => ({
			reload,
			resetPreferences,
			setGreedierSortBySet,
			toggleOption,
			setSelectedCharacterIds,
			toggleCharacter,
			copyToClipboard,
		}),
		[
			copyToClipboard,
			reload,
			resetPreferences,
			setSelectedCharacterIds,
			setGreedierSortBySet,
			toggleCharacter,
			toggleOption,
		],
	);

	return (
		<CatalogLoadContext.Provider value={state.catalogLoad}>
			<PreferencesContext.Provider value={state.preferences}>
				<SelectedCharacterIdsContext.Provider value={state.selectedCharacterIds}>
					<NotificationContext.Provider value={state.notification}>
						<AppActionsContext.Provider value={actions}>{children}</AppActionsContext.Provider>
					</NotificationContext.Provider>
				</SelectedCharacterIdsContext.Provider>
			</PreferencesContext.Provider>
		</CatalogLoadContext.Provider>
	);
}
