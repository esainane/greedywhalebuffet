import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import type { AnySchemaObject } from 'ajv';
import addFormats from 'ajv-formats';
import { describe, it } from 'vitest';
import { GREEDIER_SCRIPT_URLS } from './constants.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const staticRoot = path.join(repoRoot, 'static');

const scriptSchemaPath = path.join(repoRoot, 'schemas', 'script-schema.json');
const scriptExtraSchemaPath = path.join(repoRoot, 'schemas', 'script-extra-schema.json');
const jinxSchemaPath = path.join(repoRoot, 'schemas', 'jinx-schema.json');

const coreSources = [
	{ file: 'greedy.json', schema: 'script' as const },
	{ file: 'roles.json', schema: 'script' as const },
	{ file: 'greedy_jinxes.json', schema: 'jinx' as const },
	{ file: 'greedier_jinxes.json', schema: 'jinx' as const },
	{ file: 'jinxes.json', schema: 'jinx' as const },
];

async function readJson(filePath: string): Promise<unknown> {
	return JSON.parse(await readFile(filePath, 'utf8')) as unknown;
}

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

describe('data source schema validation', () => {
	it('validates all fetch-targeted static JSON files against local schemas', async () => {
		const ajv = new Ajv2020({ allErrors: true, strict: false });
		addFormats(ajv);

		const [scriptSchema, scriptExtraSchema, jinxSchema] = await Promise.all([
			readJson(scriptSchemaPath),
			readJson(scriptExtraSchemaPath),
			readJson(jinxSchemaPath),
		]);

		const validateScript = ajv.compile(scriptSchema as AnySchemaObject);
		const validateScriptExtra = ajv.compile(scriptExtraSchema as AnySchemaObject);
		const validateJinx = ajv.compile(jinxSchema as AnySchemaObject);

		for (const source of coreSources) {
			const payload = await readJson(path.join(staticRoot, source.file));
			const validator = source.schema === 'script' ? validateScript : validateJinx;
			assertValid(validator, payload, source.file, ajv);
		}

		for (const scriptUrl of GREEDIER_SCRIPT_URLS) {
			const greedierFile = scriptUrl.replace('./', '');
			const payload = await readJson(path.join(staticRoot, greedierFile));
			assertValid(validateScriptExtra, payload, greedierFile, ajv);
		}
	});
});
