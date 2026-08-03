import type { Catalog } from './data/catalog.js';
import {
	CHARACTER_DEPENDENCY_REQUIREMENTS,
	evaluateDependencyDiagnostics,
} from './characterPolicy.js';


export const CHARACTER_DEPENDENCIES = CHARACTER_DEPENDENCY_REQUIREMENTS;

export const getDependencyDiagnostics = evaluateDependencyDiagnostics;

/**
 * Returns selected character IDs that are missing one or more required dependencies.
 */
export function getUnsatisfiedDependencyCharacterIds(
	selectedCharacterIds: ReadonlySet<string>,
	catalog: Catalog,
): Set<string> {
	return new Set(
		evaluateDependencyDiagnostics(selectedCharacterIds, catalog).map((diagnostic) => diagnostic.characterId),
	);
}
