import type { SelectableCharacter, GenerationOptions, GenerationResult } from '../types.js';
import type { Catalog } from '../data/catalog.js';
import { generate } from '../generation.js';
import {
	defaultPreferences,
	parseStoredPreferences,
	serializePreferences,
	type Preferences,
} from './preferences.js';
import { asApplicationError, type ApplicationError } from './errors.js';
import { ClipboardUnavailableError } from './browser-adapters.js';
import type {
	CatalogRepository,
	ClipboardPort,
	PreferencesRepository,
} from './ports.js';

export type CatalogViewModel = {
	scriptName: string;
	baseCharacters: SelectableCharacter[];
	greedierCharacters: SelectableCharacter[];
};

export function catalogToViewModel(catalog: Catalog): CatalogViewModel {
	return {
		scriptName: catalog.baseScript.meta.name,
		baseCharacters: catalog.baseSelectableCharacters(),
		greedierCharacters: [...catalog.greedierById.values()].map((character) => character.toSelectable()),
	};
}

type LastSuccessfulCatalog = {
	catalog: Catalog;
	loadedAt: number;
};

export type LoadCatalogResult =
	| {
			kind: 'success';
			catalog: Catalog;
			loadedAt: number;
	  }
	| {
			kind: 'stale';
			catalog: Catalog;
			loadedAt: number;
			error: ApplicationError;
	  }
	| {
			kind: 'error';
			error: ApplicationError;
	  }
	| { kind: 'aborted' };

export class CatalogLoadingService {
	private activeController: AbortController | null = null;
	private activeRequestId = 0;
	private lastSuccessful: LastSuccessfulCatalog | null = null;

	constructor(
		private readonly catalogRepository: CatalogRepository,
		private readonly now: () => number = () => Date.now(),
	) {}

	async reload(): Promise<LoadCatalogResult> {
		this.activeController?.abort();

		const controller = new AbortController();
		this.activeController = controller;
		const requestId = ++this.activeRequestId;

		try {
			const catalog = await this.catalogRepository.load(controller.signal);
			if (controller.signal.aborted || requestId !== this.activeRequestId) {
				return { kind: 'aborted' };
			}

			const loadedAt = this.now();
			this.lastSuccessful = { catalog, loadedAt };
			return { kind: 'success', catalog, loadedAt };
		} catch (error: unknown) {
			if (controller.signal.aborted || requestId !== this.activeRequestId) {
				return { kind: 'aborted' };
			}

			const appError = asApplicationError(
				'load_failed',
				'Unable to reload latest script.',
				error,
			);
			if (this.lastSuccessful) {
				return {
					kind: 'stale',
					catalog: this.lastSuccessful.catalog,
					loadedAt: this.lastSuccessful.loadedAt,
					error: appError,
				};
			}

			return {
				kind: 'error',
				error: appError,
			};
		} finally {
			if (requestId === this.activeRequestId && this.activeController === controller) {
				this.activeController = null;
			}
		}
	}

	dispose(): void {
		this.activeController?.abort();
		this.activeController = null;
	}
}

export type LoadPreferencesResult = {
	preferences: Preferences;
	migrated: boolean;
	error: ApplicationError | null;
};

export function loadPreferences(preferencesRepository: PreferencesRepository): LoadPreferencesResult {
	let serialized: string | null;
	try {
		serialized = preferencesRepository.load();
	} catch (error: unknown) {
		return {
			preferences: defaultPreferences(),
			migrated: false,
			error: asApplicationError(
				'preferences_unavailable',
				'Preferences storage is unavailable.',
				error,
			),
		};
	}

	const parsed = parseStoredPreferences(serialized);
	let error: ApplicationError | null = null;

	if (parsed.parseError) {
		error = {
			code: 'preferences_parse_failed',
			message: 'Stored preferences were invalid and have been reset to defaults.',
		};
	}

	if (parsed.migrated) {
		try {
			preferencesRepository.save(serializePreferences(parsed.preferences));
		} catch (migrationError: unknown) {
			error = asApplicationError(
				'preferences_unavailable',
				'Preferences could not be persisted after migration.',
				migrationError,
			);
		}
	}

	return {
		preferences: parsed.preferences,
		migrated: parsed.migrated,
		error,
	};
}

export function savePreferences(
	preferencesRepository: PreferencesRepository,
	preferences: Preferences,
): ApplicationError | null {
	try {
		preferencesRepository.save(serializePreferences(preferences));
		return null;
	} catch (error: unknown) {
		return asApplicationError(
			'preferences_unavailable',
			'Preferences could not be saved.',
			error,
		);
	}
}

export type GenerateScriptResult =
	| {
			kind: 'success';
			result: GenerationResult;
	  }
	| {
			kind: 'error';
			error: ApplicationError;
	  };

export function generateScript(
	request: { selectedCharacterIds: ReadonlySet<string>; options: GenerationOptions },
	catalog: Catalog,
): GenerateScriptResult {
	try {
		return {
			kind: 'success',
			result: generate(request, catalog),
		};
	} catch (error: unknown) {
		return {
			kind: 'error',
			error: asApplicationError(
				'generation_failed',
				'Unable to generate script output.',
				error,
			),
		};
	}
}

export type CopyScriptResult =
	| { kind: 'copied' }
	| { kind: 'missing_generation' }
	| {
			kind: 'error';
			error: ApplicationError;
	  };

export async function copyGeneratedScript(
	clipboard: ClipboardPort,
	generationResult: GenerationResult | null,
): Promise<CopyScriptResult> {
	if (!generationResult) {
		return { kind: 'missing_generation' };
	}

	try {
		await clipboard.writeText(JSON.stringify(generationResult.script, null, 2));
		return { kind: 'copied' };
	} catch (error: unknown) {
		if (error instanceof ClipboardUnavailableError) {
			return {
				kind: 'error',
				error: asApplicationError(
					'clipboard_unavailable',
					'Clipboard is unavailable in this browser.',
					error,
				),
			};
		}

		return {
			kind: 'error',
			error: asApplicationError(
				'clipboard_write_failed',
				'Copy failed.',
				error,
			),
		};
	}
}
