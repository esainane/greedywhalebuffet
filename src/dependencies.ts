import type { Catalog } from './data/catalog.js';


const CHARACTER_DEPENDENCIES: Record<string, readonly string[]> = {
	choirboy: ['king'],
	daki_winningclub: ['gyutaro_winningclub'],
	gyutaro_winningclub: ['daki_winningclub'],
};

/**
 * Returns selected character IDs that are missing one or more required dependencies.
 */
export function getUnsatisfiedDependencyCharacterIds(
	selectedCharacterIds: ReadonlySet<string>,
	catalog: Catalog,
): Set<string> {
	const selectedBaseCharacterIds = new Set<string>();
	for (const characterId of selectedCharacterIds) {
		selectedBaseCharacterIds.add(catalog.resolveBaseId(characterId));
	}

	const unsatisfiedDependencyCharacterIds = new Set<string>();
	for (const characterId of selectedCharacterIds) {
		const baseCharacterId = catalog.resolveBaseId(characterId);
		const requiredCharacterIds = CHARACTER_DEPENDENCIES[baseCharacterId] ?? [];
		const hasAllDependencies = requiredCharacterIds.every((requiredId) =>
			selectedBaseCharacterIds.has(requiredId),
		);

		if (!hasAllDependencies) {
			unsatisfiedDependencyCharacterIds.add(characterId);
		}
	}

	return unsatisfiedDependencyCharacterIds;
}
