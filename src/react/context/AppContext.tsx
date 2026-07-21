import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Character, GenerationOptions, ScriptData } from '../../types.js';
import type { FetchedData } from '../../data/fetched.js';
import { GENERATION_OPTIONS, getDependentOptions } from '../../options.js';
import { loadLatestJson } from '../../data/loader.js';
import { getCharacters, getMetaEntry } from '../../character.js';
import { buildCopyPayload } from '../../generation.js';

export type StatusTone = 'info' | 'success' | 'error';

export type AppState = {
	loading: boolean;
	status: string;
	statusTone: StatusTone;
	scriptName: string;
	fetchedData: FetchedData | null;
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
			characters: Character[];
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

const initialState: AppState = {
	loading: true,
	status: 'Loading latest script...',
	statusTone: 'info',
	scriptName: 'Loading...',
	fetchedData: null,
	characters: [],
	selectedCharacterIds: new Set<string>(),
	options: defaultOptions,
};

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
			const selectedCharacterIds = new Set(action.characters.map((character) => character.id));
			return {
				...state,
				loading: false,
				status: 'Script loaded.',
				statusTone: 'success',
				scriptName: action.scriptName,
				fetchedData: action.fetchedData,
				characters: action.characters,
				selectedCharacterIds,
			};
		}
		case 'load_error': {
			return {
				...state,
				loading: false,
				status: action.message,
				statusTone: 'error',
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
			return {
				...state,
				options: adjustedOptions,
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

	const setStatus = useCallback((message: string, tone: StatusTone = 'info') => {
		dispatch({ type: 'set_status', message, tone });
	}, []);

	const reload = useCallback(async () => {
		dispatch({ type: 'load_start', status: 'Loading latest script...' });
		try {
			const { fetchedData } = await loadLatestJson();
			const greedyJson = fetchedData.cloneGreedyJson();
			const metaEntry = getMetaEntry(greedyJson);
			const characters = getCharacters(greedyJson, fetchedData);

			dispatch({
				type: 'load_success',
				fetchedData,
				greedyJson,
				scriptName: metaEntry?.name ?? 'Unknown script',
				characters,
			});
		} catch (error: unknown) {
			dispatch({
				type: 'load_error',
				message: error instanceof Error ? error.message : 'Unable to reload latest script.',
			});
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
	}, [reload]);

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
