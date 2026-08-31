/**
 * Mapping from Greedy character IDs to base character IDs, used for jinx merging.
 */

import type { GenerationOptions } from './options.js';
export type { GenerationOptions } from './options.js';

export type MappingFile = Record<string, string>;

/**
 * The leading script metadata entry; loader and generation code expect this at index 0.
 */
export type MetaEntry = {
	id: "_meta";
	name: string;
	author?: string;
	almanac?: string;
	background?: string;
	bootlegger?: string[];
};

/**
 * Shared identity fields for character records loaded from JSON and reused in UI views.
 */
export type CharacterBase = {
	id: string;
	name: string;
	team: string;
	edition?: string;
};

type JinxDefs = { id: string; reason: string }[];

/**
 * Full script character objects from schema-validated JSON, used by loader, generation, and jinx expansion.
 */
export type CharacterEntry = CharacterBase & {
	ability: string;
	image?: string | string[];
	flavor?: string;
	jinxes?: JinxDefs;
	firstNightReminder?: string;
	firstNight?: number;
	otherNightReminder?: string;
	otherNight?: number;
	reminders?: string[];
	remindersGlobal?: string[];
	setup?: boolean;
	special?: unknown[];
};

/**
 * Mixed script payload: `_meta` first, then string IDs or expanded character entries.
 */
export type ScriptFile = (MetaEntry | CharacterEntry | string)[];

export type ScriptEntry = CharacterEntry | string;

export type ScriptDocument = {
	readonly meta: MetaEntry;
	readonly entries: readonly ScriptEntry[];
};

export type CatalogCharacter = {
	readonly entry: CharacterEntry;
	readonly sourceSet?: number;
};

/**
 * One source character and the jinxes attached to it in a jinx JSON file.
 */
export type JinxFileEntry = {
	id: string;
	jinx: JinxDefs;
};

/**
 * Parsed jinx file payload used by validation, merging, and order checks.
 */
export type JinxFile = JinxFileEntry[];

/**
 * Parsed night-order data for the first and later nights.
 */
export type NightsheetFile = {
	firstNight: string[];
	otherNight: string[];
};

/**
 * Compact display model for the character selection list and related UI state.
 */
export type SelectableCharacter = CharacterBase & {
	imageUrl: string;
	sourceSet?: number;
};

export type GenerationRequest = {
	readonly selectedCharacterIds: ReadonlySet<string>;
	readonly options: GenerationOptions;
};

export type GenerationDiagnostic = {
	readonly characterId: string;
	readonly missingDependencyIds: readonly string[];
};

export type GenerationResult = {
	readonly script: ScriptFile;
	readonly scriptName: string;
	readonly diagnostics: readonly GenerationDiagnostic[];
};
