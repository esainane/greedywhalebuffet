/**
 * Data loading utilities for fetching JSON resources.
 */

import type {
	ScriptData,
	CharacterEntry,
	JinxEntry,
	NightsheetData,
	IdMappings,
} from '../types.js';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
	GREEDY_JSON_URL,
	GREEDY_JINX_JSON_URL,
	ID_MAPPINGS_JSON_URL,
	ROLES_JSON_URL,
	NIGHTSHEET_JSON_URL,
	JINX_JSON_URL,
} from '../constants.js';
import { FetchedData } from './fetched.js';
import scriptSchema from '../../schemas/script-schema.json';
import jinxSchema from '../../schemas/jinx-schema.json';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validateScriptData = ajv.compile(scriptSchema);
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

function isIdMappings(value: unknown): value is IdMappings {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	return Object.values(value).every((entry) => typeof entry === 'string');
}

function isNightsheetData(value: unknown): value is NightsheetData {
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
				typeof (entry as { id?: unknown }).id === 'string',
		)
	);
}

/**
 * Load all JSON data sources in parallel.
 * Constructs and returns immutable FetchedData.
 */
export async function loadLatestJson(options: { signal?: AbortSignal } = {}): Promise<{ fetchedData: FetchedData }> {
	const dataSources = [
		GREEDY_JSON_URL,
		GREEDY_JINX_JSON_URL,
		ID_MAPPINGS_JSON_URL,
		ROLES_JSON_URL,
		NIGHTSHEET_JSON_URL,
		JINX_JSON_URL,
	];

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

	const [
		greedyParsed,
		greedyJinxParsed,
		idMappingsParsed,
		rolesParsed,
		nightsheetParsed,
		jinxParsed,
	] = await Promise.all(responses.map((r) => r.json()));

	assertSchemaValid(greedyParsed, validateScriptData, 'greedy.json');
	assertSchemaValid(greedyJinxParsed, validateJinxData, 'greedy_jinxes.json');
	assertSchemaValid(rolesParsed, validateScriptData, 'roles.json');
	assertSchemaValid(jinxParsed, validateJinxData, 'jinxes.json');

	if (!isIdMappings(idMappingsParsed)) {
		throw new Error('id_mappings.json has an unexpected shape.');
	}

	if (!isNightsheetData(nightsheetParsed)) {
		throw new Error('nightsheet.json has an unexpected shape.');
	}

	if (!isCharacterEntryArray(rolesParsed)) {
		throw new Error('roles.json must be an array of character objects.');
	}

	// Construct immutable FetchedData with all validated data
	const fetchedData = new FetchedData({
		greedyJson: greedyParsed as ScriptData,
		greedyJinxData: greedyJinxParsed as JinxEntry[],
		greedyToBaseID: idMappingsParsed,
		rolesData: rolesParsed,
		nightsheetData: nightsheetParsed,
		jinxData: jinxParsed as JinxEntry[],
	});

	return { fetchedData };
}
