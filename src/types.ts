/**
 * Mapping from Greedy character IDs to base character IDs, used for jinx merging.
 */

export type MappingFile = Record<string, string>;

/**
 * The leading script metadata entry; loader and generation code expect this at index 0.
 */
export type MetaEntry = {
	id: "_meta";
	name: string;
	bootlegger?: string[];
};

/**
 * Shared identity fields for character records loaded from JSON and reused in UI views.
 */
export type CharacterBase = {
	id: string;
	name: string;
	team: string;
	sourceSet?: number;
};

type JinxDefs = { id: string; reason: string }[];

/**
 * Full script character objects from schema-validated JSON, used by loader, generation, and jinx expansion.
 */
export type CharacterEntry = CharacterBase & {
	ability: string;
	image?: string | string[];
	edition?: string;
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
	imageUrl: string | string[];
};

/**
 * UI and generation toggles persisted in preferences and applied during export.
 */
export type GenerationOptions = {
	appendDuplicateLine: boolean;
	addSpiritOfIvory: boolean;
	alejoRules: boolean;
	listOfficialJinxes: boolean;
	listGreedyJinxes: boolean;
	addGreedierHomebrew: boolean;
};
