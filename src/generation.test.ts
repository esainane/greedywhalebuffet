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
	greedyJinxData?: JinxFile;
	greedierJinxData?: JinxFile;
	jinxData?: JinxFile;
}): FetchedData {
	return new FetchedData({
		greedyJson: params.greedyJson ?? [{ id: '_meta', name: 'Test Script' }],
		greedyJinxData: params.greedyJinxData ?? ([] as JinxFile),
		greedierJinxData: params.greedierJinxData ?? ([] as JinxFile),
		greedierCharactersData: params.greedierCharactersData,
		greedyToBaseID: params.greedyToBaseID ?? {},
		rolesData: params.rolesData ?? [],
		nightsheetFile: params.nightsheetFile ?? ({ firstNight: [], otherNight: [] } as NightsheetFile),
		jinxData: params.jinxData ?? ([] as JinxFile),
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

	it('includes Greedier jinxes in export when Greedier characters and Greedy jinx listing are enabled', () => {
		const fetchedData = buildFetchedData({
			greedyJson: [{ id: '_meta', name: 'Test Script' }, 'heretic'],
			greedierCharactersData: [
				{
					id: 'journalist_winningclub',
					name: 'Journalist',
					team: 'townsfolk',
					ability: 'Journalist ability',
					edition: 'greedier',
				},
			],
			rolesData: [
				{ id: 'heretic', name: 'Heretic', team: 'outsider', ability: 'Heretic ability' },
				{ id: 'baron', name: 'Baron', team: 'minion', ability: 'Baron ability' },
			],
			greedyJinxData: [
				{ id: 'heretic', jinx: [{ id: 'baron', reason: 'Greedy reason' }] },
			],
			greedierJinxData: [
				{
					id: 'heretic',
					jinx: [{ id: 'journalist_winningclub', reason: 'Greedier reason' }],
				},
			],
		});

		const payload = buildCopyPayload(
			new Set(['heretic', 'journalist_winningclub']),
			buildOptions({
				addGreedierHomebrew: true,
				listGreedyJinxes: true,
			}),
			fetchedData,
		);
		const exported = JSON.parse(payload) as ScriptFile;
		const heretic = exported.find(
			(entry) => typeof entry === 'object' && entry !== null && 'id' in entry && entry.id === 'heretic_custom',
		) as CharacterEntry | undefined;

		expect(heretic?.jinxes).toEqual([
			{ id: 'journalist_winningclub', reason: 'Greedier reason' },
			{ id: 'baron', reason: 'Greedy reason' },
		]);
	});
});
