import { CharacterEntry } from '../types.js';
import type { GenerationRule } from './types.js';

const NO_DEMON_BLUFFS = 'The Demon receives no bluffs.';
const SUMMONER_PREFIX = 'You get 3 bluffs. ';

export const noDemonBluffsRule: GenerationRule = {
	name: 'demonReceivesNoBluffs',
	apply({ workspace, options }) {
		if (options.noDemonBluffs || !workspace.meta.bootlegger) {
			return;
		}

		workspace.meta.bootlegger = workspace.meta.bootlegger.filter(
			(line) => line !== NO_DEMON_BLUFFS,
		);

		for (const entry of workspace.entries) {
			if (typeof entry === 'string') {
				continue;
			}

			const characterEntry = entry as CharacterEntry;
			const baseId = workspace.generationContext.resolveBaseIdFor(characterEntry.id, workspace.catalog);
			if (baseId !== 'summoner') {
				continue;
			}
			if (characterEntry.ability.startsWith(SUMMONER_PREFIX)) {
				continue;
			}
			characterEntry.ability = SUMMONER_PREFIX + characterEntry.ability;
		}
	},
};
