/**
 * Character processing utilities.
 */

import type { ScriptFile, CharacterEntry, SelectableCharacter, MetaEntry } from './types.js';
import { FILTERABLE_TEAMS, COMMON_BANS, CUSTOM_CHARACTER_ID_SUFFIX } from './constants.js';
import type { FetchedData } from './data/fetched.js';
import type { Catalog } from './data/catalog.js';

function isMetaEntry(value: unknown): value is MetaEntry {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	const entry = value as { id?: unknown; name?: unknown };
	return entry.id === '_meta' && typeof entry.name === 'string';
}

/**
 * Get base character ID from a potentially custom ID.
 */
export function getBaseCharacterId(id: string, fetchedData: FetchedData): string {
	return fetchedData.getGreedyToBaseID(id) ?? fetchedData.getAutoToBaseID(id) ?? id;
}

/**
 * Get custom character ID from a base ID.
 */
export function getCustomCharacterId(id: string, fetchedData: FetchedData): string {
	const baseId = getBaseCharacterId(id, fetchedData);

	const greedyCustom = fetchedData.getBaseToGreedyID(baseId);
	if (greedyCustom) {
		return greedyCustom;
	}

	const autoCustom = fetchedData.getBaseToAutoID(baseId);
	return autoCustom ?? `${baseId}${CUSTOM_CHARACTER_ID_SUFFIX}`;
}


export function getCharacters(catalog: Catalog): SelectableCharacter[] {
	const characters: SelectableCharacter[] = [];

	for (const entry of catalog.baseScript.entries) {
		const id = typeof entry === 'string' ? entry : entry.id;
		if (id === 'choose_your_chars') continue;
		const catalogEntry = catalog.lookupById(id);
		if (!catalogEntry || !FILTERABLE_TEAMS.has(catalogEntry.team)) continue;
		// For inline script entries use selectableFor to honour script-specific images.
		characters.push(typeof entry === 'string' ? catalogEntry.toSelectable() : catalog.selectableFor(entry));
	}

	return characters;
}

/**
 * Split characters into quick-remove and remaining lists.
 */
export function splitCharactersByCommonBans(
	characters: SelectableCharacter[],
): { quickRemove: SelectableCharacter[]; remaining: SelectableCharacter[] } {
	const quickRemove: SelectableCharacter[] = [];
	const remaining: SelectableCharacter[] = [];

	for (const character of characters) {
		if (COMMON_BANS.includes(character.id)) {
			quickRemove.push(character);
		} else {
			remaining.push(character);
		}
	}

	return { quickRemove, remaining };
}

/**
 * Get metadata entry from script data.
 */
export function getMetaEntry(data: Readonly<ScriptFile>): MetaEntry | null {
	if (!Array.isArray(data) || data.length === 0) {
		return null;
	}

	return isMetaEntry(data[0]) ? data[0] : null;
}

/**
 * Find a character in script data.
 */
export function findCharacterId(
	id: string, data: ScriptFile, fetchedData: FetchedData,
): string {
	const baseId = getBaseCharacterId(id, fetchedData);
	const customId = getCustomCharacterId(baseId, fetchedData);

	const needle = [id, baseId, customId];

	// Return existing full object if already expanded (base or custom ID).
	const existing = data.find(
		(entry) =>
			typeof entry === 'object' &&
			entry !== null &&
			'id' in entry &&
			needle.includes((entry as CharacterEntry).id),
	) as CharacterEntry | undefined;
	if (existing) {
		return existing.id;
	}

	return baseId;
}

export function findOrExpandCharacter(
	id: string,
	data: ScriptFile,
	fetchedData: FetchedData,
): CharacterEntry | null {
	const baseId = getBaseCharacterId(id, fetchedData);
	const customId = getCustomCharacterId(baseId, fetchedData);

	const needle = [id, baseId, customId];

	const existing = data.find(
		(entry) =>
			typeof entry === 'object' &&
			entry !== null &&
			'id' in entry &&
			needle.includes((entry as CharacterEntry).id),
	) as CharacterEntry | undefined;
	if (existing) {
		return existing;
	}

	const index = data.findIndex((d) => typeof d === 'string' && needle.includes(d));
	if (index === -1) {
		return null;
	}

	const catalogRoleDef = fetchedData.catalog.rolesById.get(baseId);
	if (!catalogRoleDef) {
		return null;
	}

	const clone = structuredClone(catalogRoleDef.entry);
	clone.id = customId;
	fetchedData.setAutoIdMapping(baseId, customId);
	clone.firstNight ??= fetchedData.catalog.firstNightOrder(baseId);
	clone.otherNight ??= fetchedData.catalog.otherNightOrder(baseId);
	clone.image ??= catalogRoleDef.scriptImageUrls();

	data[index] = clone;
	return clone;
}
