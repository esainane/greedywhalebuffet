import type { GenerationRule } from './types.js';

export const alejoRulesRule: GenerationRule = {
	name: 'alejoRules',
	apply({ workspace, options }) {
		if (!options.alejoRules) {
			return;
		}

		const snakeCharmer = workspace.generationContext.findOrExpandCharacter(
			'snakecharmer',
			workspace.entries,
			workspace.catalog,
		);
		if (snakeCharmer) {
			snakeCharmer.firstNight = workspace.catalog.firstNightOrder('philosopher');
		}
	},
};
