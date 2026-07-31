/**
 * Jinx processing utilities.
 */

import type { ScriptData, JinxEntry } from './types.js';
import { findCharacterId, findOrExpandCharacter } from './character.js';
import type { FetchedData } from './data/fetched.js';

function expandJinxSources(
	data: ScriptData,
	jinxEntries: Readonly<JinxEntry[]>,
	fetchedData: FetchedData,
): void {
	for (const source of jinxEntries) {
		if (!source?.id) {
			continue;
		}

		findOrExpandCharacter(source.id, data, fetchedData);
	}
}

/**
 * Merge jinxes from jinx entries into script data.
 */
export function mergeJinxes(
	data: ScriptData,
	jinxEntries: Readonly<JinxEntry[]>,
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

		sourceEntry.jinxes = Array.from(mergedByTargetId, ([id, reason]) => ({ id, reason }));
	}
}

/**
 * Apply selected jinx sources with a single coordinated two-pass architecture:
 * 1) Dry-expand all official sources, then all greedy sources.
 * 2) Merge official jinxes first, then greedy jinxes (greedy overrides).
 */
export function applySelectedJinxes(
	data: ScriptData,
	fetchedData: FetchedData,
	options: { includeOfficial: boolean; includeGreedy: boolean },
): void {
	const official = options.includeOfficial ? fetchedData.getJinxData() : [];
	const greedy = options.includeGreedy ? fetchedData.getGreedyJinxData() : [];

	if (official.length === 0 && greedy.length === 0) {
		return;
	}

	expandJinxSources(data, official, fetchedData);
	expandJinxSources(data, greedy, fetchedData);

	mergeJinxes(data, official, fetchedData);
	mergeJinxes(data, greedy, fetchedData, { emptyReasonIsTombstone: true });
}
