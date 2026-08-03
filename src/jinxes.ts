/**
 * Jinx processing utilities.
 */

import type { ScriptFile, JinxFile } from './types.js';
import { findCharacterId, findOrExpandCharacter, getBaseCharacterId } from './character.js';
import type { FetchedData } from './data/fetched.js';
import { isNoDeathAtNightJinxPair } from './noDeathAtNightJinxes.js';
import {
	compareCanonicalJinxOrder,
	characterToSortCharacter,
	scriptEntryToSortCharacter,
	type JinxSortCharacter,
} from './jinxOrder.js';

function expandJinxSources(
	data: ScriptFile,
	jinxEntries: Readonly<JinxFile>,
	fetchedData: FetchedData,
): void {
	for (const source of jinxEntries) {
		if (!source?.id) {
			continue;
		}

		findOrExpandCharacter(source.id, data, fetchedData);
	}
}

function filterNoDeathAtNightJinxEntries(
	jinxEntries: Readonly<JinxFile>,
	fetchedData: FetchedData,
	includeNoDeathAtNight: boolean,
): JinxFile {
	if (includeNoDeathAtNight) {
		return jinxEntries.map((entry) => ({
			id: entry.id,
			jinx: entry.jinx.map((jinx) => ({ ...jinx })),
		}));
	}

	const filtered: JinxFile = [];

	for (const sourceEntry of jinxEntries) {
		if (!Array.isArray(sourceEntry.jinx)) {
			continue;
		}

		const filteredJinxes = sourceEntry.jinx.filter(
			(jinx) =>
				jinx?.id &&
				typeof jinx.reason === 'string' &&
				!isNoDeathAtNightJinxPair(sourceEntry.id, jinx.id, fetchedData),
		);

		if (filteredJinxes.length === 0) {
			continue;
		}

		filtered.push({
			id: sourceEntry.id,
			jinx: filteredJinxes,
		});
	}

	return filtered;
}

function getSortCharacterById(
	id: string,
	data: ScriptFile,
	fetchedData: FetchedData,
): JinxSortCharacter {
	const expandedCharacter = data.find(
		(entry) =>
			typeof entry === 'object' &&
			entry !== null &&
			'id' in entry &&
			typeof entry.id === 'string' &&
			entry.id === id,
	);
	const expandedSortCharacter = scriptEntryToSortCharacter(expandedCharacter);
	if (expandedSortCharacter) {
		return expandedSortCharacter;
	}

	const baseId = getBaseCharacterId(id, fetchedData);
	const role = fetchedData.getRolesData().find((entry) => entry.id === baseId);
	if (role) {
		return characterToSortCharacter(role);
	}

	return { id, name: id, team: undefined };
}

function toSortedJinxes(
	sourceId: string,
	mergedByTargetId: ReadonlyMap<string, string>,
	data: ScriptFile,
	fetchedData: FetchedData,
): { id: string; reason: string }[] {
	const sourceCharacter = getSortCharacterById(sourceId, data, fetchedData);
	const sortable = Array.from(mergedByTargetId, ([targetId, reason], index) => ({
		targetId,
		reason,
		originalOrder: index,
		targetCharacter: getSortCharacterById(targetId, data, fetchedData),
	}));

	sortable.sort((a, b) =>
		compareCanonicalJinxOrder(
			{
				source: sourceCharacter,
				target: a.targetCharacter,
				originalOrder: a.originalOrder,
			},
			{
				source: sourceCharacter,
				target: b.targetCharacter,
				originalOrder: b.originalOrder,
			},
		),
	);

	return sortable.map(({ targetId, reason }) => ({ id: targetId, reason }));
}

/**
 * Merge jinxes from jinx entries into script data.
 */
export function mergeJinxes(
	data: ScriptFile,
	jinxEntries: Readonly<JinxFile>,
	fetchedData: FetchedData,
	options?: { emptyReasonIsTombstone?: boolean },
): void {
	const emptyReasonIsTombstone = options?.emptyReasonIsTombstone === true;

	for (const source of jinxEntries) {
		if (!source?.id || !Array.isArray(source.jinx) || source.jinx.length === 0) {
			continue;
		}

		const sourceEntry = findOrExpandCharacter(source.id, data, fetchedData);
		if (!sourceEntry) {
			continue;
		}

		const existingJinxes = Array.isArray(sourceEntry.jinxes) ? sourceEntry.jinxes : [];
		const mergedByTargetId = new Map(existingJinxes.map((jinx) => [jinx.id, jinx.reason]));

		for (const jinx of source.jinx) {
			if (!jinx?.id || typeof jinx.reason !== 'string') {
				continue;
			}

			const targetId = findCharacterId(jinx.id, data, fetchedData);
			const isBlankReason = jinx.reason.trim().length === 0;

			if (isBlankReason) {
				if (emptyReasonIsTombstone) {
					mergedByTargetId.delete(targetId);
				}

				continue;
			}

			// Latest source wins for the same source-target pair.
			mergedByTargetId.set(targetId, jinx.reason);
		}

		sourceEntry.jinxes = toSortedJinxes(sourceEntry.id, mergedByTargetId, data, fetchedData);
	}
}

/**
 * Apply selected jinx sources with a single coordinated two-pass architecture:
 * 1) Dry-expand all official sources, then all greedy sources.
 * 2) Merge official jinxes first, then greedy jinxes (greedy overrides).
 */
export function applySelectedJinxes(
	data: ScriptFile,
	fetchedData: FetchedData,
	options: {
		includeOfficial: boolean;
		includeGreedy: boolean;
		includeGreedier: boolean;
		includeNoDeathAtNight: boolean;
	},
): void {
	const officialSource = options.includeOfficial ? fetchedData.getJinxData() : [];
	const greedySource = options.includeGreedy ? fetchedData.getGreedyJinxData() : [];
	const greedierSource = options.includeGreedier ? fetchedData.getGreedierJinxData() : [];
	const official = filterNoDeathAtNightJinxEntries(
		officialSource,
		fetchedData,
		options.includeNoDeathAtNight,
	);
	const greedy = filterNoDeathAtNightJinxEntries(
		greedySource,
		fetchedData,
		options.includeNoDeathAtNight,
	);
	const greedier = filterNoDeathAtNightJinxEntries(
		greedierSource,
		fetchedData,
		options.includeNoDeathAtNight,
	);

	if (official.length === 0 && greedy.length === 0 && greedier.length === 0) {
		return;
	}

	expandJinxSources(data, official, fetchedData);
	expandJinxSources(data, greedy, fetchedData);
	expandJinxSources(data, greedier, fetchedData);

	mergeJinxes(data, official, fetchedData);
	mergeJinxes(data, greedy, fetchedData, { emptyReasonIsTombstone: true });
	mergeJinxes(data, greedier, fetchedData, { emptyReasonIsTombstone: true });
}
