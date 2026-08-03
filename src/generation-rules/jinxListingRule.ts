import type { GenerationRule } from './types.js';

export const jinxListingRule: GenerationRule = {
	name: 'jinxListing',
	apply({ workspace, options }) {
		if (!options.listOfficialJinxes && !options.listGreedyJinxes) {
			return;
		}

		workspace.applyJinxRules({
			includeOfficial: options.listOfficialJinxes,
			includeGreedy: options.listGreedyJinxes,
			includeGreedier: options.addGreedierHomebrew && options.listGreedyJinxes,
			includeNoDeathAtNight: options.useNoDeathAtNightJinxes,
		});
	},
};
