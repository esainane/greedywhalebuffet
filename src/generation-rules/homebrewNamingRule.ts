import type { GenerationRule } from './types.js';

export const homebrewNamingRule: GenerationRule = {
	name: 'homebrewNaming',
	apply({ workspace, options, exportableIds }) {
		const baseName = workspace.catalog.baseScript.meta.name;
		const hasGreedier = options.addGreedierHomebrew
			&& [...exportableIds].some((id) => workspace.catalog.greedierById.has(id));
		workspace.meta.name = hasGreedier ? baseName.replace(/\bGreedy\b/g, 'Greedier') : baseName;
	},
};
