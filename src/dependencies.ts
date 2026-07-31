import { getBaseCharacterId } from './character.js';
import type { FetchedData } from './data/fetched.js';


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
	fetchedData: FetchedData,
): Set<string> {
	const selectedBaseCharacterIds = new Set<string>();
	for (const characterId of selectedCharacterIds) {
		const baseCharacterId = getBaseCharacterId(characterId, fetchedData);
		selectedBaseCharacterIds.add(baseCharacterId);
	}

	const unsatisfiedDependencyCharacterIds = new Set<string>();
	for (const characterId of selectedCharacterIds) {
		const baseCharacterId = getBaseCharacterId(characterId, fetchedData);
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
