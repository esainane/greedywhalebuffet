import type { Catalog } from './data/catalog.js';

export const COMMON_BANNED_CHARACTER_IDS: readonly string[] = [
	'alchemistclean',
	'atheist',
	'bountyhunter',
	'cultleaderclean',
	'philosopherbalance',
	'poppygrowerclean',
	'snakecharmer',
	'hereticclean',
	'goon',
	'pithagbalance',
	'wizardclean',
	'legionclean',
	'leviathanclean',
	'riotclean',
	'zombuul',
] as const;

export const COMMON_BANNED_CHARACTER_ID_SET = new Set(COMMON_BANNED_CHARACTER_IDS) as ReadonlySet<string>;

export const POPULAR_GREEDIER_CHARACTER_IDS: readonly string[] = [
	'hypnotist',
	'lolth',
	'bingbong',
	'secretary',
	'baffler',
	'hopeful',
	'potionseller',
	'buffetsgourmet',
	'skaldi',
	'archivist',
	'hawkmoth',
	'joe',
] as const;

export const POPULAR_GREEDIER_CHARACTER_ID_SET = new Set(POPULAR_GREEDIER_CHARACTER_IDS) as ReadonlySet<string>;

export const CHARACTER_DEPENDENCY_REQUIREMENTS: Readonly<Record<string, readonly string[]>> = {
	choirboy: ['king'],
	daki: ['gyutaro'],
	gyutaro: ['daki'],
	ash: ['bidoofswheel'],
	bidoofswheel: ['ash'],
};

export const NO_DEATH_AT_NIGHT_DEMON_IDS: readonly string[] = ['leviathan', 'riot', 'armageddon'] as const;
export const NO_DEATH_AT_NIGHT_ROLE_IDS: readonly string[] = [
	'banshee',
	'exorcist',
	'farmer',
	'grandmother',
	'innkeeper',
	'monk',
	'ravenkeeper',
	'sage',
	'soldier',
	'journalist',
	'pathologist',
] as const;

const noDeathAtNightDemonIdsSet = new Set(NO_DEATH_AT_NIGHT_DEMON_IDS) as ReadonlySet<string>;
const noDeathAtNightRoleIdsSet = new Set(NO_DEATH_AT_NIGHT_ROLE_IDS) as ReadonlySet<string>;

export type DependencyDiagnostic = {
	readonly characterId: string;
	readonly missingDependencyIds: readonly string[];
};

export function isNoDeathAtNightJinxPair(
	sourceId: string,
	targetId: string,
	catalog: Catalog,
): boolean {
	const source = catalog.resolveBaseId(sourceId);
	const target = catalog.resolveBaseId(targetId);

	return (
		(noDeathAtNightDemonIdsSet.has(source) && noDeathAtNightRoleIdsSet.has(target)) ||
		(noDeathAtNightRoleIdsSet.has(source) && noDeathAtNightDemonIdsSet.has(target))
	);
}

export function evaluateDependencyDiagnostics(
	selectedCharacterIds: ReadonlySet<string>,
	catalog: Catalog,
): DependencyDiagnostic[] {
	const selectedBaseCharacterIds = new Set<string>();
	for (const characterId of selectedCharacterIds) {
		selectedBaseCharacterIds.add(catalog.resolveBaseId(characterId));
	}

	const diagnostics: DependencyDiagnostic[] = [];
	for (const characterId of selectedCharacterIds) {
		const baseCharacterId = catalog.resolveBaseId(characterId);
		const requiredCharacterIds = CHARACTER_DEPENDENCY_REQUIREMENTS[baseCharacterId] ?? [];
		const missingDependencyIds = requiredCharacterIds.filter(
			(requiredId) => !selectedBaseCharacterIds.has(requiredId),
		);

		if (missingDependencyIds.length > 0) {
			diagnostics.push({ characterId, missingDependencyIds });
		}
	}

	return diagnostics;
}
