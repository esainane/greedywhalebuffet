import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FILTERABLE_TEAMS, REMOVED_CHARACTERS_PREFIX } from './constants.js';
import { Catalog } from './data/catalog.js';
import { getUnsatisfiedDependencyCharacterIds } from './dependencies.js';
import { buildExportedScript, generate } from './generation.js';
import type {
	CharacterEntry,
	ScriptFile,
	MetaEntry,
} from './types.js';
import { buildTestOptions, createStaticFetch, createTestCatalog } from './test-helpers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const staticRoot = path.join(repoRoot, 'static');

async function loadFixtureData(): Promise<Catalog> {
	const { loadLatestJson } = await import('./data/loader.js');
	const originalFetch = globalThis.fetch;
	globalThis.fetch = createStaticFetch(staticRoot) as typeof fetch;

	try {
		return (await loadLatestJson()).catalog;
	} finally {
		globalThis.fetch = originalFetch;
	}
}

function getMetaEntry(data: ScriptFile): { name: string; bootlegger: string[] } {
	const meta = data[0];
	if (
		typeof meta !== 'object' ||
		meta?.id !== '_meta' ||
		typeof meta.name !== 'string'
	) {
		throw new Error('Missing _meta entry');
	}

	const typedMeta = meta as MetaEntry;

	return {
		name: typedMeta.name,
		bootlegger: Array.isArray(typedMeta.bootlegger) ? typedMeta.bootlegger : [],
	};
}

function getRoleTeamByBaseId(catalog: Catalog): Map<string, string> {
	return new Map([...catalog.rolesById.values()].map((ce) => [ce.baseId, ce.entry.team] as const));
}

function getFilterableBaseSelectionFromGreedy(catalog: Catalog): string[] {
	return catalog.baseSelectableCharacters().map((c) => c.id).sort();
}

function getFilterableIdsFromPayload(payload: ScriptFile): string[] {
	const ids: string[] = [];

	for (const entry of payload) {
		if (typeof entry === 'string') {
			ids.push(entry);
			continue;
		}

		if (
			typeof entry === 'object' &&
			entry !== null &&
			'id' in entry &&
			typeof entry.id === 'string' &&
			'team' in entry &&
			typeof entry.team === 'string' &&
			FILTERABLE_TEAMS.has(entry.team)
		) {
			ids.push(entry.id);
		}
	}

	return ids;
}

function hasCharacter(payload: ScriptFile, id: string): boolean {
	return payload.some((entry) => {
		if (typeof entry === 'string') {
			return entry === id;
		}

		return typeof entry === 'object' && entry !== null && 'id' in entry && entry.id === id;
	});
}

function findCharacter(payload: ScriptFile, ids: readonly string[]): CharacterEntry | undefined {
	for (const entry of payload) {
		if (
			typeof entry === 'object' &&
			entry !== null &&
			'id' in entry &&
			typeof entry.id === 'string' &&
			ids.includes(entry.id)
		) {
			return entry as CharacterEntry;
		}
	}

	return undefined;
}

function getTeamRank(team: string | undefined): number {
	switch (team) {
		case 'townsfolk':
			return 0;
		case 'outsider':
			return 1;
		case 'minion':
			return 2;
		case 'demon':
			return 3;
		default:
			return Number.MAX_SAFE_INTEGER;
	}
}

describe('generation characterization fixtures', () => {
	it('fixture: substantial base deselection records removals and excludes unselected filterable characters', async () => {
		const catalog = await loadFixtureData();
		const allFilterable = getFilterableBaseSelectionFromGreedy(catalog);
		expect(allFilterable.length).toBeGreaterThan(40);

		const selectedList = allFilterable.slice(0, 8);
		const selectedCharacterIds = new Set(selectedList);
		const blocked = getUnsatisfiedDependencyCharacterIds(selectedCharacterIds, catalog);
		const expectedExportableSelected = selectedList.filter((id) => !blocked.has(id));

		const payload = generate(
			{ selectedCharacterIds, options: buildTestOptions() },
			catalog,
		).script;
		const exportedFilterableIds = getFilterableIdsFromPayload(payload);
		const exportedIdSet = new Set(exportedFilterableIds);
		const { bootlegger } = getMetaEntry(payload);

		for (const selectedId of expectedExportableSelected) {
			expect(exportedIdSet.has(selectedId)).toBe(true);
		}

		const alwaysIncludedIds = new Set(['choose_your_chars']);
		const unselectedIds = allFilterable.filter(
			(id) => !selectedCharacterIds.has(id) && !alwaysIncludedIds.has(id),
		);
		expect(unselectedIds.length).toBeGreaterThan(allFilterable.length / 2);
		for (const unselectedId of unselectedIds) {
			expect(exportedIdSet.has(unselectedId)).toBe(false);
		}

		expect(
			bootlegger.some((line) => line.startsWith(REMOVED_CHARACTERS_PREFIX)),
		).toBe(true);
	});

	it('fixture: small selection with unsatisfied dependency excludes dependent role and records it in metadata', async () => {
		const catalog = await loadFixtureData();
		const selectedCharacterIds = new Set(['choirboy', 'chef']);

			const result = generate({ selectedCharacterIds, options: buildTestOptions() }, catalog);
		const payload = result.script;
		const { bootlegger } = getMetaEntry(payload);

		expect(hasCharacter(payload, 'choirboy')).toBe(false);
		expect(hasCharacter(payload, 'choirboy_custom')).toBe(false);
		expect(bootlegger.join(' ')).toContain('Choirboy');
	});

	it('fixture: greedier-enabled generation renames script and can emit Greedier addition metadata', async () => {
		const catalog = await loadFixtureData();
		const allBase = getFilterableBaseSelectionFromGreedy(catalog);
		const greedierCharacter = [...catalog.greedierById.values()][0].entry;
		expect(greedierCharacter).toBeDefined();

		const selectedCharacterIds = new Set([...allBase, greedierCharacter.id]);
		const result = generate(
				{ selectedCharacterIds, options: buildTestOptions({ addGreedierHomebrew: true }) },
			catalog,
		);
		const payload = result.script;
		const name = result.scriptName;

		expect(name).toContain('Greedier');
		expect(hasCharacter(payload, greedierCharacter.id)).toBe(true);
		const { bootlegger } = getMetaEntry(payload);
		expect(
			bootlegger.some((line) => line.startsWith('The following Greedier characters have been added:')),
		).toBe(true);
	});

	it('fixture: independent options remain behaviorally observable on a minimal script', () => {
		const catalog = createTestCatalog({
			greedyJson: [{ id: '_meta', name: 'Greedy Mini' }, 'snakecharmer', 'philosopher'],
			rolesData: [
				{ id: 'snakecharmer', name: 'Snake Charmer', team: 'outsider', ability: 'SC' },
				{ id: 'philosopher', name: 'Philosopher', team: 'townsfolk', ability: 'Philo' },
				{ id: 'spiritofivory', name: 'Spirit of Ivory', team: 'fabled', ability: 'SOI' },
			],
			nightsheetFile: {
				firstNight: ['philosopher'],
				otherNight: [],
			},
		});
		const selected = new Set(['snakecharmer', 'philosopher']);

		const defaultPayload = JSON.parse(buildExportedScript(selected, buildTestOptions(), catalog)) as ScriptFile;
		expect(getMetaEntry(defaultPayload).bootlegger.some((line) => line.includes('Duplicate characters'))).toBe(false);

		const duplicatePayload = JSON.parse(
			buildExportedScript(selected, buildTestOptions({ permitDuplicateCharacters: true }), catalog),
		) as ScriptFile;
		expect(getMetaEntry(duplicatePayload).bootlegger.some((line) => line.includes('Duplicate characters might be in play.'))).toBe(true);

		const spiritPayload = JSON.parse(
			buildExportedScript(selected, buildTestOptions({ addSpiritOfIvory: true }), catalog),
		) as ScriptFile;
		expect(hasCharacter(spiritPayload, 'spiritofivory')).toBe(true);

		const alejoPayload = JSON.parse(
			buildExportedScript(selected, buildTestOptions({ alejoRules: true }), catalog),
		) as ScriptFile;
		const snake = findCharacter(alejoPayload, ['snakecharmer_custom', 'snakecharmer']);
		expect(snake?.firstNight).toBe(1);
	});

	it('fixture: official -> greedy -> greedier precedence with blank tombstones and off-script target retention', () => {
		const catalog = createTestCatalog({
			greedyJson: [{ id: '_meta', name: 'Test Script' }, 'heretic'],
			rolesData: [
				{ id: 'heretic', name: 'Heretic', team: 'outsider', ability: 'Heretic' },
				{ id: 'baron', name: 'Baron', team: 'minion', ability: 'Baron' },
			],
			greedierCharactersData: [
				{
					entry: {
						id: 'journalist_winningclub',
						name: 'Journalist',
						team: 'townsfolk',
						ability: 'Journalist',
						edition: 'greedier',
					},
				},
			],
			jinxData: [{ id: 'heretic', jinx: [{ id: 'baron', reason: 'Official reason' }] }],
			greedyJinxData: [
				{
					id: 'heretic',
					jinx: [
						{ id: 'baron', reason: '' },
						{ id: 'kazali', reason: 'Greedy reason retained off-script' },
					],
				},
			],
			greedierJinxData: [
				{
					id: 'heretic',
					jinx: [{ id: 'journalist_winningclub', reason: 'Greedier reason' }],
				},
			],
		});

		const payload = JSON.parse(
			buildExportedScript(
				new Set(['heretic', 'journalist_winningclub']),
				buildTestOptions({
					listOfficialJinxes: true,
					listGreedyJinxes: true,
					addGreedierHomebrew: true,
				}),
					catalog,
			),
		) as ScriptFile;
		const source = findCharacter(payload, ['heretic_custom', 'heretic']);

		expect(source?.jinxes ?? []).not.toContainEqual({ id: 'baron', reason: 'Official reason' });
		expect(source?.jinxes ?? []).toContainEqual({
			id: 'kazali',
			reason: 'Greedy reason retained off-script',
		});
		expect(source?.jinxes ?? []).toContainEqual({
			id: 'journalist_winningclub',
			reason: 'Greedier reason',
		});
		// Current contract: absent jinx targets are retained as IDs even when not selected.
		expect(hasCharacter(payload, 'kazali')).toBe(false);
	});

	it('fixture: no-death-at-night jinxes are excluded by default and included when explicitly enabled', async () => {
		const catalog = await loadFixtureData();
		const selectedCharacterIds = new Set(['leviathan_popppp']);

		const excludedPayload = generate(
			{ selectedCharacterIds, options: buildTestOptions({ listOfficialJinxes: true, useNoDeathAtNightJinxes: false }) },
			catalog,
		).script;
		const includedPayload = generate(
			{ selectedCharacterIds, options: buildTestOptions({ listOfficialJinxes: true, useNoDeathAtNightJinxes: true }) },
			catalog,
		).script;

		const excludedLeviathan = findCharacter(excludedPayload, ['leviathan_popppp', 'leviathan_custom']);
		const includedLeviathan = findCharacter(includedPayload, ['leviathan_popppp', 'leviathan_custom']);
		const excludedTargetIds = new Set((excludedLeviathan?.jinxes ?? []).map((entry) => entry.id));
		const includedTargetIds = new Set((includedLeviathan?.jinxes ?? []).map((entry) => entry.id));

		expect(excludedTargetIds.has('soldier')).toBe(false);
		expect(includedTargetIds.has('soldier')).toBe(true);
	});

	it('fixture: repeated generation is stable with equal inputs and jinx order follows locale-independent team ranking', async () => {
		const catalog = await loadFixtureData();
		const allBase = getFilterableBaseSelectionFromGreedy(catalog);
		const selectedCharacterIds = new Set(allBase.slice(0, 30));
		const options = buildTestOptions({
			listOfficialJinxes: true,
			listGreedyJinxes: true,
			useNoDeathAtNightJinxes: false,
		});

		const first = JSON.stringify(generate({ selectedCharacterIds, options }, catalog).script, null, 2);
		const second = JSON.stringify(generate({ selectedCharacterIds, options }, catalog).script, null, 2);
		const third = JSON.stringify(generate({ selectedCharacterIds, options }, catalog).script, null, 2);

		expect(second).toBe(first);
		expect(third).toBe(first);

		const parsed = JSON.parse(first) as ScriptFile;
		const teamByBaseId = getRoleTeamByBaseId(catalog);
		const sourceWithJinxes = parsed.find(
			(entry) =>
				typeof entry === 'object' &&
				entry !== null &&
				'id' in entry &&
				Array.isArray((entry as CharacterEntry).jinxes) &&
				((entry as CharacterEntry).jinxes?.length ?? 0) >= 2,
		) as CharacterEntry | undefined;
		expect(sourceWithJinxes).toBeDefined();

		const ranks = (sourceWithJinxes?.jinxes ?? []).map((jinx) => {
			const baseId = catalog.resolveBaseId(jinx.id);
			return getTeamRank(teamByBaseId.get(baseId));
		});

		for (let i = 1; i < ranks.length; i++) {
			expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
		}
	});
});
