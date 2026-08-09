import type { GenerationRule } from './types.js';
import type { CharacterEntry } from '../types.js';

export const addGreedierHomebrewRule: GenerationRule = {
	name: 'addGreedierHomebrew',
	apply({ workspace, options }) {
		if (!options.addGreedierHomebrew) {
			return;
		}

		const existingIds = new Set(
			workspace.entries
				.filter((entry): entry is CharacterEntry => typeof entry === 'object' && entry !== null && 'id' in entry)
				.map((entry) => entry.id)
				.concat(workspace.entries.filter((entry): entry is string => typeof entry === 'string')),
		);

		for (const catalogEntry of workspace.catalog.greedierById.values()) {
			if (!existingIds.has(catalogEntry.entry.id)) {
				workspace.entries.push(structuredClone(catalogEntry.entry));
				existingIds.add(catalogEntry.entry.id);
			}
		}
	},
};
