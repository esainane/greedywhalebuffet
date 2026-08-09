import type { GenerationOptions } from '../options.js';
import type { GenerationWorkspace } from '../generation-workspace.js';

export type ExclusionRecord = {
	readonly removedBaseNames: readonly string[];
	readonly removedGreedierNames: readonly string[];
	readonly addedGreedierNames: readonly string[];
};

export type GenerationRuleContext = {
	workspace: GenerationWorkspace;
	options: GenerationOptions;
	exportableIds: ReadonlySet<string>;
	exclusionRecord?: ExclusionRecord;
};

export type GenerationRule = {
	readonly name: string;
	apply(context: GenerationRuleContext): void;
};
