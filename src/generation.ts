import type { GenerationOptions, GenerationRequest, GenerationResult, GenerationDiagnostic } from './types.js';
import type { Catalog } from './data/catalog.js';
import { getUnsatisfiedDependencyCharacterIds, CHARACTER_DEPENDENCIES } from './dependencies.js';
import { GenerationWorkspace } from './generation-workspace.js';
import { SOURCE_COMPOSITION_RULES, TRANSFORMATION_RULES } from './generation-rules/index.js';

/**
 * Run the generation pipeline for a request against an immutable catalog.
 *
 * This is the main script export pipeline.
 */
export function generate(request: GenerationRequest, catalog: Catalog): GenerationResult {
	const { selectedCharacterIds, options } = request;

	// Dependency evaluation
	// If any character requires another character which is not present, the dependent character is blocked from export.
	const blocked = getUnsatisfiedDependencyCharacterIds(selectedCharacterIds, catalog);
	const selectedBaseIds = new Set([...selectedCharacterIds].map((id) => catalog.resolveBaseId(id)));
	const diagnostics: GenerationDiagnostic[] = [...blocked].map((characterId) => {
		const baseId = catalog.resolveBaseId(characterId);
		const required = CHARACTER_DEPENDENCIES[baseId] ?? [];
		const missingDependencyIds = required.filter((r) => !selectedBaseIds.has(r));
		return { characterId, missingDependencyIds };
	});

	// Anything remaining is exportable.
	const exportableIds = new Set([...selectedCharacterIds].filter((id) => !blocked.has(id)));

	// Mutable state to be passed around the generation pipeline
	const workspace = new GenerationWorkspace(catalog);

	// Apply pre-filter source-composition rules.
	for (const rule of SOURCE_COMPOSITION_RULES) {
		rule.apply({ workspace, options });
	}

	// Remove any deselected
	const exclusion = workspace.filterToExportable(exportableIds);

	// Update bootlegger with added/removed characters
	workspace.setBootleggerCharacterLine(exclusion);

	// If any Greedier characters are present, change the script name accordingly
	const baseName = catalog.baseScript.meta.name;
	const hasGreedier = options.addGreedierHomebrew && [...exportableIds].some((id) => catalog.greedierById.has(id));
	const scriptName = hasGreedier ? baseName.replace(/\bGreedy\b/g, 'Greedier') : baseName;
	workspace.setScriptName(scriptName);

	// Apply ordered option transformations.
	for (const rule of TRANSFORMATION_RULES) {
		rule.apply({ workspace, options });
	}

	return {
		script: workspace.toScriptFile(),
		scriptName,
		diagnostics,
	};
}

/** Transitional compatibility wrapper: serializes a generation result for the clipboard JSON string. */
export function buildCopyPayload(
	selectedCharacterIds: ReadonlySet<string>,
	options: GenerationOptions,
	catalog: Catalog,
): string {
	return JSON.stringify(generate({ selectedCharacterIds, options }, catalog).script, null, 2);
}
