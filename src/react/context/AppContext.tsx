import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Character, GenerationOptions, ScriptData } from '../../types.js';
import type { FetchedData } from '../../data/fetched.js';
import { GENERATION_OPTIONS, getDependentOptions } from '../../options.js';
import { loadLatestJson } from '../../data/loader.js';
import { getCharacters, getMetaEntry } from '../../character.js';
import { buildCopyPayload } from '../../generation.js';

const PREFERENCES_STORAGE_KEY = 'gwb:preferences:v1';

type StoredPreferences = {
	options: GenerationOptions;
	bannedCharacterIds: string[];
};

export type StatusTone = 'info' | 'success' | 'error';

export type AppState = {
	loading: boolean;
	status: string;
	statusTone: StatusTone;
	scriptName: string;
	lastLoadedAt: number | null;
	usingStaleData: boolean;
	fetchedData: FetchedData | null;
	baseCharacters: Character[];
	greedierCharacters: Character[];
	characters: Character[];
	selectedCharacterIds: Set<string>;
	options: GenerationOptions;
};

type AppAction =
	| { type: 'load_start'; status: string }
	| {
			type: 'load_success';
			fetchedData: FetchedData;
			greedyJson: ScriptData;
			scriptName: string;
			baseCharacters: Character[];
			greedierCharacters: Character[];
			bannedCharacterIds: Set<string>;
	  }
	| { type: 'load_error'; message: string }
	| { type: 'set_status'; message: string; tone: StatusTone }
	| { type: 'toggle_option'; optionName: keyof GenerationOptions; checked: boolean }
	| { type: 'toggle_character'; id: string; checked: boolean };

export type AppActions = {
	reload: () => Promise<void>;
	setStatus: (message: string, tone?: StatusTone) => void;
	toggleOption: (optionName: keyof GenerationOptions, checked: boolean) => void;
	toggleCharacter: (id: string, checked: boolean) => void;
	copyToClipboard: () => Promise<void>;
};

const defaultOptions = GENERATION_OPTIONS.reduce((acc, option) => {
	acc[option.name] = option.defaultChecked;
	return acc;
}, {} as GenerationOptions);

function cloneDefaultOptions(): GenerationOptions {
	return { ...defaultOptions };
}

function isValidOptionName(value: string): value is keyof GenerationOptions {
	return GENERATION_OPTIONS.some((option) => option.name === value);
}

function parseStoredPreferences(rawValue: string): StoredPreferences | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawValue);
	} catch {
		return null;
	}

	if (!parsed || typeof parsed !== 'object') {
		return null;
	}

	const rawOptions =
		'options' in parsed && parsed.options && typeof parsed.options === 'object'
			? parsed.options
			: {};
	const options = cloneDefaultOptions();

	for (const [key, value] of Object.entries(rawOptions)) {
		if (!isValidOptionName(key) || typeof value !== 'boolean') {
			continue;
		}
		options[key] = value;
	}

	const bannedCharacterIds =
		'bannedCharacterIds' in parsed && Array.isArray(parsed.bannedCharacterIds)
			? parsed.bannedCharacterIds.filter((entry): entry is string => typeof entry === 'string')
			: [];

	return {
		options,
		bannedCharacterIds,
	};
}

function loadStoredPreferences(): StoredPreferences {
	const defaults: StoredPreferences = { options: cloneDefaultOptions(), bannedCharacterIds: [] };
	if (typeof window === 'undefined') {
		return defaults;
	}

	try {
		const rawValue = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
		if (!rawValue) {
			return defaults;
		}

		const parsed = parseStoredPreferences(rawValue);
		if (!parsed) {
			return defaults;
		}

		return parsed;
	} catch {
		return defaults;
	}
}

function saveStoredPreferences(preferences: StoredPreferences): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
	} catch {
		// Ignore persistence failures (private mode, storage quota, etc.)
	}
}

const storedPreferencesAtStartup = loadStoredPreferences();

const initialState: AppState = {
	loading: true,
	status: 'Loading latest script...',
	statusTone: 'info',
	scriptName: 'Loading...',
	lastLoadedAt: null,
	usingStaleData: false,
	fetchedData: null,
	baseCharacters: [],
	greedierCharacters: [],
	characters: [],
	selectedCharacterIds: new Set<string>(),
	options: storedPreferencesAtStartup.options,
};

function buildCharacterPool(
	baseCharacters: Character[],
	greedierCharacters: Character[],
	options: GenerationOptions,
): Character[] {
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

	const changedOption = GENERATION_OPTIONS.find((entry) => entry.name === changedOptionName);
	if (!changedOption) {
		return nextOptions;
	}

	const dependentOptions = getDependentOptions(changedOption.id);
	if (dependentOptions.length === 0) {
		return nextOptions;
	}

	const adjusted = { ...nextOptions };
	for (const dependent of dependentOptions) {
		adjusted[dependent.name] = false;
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
			const characters = buildCharacterPool(
				action.baseCharacters,
				action.greedierCharacters,
				state.options,
			);
			const selectedCharacterIds = new Set(
				characters
					.map((character) => character.id)
					.filter((characterId) => !action.bannedCharacterIds.has(characterId)),
			);
			const now = Date.now();
			return {
				...state,
				loading: false,
				status: 'Script loaded.',
				statusTone: 'success',
				scriptName: action.scriptName,
				lastLoadedAt: now,
				usingStaleData: false,
				fetchedData: action.fetchedData,
				baseCharacters: action.baseCharacters,
				greedierCharacters: action.greedierCharacters,
				characters,
				selectedCharacterIds,
			};
		}
		case 'load_error': {
			if (state.fetchedData && state.lastLoadedAt !== null) {
				return {
					...state,
					loading: false,
					status: `Reload failed; continuing to use data loaded at ${formatLoadTime(state.lastLoadedAt)}. (${action.message})`,
					statusTone: 'error',
					usingStaleData: true,
				};
			}

			return {
				...state,
				loading: false,
				status: `Initial load failed: ${action.message}`,
				statusTone: 'error',
				scriptName: 'Unavailable',
				lastLoadedAt: null,
				usingStaleData: false,
				fetchedData: null,
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
				const nextSelectedCharacterIds = new Set(state.selectedCharacterIds);
				for (const character of state.greedierCharacters) {
					nextSelectedCharacterIds.add(character.id);
				}

				return {
					...state,
					options: adjustedOptions,
					characters: nextCharacters,
					selectedCharacterIds: nextSelectedCharacterIds,
				};
			}

			const greedierIds = new Set(state.greedierCharacters.map((character) => character.id));
			const nextSelectedCharacterIds = new Set(
				[...state.selectedCharacterIds].filter((id) => !greedierIds.has(id)),
			);
			return {
				...state,
				options: adjustedOptions,
				characters: state.baseCharacters,
				selectedCharacterIds: nextSelectedCharacterIds,
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
	const activeLoadController = useRef<AbortController | null>(null);

	const setStatus = useCallback((message: string, tone: StatusTone = 'info') => {
		dispatch({ type: 'set_status', message, tone });
	}, []);

	const reload = useCallback(async () => {
		activeLoadController.current?.abort();
		const controller = new AbortController();
		activeLoadController.current = controller;

		dispatch({ type: 'load_start', status: 'Loading latest script...' });
		try {
			const { fetchedData } = await loadLatestJson({ signal: controller.signal });
			if (controller.signal.aborted) {
				return;
			}
			const greedyJson = fetchedData.cloneGreedyJson();
			const metaEntry = getMetaEntry(greedyJson);
			const baseCharacters = getCharacters(greedyJson, fetchedData);
			const greedierCharacters = fetchedData.getGreedierCharactersData().map((entry) => {
				const imageUrl = Array.isArray(entry.image) ? entry.image[0] : entry.image;
				return {
					id: entry.id,
					name: entry.name || entry.id,
					imageUrl,
				};
			});
			const storedPreferences = loadStoredPreferences();

			dispatch({
				type: 'load_success',
				fetchedData,
				greedyJson,
				scriptName: metaEntry?.name ?? 'Unknown script',
				baseCharacters,
				greedierCharacters,
				bannedCharacterIds: new Set(storedPreferences.bannedCharacterIds),
			});
		} catch (error: unknown) {
			if (controller.signal.aborted) {
				return;
			}

			dispatch({
				type: 'load_error',
				message: error instanceof Error ? error.message : 'Unable to reload latest script.',
			});
		} finally {
			if (activeLoadController.current === controller) {
				activeLoadController.current = null;
			}
		}
	}, []);

	const toggleOption = useCallback((optionName: keyof GenerationOptions, checked: boolean) => {
		dispatch({ type: 'toggle_option', optionName, checked });
	}, []);

	const toggleCharacter = useCallback((id: string, checked: boolean) => {
		dispatch({ type: 'toggle_character', id, checked });
	}, []);

	const copyToClipboard = useCallback(async () => {
		if (!state.fetchedData) {
			setStatus('No script data loaded yet.', 'error');
			return;
		}

		try {
			const payload = buildCopyPayload(
				state.selectedCharacterIds,
				state.options,
				state.fetchedData,
			);
			await navigator.clipboard.writeText(payload);
			setStatus('Copied!', 'success');
		} catch (error: unknown) {
			setStatus(error instanceof Error ? error.message : 'Copy failed.', 'error');
		}
	}, [setStatus, state.fetchedData, state.options, state.selectedCharacterIds]);

	useEffect(() => {
		void reload();
		return () => {
			activeLoadController.current?.abort();
		};
	}, [reload]);

	useEffect(() => {
		const bannedCharacterIds = state.characters
			.filter((character) => !state.selectedCharacterIds.has(character.id))
			.map((character) => character.id);

		saveStoredPreferences({
			options: state.options,
			bannedCharacterIds,
		});
	}, [state.characters, state.options, state.selectedCharacterIds]);

	const actions = useMemo<AppActions>(
		() => ({
			reload,
			setStatus,
			toggleOption,
			toggleCharacter,
			copyToClipboard,
		}),
		[copyToClipboard, reload, setStatus, toggleCharacter, toggleOption],
	);

	return (
		<AppStateContext.Provider value={state}>
			<AppActionsContext.Provider value={actions}>{children}</AppActionsContext.Provider>
		</AppStateContext.Provider>
	);
}
