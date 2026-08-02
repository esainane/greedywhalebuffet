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
	GREEDY_JSON_URL,
	GREEDY_JINX_JSON_URL,
	GREEDIER_JINX_JSON_URL,
	GREEDIER_SCRIPT_URLS,
	ID_MAPPINGS_JSON_URL,
	ROLES_JSON_URL,
	NIGHTSHEET_JSON_URL,
	JINX_JSON_URL,
	FILTERABLE_TEAMS,
} from '../constants.js';
import { FetchedData } from './fetched.js';
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

function getGreedierSourceSet(scriptUrl: string): number | undefined {
	const match = scriptUrl.match(/greedier-s(\d+)\.json$/);
	if (!match) {
		return undefined;
	}

	return Number.parseInt(match[1], 10);
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

/**
 * Load all JSON data sources in parallel.
 * Constructs and returns immutable FetchedData.
 */
export async function loadLatestJson(options: { signal?: AbortSignal } = {}): Promise<{ fetchedData: FetchedData }> {
	const coreDataSources = [
		GREEDY_JSON_URL,
		GREEDY_JINX_JSON_URL,
		GREEDIER_JINX_JSON_URL,
		ID_MAPPINGS_JSON_URL,
		ROLES_JSON_URL,
		NIGHTSHEET_JSON_URL,
		JINX_JSON_URL,
	];
	const dataSources = [...coreDataSources, ...GREEDIER_SCRIPT_URLS];

	const responses = await Promise.all(
		dataSources.map((url) => fetch(url, { cache: 'no-store', signal: options.signal })),
	);

	if (responses.some((r) => !r.ok)) {
		const failedSources = responses
			.map((r, i) => ({ response: r, source: dataSources[i] }))
			.filter(({ response }) => !response.ok)
			.map(({ source, response }) => `${source} (${response.status})`)
			.join(', ');

		throw new Error(`Failed to load data: ${failedSources}`);
	}

	const parsedData = await Promise.all(responses.map((r) => r.json()));
	const [greedyParsed, greedyJinxParsed, greedierJinxParsed, mappingFileParsed, rolesParsed, nightsheetParsed, jinxParsed] =
		parsedData;
	const greedierParsed = parsedData.slice(coreDataSources.length);

	assertSchemaValid(greedyParsed, validateScriptFile, 'greedy.json');
	assertSchemaValid(greedyJinxParsed, validateJinxData, 'greedy_jinxes.json');
	assertSchemaValid(greedierJinxParsed, validateJinxData, 'greedier_jinxes.json');
	assertSchemaValid(rolesParsed, validateScriptFile, 'roles.json');
	assertSchemaValid(jinxParsed, validateJinxData, 'jinxes.json');

	for (const [i, parsed] of greedierParsed.entries()) {
		assertSchemaValid(parsed, validateScriptExtraData, GREEDIER_SCRIPT_URLS[i]);
	}

	const greedyScriptFile = greedyParsed as ScriptFile;
	assertLeadingMetaEntry(greedyScriptFile, 'greedy.json');

	if (!isMappingFile(mappingFileParsed)) {
		throw new Error('id_mappings.json has an unexpected shape.');
	}

	if (!isNightsheetFile(nightsheetParsed)) {
		throw new Error('nightsheet.json has an unexpected shape.');
	}

	if (!isCharacterEntryArray(rolesParsed)) {
		throw new Error('roles.json must be an array of character objects.');
	}

	const greedierCharactersById = new Map<string, CharacterEntry>();
	for (const [i, greedierData] of greedierParsed.entries()) {
		if (!Array.isArray(greedierData)) {
			continue;
		}

		const scriptEntries = greedierData as ScriptFile;
		const sourceSet = getGreedierSourceSet(GREEDIER_SCRIPT_URLS[i]);
		for (const character of extractFilterableCharactersFromScriptFile(scriptEntries)) {
			if (!greedierCharactersById.has(character.id)) {
				greedierCharactersById.set(character.id, {
					...character,
					sourceSet,
				});
			}
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
