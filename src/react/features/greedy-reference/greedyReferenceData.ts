import { FILTERABLE_TEAMS } from '../../../constants.js';
import type { Catalog } from '../../../data/catalog.js';
import { compareCanonicalCharacterOrder, compareCanonicalJinxOrder } from '../../../jinxOrder.js';
import { isNoDeathAtNightJinxPair } from '../../../noDeathAtNightJinxes.js';
import type { SelectableCharacter } from '../../../types.js';

export type GreedyDifferenceDetail = {
	character: SelectableCharacter;
	officialAbility: string;
	greedyAbility: string;
};

export type GreedyJinxDetail = {
	source: SelectableCharacter;
	target: SelectableCharacter;
	officialReason: string | null;
	reason: string;
	origin: 'greedy' | 'greedier-homebrew';
};

export type GreedyHomebrewDetail = {
	character: SelectableCharacter;
	ability: string;
	firstNight?: number;
	otherNight?: number;
};

function buildOfficialJinxLookup(catalog: Catalog): Map<string, string> {
	const officialLookup = new Map<string, string>();

	for (const sourceEntry of catalog.officialJinxes) {
		if (!Array.isArray(sourceEntry.jinx)) {
			continue;
		}

		for (const jinx of sourceEntry.jinx) {
			if (!jinx || typeof jinx.id !== 'string' || typeof jinx.reason !== 'string') {
				continue;
			}

			officialLookup.set(`${sourceEntry.id}::${jinx.id}`, jinx.reason);
		}
	}

	return officialLookup;
}

export function deriveGreedyDifferences(catalog: Catalog): GreedyDifferenceDetail[] {
	const differences: GreedyDifferenceDetail[] = [];

	for (const entry of catalog.baseScript.entries) {
		if (typeof entry === 'string' || entry.id === 'choose_your_chars') {
			continue;
		}

		if (!FILTERABLE_TEAMS.has(entry.team)) {
			continue;
		}

		const baseId = catalog.resolveBaseId(entry.id);
		const officialCatalogEntry = catalog.rolesById.get(baseId);
		if (!officialCatalogEntry) {
			continue;
		}

		if (entry.ability === officialCatalogEntry.entry.ability) {
			continue;
		}

		differences.push({
			character: catalog.selectableFor(entry),
			officialAbility: officialCatalogEntry.entry.ability,
			greedyAbility: entry.ability,
		});
	}

	return differences;
}

function appendJinxDetails(
	details: (GreedyJinxDetail & { originalOrder: number })[],
	catalog: Catalog,
	officialJinxLookup: Map<string, string>,
	sourceData: ReadonlyArray<{ id: string; jinx?: { id: string; reason: string }[] }>,
	origin: GreedyJinxDetail['origin'],
	startOrder: number,
	includeNoDeathAtNightJinxes: boolean,
): number {
	let originalOrder = startOrder;

	for (const sourceEntry of sourceData) {
		const sourceCatalogEntry = catalog.lookupById(sourceEntry.id);
		if (!sourceCatalogEntry || !Array.isArray(sourceEntry.jinx)) {
			continue;
		}

		for (const jinx of sourceEntry.jinx) {
			if (!jinx || typeof jinx.id !== 'string' || typeof jinx.reason !== 'string') {
				continue;
			}

			if (!includeNoDeathAtNightJinxes && isNoDeathAtNightJinxPair(sourceEntry.id, jinx.id, catalog)) {
				continue;
			}

			const targetCatalogEntry = catalog.lookupById(jinx.id);
			if (!targetCatalogEntry) {
				continue;
			}

			const sourceBaseId = catalog.resolveBaseId(sourceCatalogEntry.id);
			const targetBaseId = catalog.resolveBaseId(targetCatalogEntry.id);
			const officialReason =
				officialJinxLookup.get(`${sourceBaseId}::${targetBaseId}`) ??
				officialJinxLookup.get(`${targetBaseId}::${sourceBaseId}`) ??
				null;

			details.push({
				source: sourceCatalogEntry.toSelectable(),
				target: targetCatalogEntry.toSelectable(),
				officialReason,
				reason: jinx.reason,
				origin,
				originalOrder,
			});
			originalOrder += 1;
		}
	}

	return originalOrder;
}

export function deriveGreedyJinxes(
	catalog: Catalog,
	options: { includeGreedierHomebrew?: boolean; includeNoDeathAtNightJinxes?: boolean } = {},
): GreedyJinxDetail[] {
	const details: (GreedyJinxDetail & { originalOrder: number })[] = [];
	const officialJinxLookup = buildOfficialJinxLookup(catalog);
	const originalOrder = appendJinxDetails(
		details,
		catalog,
		officialJinxLookup,
		catalog.greedyJinxes,
		'greedy',
		0,
		options.includeNoDeathAtNightJinxes === true,
	);

	if (options.includeGreedierHomebrew) {
		appendJinxDetails(
			details,
			catalog,
			officialJinxLookup,
			catalog.greedierJinxes,
			'greedier-homebrew',
			originalOrder,
			options.includeNoDeathAtNightJinxes === true,
		);
	}

	return details
		.sort(compareCanonicalJinxOrder)
		.map(({ source, target, officialReason, reason, origin }) => ({
			source,
			target,
			officialReason,
			reason,
			origin,
		}));
}

export function deriveGreedyHomebrew(catalog: Catalog, sortBySet = true): GreedyHomebrewDetail[] {
	const details: GreedyHomebrewDetail[] = [];

	for (const catalogEntry of catalog.greedierById.values()) {
		if (catalogEntry.entry.edition !== 'greedier' || !FILTERABLE_TEAMS.has(catalogEntry.team)) {
			continue;
		}

		details.push({
			character: catalogEntry.toSelectable(),
			ability: catalogEntry.entry.ability,
			firstNight: catalogEntry.entry.firstNight,
			otherNight: catalogEntry.entry.otherNight,
		});
	}

	if (!sortBySet) {
		details.sort((a, b) => compareCanonicalCharacterOrder(a.character, b.character));
	}

	return details;
}
