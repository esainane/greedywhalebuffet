/**
 * Character processing utilities.
 */

import type { ScriptData, CharacterEntry, Character, MetaEntry } from './types.js';
import { FILTERABLE_TEAMS, COMMON_BANS, CUSTOM_CHARACTER_ID_SUFFIX } from './constants.js';
import type { FetchedData } from './data/fetched.js';

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

/**
 * Get night order position for a character.
 */
function nightOrder(id: string, ordering: string[], fetchedData: FetchedData): number | undefined {
	const baseId = getBaseCharacterId(id, fetchedData);
	const pos = ordering.indexOf(baseId);
	if (pos === -1) {
		return undefined;
	}
	return pos + 1;
}

/**
 * Get first night order position for a character.
 */
export function firstNightOrder(id: string, fetchedData: FetchedData): number | undefined {
	return nightOrder(id, fetchedData.getNightsheetData().firstNight, fetchedData);
}

/**
 * Get other night order position for a character.
 */
export function otherNightOrder(id: string, fetchedData: FetchedData): number | undefined {
	return nightOrder(id, fetchedData.getNightsheetData().otherNight, fetchedData);
}

/**
 * Get image array for a character entry.
 */
export function getImageArray(entry: CharacterEntry, fetchedData: FetchedData): string[] {
	const roleImage = entry.image;
	const team = entry?.team as string | undefined;
	if (!team || !FILTERABLE_TEAMS.has(team)) {
		throw new Error(`Could not find valid team for character ${entry.id}: ${team}`);
	}
	if (typeof roleImage === 'string') {
		return [roleImage];
	} else if (Array.isArray(roleImage)) {
		return roleImage;
	}
	// Fallback to Klutzbanana URL
	// Work out whether to ask for g or e as the standard image
	const baseId = getBaseCharacterId(entry.id, fetchedData);
	const [teamId, otherId] = ['townsfolk', 'outsider'].includes(team) ? ['g', 'e'] : ['e', 'g'];
	return [
		`https://images.klutzbanana.com/characters_official/${baseId}_${teamId}.png`,
		`https://images.klutzbanana.com/characters_official/${baseId}_${otherId}.png`,
	];
}

/**
 * Extract characters from script data.
 */
export function getCharacters(data: Readonly<ScriptData>, fetchedData: FetchedData): Character[] {
	const characters: Character[] = [];
	const roles = fetchedData.getRolesData();
	const startIndex = getMetaEntry(data) ? 1 : 0;

	for (let i = startIndex; i < data.length; i++) {
		const entry = data[i];

		if (typeof entry === 'string') {
			// Simple string ID - look up in roles.json
			const roleEntry = roles.find((r) => r.id === entry);
			const team = roleEntry?.team as string | undefined;

			// Only include if team is valid
			if (!roleEntry || !team || !FILTERABLE_TEAMS.has(team)) {
				continue;
			}

			characters.push({
				id: entry,
				name: roleEntry?.name || entry.charAt(0).toUpperCase() + entry.slice(1),
				imageUrl: getImageArray(roleEntry, fetchedData)[0],
			});
		} else if (typeof entry === 'object' && entry !== null) {
			const charEntry = entry as CharacterEntry;

			// Skip the "Choose your characters" pseudo-character
			if (charEntry.id === 'choose_your_chars') {
				continue;
			}

			// Only include characters with valid team types
			if (!charEntry.team || !FILTERABLE_TEAMS.has(charEntry.team)) {
				continue;
			}

			const imageUrl = Array.isArray(charEntry.image) ? charEntry.image[0] : undefined;
			characters.push({
				id: charEntry.id,
				name: charEntry.name || charEntry.id,
				imageUrl,
			});
		}
	}

	return characters;
}

/**
 * Split characters into quick-remove and remaining lists.
 */
export function splitCharactersByCommonBans(
	characters: Character[],
): { quickRemove: Character[]; remaining: Character[] } {
	const quickRemove: Character[] = [];
	const remaining: Character[] = [];

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
export function getMetaEntry(data: Readonly<ScriptData>): MetaEntry | null {
	if (!Array.isArray(data) || data.length === 0) {
		return null;
	}

	return isMetaEntry(data[0]) ? data[0] : null;
}

/**
 * Find a character in script data.
 */
export function findCharacterId(
	id: string, data: ScriptData, fetchedData: FetchedData,
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

/**
 * Find or expand a character in script data.
 * If the character is referenced as a string ID, expand it to a full object.
 */
export function findOrExpandCharacter(
	id: string,
	data: ScriptData,
	fetchedData: FetchedData,
): CharacterEntry | null {
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
		return existing;
	}

	// Find the string entry index (supports base and custom ID calls).
	const index = data.findIndex((d) => typeof d === 'string' && needle.includes(d));
	if (index === -1) {
		return null;
	}

	const roleDef = fetchedData.getRolesData().find((d) => d.id === baseId);
	if (!roleDef) {
		return null;
	}

	const clone = structuredClone(roleDef);
	clone.id = customId;

	// Update auto ID mappings atomically
	fetchedData.setAutoIdMapping(baseId, customId);

	clone.firstNight ??= firstNightOrder(baseId, fetchedData);
	clone.otherNight ??= otherNightOrder(baseId, fetchedData);
	clone.image ??= getImageArray(roleDef, fetchedData);

	data[index] = clone;
	return clone;
}
