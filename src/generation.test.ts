import { describe, expect, it } from 'vitest';
import { FetchedData } from './data/fetched.js';
import { buildCopyPayload } from './generation.js';
import type { CharacterEntry, GenerationOptions, JinxFile, NightsheetFile, ScriptFile } from './types.js';

function buildFetchedData(params: {
	greedyJson?: ScriptFile;
	greedierCharactersData: CharacterEntry[];
	rolesData?: CharacterEntry[];
}): FetchedData {
	return new FetchedData({
		greedyJson: params.greedyJson ?? [{ id: '_meta', name: 'Test Script' }],
		greedyJinxData: [] as JinxFile,
		greedierJinxData: [] as JinxFile,
		greedierCharactersData: params.greedierCharactersData,
		greedyToBaseID: {},
		rolesData: params.rolesData ?? [],
		nightsheetFile: { firstNight: [], otherNight: [] } as NightsheetFile,
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
});
