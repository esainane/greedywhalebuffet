import { FILTERABLE_TEAMS } from '../../../constants.js';
import { getBaseCharacterId, getImageArray } from '../../../character.js';
import type { FetchedData } from '../../../data/fetched.js';
import type { CharacterEntry, ScriptData } from '../../../types.js';
import { compareCanonicalCharacterOrder, compareCanonicalJinxOrder } from '../../../jinxOrder.js';

export type CharacterSummary = {
	id: string;
	name: string;
	team: string;
	edition?: string;
	imageUrl?: string;
	sourceSet?: number;
};

export type GreedyDifferenceDetail = {
	character: CharacterSummary;
	officialAbility: string;
	greedyAbility: string;
};

export type GreedyJinxDetail = {
	source: CharacterSummary;
	target: CharacterSummary;
	officialReason: string | null;
	reason: string;
	origin: 'greedy' | 'greedier-homebrew';
};

export type GreedyHomebrewDetail = {
	character: CharacterSummary;
	ability: string;
	firstNight?: number;
	otherNight?: number;
};

function isCharacterObject(entry: ScriptData[number]): entry is CharacterEntry {
	if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
		return false;
	}

	return typeof (entry as { id?: unknown }).id === 'string';
}

function hasFilterableTeam(entry: CharacterEntry): entry is CharacterEntry & { team: string } {
	return typeof entry.team === 'string' && FILTERABLE_TEAMS.has(entry.team);
}

function getPrimaryImage(entry: CharacterEntry, fetchedData: FetchedData): string | undefined {
	if (!hasFilterableTeam(entry)) {
		return undefined;
	}

	const [firstImage] = getImageArray(entry, fetchedData);
	return firstImage;
}

function createCharacterSummary(entry: CharacterEntry, fetchedData: FetchedData): CharacterSummary {
	return {
		id: entry.id,
		name: entry.name ?? entry.id,
		team: entry.team ?? 'unknown',
		edition: entry.edition,
		imageUrl: getPrimaryImage(entry, fetchedData),
		sourceSet: entry.sourceSet,
	};
}

function buildCharacterLookup(fetchedData: FetchedData): Map<string, CharacterEntry> {
	const lookup = new Map<string, CharacterEntry>();

	for (const role of fetchedData.getRolesData()) {
		lookup.set(role.id, role);
	}

	for (const character of fetchedData.getGreedierCharactersData()) {
		lookup.set(character.id, character);
	}

	for (const entry of fetchedData.getGreedyJson()) {
		if (!isCharacterObject(entry)) {
			continue;
		}
		lookup.set(entry.id, entry);
	}

	return lookup;
}

function getEntryById(id: string, lookup: Map<string, CharacterEntry>, fetchedData: FetchedData): CharacterEntry | null {
	const direct = lookup.get(id);
	if (direct) {
		return direct;
	}

	const baseId = getBaseCharacterId(id, fetchedData);
	return lookup.get(baseId) ?? null;
}

function buildOfficialJinxLookup(fetchedData: FetchedData): Map<string, string> {
	const officialLookup = new Map<string, string>();

	for (const sourceEntry of fetchedData.getJinxData()) {
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

export function deriveGreedyDifferences(fetchedData: FetchedData): GreedyDifferenceDetail[] {
	const officialLookup = new Map(fetchedData.getRolesData().map((entry) => [entry.id, entry] as const));
	const differences: GreedyDifferenceDetail[] = [];

	for (const entry of fetchedData.getGreedyJson()) {
		if (!isCharacterObject(entry) || entry.id === 'choose_your_chars') {
			continue;
		}

		if (!hasFilterableTeam(entry)) {
			continue;
		}

		const baseId = getBaseCharacterId(entry.id, fetchedData);
		const official = officialLookup.get(baseId);
		if (!official) {
			continue;
		}

		const officialAbility = official.ability ?? '';
		const greedyAbility = entry.ability ?? '';
		if (officialAbility === greedyAbility) {
			continue;
		}

		differences.push({
			character: createCharacterSummary(entry, fetchedData),
			officialAbility,
			greedyAbility,
		});
	}

	return differences;
}

function appendJinxDetails(
	details: (GreedyJinxDetail & { originalOrder: number })[],
	fetchedData: FetchedData,
	lookup: Map<string, CharacterEntry>,
	officialJinxLookup: Map<string, string>,
	sourceData: ReadonlyArray<{ id: string; jinx?: { id: string; reason: string }[] }>,
	origin: GreedyJinxDetail['origin'],
	startOrder: number,
): number {
	let originalOrder = startOrder;

	for (const sourceEntry of sourceData) {
		const sourceCharacter = getEntryById(sourceEntry.id, lookup, fetchedData);
		if (!sourceCharacter || !Array.isArray(sourceEntry.jinx)) {
			continue;
		}

		for (const jinx of sourceEntry.jinx) {
			if (!jinx || typeof jinx.id !== 'string' || typeof jinx.reason !== 'string') {
				continue;
			}

			const targetCharacter = getEntryById(jinx.id, lookup, fetchedData);
			if (!targetCharacter) {
				continue;
			}

			const sourceSummary = createCharacterSummary(sourceCharacter, fetchedData);
			const targetSummary = createCharacterSummary(targetCharacter, fetchedData);
			const sourceBaseId = getBaseCharacterId(sourceCharacter.id, fetchedData);
			const targetBaseId = getBaseCharacterId(targetCharacter.id, fetchedData);
			const officialReason =
				officialJinxLookup.get(`${sourceBaseId}::${targetBaseId}`) ??
				officialJinxLookup.get(`${targetBaseId}::${sourceBaseId}`) ??
				null;

			details.push({
				source: sourceSummary,
				target: targetSummary,
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
	fetchedData: FetchedData,
	options: { includeGreedierHomebrew?: boolean } = {},
): GreedyJinxDetail[] {
	const details: (GreedyJinxDetail & {
		originalOrder: number;
	})[] = [];
	const lookup = buildCharacterLookup(fetchedData);
	const officialJinxLookup = buildOfficialJinxLookup(fetchedData);
	const originalOrder = appendJinxDetails(
		details,
		fetchedData,
		lookup,
		officialJinxLookup,
		fetchedData.getGreedyJinxData(),
		'greedy',
		0,
	);

	if (options.includeGreedierHomebrew) {
		appendJinxDetails(
			details,
			fetchedData,
			lookup,
			officialJinxLookup,
			fetchedData.getGreedierJinxData(),
			'greedier-homebrew',
			originalOrder,
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

export function deriveGreedyHomebrew(
	fetchedData: FetchedData,
	sortBySet = true,
): GreedyHomebrewDetail[] {
	const details: GreedyHomebrewDetail[] = [];

	for (const entry of fetchedData.getGreedierCharactersData()) {
		if (entry.edition !== 'greedier' || !hasFilterableTeam(entry)) {
			continue;
		}

		details.push({
			character: createCharacterSummary(entry, fetchedData),
			ability: entry.ability ?? '',
			firstNight: entry.firstNight,
			otherNight: entry.otherNight,
		});
	}

	if (!sortBySet) {
		details.sort((a, b) => compareCanonicalCharacterOrder(a.character, b.character));
	}

	return details;
}
