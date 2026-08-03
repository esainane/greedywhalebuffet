/**
 * Single source of truth for generation options configuration.
 * This configuration drives form generation and option processing.
 */

import type { GenerationOptions } from './types.js';

type OptionConfig = {
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
		id: 'add-duplicate-characters-line',
		name: 'permitDuplicateCharacters',
		label: 'Permit duplicate characters',
		defaultChecked: true,
		helpText: 'Duplicate characters might be added during setup, even without setup abilities.',
	},
	{
		id: 'add-spirit-of-ivory',
		name: 'addSpiritOfIvory',
		label: 'Add Spirit of Ivory',
		defaultChecked: true,
		helpText:
			"Adds the Spirit of Ivory NPC. This prevents there being any more than one Evil over the base Evil count in the game.",
	},
	{
		id: 'alejo-rules',
		name: 'alejoRules',
		label: 'Alejo rules',
		defaultChecked: false,
		helpText:
			'Run Alejo ordering for the first night: Snake Charmer acts before Minion and Demon information.',
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
		id: 'use-no-death-at-night-jinxes',
		name: 'useNoDeathAtNightJinxes',
		label: 'Use No Death At Night jinxes',
		defaultChecked: false,
		helpText:
			'Leviathan, Riot, and the homebrew Armageddon are all Demons which do not cause regular deaths until their deadline, and have jinxes with roles which would otherwise have no interaction (Banshee, Exorcist, Farmer, Grandmother, Innkeeper, Monk, Ravenkeeper, Sage, Soldier, and the homebrew Journalist and Pathologist): Each night*, the Demon chooses a different living player they believe is Good, which may trigger demonbanes, and if the Demon nominates and executes protected or vulnerable players, a team wins. Enabling sets a night order position for the Demons to prompt for a Jinx choice. This makes more role combinations meaningful, but adds significant clutter to the jinx list, as a jinx is added for the full cartesian product of combinations. Disabling removes the rarely used jinxes, Greedy or official, from any on-script listing.',
	},
	{
		id: 'add-greedier-homebrew',
		name: 'addGreedierHomebrew',
		label: 'Add Greedier homebrew',
		defaultChecked: false,
		helpText:
			'Adds all characters from the Greedier homebrew competitions to the character pool. WARNING: This is an incomplete feature. Character definitions, including ability descriptions and night order information, may be missing or incorrect.',
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
