import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import {
	COMMON_BANNED_CHARACTER_IDS,
	POPULAR_GREEDIER_CHARACTER_IDS,
	CHARACTER_DEPENDENCY_REQUIREMENTS,
	NO_DEATH_AT_NIGHT_DEMON_IDS,
	NO_DEATH_AT_NIGHT_ROLE_IDS,
	POLICY_CANONICAL_ID_ALIASES,
} from './characterPolicy.js';
import { assertNoIssues, readJson } from './test-helpers.js';
import type { CharacterBase, MappingFile, ScriptFile } from './types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const staticRoot = path.join(repoRoot, 'static');

describe('policy ID consistency', () => {
	it('keeps common-ban and popular-greedier policy IDs present in known catalog/static IDs', async () => {
		const [roles, mappingFile, greedyScriptIds, greedierIds] = await Promise.all([
			readJson<CharacterBase[]>(path.join(staticRoot, 'roles.json')),
			readJson<MappingFile>(path.join(staticRoot, 'id_mappings.json')),
			readGreedyScriptIds(),
			collectGreedierDefinedIds(),
		]);

		const knownIds = new Set<string>([
			...roles.map((role) => role.id),
			...Object.keys(mappingFile),
			...greedyScriptIds,
			...greedierIds,
		]);

		const issues: string[] = [];
		for (const id of COMMON_BANNED_CHARACTER_IDS) {
			if (!knownIds.has(id)) {
				issues.push(`common ban id "${id}" is not resolvable`);
			}
		}

		for (const id of POPULAR_GREEDIER_CHARACTER_IDS) {
			if (!knownIds.has(id)) {
				issues.push(`popular greedier id "${id}" is not resolvable`);
			}
		}

		assertNoIssues(issues, 'selection policy contains stale IDs:');
	});

	it('keeps dependency policy IDs resolvable against known catalog/static IDs', async () => {
		const [roles, mappingFile, greedierIds] = await Promise.all([
			readJson<CharacterBase[]>(path.join(staticRoot, 'roles.json')),
			readJson<MappingFile>(path.join(staticRoot, 'id_mappings.json')),
			collectGreedierDefinedIds(),
		]);
		const knownIds = new Set<string>([
			...roles.map((role) => role.id),
			...Object.keys(mappingFile),
			...greedierIds,
		]);
		const issues: string[] = [];

		for (const [sourceId, requiredIds] of Object.entries(CHARACTER_DEPENDENCY_REQUIREMENTS)) {
			if (!knownIds.has(sourceId)) {
				issues.push(`dependency source id "${sourceId}" is not a known policy ID`);
			}

			for (const requiredId of requiredIds) {
				if (!knownIds.has(requiredId)) {
					issues.push(`dependency required id "${requiredId}" (for "${sourceId}") is not a known policy ID`);
				}
			}
		}

		assertNoIssues(issues, 'dependency policy contains stale IDs:');
	});

	it('keeps no-death-at-night policy IDs and alias targets valid', async () => {
		const [roles, mappingFile, greedierIds] = await Promise.all([
			readJson<CharacterBase[]>(path.join(staticRoot, 'roles.json')),
			readJson<MappingFile>(path.join(staticRoot, 'id_mappings.json')),
			collectGreedierDefinedIds(),
		]);
		const knownIds = new Set<string>([
			...roles.map((role) => role.id),
			...Object.keys(mappingFile),
			...greedierIds,
		]);
		const baseRoleIds = new Set(roles.map((role) => role.id));
		const noDeathAtNightCanonicalIds = new Set([
			...NO_DEATH_AT_NIGHT_DEMON_IDS,
			...NO_DEATH_AT_NIGHT_ROLE_IDS,
		]);
		const issues: string[] = [];

		for (const id of NO_DEATH_AT_NIGHT_DEMON_IDS) {
			if (!baseRoleIds.has(id) && !Object.values(POLICY_CANONICAL_ID_ALIASES).includes(id)) {
				issues.push(`NDAN demon id "${id}" is not a known base/canonical ID`);
			}
		}

		for (const id of NO_DEATH_AT_NIGHT_ROLE_IDS) {
			if (!baseRoleIds.has(id) && !Object.values(POLICY_CANONICAL_ID_ALIASES).includes(id)) {
				issues.push(`NDAN role id "${id}" is not a known base/canonical ID`);
			}
		}

		for (const [aliasId, canonicalId] of Object.entries(POLICY_CANONICAL_ID_ALIASES)) {
			if (!knownIds.has(aliasId)) {
				issues.push(`policy alias id "${aliasId}" is not present in known IDs`);
			}

			if (!noDeathAtNightCanonicalIds.has(canonicalId)) {
				issues.push(`policy canonical target "${canonicalId}" for alias "${aliasId}" is not an NDAN participant ID`);
			}
		}

		assertNoIssues(issues, 'no-death-at-night policy contains stale IDs:');
	});
});

async function readGreedyScriptIds(): Promise<Set<string>> {
	const script = await readJson<ScriptFile>(path.join(staticRoot, 'greedy.json'));
	const ids = new Set<string>();

	for (const entry of script) {
		if (typeof entry === 'string') {
			ids.add(entry);
			continue;
		}

		if (typeof entry === 'object' && entry !== null && 'id' in entry && typeof entry.id === 'string') {
			ids.add(entry.id);
		}
	}

	return ids;
}

async function collectGreedierDefinedIds(): Promise<Set<string>> {
	const greedierDirectory = path.join(staticRoot, 'greedier');
	const fileNames = await readdir(greedierDirectory);
	const ids = new Set<string>();

	for (const fileName of fileNames) {
		if (!fileName.endsWith('.json')) {
			continue;
		}

		const script = await readJson<ScriptFile>(path.join(greedierDirectory, fileName));
		for (const entry of script) {
			if (typeof entry === 'object' && entry !== null && 'id' in entry && typeof entry.id === 'string') {
				ids.add(entry.id);
			}
		}
	}

	return ids;
}
