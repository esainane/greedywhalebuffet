/**
 * Jinx processing utilities.
 */

import type { ScriptData, JinxEntry } from './types.js';
import { findOrExpandCharacter } from './character.js';
import type { FetchedData } from './data/fetched.js';

/**
 * Merge jinxes from jinx entries into script data.
 */
export function mergeJinxes(
	data: ScriptData,
	jinxEntries: Readonly<JinxEntry[]>,
	fetchedData: FetchedData,
): void {
	const mentionedIds = new Set<string>();

	for (const source of jinxEntries) {
		if (!source?.id) {
			continue;
		}

		mentionedIds.add(source.id);

		if (!Array.isArray(source.jinx)) {
			continue;
		}

		for (const jinx of source.jinx) {
			if (jinx?.id) {
				mentionedIds.add(jinx.id);
			}
		}
	}

	for (const id of mentionedIds) {
		findOrExpandCharacter(id, data, fetchedData);
	}

	for (const source of jinxEntries) {
		if (!source?.id || !Array.isArray(source.jinx) || source.jinx.length === 0) {
			continue;
		}

		const sourceEntry = findOrExpandCharacter(source.id, data, fetchedData);
		if (!sourceEntry) {
			continue;
		}

		const existingJinxes = Array.isArray(sourceEntry.jinx) ? sourceEntry.jinx : [];
		const mergedJinxes = [...existingJinxes];

		for (const jinx of source.jinx) {
			if (!jinx?.id || typeof jinx.reason !== 'string') {
				continue;
			}

			const targetEntry = findOrExpandCharacter(jinx.id, data, fetchedData);
			if (!targetEntry) {
				continue;
			}

			const alreadyPresent = mergedJinxes.some(
				(existing) => existing.id === targetEntry.id && existing.reason === jinx.reason,
			);
			if (!alreadyPresent) {
				mergedJinxes.push({ id: targetEntry.id, reason: jinx.reason });
			}
		}

		sourceEntry.jinxes = mergedJinxes;
	}
}
