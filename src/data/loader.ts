/**
 * Data loading utilities for fetching JSON resources.
 */

import type {
	ScriptFile,
	CharacterEntry,
	JinxFile,
	NightsheetFile,
	MappingFile,
	MetaEntry,
} from '../types.js';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
	FILTERABLE_TEAMS,
} from '../constants.js';
import { FetchedData } from './fetched.js';
import {
	DATA_SOURCES_MANIFEST_URL,
	getCoreSourceByName,
	parseDataSourcesManifest,
	type DataSourcesManifest,
} from './manifest.js';
import scriptSchema from '../../schemas/script-schema.json';
import scriptExtraSchema from '../../schemas/script-extra-schema.json';
import jinxSchema from '../../schemas/jinx-schema.json';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validateScriptFile = ajv.compile(scriptSchema);
const validateScriptExtraData = ajv.compile(scriptExtraSchema);
const validateJinxData = ajv.compile(jinxSchema);

function assertSchemaValid(data: unknown, validate: ValidateFunction, sourceName: string): void {
	if (validate(data)) {
		return;
	}

	const details = ajv.errorsText(validate.errors, { separator: '; ' });
	throw new Error(`${sourceName} failed schema validation: ${details}`);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isMappingFile(value: unknown): value is MappingFile {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	return Object.values(value).every((entry) => typeof entry === 'string');
}

function assertOneToOneMapping(mappingFile: Readonly<MappingFile>, sourceName: string): void {
	const sourceByTarget = new Map<string, string>();

	for (const [sourceId, targetId] of Object.entries(mappingFile)) {
		const existingSourceId = sourceByTarget.get(targetId);
		if (existingSourceId !== undefined) {
			throw new Error(
				`${sourceName} is not one-to-one: "${existingSourceId}" and "${sourceId}" both map to "${targetId}".`,
			);
		}

		sourceByTarget.set(targetId, sourceId);
	}
}

function isNightsheetFile(value: unknown): value is NightsheetFile {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	const record = value as Record<string, unknown>;
	return isStringArray(record.firstNight) && isStringArray(record.otherNight);
}

function isCharacterEntryArray(value: unknown): value is CharacterEntry[] {
	return (
		Array.isArray(value) &&
		value.every(
			(entry) =>
				typeof entry === 'object' &&
				entry !== null &&
				!Array.isArray(entry) &&
				typeof (entry as { id?: unknown }).id === 'string' &&
				(entry as { id: string }).id !== '_meta',
		)
	);
}

function isCharacterEntry(value: unknown): value is CharacterEntry {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		typeof (value as { id?: unknown }).id === 'string' &&
		(value as { id: string }).id !== '_meta'
	);
}

function extractFilterableCharactersFromScriptFile(data: ScriptFile): CharacterEntry[] {
	const extracted: CharacterEntry[] = [];
	for (const entry of data) {
		if (!isCharacterEntry(entry)) {
			continue;
		}

		if (!entry.team || !FILTERABLE_TEAMS.has(entry.team)) {
			continue;
		}

		extracted.push(entry);
	}

	return extracted;
}

function isMetaEntry(value: unknown): value is MetaEntry {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	const entry = value as { id?: unknown; name?: unknown };
	return entry.id === '_meta' && typeof entry.name === 'string';
}

function assertLeadingMetaEntry(data: ScriptFile, sourceName: string): void {
	if (data.length === 0) {
		throw new Error(`${sourceName} must include a leading _meta entry.`);
	}

	if (!isMetaEntry(data[0])) {
		throw new Error(`${sourceName} must begin with an object entry with id "_meta" and a string name.`);
	}

	for (let i = 1; i < data.length; i++) {
		const entry = data[i];
		if (typeof entry === 'object' && entry !== null && !Array.isArray(entry) && 'id' in entry) {
			if ((entry as { id?: unknown }).id === '_meta') {
				throw new Error(`${sourceName} must include only one _meta entry, and it must be the first item.`);
			}
		}
	}
}

async function fetchJsonSource(path: string, signal?: AbortSignal): Promise<unknown> {
	const response = await fetch(path, { cache: 'no-store', signal });
	if (!response.ok) {
		throw new Error(`${path} fetch failed (${response.status}).`);
	}

	const content = await response.text();
	try {
		return JSON.parse(content) as unknown;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`${path} contains invalid JSON: ${message}`, {
			cause: error,
		});
	}
}

async function fetchJsonSourcesInParallel(
	paths: readonly string[],
	signal?: AbortSignal,
): Promise<Map<string, unknown>> {
	const entries = await Promise.all(
		paths.map(async (path) => [path, await fetchJsonSource(path, signal)] as const),
	);

	return new Map(entries);
}

function parseManifest(rawManifest: unknown): DataSourcesManifest {
	return parseDataSourcesManifest(rawManifest, 'data_sources_manifest.json');
}

/**
 * Load all JSON data sources in parallel.
 * Constructs and returns immutable FetchedData.
 */
export async function loadLatestJson(options: { signal?: AbortSignal } = {}): Promise<{ fetchedData: FetchedData }> {
	const rawManifest = await fetchJsonSource(DATA_SOURCES_MANIFEST_URL, options.signal);
	const manifest = parseManifest(rawManifest);

	const allSourcePaths = [
		...manifest.coreSources.map((source) => source.path),
		...manifest.greedierScripts.map((source) => source.path),
	];
	const parsedByPath = await fetchJsonSourcesInParallel(allSourcePaths, options.signal);

	const greedyPath = getCoreSourceByName(manifest, 'greedyScript').path;
	const greedyJinxPath = getCoreSourceByName(manifest, 'greedyJinxes').path;
	const greedierJinxPath = getCoreSourceByName(manifest, 'greedierJinxes').path;
	const mappingPath = getCoreSourceByName(manifest, 'idMappings').path;
	const rolesPath = getCoreSourceByName(manifest, 'rolesScript').path;
	const nightsheetPath = getCoreSourceByName(manifest, 'nightsheet').path;
	const jinxPath = getCoreSourceByName(manifest, 'officialJinxes').path;

	const greedyParsed = parsedByPath.get(greedyPath);
	const greedyJinxParsed = parsedByPath.get(greedyJinxPath);
	const greedierJinxParsed = parsedByPath.get(greedierJinxPath);
	const mappingFileParsed = parsedByPath.get(mappingPath);
	const rolesParsed = parsedByPath.get(rolesPath);
	const nightsheetParsed = parsedByPath.get(nightsheetPath);
	const jinxParsed = parsedByPath.get(jinxPath);

	assertSchemaValid(greedyParsed, validateScriptFile, greedyPath);
	assertSchemaValid(greedyJinxParsed, validateJinxData, greedyJinxPath);
	assertSchemaValid(greedierJinxParsed, validateJinxData, greedierJinxPath);
	assertSchemaValid(rolesParsed, validateScriptFile, rolesPath);
	assertSchemaValid(jinxParsed, validateJinxData, jinxPath);

	for (const source of manifest.greedierScripts) {
		const parsed = parsedByPath.get(source.path);
		assertSchemaValid(parsed, validateScriptExtraData, source.path);
	}

	const greedyScriptFile = greedyParsed as ScriptFile;
	assertLeadingMetaEntry(greedyScriptFile, greedyPath);

	if (!isMappingFile(mappingFileParsed)) {
		throw new Error(`${mappingPath} has an unexpected shape.`);
	}

	assertOneToOneMapping(mappingFileParsed, mappingPath);

	if (!isNightsheetFile(nightsheetParsed)) {
		throw new Error(`${nightsheetPath} has an unexpected shape.`);
	}

	if (!isCharacterEntryArray(rolesParsed)) {
		throw new Error(`${rolesPath} must be an array of character objects.`);
	}

	const greedierCharactersById = new Map<string, CharacterEntry>();
	const greedierCharacterSourceById = new Map<string, string>();
	for (const source of manifest.greedierScripts) {
		const greedierData = parsedByPath.get(source.path);
		if (!Array.isArray(greedierData)) {
			continue;
		}

		const scriptEntries = greedierData as ScriptFile;
		const sourceSet = source.sourceSet;
		for (const character of extractFilterableCharactersFromScriptFile(scriptEntries)) {
			const existingSourcePath = greedierCharacterSourceById.get(character.id);
			if (existingSourcePath) {
				throw new Error(
					`Duplicate Greedier character id "${character.id}" found in ${existingSourcePath} and ${source.path}.`,
				);
			}

			greedierCharactersById.set(character.id, {
				...character,
				sourceSet,
			});
			greedierCharacterSourceById.set(character.id, source.path);
		}
	}

	const greedierCharactersData = [...greedierCharactersById.values()];

	// Construct immutable FetchedData with all validated data
	const fetchedData = new FetchedData({
		greedyJson: greedyScriptFile,
		greedyJinxData: greedyJinxParsed as JinxFile,
		greedierJinxData: greedierJinxParsed as JinxFile,
		greedierCharactersData,
		greedyToBaseID: mappingFileParsed,
		rolesData: rolesParsed,
		nightsheetFile: nightsheetParsed,
		jinxData: jinxParsed as JinxFile,
	});

	return { fetchedData };
}
