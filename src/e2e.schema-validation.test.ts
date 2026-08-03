import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import type { AnySchemaObject } from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { buildCopyPayload } from './generation.js';
import { FILTERABLE_TEAMS } from './constants.js';
import { loadLatestJson } from './data/loader.js';
import type { GenerationOptions, ScriptFile } from './types.js';
import scriptSchema from '../schemas/script-schema.json';
import { createStaticFetch } from './test-helpers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const staticRoot = path.join(repoRoot, 'static');
const optionKeys: readonly (keyof GenerationOptions)[] = [
	'permitDuplicateCharacters',
	'addSpiritOfIvory',
	'alejoRules',
	'listOfficialJinxes',
	'listGreedyJinxes',
	'useNoDeathAtNightJinxes',
	'addGreedierHomebrew',
];

function assertValid(
	validate: ValidateFunction,
	data: unknown,
	label: string,
	ajv: Ajv2020,
): void {
	if (validate(data)) {
		return;
	}

	const details = ajv.errorsText(validate.errors, { separator: '; ' });
	throw new Error(`${label} failed schema validation: ${details}`);
}

function allOptionCombinations(): GenerationOptions[] {
	const combinations: GenerationOptions[] = [];
	const total = 1 << optionKeys.length;

	for (let mask = 0; mask < total; mask++) {
		const options = {} as GenerationOptions;
		for (let i = 0; i < optionKeys.length; i++) {
			options[optionKeys[i]] = (mask & (1 << i)) !== 0;
		}
		combinations.push(options);
	}

	return combinations;
}

function getUnbannedSelection(entries: readonly (ScriptFile[number])[], rolesById: ReadonlyMap<string, string>): Set<string> {
	const selected = new Set<string>();

	for (const entry of entries) {
		if (typeof entry === 'string') {
			const team = rolesById.get(entry);
			if (team && FILTERABLE_TEAMS.has(team)) {
				selected.add(entry);
			}
			continue;
		}

		if (typeof entry === 'object' && entry !== null && 'id' in entry && 'team' in entry) {
			const id = entry.id;
			const team = entry.team;
			if (typeof id === 'string' && typeof team === 'string' && FILTERABLE_TEAMS.has(team)) {
				selected.add(id);
			}
		}
	}

	return selected;
}

describe('end-to-end schema validation', () => {
	it('validates generated scripts against the vendored schema for every non-ban option combination', async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = createStaticFetch(staticRoot) as typeof fetch;

		try {
			const { catalog } = await loadLatestJson();

			const ajv = new Ajv2020({ allErrors: true, strict: false });
			addFormats(ajv);
			const validateUpstream = ajv.compile(scriptSchema as AnySchemaObject);

			const rolesById = new Map(
				[...catalog.rolesById.values()].map((ce) => [ce.baseId, ce.entry.team] as const),
			);
			const greedyScript = catalog.baseScript;
			const selectedCharacterIds = getUnbannedSelection([...greedyScript.entries], rolesById);
			for (const greedierEntry of catalog.greedierById.values()) {
				if (FILTERABLE_TEAMS.has(greedierEntry.team)) {
					selectedCharacterIds.add(greedierEntry.id);
				}
			}

			const combinations = allOptionCombinations();
			expect(combinations).toHaveLength(128);

			for (const options of combinations) {
				const payload = buildCopyPayload(selectedCharacterIds, options, catalog);
				const parsed = JSON.parse(payload) as unknown;
				const label = `generated payload for options ${JSON.stringify(options)}`;
				assertValid(validateUpstream, parsed, label, ajv);
			}
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
