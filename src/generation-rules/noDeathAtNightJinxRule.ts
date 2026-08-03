import type { GenerationRule } from './types.js';

export const noDeathAtNightJinxRule: GenerationRule = {
	name: 'useNoDeathAtNightJinxes',
	apply({ workspace, options }) {
		if (options.useNoDeathAtNightJinxes) {
			workspace.ensureNDANPromptOrder();
			return;
		}

		workspace.revertNDANExportFields();
	},
};
