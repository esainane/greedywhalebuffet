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
	ability?: string;
	image?: string | string[];
	team?: string;
	edition?: string;
	sourceSet?: number;
	flavor?: string;
	jinxes?: { id: string; reason: string }[];
	firstNightReminder?: string;
	firstNight?: number;
	otherNightReminder?: string;
	otherNight?: number;
	reminders?: string[];
	remindersGlobal?: string[];
	setup?: boolean;
	special?: unknown[];
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
	team?: string;
	imageUrl?: string | string[];
	sourceSet?: number;
};

export type GenerationOptions = {
	appendDuplicateLine: boolean;
	addSpiritOfIvory: boolean;
	alejoRules: boolean;
	listOfficialJinxes: boolean;
	listGreedyJinxes: boolean;
	addGreedierHomebrew: boolean;
};
