import { describe, expect, it } from 'vitest';
import { FetchedData } from './data/fetched.js';
import { buildCopyPayload } from './generation.js';
import type { CharacterEntry, GenerationOptions, JinxEntry, NightsheetData, ScriptData } from './types.js';

function buildFetchedData(params: {
	greedyJson?: ScriptData;
	greedierCharactersData: CharacterEntry[];
	rolesData?: CharacterEntry[];
}): FetchedData {
	return new FetchedData({
		greedyJson: params.greedyJson ?? [{ id: '_meta', name: 'Test Script' }],
		greedyJinxData: [] as JinxEntry[],
		greedierCharactersData: params.greedierCharactersData,
		greedyToBaseID: {},
		rolesData: params.rolesData ?? [],
		nightsheetData: { firstNight: [], otherNight: [] } as NightsheetData,
		jinxData: [] as JinxEntry[],
	});
}

function buildOptions(overrides: Partial<GenerationOptions> = {}): GenerationOptions {
	return {
		appendDuplicateLine: false,
		addSpiritOfIvory: false,
		alejoRules: false,
		listOfficialJinxes: false,
		listGreedyJinxes: false,
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
		const exported = JSON.parse(payload) as ScriptData;
		const exportedCharacter = exported.find(
			(entry) => typeof entry === 'object' && entry !== null && 'id' in entry && entry.id === 'alpha',
		) as CharacterEntry | undefined;

		expect(exportedCharacter).toBeDefined();
		expect(exportedCharacter?.sourceSet).toBeUndefined();
	});
});
