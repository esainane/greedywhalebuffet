/**
 * Single source of truth for generation options configuration.
 * This configuration drives form generation and option processing.
 */

type OptionDefinition<Name extends string = string> = {
	id: string;
	label: string;
	defaultValue: boolean;
	helpText: string;
	dependsOn?: readonly Name[];
};

function defineOptionDefinitions<T extends Record<string, OptionDefinition<Extract<keyof T, string>>>>(
	definitions: T,
): T {
	return definitions;
}

export const OPTION_DEFINITIONS = defineOptionDefinitions({
	permitDuplicateCharacters: {
		id: 'add-duplicate-characters-line',
		label: 'Permit duplicate characters',
		defaultValue: true,
		helpText: 'Duplicate characters might be added during setup, even without setup abilities.',
	},
	addSpiritOfIvory: {
		id: 'add-spirit-of-ivory',
		label: 'Add Spirit of Ivory',
		defaultValue: true,
		helpText:
			"Adds the Spirit of Ivory NPC. This prevents there being any more than one Evil over the base Evil count in the game.",
	},
	alejoRules: {
		id: 'alejo-rules',
		label: 'Alejo rules',
		defaultValue: false,
		helpText:
			'Run Alejo ordering for the first night: Snake Charmer acts before Minion and Demon information.',
	},
	listOfficialJinxes: {
		id: 'list-official-jinxes',
		label: 'List official jinxes',
		defaultValue: false,
		helpText:
			'Adds all vanilla Blood on the Clocktower official jinxes to the generated script sheet.',
	},
	listGreedyJinxes: {
		id: 'list-greedy-jinxes',
		label: 'List Greedy jinxes',
		defaultValue: false,
		helpText:
			'Adds all Greedy Whalebuffet-specific jinxes to the generated script sheet.',
	},
	useNoDeathAtNightJinxes: {
		id: 'use-no-death-at-night-jinxes',
		label: 'Use No Death At Night jinxes',
		defaultValue: false,
		helpText:
			'Leviathan, Riot, and the homebrew Armageddon are all Demons which do not cause regular deaths until their deadline, and have jinxes with roles which would otherwise have no interaction (Banshee, Exorcist, Farmer, Grandmother, Innkeeper, Monk, Ravenkeeper, Sage, Soldier, and the homebrew Journalist and Pathologist): Each night*, the Demon chooses a different living player they believe is Good, which may trigger demonbanes, and if the Demon nominates and executes protected or vulnerable players, a team wins. Enabling sets a night order position for the Demons to prompt for a Jinx choice. This makes more role combinations meaningful, but adds significant clutter to the jinx list, as a jinx is added for the full cartesian product of combinations. Disabling removes the rarely used jinxes, Greedy or official, from any on-script listing.',
	},
	addGreedierHomebrew: {
		id: 'add-greedier-homebrew',
		label: 'Add Greedier homebrew',
		defaultValue: false,
		helpText:
			'Adds all characters from the Greedier homebrew competitions to the character pool.',
	},
});

export type GenerationOptionName = Extract<keyof typeof OPTION_DEFINITIONS, string>;
export type GenerationOptions = Record<GenerationOptionName, boolean>;

export type OptionConfig = {
	id: string;
	name: GenerationOptionName;
	label: string;
	defaultChecked: boolean;
	helpText: string;
	dependsOn?: readonly GenerationOptionName[];
};

export const GENERATION_OPTION_NAMES = Object.keys(OPTION_DEFINITIONS) as readonly GenerationOptionName[];

function optionDefinitionFor(name: GenerationOptionName): OptionDefinition<GenerationOptionName> {
	return OPTION_DEFINITIONS[name] as OptionDefinition<GenerationOptionName>;
}

export const GENERATION_OPTIONS: readonly OptionConfig[] = GENERATION_OPTION_NAMES.map((name) => {
	const def = optionDefinitionFor(name);
	return {
		id: def.id,
		name,
		label: def.label,
		defaultChecked: def.defaultValue,
		helpText: def.helpText,
		dependsOn: def.dependsOn,
	};
});

const OPTION_BY_NAME: Readonly<Record<GenerationOptionName, OptionConfig>> = Object.fromEntries(
	GENERATION_OPTIONS.map((opt) => [opt.name, opt]),
) as Readonly<Record<GenerationOptionName, OptionConfig>>;

export function isGenerationOptionName(value: string): value is GenerationOptionName {
	return value in OPTION_DEFINITIONS;
}

export function defaultGenerationOptions(): GenerationOptions {
	const options = {} as GenerationOptions;
	for (const optionName of GENERATION_OPTION_NAMES) {
		options[optionName] = OPTION_DEFINITIONS[optionName].defaultValue;
	}
	return options;
}

/**
 * Get option names that depend on a specific option.
 */
export function getDependentOptionNames(optionName: GenerationOptionName): readonly GenerationOptionName[] {
	return GENERATION_OPTIONS
		.filter((opt) => opt.dependsOn?.includes(optionName))
		.map((opt) => opt.name);
}

/**
 * Get all option names that a specific option depends on.
 */
export function getOptionDependencies(optionName: GenerationOptionName): readonly GenerationOptionName[] {
	return OPTION_BY_NAME[optionName]?.dependsOn ?? [];
}
