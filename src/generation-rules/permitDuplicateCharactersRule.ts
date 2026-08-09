import type { GenerationRule } from './types.js';
import { DUPLICATE_LINE } from '../constants.js';

export const permitDuplicateCharactersRule: GenerationRule = {
	name: 'permitDuplicateCharacters',
	apply({ workspace, options }) {
		if (!options.permitDuplicateCharacters) {
			return;
		}

		workspace.meta.bootlegger = [...(workspace.meta.bootlegger ?? []), DUPLICATE_LINE];
	},
};
