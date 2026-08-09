import type { GenerationRule } from './types.js';
import type { CharacterEntry } from '../types.js';

export const addSpiritOfIvoryRule: GenerationRule = {
	name: 'addSpiritOfIvory',
	apply({ workspace, options }) {
		if (!options.addSpiritOfIvory) {
			return;
		}

		const spiritOfIvoryId = 'spiritofivory';
		if (!workspace.entries.some((entry) => (typeof entry === 'string' ? entry : (entry as CharacterEntry).id) === spiritOfIvoryId)) {
			workspace.entries.push(spiritOfIvoryId);
		}
	},
};
