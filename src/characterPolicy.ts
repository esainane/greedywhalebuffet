import type { Catalog } from './data/catalog.js';

export const COMMON_BANNED_CHARACTER_IDS: readonly string[] = [
	'alchemist_popppp',
	'atheist',
	'bountyhunter',
	'cultleader_popppp',
	'philosopher_ultimate',
	'poppygrower_popppp',
	'snakecharmer',
	'heretic_popppp',
	'goon',
	'pithag_ultimate',
	'wizard_popppp',
	'legion_popppp',
	'leviathan_popppp',
	'riot_popppp',
	'zombuul',
] as const;

export const COMMON_BANNED_CHARACTER_ID_SET = new Set(COMMON_BANNED_CHARACTER_IDS);

export const POPULAR_GREEDIER_CHARACTER_IDS: readonly string[] = [
	'hypnotist_winningclub',
	'lolth_winningclub',
	'bingbong_winningclub',
	'secretary_winningclub',
	'baffler_winningclub',
	'hopeful_winningclub',
	'potionseller_winningclub',
	'buffetsgourmet_winningclub',
	'skaldi',
	'archivist',
	'hawkmoth',
	'joe',
] as const;

export const POPULAR_GREEDIER_CHARACTER_ID_SET = new Set(POPULAR_GREEDIER_CHARACTER_IDS);

export const CHARACTER_DEPENDENCY_REQUIREMENTS: Readonly<Record<string, readonly string[]>> = {
	choirboy: ['king'],
	daki_winningclub: ['gyutaro_winningclub'],
	gyutaro_winningclub: ['daki_winningclub'],
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

export const POLICY_CANONICAL_ID_ALIASES: Readonly<Record<string, string>> = {
	armageddon_winningclub: 'armageddon',
	journalist_winningclub: 'journalist',
	pathologist_winningclub: 'pathologist',
};

const noDeathAtNightDemonIdsSet = new Set(NO_DEATH_AT_NIGHT_DEMON_IDS);
const noDeathAtNightRoleIdsSet = new Set(NO_DEATH_AT_NIGHT_ROLE_IDS);

export type DependencyDiagnostic = {
	readonly characterId: string;
	readonly missingDependencyIds: readonly string[];
};

export function normalizePolicyCharacterId(id: string, catalog: Catalog): string {
	const baseId = catalog.resolveBaseId(id);
	return POLICY_CANONICAL_ID_ALIASES[baseId] ?? baseId;
}

export function isNoDeathAtNightJinxPair(
	sourceId: string,
	targetId: string,
	catalog: Catalog,
): boolean {
	const source = normalizePolicyCharacterId(sourceId, catalog);
	const target = normalizePolicyCharacterId(targetId, catalog);

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
