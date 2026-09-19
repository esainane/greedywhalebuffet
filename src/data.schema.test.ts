import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import type { AnySchemaObject } from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { parseDataSourcesManifest, type DataSourceKind } from './data/manifest.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const staticRoot = path.join(repoRoot, 'static');

const scriptSchemaPath = path.join(repoRoot, 'schemas', 'script-schema.json');
const scriptExtraSchemaPath = path.join(repoRoot, 'schemas', 'roles-schema.json');
const jinxSchemaPath = path.join(repoRoot, 'schemas', 'jinx-schema.json');
const almanacSchemaPath = path.join(repoRoot, 'schemas', 'almanac-schema.json');
const dataSourcesManifestPath = path.join(staticRoot, 'data_sources_manifest.json');

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function assertShapeValid(kind: DataSourceKind, data: unknown, label: string): void {
	if (kind === 'mapping') {
		if (typeof data !== 'object' || data === null || Array.isArray(data)) {
			throw new Error(`${label} failed mapping shape validation.`);
		}

		for (const value of Object.values(data)) {
			if (typeof value !== 'string') {
				throw new Error(`${label} failed mapping shape validation.`);
			}
		}

		return;
	}

	if (kind === 'nightsheet') {
		if (typeof data !== 'object' || data === null || Array.isArray(data)) {
			throw new Error(`${label} failed nightsheet shape validation.`);
		}

		const record = data as Record<string, unknown>;
		if (!isStringArray(record.firstNight) || !isStringArray(record.otherNight)) {
			throw new Error(`${label} failed nightsheet shape validation.`);
		}
	}
}

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
	it.fails('accepts non-empty optional How to Run examples and rejects empty lists', async () => {
		const ajv = new Ajv2020({ allErrors: true, strict: false });
		const validateAlmanac = ajv.compile(await readJson(almanacSchemaPath) as AnySchemaObject);
		const entry = {
			id: 'example',
			summary: { description: 'Summary.', rules: ['Rule.'] },
			howToRun: ['Run it.'],
			howToRunExamples: ['For example, resolve this after the Demon acts.'],
			examples: ['A game example.'],
			tipsAndTricks: ['A tip.'],
			opposingTips: ['An opposing tip.'],
		};

		expect(validateAlmanac([entry])).toBe(true);
		expect(validateAlmanac([{ ...entry, howToRunExamples: [] }])).toBe(false);
	});

	it('validates all fetch-targeted static JSON files against local schemas', async () => {
		const ajv = new Ajv2020({ allErrors: true, strict: false });
		addFormats(ajv);

		const [scriptSchema, scriptExtraSchema, jinxSchema, almanacSchema, manifestJson] = await Promise.all([
			readJson(scriptSchemaPath),
			readJson(scriptExtraSchemaPath),
			readJson(jinxSchemaPath),
			readJson(almanacSchemaPath),
			readJson(dataSourcesManifestPath),
		]);
		const manifest = parseDataSourcesManifest(manifestJson);

		const validateScript = ajv.compile(scriptSchema as AnySchemaObject);
		const validateScriptExtra = ajv.compile(scriptExtraSchema as AnySchemaObject);
		const validateJinx = ajv.compile(jinxSchema as AnySchemaObject);
		const validateAlmanac = ajv.compile(almanacSchema as AnySchemaObject);

		const allSources = [...manifest.coreSources, ...manifest.greedierScripts, ...manifest.greedierAlmanacs];
		for (const source of allSources) {
			const relativeFile = source.path.replace('./', '');
			const payload = await readJson(path.join(staticRoot, relativeFile));

			switch (source.kind) {
				case 'script':
					assertValid(validateScript, payload, relativeFile, ajv);
					break;
				case 'roles':
					assertValid(validateScriptExtra, payload, relativeFile, ajv);
					break;
				case 'jinx':
					assertValid(validateJinx, payload, relativeFile, ajv);
					break;
				case 'almanac':
					assertValid(validateAlmanac, payload, relativeFile, ajv);
					break;
				case 'mapping':
				case 'nightsheet':
					assertShapeValid(source.kind, payload, relativeFile);
					break;
			}
		}
	});
});
