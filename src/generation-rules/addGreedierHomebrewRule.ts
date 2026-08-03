import type { GenerationRule } from './types.js';

export const addGreedierHomebrewRule: GenerationRule = {
	name: 'addGreedierHomebrew',
	apply({ workspace, options }) {
		if (!options.addGreedierHomebrew) {
			return;
		}

		workspace.addGreedierCharacters();
	},
};
