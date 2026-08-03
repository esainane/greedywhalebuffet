import type { GenerationOptions } from '../options.js';
import type { GenerationWorkspace } from '../generation-workspace.js';

export type GenerationRuleContext = {
	workspace: GenerationWorkspace;
	options: GenerationOptions;
};

export type GenerationRule = {
	readonly name: string;
	apply(context: GenerationRuleContext): void;
};
