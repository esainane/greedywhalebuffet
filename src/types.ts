/**
 * Type definitions for the Greedy Whalebuffet generator.
 */

export type IdMappings = Record<string, string>;

export type MetaEntry = {
	id?: string;
	name?: string;
	bootlegger?: string[];
};

export type CharacterEntry = {
	id: string;
	name?: string;
	image?: string | string[];
	team?: string;
	jinxes?: { id: string; reason: string }[];
	firstNight?: number;
	otherNight?: number;
};

export type ScriptData = (MetaEntry | CharacterEntry | string)[];

export type JinxEntry = {
	id: string;
	jinx?: { id: string; reason: string }[];
};

export type NightsheetData = {
	firstNight: string[];
	otherNight: string[];
};

export type Character = {
	id: string;
	name: string;
	imageUrl?: string | string[];
};

export type GenerationOptions = {
	appendDuplicateLine: boolean;
	addSpiritOfIvory: boolean;
	alejoRules: boolean;
	listOfficialJinxes: boolean;
	listGreedyJinxes: boolean;
	addGreedierHomebrew: boolean;
};
