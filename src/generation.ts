import type { GenerationOptions, GenerationRequest, GenerationResult, GenerationDiagnostic } from './types.js';
import type { Catalog } from './data/catalog.js';
import { getDependencyDiagnostics } from './dependencies.js';
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
	const diagnostics: GenerationDiagnostic[] = getDependencyDiagnostics(selectedCharacterIds, catalog);
	const blocked = new Set(diagnostics.map((diagnostic) => diagnostic.characterId));

	// Anything remaining is exportable.
	const exportableIds = new Set([...selectedCharacterIds].filter((id) => !blocked.has(id)));

	// Mutable state to be passed around the generation pipeline
	const workspace = new GenerationWorkspace(catalog);
	const ruleContext = {
		workspace,
		options,
		exportableIds,
	};

	// Apply pre-filter source-composition rules.
	for (const rule of SOURCE_COMPOSITION_RULES) {
		rule.apply(ruleContext);
	}

	// Apply ordered option transformations.
	for (const rule of TRANSFORMATION_RULES) {
		rule.apply(ruleContext);
	}

	return {
		script: workspace.toScriptFile(),
		scriptName: workspace.meta.name,
		diagnostics,
	};
}

/** Serializes a generation result for the clipboard JSON string. */
export function buildExportedScript(
	selectedCharacterIds: ReadonlySet<string>,
	options: GenerationOptions,
	catalog: Catalog,
): string {
	return JSON.stringify(generate({ selectedCharacterIds, options }, catalog).script, null, 2);
}
