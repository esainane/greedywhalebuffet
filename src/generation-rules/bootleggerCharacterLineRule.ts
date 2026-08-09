import { REMOVED_CHARACTERS_PREFIX } from '../constants.js';
import type { GenerationRule } from './types.js';

export const bootleggerCharacterLineRule: GenerationRule = {
	name: 'bootleggerCharacterLine',
	apply({ workspace, exclusionRecord }) {
		if (!exclusionRecord) {
			return;
		}

		const { removedBaseNames, removedGreedierNames, addedGreedierNames } = exclusionRecord;
		if (removedBaseNames.length === 0 && removedGreedierNames.length === 0) {
			return;
		}

		const bootlegger = Array.isArray(workspace.meta.bootlegger) ? [...workspace.meta.bootlegger] : [];
		const allRemovedLine = `${REMOVED_CHARACTERS_PREFIX}${[...removedBaseNames, ...removedGreedierNames].join(', ')}`;
		const addedLine = `The following Greedier characters have been added: ${addedGreedierNames.join(', ')}`;

		const canMixed = removedBaseNames.length > 0
			&& removedGreedierNames.length > 0
			&& addedGreedierNames.length > 0;
		if (canMixed) {
			const mixedLine = `${REMOVED_CHARACTERS_PREFIX}${removedBaseNames.join(', ')}. ${addedLine}`;
			bootlegger.push(mixedLine.length < allRemovedLine.length ? mixedLine : allRemovedLine);
		} else if (
			removedBaseNames.length === 0
			&& removedGreedierNames.length > 0
			&& addedGreedierNames.length > 0
			&& addedLine.length < allRemovedLine.length
		) {
			bootlegger.push(addedLine);
		} else {
			bootlegger.push(allRemovedLine);
		}

		workspace.meta.bootlegger = bootlegger;
	},
};
