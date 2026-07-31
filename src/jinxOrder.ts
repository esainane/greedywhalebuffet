import type { CharacterEntry } from './types.js';

export type JinxSortCharacter = {
	id: string;
	name?: string;
	team?: string;
};

export type CanonicalJinxOrderEntry = {
	source: JinxSortCharacter;
	target: JinxSortCharacter;
	originalOrder?: number;
};

const NAME_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base' });

export function getTeamSortRank(team: string | undefined): number {
	switch (team) {
		case 'townsfolk':
			return 0;
		case 'outsider':
			return 1;
		case 'minion':
			return 2;
		case 'demon':
			return 3;
		default:
			return Number.MAX_SAFE_INTEGER;
	}
}

function getDisplayName(character: JinxSortCharacter): string {
	return character.name ?? character.id;
}

function compareDisplayNames(a: JinxSortCharacter, b: JinxSortCharacter): number {
	return NAME_COLLATOR.compare(getDisplayName(a), getDisplayName(b));
}

export function compareCanonicalJinxOrder(
	a: CanonicalJinxOrderEntry,
	b: CanonicalJinxOrderEntry,
): number {
	const aSourceTeamRank = getTeamSortRank(a.source.team);
	const bSourceTeamRank = getTeamSortRank(b.source.team);
	if (aSourceTeamRank !== bSourceTeamRank) {
		return aSourceTeamRank - bSourceTeamRank;
	}

	const sourceNameCompare = compareDisplayNames(a.source, b.source);
	if (sourceNameCompare !== 0) {
		return sourceNameCompare;
	}

	const aTargetTeamRank = getTeamSortRank(a.target.team);
	const bTargetTeamRank = getTeamSortRank(b.target.team);
	if (aTargetTeamRank !== bTargetTeamRank) {
		return aTargetTeamRank - bTargetTeamRank;
	}

	const targetNameCompare = compareDisplayNames(a.target, b.target);
	if (targetNameCompare !== 0) {
		return targetNameCompare;
	}

	return (a.originalOrder ?? 0) - (b.originalOrder ?? 0);
}

export function characterToSortCharacter(entry: CharacterEntry): JinxSortCharacter {
	return {
		id: entry.id,
		name: entry.name,
		team: entry.team,
	};
}

export function scriptEntryToSortCharacter(entry: unknown): JinxSortCharacter | null {
	if (typeof entry !== 'object' || entry === null || !('id' in entry)) {
		return null;
	}

	const maybeCharacter = entry as { id?: unknown; name?: unknown; team?: unknown };
	if (typeof maybeCharacter.id !== 'string') {
		return null;
	}

	return {
		id: maybeCharacter.id,
		name: typeof maybeCharacter.name === 'string' ? maybeCharacter.name : maybeCharacter.id,
		team: typeof maybeCharacter.team === 'string' ? maybeCharacter.team : undefined,
	};
}
