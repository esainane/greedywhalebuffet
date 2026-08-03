import type { GenerationRule } from './types.js';

export const permitDuplicateCharactersRule: GenerationRule = {
	name: 'permitDuplicateCharacters',
	apply({ workspace, options }) {
		if (!options.permitDuplicateCharacters) {
			return;
		}

		workspace.addDuplicateCharactersLine();
	},
};
