import type { GenerationRule } from './types.js';

const NO_DEMON_BLUFFS = 'The Demon receives no bluffs.';

export const noDemonBluffsRule: GenerationRule = {
	name: 'demonReceivesNoBluffs',
	apply({ workspace, options }) {
		if (options.noDemonBluffs || !workspace.meta.bootlegger) {
			return;
		}

		workspace.meta.bootlegger = workspace.meta.bootlegger.filter(
			(line) => line !== NO_DEMON_BLUFFS,
		);
	},
};
