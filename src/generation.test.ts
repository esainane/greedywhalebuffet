import { describe, expect, it } from 'vitest';
import { buildExportedScript } from './generation.js';
import type {
	CharacterEntry,
	ScriptFile,
} from './types.js';
import { buildTestOptions, createTestCatalog } from './test-helpers.js';

describe('buildCopyPayload', () => {
	it('omits sourceSet from exported Greedier character entries', () => {
		const catalog = createTestCatalog({
			greedierCharactersData: [
				{
					entry: {
						id: 'alpha',
						name: 'Alpha',
						team: 'townsfolk',
						ability: 'Alpha ability',
						edition: 'greedier',
					},
					sourceSet: 4,
				},
			],
		});

		const payload = buildExportedScript(
			new Set(['alpha']),
			buildTestOptions({ addGreedierHomebrew: true }),
			catalog,
		);
		const exported = JSON.parse(payload) as ScriptFile;
		const exportedCharacter = exported.find(
			(entry) => typeof entry === 'object' && entry !== null && 'id' in entry && entry.id === 'alpha',
		) as CharacterEntry | undefined;

		expect(exportedCharacter).toBeDefined();
		expect(exportedCharacter && 'sourceSet' in exportedCharacter).toBe(false);
	});

	it('reverts Leviathan and Riot export fields to upstream values when NDAN jinxes are disabled', () => {
		const catalog = createTestCatalog({
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

		const payload = buildExportedScript(
			new Set(['leviathan_popppp', 'riot_popppp']),
			buildTestOptions({ useNoDeathAtNightJinxes: false }),
			catalog,
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
		const catalog = createTestCatalog({
			greedyJson: [{ id: '_meta', name: 'Test Script' }, 'heretic'],
			greedierCharactersData: [
				{
					entry: {
						id: 'journalist_winningclub',
						name: 'Journalist',
						team: 'townsfolk',
						ability: 'Journalist ability',
						edition: 'greedier',
					},
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

		const payload = buildExportedScript(
			new Set(['heretic', 'journalist_winningclub']),
			buildTestOptions({
				addGreedierHomebrew: true,
				listGreedyJinxes: true,
			}),
			catalog,
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
