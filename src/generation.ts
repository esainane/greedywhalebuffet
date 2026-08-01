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
import { applySelectedJinxes } from './jinxes.js';
import type { FetchedData } from './data/fetched.js';
import { getUnsatisfiedDependencyCharacterIds } from './dependencies.js';

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

function stripTransientCharacterFields(data: ScriptData): void {
	for (const entry of data) {
		if (typeof entry !== 'object' || entry === null || !('id' in entry) || entry.id === '_meta') {
			continue;
		}

		delete (entry as CharacterEntry).sourceSet;
	}
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

	if (options.listOfficialJinxes || options.listGreedyJinxes) {
		applySelectedJinxes(data, fetchedData, {
			includeOfficial: options.listOfficialJinxes,
			includeGreedy: options.listGreedyJinxes,
		});
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
	const unsatisfiedDependencyCharacterIds = getUnsatisfiedDependencyCharacterIds(
		selectedCharacterIds,
		fetchedData,
	);
	const exportableSelectedCharacterIds = new Set(
		Array.from(selectedCharacterIds).filter(
			(characterId) => !unsatisfiedDependencyCharacterIds.has(characterId),
		),
	);
	const greedierCharacterIds = new Set(
		fetchedData.getGreedierCharactersData().map((character) => character.id),
	);
	const hasSelectedGreedierCharacter =
		options.addGreedierHomebrew &&
		Array.from(exportableSelectedCharacterIds).some((characterId) => greedierCharacterIds.has(characterId));

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

	if (hasSelectedGreedierCharacter && typeof metaEntry.name === 'string') {
		metaEntry.name = metaEntry.name.replace(/\bGreedy\b/g, 'Greedier');
	}

	const removedBaseCharacterNames: string[] = [];
	const removedGreedierCharacterNames: string[] = [];
	const rolesData = fetchedData.getRolesData();

	// Filter out deselected characters
	const filteredData: ScriptData = [metaEntry];
	for (const entry of nextData) {
		if (entry === metaEntry) {
			continue;
		}

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
			(entryId && exportableSelectedCharacterIds.has(entryId))
		) {
			filteredData.push(entry);
		} else if (isFilterableCharacter && entryId && entryName) {
			if (greedierCharacterIds.has(entryId)) {
				removedGreedierCharacterNames.push(entryName);
			} else {
				removedBaseCharacterNames.push(entryName);
			}
		}
	}

	if (metaEntry && (removedBaseCharacterNames.length > 0 || removedGreedierCharacterNames.length > 0)) {
		const bootlegger = Array.isArray(metaEntry.bootlegger) ? metaEntry.bootlegger : [];
		const allRemovedCharacterNames = [
			...removedBaseCharacterNames,
			...removedGreedierCharacterNames,
		];
		const allRemovedLine = `${REMOVED_CHARACTERS_PREFIX}${allRemovedCharacterNames.join(', ')}`;
		const addedGreedierCharacterNames = fetchedData
			.getGreedierCharactersData()
			.filter((character) => exportableSelectedCharacterIds.has(character.id))
			.map((character) => character.name || character.id);
		const addedGreedierLine = `The following Greedier characters have been added: ${addedGreedierCharacterNames.join(', ')}`;

		const canUseMixedLine =
			removedBaseCharacterNames.length > 0 &&
			removedGreedierCharacterNames.length > 0 &&
			addedGreedierCharacterNames.length > 0;

		if (canUseMixedLine) {
			const baseRemovedLine = `${REMOVED_CHARACTERS_PREFIX}${removedBaseCharacterNames.join(', ')}`;
			const mixedLine = `${baseRemovedLine}. ${addedGreedierLine}`;

			bootlegger.push(mixedLine.length < allRemovedLine.length ? mixedLine : allRemovedLine);
		} else if (
			removedBaseCharacterNames.length === 0 &&
			removedGreedierCharacterNames.length > 0 &&
			addedGreedierCharacterNames.length > 0 &&
			addedGreedierLine.length < allRemovedLine.length
		) {
			bootlegger.push(addedGreedierLine);
		} else {
			bootlegger.push(allRemovedLine);
		}

		metaEntry.bootlegger = bootlegger;
	}

	applyOptions(filteredData, options, fetchedData);
	stripTransientCharacterFields(filteredData);

	return JSON.stringify(filteredData, null, 2);
}
