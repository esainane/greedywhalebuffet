/**
 * Single source of truth for generation options configuration.
 * This configuration drives form generation and option processing.
 */

import type { GenerationOptions } from './types.js';

export type OptionConfig = {
	id: string;
	name: keyof GenerationOptions;
	label: string;
	defaultChecked: boolean;
	helpText: string;
	/** IDs of options that must be enabled for this option to be available */
	dependsOn?: string[];
};

export const GENERATION_OPTIONS: readonly OptionConfig[] = [
	{
		id: 'append-duplicate-line',
		name: 'appendDuplicateLine',
		label: 'Duplicate characters',
		defaultChecked: true,
		helpText: 'Duplicate characters might be added during setup, even without setup abilities.',
	},
	{
		id: 'alejo-rules',
		name: 'alejoRules',
		label: 'Alejo rules',
		defaultChecked: false,
		helpText:
			'Enforces Alejo first-night ordering: Philosopher and Snake Charmer appear before Minion and Demon information.',
	},
	{
		id: 'list-official-jinxes',
		name: 'listOfficialJinxes',
		label: 'List official jinxes',
		defaultChecked: false,
		helpText:
			'Adds all vanilla Blood on the Clocktower official jinxes to the generated script sheet.',
	},
	{
		id: 'list-greedy-jinxes',
		name: 'listGreedyJinxes',
		label: 'List Greedy jinxes',
		defaultChecked: false,
		helpText:
			'Adds all Greedy Whalebuffet-specific jinxes to the generated script sheet.',
	},
	{
		id: 'add-greedier-homebrew',
		name: 'addGreedierHomebrew',
		label: 'WIP: Add Greedier homebrew characters',
		defaultChecked: false,
		helpText:
			'Adds all characters from Greedier to the character pool. WARNING: This is a work-in-progress feature. Character definitions, including ability descriptions and night order information, may be missing or incorrect, and no Greedier jinxes will be listed on-script, regardless of other options.',
	},
] as const;

/**
 * Get options that depend on a specific option being enabled.
 */
export function getDependentOptions(optionId: string): readonly OptionConfig[] {
	return GENERATION_OPTIONS.filter((opt) => opt.dependsOn?.includes(optionId));
}

/**
 * Get all option IDs that a specific option depends on.
 */
export function getOptionDependencies(optionId: string): readonly string[] {
	const option = GENERATION_OPTIONS.find((opt) => opt.id === optionId);
	return option?.dependsOn ?? [];
}
