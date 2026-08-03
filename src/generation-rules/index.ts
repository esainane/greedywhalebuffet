import type { GenerationRule } from './types.js';
import { addGreedierHomebrewRule } from './addGreedierHomebrewRule.js';
import { permitDuplicateCharactersRule } from './permitDuplicateCharactersRule.js';
import { addSpiritOfIvoryRule } from './addSpiritOfIvoryRule.js';
import { alejoRulesRule } from './alejoRulesRule.js';
import { jinxListingRule } from './jinxListingRule.js';
import { noDeathAtNightJinxRule } from './noDeathAtNightJinxRule.js';

/**
 * Rules that affect the candidate source character pool before deselection filtering.
 */
export const SOURCE_COMPOSITION_RULES: readonly GenerationRule[] = [
	addGreedierHomebrewRule,
];

/**
 * Ordered option transformation rules for generated output.
 */
export const TRANSFORMATION_RULES: readonly GenerationRule[] = [
	permitDuplicateCharactersRule,
	addSpiritOfIvoryRule,
	alejoRulesRule,
	jinxListingRule,
	noDeathAtNightJinxRule,
];
