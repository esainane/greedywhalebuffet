import type { GenerationRule } from './types.js';

export const homebrewNamingRule: GenerationRule = {
	name: 'homebrewNaming',
	apply({ workspace, options, exportableIds }) {
		const baseMeta = workspace.catalog.baseScript.meta;
		const hasGreedier = options.addGreedierHomebrew
			&& [...exportableIds].some((id) => workspace.catalog.greedierById.has(id));
		workspace.meta.name = hasGreedier ? baseMeta.name.replace(/\bGreedy\b/g, 'Greedier') : baseMeta.name;
		workspace.meta.background = hasGreedier
			? baseMeta.background?.replace(/bg\.webp$/, 'bgh.webp')
			: baseMeta.background;
	},
};
