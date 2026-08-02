import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import type { JinxFile, MappingFile, NightsheetFile, CharacterBase, CharacterEntry } from './types.js';

const CORE_TEAMS = new Set(['townsfolk', 'outsider', 'minion', 'demon']);
const GREEDY_EXCEPTIONS = new Set(['choose_your_chars', '_meta']);
const NIGHTSHEET_EXCEPTIONS = new Set([
	'dusk',
	'dawn',
	'minioninfo',
	'demoninfo',
]);

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const staticRoot = path.join(repoRoot, 'static');

async function readJson<T>(filePath: string): Promise<T> {
	return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function suggestSimilar(id: string, allowedIds: Set<string>): string {
	const prefixes = [...allowedIds.values()].filter((allowedId) => allowedId.startsWith(id));
	const extensions = [...allowedIds.values()].filter((allowedId) => id.startsWith(allowedId));
	if (prefixes.length > 0) {
		return ` (did you mean: ${prefixes.join(', ')})`;
	} else if (extensions.length > 0) {
		return ` (did you mean: ${extensions.join(', ')})`;
	}
	return '';
}

function collectInvalidJinxIds(
	entries: JinxFile,
	allowedIds: Set<string>,
	label: string,
): string[] {
	const issues: string[] = [];

	for (const entry of entries) {
		if (!allowedIds.has(entry.id)) {
			const suggestion = suggestSimilar(entry.id, allowedIds);
			issues.push(`${label}: entry id "${entry.id}" is not allowed${suggestion}`);
		}

		for (const jinxFileEntry of entry.jinx) {
			if (!allowedIds.has(jinxFileEntry.id)) {
				const suggestion = suggestSimilar(jinxFileEntry.id, allowedIds);
				issues.push(
					`${label}: jinx id "${jinxFileEntry.id}" (paired with "${entry.id}") is not allowed${suggestion}`,
				);
			}
		}
	}

	return issues;
}

function assertNoIssues(issues: string[], heading: string): void {
	if (issues.length === 0) {
		return;
	}

	throw new Error(`${heading}\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
}

async function collectGreedierDefinedIds(): Promise<Set<string>> {
	const greedierFileNames = await readdir(path.join(staticRoot, 'greedier'));
	const greedierDefinedIds = new Set<string>();

	for (const fileName of greedierFileNames) {
		if (!fileName.endsWith('.json')) {
			continue;
		}

		const script = await readJson<CharacterEntry[]>(path.join(staticRoot, 'greedier', fileName));
		for (const entry of script) {
			if (typeof entry === 'object' && entry.id) {
				greedierDefinedIds.add(entry.id);
			}
		}
	}

	return greedierDefinedIds;
}

describe('static data ID consistency', () => {
	it('keeps id_mappings targets on base role IDs', async () => {
		const [roles, mappingFile] = await Promise.all([
			readJson<CharacterBase[]>(path.join(staticRoot, 'roles.json')),
			readJson<MappingFile>(path.join(staticRoot, 'id_mappings.json')),
		]);

		const baseRoleIds = new Set(roles.map((role) => role.id));
		const issues = Object.entries(mappingFile)
			.filter(([, mappedTo]) => !baseRoleIds.has(mappedTo))
			.map(([sourceId, mappedTo]) =>
				`id_mappings: "${sourceId}" maps to "${mappedTo}", which is not in roles.json`,
			);

		assertNoIssues(issues, 'id_mappings.json has invalid mapping targets:');
	});

	it('keeps greedy.json using mapped IDs where mapped, and base role IDs otherwise', async () => {
		const [roles, greedyEntries, mappingFile] = await Promise.all([
			readJson<CharacterBase[]>(path.join(staticRoot, 'roles.json')),
			readJson<CharacterEntry[]>(path.join(staticRoot, 'greedy.json')),
			readJson<MappingFile>(path.join(staticRoot, 'id_mappings.json')),
		]);

		const baseRoleIds = new Set(roles.map((role) => role.id));
		const issues: string[] = [];

		for (const entry of greedyEntries) {
			if (typeof entry === 'string') {
				if (!baseRoleIds.has(entry)) {
					issues.push(
						`greedy.json: "${entry}" string entry that is not a base role ID`,
					);
				}
				continue;
			}

			const id = entry.id;
			if (baseRoleIds.has(id)) {
				if (Object.values(mappingFile).includes(id)) {
					issues.push(
						`greedy.json: "${id}" is a base role ID that should be mapped to "${mappingFile[id]}"`,
					);
				}
				continue;
			}

			if (id in mappingFile) {
				continue;
			}

			if (GREEDY_EXCEPTIONS.has(id)) {
				continue;
			}

			if (!entry.team || !CORE_TEAMS.has(entry.team)) {
				continue;
			}

			issues.push(
				`greedy.json: "${id}" is a character entry not using a base or mapped role ID`,
			);
		}

		assertNoIssues(issues, 'greedy.json has invalid IDs:');
	});

	it('keeps jinxes.json using only base role IDs', async () => {
		const [roles, jinxes] = await Promise.all([
			readJson<CharacterBase[]>(path.join(staticRoot, 'roles.json')),
			readJson<JinxFile>(path.join(staticRoot, 'jinxes.json')),
		]);

		const baseRoleIds = new Set(roles.map((role) => role.id));
		const issues = collectInvalidJinxIds(jinxes, baseRoleIds, 'jinxes.json');
		assertNoIssues(issues, 'jinxes.json has invalid IDs:');
	});

	it('keeps nightsheet.json using only base role IDs', async () => {
		const [roles, nightsheet] = await Promise.all([
			readJson<CharacterBase[]>(path.join(staticRoot, 'roles.json')),
			readJson<NightsheetFile>(path.join(staticRoot, 'nightsheet.json')),
		]);

		const baseRoleIds = new Set(roles.map((role) => role.id));
		const issues: string[] = [];

		for (const id of nightsheet.firstNight) {
			if (!baseRoleIds.has(id) && !NIGHTSHEET_EXCEPTIONS.has(id)) {
				issues.push(`nightsheet.json: firstNight contains "${id}" not found in roles.json`);
			}
		}

		for (const id of nightsheet.otherNight) {
			if (!baseRoleIds.has(id) && !NIGHTSHEET_EXCEPTIONS.has(id)) {
				issues.push(`nightsheet.json: otherNight contains "${id}" not found in roles.json`);
			}
		}

		assertNoIssues(issues, 'nightsheet.json has invalid IDs:');
	});

	it('keeps greedy_jinxes.json using only base role IDs', async () => {
		const [roles, greedyJinxes] = await Promise.all([
			readJson<CharacterBase[]>(path.join(staticRoot, 'roles.json')),
			readJson<JinxFile>(path.join(staticRoot, 'greedy_jinxes.json')),
		]);

		const baseRoleIds = new Set(roles.map((role) => role.id));
		const issues = collectInvalidJinxIds(greedyJinxes, baseRoleIds, 'greedy_jinxes.json');
		assertNoIssues(issues, 'greedy_jinxes.json has invalid IDs:');
	});

	it('keeps greedier_jinxes.json using only base or greedier-defined IDs', async () => {
		const [roles, greedierJinxes, greedierDefinedIds] = await Promise.all([
			readJson<CharacterBase[]>(path.join(staticRoot, 'roles.json')),
			readJson<JinxFile>(path.join(staticRoot, 'greedier_jinxes.json')),
			collectGreedierDefinedIds(),
		]);

		const baseRoleIds = new Set(roles.map((role) => role.id));

		const allowedIds = new Set<string>([...baseRoleIds, ...greedierDefinedIds]);
		const issues = collectInvalidJinxIds(greedierJinxes, allowedIds, 'greedier_jinxes.json');
		assertNoIssues(issues, 'greedier_jinxes.json has invalid IDs:');
	});

	it('ensures greedier-defined IDs do not overlap base or mapped IDs', async () => {
		const [roles, mappingFile, greedierDefinedIds] = await Promise.all([
			readJson<CharacterBase[]>(path.join(staticRoot, 'roles.json')),
			readJson<MappingFile>(path.join(staticRoot, 'id_mappings.json')),
			collectGreedierDefinedIds(),
		]);

		const baseRoleIds = new Set(roles.map((role) => role.id));
		const mappedSourceIds = new Set(Object.keys(mappingFile));
		const issues: string[] = [];

		for (const id of greedierDefinedIds) {
			if (baseRoleIds.has(id)) {
				issues.push(`greedier/*.json: defined id "${id}" overlaps roles.json base ID`);
			}

			if (mappedSourceIds.has(id)) {
				issues.push(`greedier/*.json: defined id "${id}" overlaps id_mappings.json source ID`);
			}
		}

		assertNoIssues(issues, 'greedier script extras define overlapping IDs:');
	});
});
