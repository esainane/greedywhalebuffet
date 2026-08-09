import { FILTERABLE_TEAMS } from '../constants.js';
import type { CharacterEntry, ScriptEntry } from '../types.js';
import type { ExclusionRecord, GenerationRule } from './types.js';

function classifyEntry(
	workspace: Parameters<GenerationRule['apply']>[0]['workspace'],
	entry: ScriptEntry,
): {
	id: string | undefined;
	name: string | undefined;
	alwaysInclude: boolean;
	filterable: boolean;
} {
	if (typeof entry === 'string') {
		const catalogEntry = workspace.catalog.rolesById.get(entry)?.entry;
		return {
			id: entry,
			name: catalogEntry?.name ?? entry,
			alwaysInclude: false,
			filterable: !!catalogEntry?.team && FILTERABLE_TEAMS.has(catalogEntry.team),
		};
	}

	const characterEntry = entry as CharacterEntry;
	return {
		id: characterEntry.id,
		name: characterEntry.name || characterEntry.id,
		alwaysInclude: characterEntry.id === 'choose_your_chars',
		filterable: !!characterEntry.team && FILTERABLE_TEAMS.has(characterEntry.team),
	};
}

function buildExclusionRecord(
	workspace: Parameters<GenerationRule['apply']>[0]['workspace'],
	exportableIds: ReadonlySet<string>,
): ExclusionRecord {
	const removedBaseNames: string[] = [];
	const removedGreedierNames: string[] = [];
	const kept: ScriptEntry[] = [];

	for (const entry of workspace.entries) {
		const { id, name, alwaysInclude, filterable } = classifyEntry(workspace, entry);
		if (!filterable || alwaysInclude || (id && exportableIds.has(id))) {
			kept.push(entry);
			continue;
		}

		if (filterable && id && name) {
			if (workspace.catalog.greedierById.has(id)) {
				removedGreedierNames.push(name);
			} else {
				removedBaseNames.push(name);
			}
		}
	}

	workspace.entries.splice(0, workspace.entries.length, ...kept);

	const addedGreedierNames = [...workspace.catalog.greedierById.values()]
		.filter((catalogEntry) => exportableIds.has(catalogEntry.entry.id))
		.map((catalogEntry) => catalogEntry.entry.name || catalogEntry.entry.id);

	return { removedBaseNames, removedGreedierNames, addedGreedierNames };
}

export const filterToExportableRule: GenerationRule = {
	name: 'filterToExportable',
	apply(context) {
		context.exclusionRecord = buildExclusionRecord(context.workspace, context.exportableIds);
	},
};
