import { describe, expect, it } from 'vitest';
import { FetchedData } from './data/fetched.js';
import { buildCopyPayload } from './generation.js';
import type { CharacterEntry, GenerationOptions, JinxFile, NightsheetFile, ScriptFile } from './types.js';

function buildFetchedData(params: {
	greedyJson?: ScriptFile;
	greedierCharactersData: CharacterEntry[];
	rolesData?: CharacterEntry[];
	greedyToBaseID?: Record<string, string>;
	nightsheetFile?: NightsheetFile;
}): FetchedData {
	return new FetchedData({
		greedyJson: params.greedyJson ?? [{ id: '_meta', name: 'Test Script' }],
		greedyJinxData: [] as JinxFile,
		greedierJinxData: [] as JinxFile,
		greedierCharactersData: params.greedierCharactersData,
		greedyToBaseID: params.greedyToBaseID ?? {},
		rolesData: params.rolesData ?? [],
		nightsheetFile: params.nightsheetFile ?? ({ firstNight: [], otherNight: [] } as NightsheetFile),
		jinxData: [] as JinxFile,
	});
}

function buildOptions(overrides: Partial<GenerationOptions> = {}): GenerationOptions {
	return {
		appendDuplicateLine: false,
		addSpiritOfIvory: false,
		alejoRules: false,
		listOfficialJinxes: false,
		listGreedyJinxes: false,
		useNoDeathAtNightJinxes: false,
		addGreedierHomebrew: false,
		...overrides,
	};
}

describe('buildCopyPayload', () => {
	it('omits sourceSet from exported Greedier character entries', () => {
		const fetchedData = buildFetchedData({
			greedierCharactersData: [
				{
					id: 'alpha',
					name: 'Alpha',
					team: 'townsfolk',
					ability: 'Alpha ability',
					edition: 'greedier',
					sourceSet: 4,
				},
			],
		});

		const payload = buildCopyPayload(
			new Set(['alpha']),
			buildOptions({ addGreedierHomebrew: true }),
			fetchedData,
		);
		const exported = JSON.parse(payload) as ScriptFile;
		const exportedCharacter = exported.find(
			(entry) => typeof entry === 'object' && entry !== null && 'id' in entry && entry.id === 'alpha',
		) as CharacterEntry | undefined;

		expect(exportedCharacter).toBeDefined();
		expect(exportedCharacter?.sourceSet).toBeUndefined();
	});

	it('reverts Leviathan and Riot export fields to upstream values when NDAN jinxes are disabled', () => {
		const fetchedData = buildFetchedData({
			greedyJson: [
				{ id: '_meta', name: 'Test Script' },
				{
					id: 'leviathan_popppp',
					name: 'Leviathan',
					team: 'demon',
					ability: 'Leviathan ability',
					firstNight: 79,
					firstNightReminder: 'Greedy Leviathan reminder',
					otherNight: 55,
					otherNightReminder: 'Greedy Leviathan other reminder',
					reminders: ['Day 1', 'Jinx Chosen'],
				},
				{
					id: 'riot_popppp',
					name: 'Riot',
					team: 'demon',
					ability: 'Riot ability',
					otherNight: 55,
					otherNightReminder: 'Greedy Riot other reminder',
					reminders: ['Day 1', 'Jinx Chosen'],
				},
			],
			greedierCharactersData: [],
			greedyToBaseID: {
				leviathan_popppp: 'leviathan',
				riot_popppp: 'riot',
			},
			rolesData: [
				{
					id: 'leviathan',
					name: 'Leviathan',
					team: 'demon',
					ability: 'Leviathan ability',
					firstNightReminder: 'Upstream Leviathan first reminder',
					otherNightReminder: 'Upstream Leviathan other reminder',
					reminders: ['Day 1', 'Day 2'],
				},
				{
					id: 'riot',
					name: 'Riot',
					team: 'demon',
					ability: 'Riot ability',
					otherNightReminder: 'Upstream Riot other reminder',
					reminders: ['Day 1', 'Day 2', 'Day 3'],
				},
			],
			nightsheetFile: {
				firstNight: ['leviathan'],
				otherNight: ['riot', 'leviathan'],
			},
		});

		const payload = buildCopyPayload(
			new Set(['leviathan_popppp', 'riot_popppp']),
			buildOptions({ useNoDeathAtNightJinxes: false }),
			fetchedData,
		);
		const exported = JSON.parse(payload) as ScriptFile;
		const leviathan = exported.find(
			(entry) => typeof entry === 'object' && entry !== null && 'id' in entry && entry.id === 'leviathan_popppp',
		) as CharacterEntry | undefined;
		const riot = exported.find(
			(entry) => typeof entry === 'object' && entry !== null && 'id' in entry && entry.id === 'riot_popppp',
		) as CharacterEntry | undefined;

		expect(leviathan?.firstNight).toBe(1);
		expect(leviathan?.otherNight).toBe(2);
		expect(leviathan?.firstNightReminder).toBe('Upstream Leviathan first reminder');
		expect(leviathan?.otherNightReminder).toBe('Upstream Leviathan other reminder');
		expect(leviathan?.reminders).toEqual(['Day 1', 'Day 2']);

		expect(riot?.firstNight).toBeUndefined();
		expect(riot?.otherNight).toBe(1);
		expect(riot?.firstNightReminder).toBeUndefined();
		expect(riot?.otherNightReminder).toBe('Upstream Riot other reminder');
		expect(riot?.reminders).toEqual(['Day 1', 'Day 2', 'Day 3']);
	});
});
