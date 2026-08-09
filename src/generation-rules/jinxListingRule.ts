import type { GenerationRule } from './types.js';
import { applySelectedJinxes } from '../jinxes.js';

export const jinxListingRule: GenerationRule = {
	name: 'jinxListing',
	apply({ workspace, options }) {
		if (!options.listOfficialJinxes && !options.listGreedyJinxes) {
			return;
		}

		applySelectedJinxes(workspace.entries, workspace, {
			includeOfficial: options.listOfficialJinxes,
			includeGreedy: options.listGreedyJinxes,
			includeGreedier: options.addGreedierHomebrew && options.listGreedyJinxes,
			includeNoDeathAtNight: options.useNoDeathAtNightJinxes,
		});
	},
};
