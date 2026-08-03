/**
 * Jinx processing utilities.
 */

import type { ScriptFile, JinxFile } from './types.js';
import type { CharacterResolver } from './data/catalog-entry.js';
import type { Catalog } from './data/catalog.js';
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
	resolver: CharacterResolver,
): void {
	for (const source of jinxEntries) {
		if (!source?.id) {
			continue;
		}

		resolver.generationContext.findOrExpandCharacter(source.id, data, resolver.catalog);
	}
}

function filterNoDeathAtNightJinxEntries(
	jinxEntries: Readonly<JinxFile>,
	catalog: Catalog,
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
				!isNoDeathAtNightJinxPair(sourceEntry.id, jinx.id, catalog),
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
	resolver: CharacterResolver,
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

	const catalogEntry = resolver.catalog.lookupById(id)
		?? resolver.catalog.lookupById(resolver.generationContext.resolveBaseIdFor(id, resolver.catalog));
	if (catalogEntry) {
		return characterToSortCharacter(catalogEntry.entry);
	}

	return { id, name: id, team: undefined };
}

function toSortedJinxes(
	sourceId: string,
	mergedByTargetId: ReadonlyMap<string, string>,
	data: ScriptFile,
	resolver: CharacterResolver,
): { id: string; reason: string }[] {
	const sourceCharacter = getSortCharacterById(sourceId, data, resolver);
	const sortable = Array.from(mergedByTargetId, ([targetId, reason], index) => ({
		targetId,
		reason,
		originalOrder: index,
		targetCharacter: getSortCharacterById(targetId, data, resolver),
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

export function mergeJinxes(
	data: ScriptFile,
	jinxEntries: Readonly<JinxFile>,
	resolver: CharacterResolver,
	options?: { emptyReasonIsTombstone?: boolean },
): void {
	const emptyReasonIsTombstone = options?.emptyReasonIsTombstone === true;

	for (const source of jinxEntries) {
		if (!source?.id || !Array.isArray(source.jinx) || source.jinx.length === 0) {
			continue;
		}

		const sourceEntry = resolver.generationContext.findOrExpandCharacter(source.id, data, resolver.catalog);
		if (!sourceEntry) {
			continue;
		}

		const existingJinxes = Array.isArray(sourceEntry.jinxes) ? sourceEntry.jinxes : [];
		const mergedByTargetId = new Map(existingJinxes.map((jinx) => [jinx.id, jinx.reason]));

		for (const jinx of source.jinx) {
			if (!jinx?.id || typeof jinx.reason !== 'string') {
				continue;
			}

			const targetId = resolver.generationContext.findCharacterId(jinx.id, data, resolver.catalog);
			const isBlankReason = jinx.reason.trim().length === 0;

			if (isBlankReason) {
				if (emptyReasonIsTombstone) {
					mergedByTargetId.delete(targetId);
				}

				continue;
			}

			mergedByTargetId.set(targetId, jinx.reason);
		}

		sourceEntry.jinxes = toSortedJinxes(sourceEntry.id, mergedByTargetId, data, resolver);
	}
}

export function applySelectedJinxes(
	data: ScriptFile,
	resolver: CharacterResolver,
	options: {
		includeOfficial: boolean;
		includeGreedy: boolean;
		includeGreedier: boolean;
		includeNoDeathAtNight: boolean;
	},
): void {
	const officialSource = options.includeOfficial ? resolver.catalog.officialJinxes : [];
	const greedySource = options.includeGreedy ? resolver.catalog.greedyJinxes : [];
	const greedierSource = options.includeGreedier ? resolver.catalog.greedierJinxes : [];
	const official = filterNoDeathAtNightJinxEntries(officialSource, resolver.catalog, options.includeNoDeathAtNight);
	const greedy = filterNoDeathAtNightJinxEntries(greedySource, resolver.catalog, options.includeNoDeathAtNight);
	const greedier = filterNoDeathAtNightJinxEntries(greedierSource, resolver.catalog, options.includeNoDeathAtNight);

	if (official.length === 0 && greedy.length === 0 && greedier.length === 0) {
		return;
	}

	expandJinxSources(data, official, resolver);
	expandJinxSources(data, greedy, resolver);
	expandJinxSources(data, greedier, resolver);

	mergeJinxes(data, official, resolver);
	mergeJinxes(data, greedy, resolver, { emptyReasonIsTombstone: true });
	mergeJinxes(data, greedier, resolver, { emptyReasonIsTombstone: true });
}
