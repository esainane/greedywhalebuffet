import type { GenerationRule } from './types.js';

export const alejoRulesRule: GenerationRule = {
	name: 'alejoRules',
	apply({ workspace, options }) {
		if (!options.alejoRules) {
			return;
		}

		workspace.applyAlejoRules();
	},
};
