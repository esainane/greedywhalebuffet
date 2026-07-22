/**
 * Script generation logic and option application.
 */

import type { ScriptData, GenerationOptions, CharacterEntry } from './types.js';
import { DUPLICATE_LINE, REMOVED_CHARACTERS_PREFIX, FILTERABLE_TEAMS } from './constants.js';
import {
	getMetaEntry,
	findOrExpandCharacter,
	firstNightOrder,
} from './character.js';
import { mergeJinxes } from './jinxes.js';
import type { FetchedData } from './data/fetched.js';

const SPIRIT_OF_IVORY_ID = 'spiritofivory';

function getEntryId(entry: ScriptData[number]): string | undefined {
	if (typeof entry === 'string') {
		return entry;
	}

	if (typeof entry === 'object' && entry !== null && 'id' in entry && typeof entry.id === 'string') {
		return entry.id;
	}

	return undefined;
}

/**
 * Apply duplicate line to meta entry.
 */
export function applyDuplicateLine(data: ScriptData): void {
	const metaEntry = getMetaEntry(data);
	if (!metaEntry) {
		return;
	}

	metaEntry.bootlegger = [...(metaEntry.bootlegger ?? []), DUPLICATE_LINE];
}

/**
 * Ensure Spirit of Ivory appears in the script character list.
 */
export function applySpiritOfIvory(data: ScriptData): void {
	if (data.find((entry) => getEntryId(entry) === SPIRIT_OF_IVORY_ID)) {
		return;
	}

	data.push(SPIRIT_OF_IVORY_ID);
}

/**
 * Apply Alejo rules (Philosopher/Snake Charmer first night ordering).
 */
export function applyAlejoRules(data: ScriptData, fetchedData: FetchedData): void {
	const snakeCharmer = findOrExpandCharacter('snakecharmer', data, fetchedData);

	if (!snakeCharmer) {
		return;
	}

	snakeCharmer.firstNight = firstNightOrder('philosopher', fetchedData);
}

/**
 * Apply official jinxes to script data.
 */
export function applyOfficialJinxes(data: ScriptData, fetchedData: FetchedData): void {
	const jinxData = fetchedData.getJinxData();
	if (jinxData.length === 0) {
		return;
	}

	mergeJinxes(data, jinxData, fetchedData);
}

/**
 * Apply Greedy-specific jinxes to script data.
 */
export function applyGreedyJinxes(data: ScriptData, fetchedData: FetchedData): void {
	const greedyJinxData = fetchedData.getGreedyJinxData();
	if (greedyJinxData.length === 0) {
		return;
	}

	mergeJinxes(data, greedyJinxData, fetchedData);
}

/**
 * Apply all selected generation options to script data.
 */
export function applyOptions(data: ScriptData, options: GenerationOptions, fetchedData: FetchedData): void {
	if (options.appendDuplicateLine) {
		applyDuplicateLine(data);
	}

	if (options.addSpiritOfIvory) {
		applySpiritOfIvory(data);
	}

	if (options.alejoRules) {
		applyAlejoRules(data, fetchedData);
	}

	if (options.listOfficialJinxes) {
		applyOfficialJinxes(data, fetchedData);
	}

	if (options.listGreedyJinxes) {
		applyGreedyJinxes(data, fetchedData);
	}
}

/**
 * Build the final JSON payload for copying to clipboard.
 */
export function buildCopyPayload(
	selectedCharacterIds: ReadonlySet<string>,
	options: GenerationOptions,
	fetchedData: FetchedData,
): string {
	const nextData = fetchedData.cloneGreedyJson();
	if (options.addGreedierHomebrew) {
		const existingIds = new Set(
			nextData
				.filter((entry): entry is string | CharacterEntry =>
					typeof entry === 'string' || (typeof entry === 'object' && entry !== null && 'id' in entry),
				)
				.map((entry) => (typeof entry === 'string' ? entry : entry.id)),
		);

		for (const greedierCharacter of fetchedData.getGreedierCharactersData()) {
			if (existingIds.has(greedierCharacter.id)) {
				continue;
			}

			nextData.push(structuredClone(greedierCharacter));
			existingIds.add(greedierCharacter.id);
		}
	}

	const metaEntry = getMetaEntry(nextData);
	if (!metaEntry) {
		throw new Error('Script metadata is missing or invalid.');
	}
	const removedCharacterNames: string[] = [];
	const rolesData = fetchedData.getRolesData();

	// Filter out deselected characters
	const filteredData: ScriptData = [metaEntry];
	for (let i = 1; i < nextData.length; i++) {
		const entry = nextData[i];
		let entryId: string | undefined;
		let entryName: string | undefined;
		let shouldAlwaysInclude = false;
		let isFilterableCharacter = false;

		if (typeof entry === 'string') {
			entryId = entry;
			entryName = rolesData.find((role) => role.id === entry)?.name ?? entry;
			const roleTeam = rolesData.find((role) => role.id === entry)?.team;
			isFilterableCharacter = !!roleTeam && FILTERABLE_TEAMS.has(roleTeam);
		} else if (typeof entry === 'object' && entry !== null && 'id' in entry) {
			const charEntry = entry as CharacterEntry;
			entryId = charEntry.id;
			entryName = charEntry.name || entryId;
			shouldAlwaysInclude = entryId === 'choose_your_chars';
			const entryTeam = charEntry.team;
			isFilterableCharacter = !!entryTeam && FILTERABLE_TEAMS.has(entryTeam);
		}

		if (
			!isFilterableCharacter ||
			shouldAlwaysInclude ||
			(entryId && selectedCharacterIds.has(entryId))
		) {
			filteredData.push(entry);
		} else if (isFilterableCharacter && entryId && entryName) {
			removedCharacterNames.push(entryName);
		}
	}

	if (metaEntry && removedCharacterNames.length > 0) {
		const bootlegger = Array.isArray(metaEntry.bootlegger) ? metaEntry.bootlegger : [];
		bootlegger.push(`${REMOVED_CHARACTERS_PREFIX}${removedCharacterNames.join(', ')}`);
		metaEntry.bootlegger = bootlegger;
	}

	applyOptions(filteredData, options, fetchedData);

	return JSON.stringify(filteredData, null, 2);
}
