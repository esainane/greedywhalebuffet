import type { GenerationRule } from './types.js';

export const addSpiritOfIvoryRule: GenerationRule = {
	name: 'addSpiritOfIvory',
	apply({ workspace, options }) {
		if (!options.addSpiritOfIvory) {
			return;
		}

		workspace.applySpiritOfIvory();
	},
};
