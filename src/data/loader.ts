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
import {
	GREEDY_JSON_URL,
	GREEDY_JINX_JSON_URL,
	ID_MAPPINGS_JSON_URL,
	ROLES_JSON_URL,
	NIGHTSHEET_JSON_URL,
	JINX_JSON_URL,
} from '../constants.js';
import { FetchedData } from './fetched.js';

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

	// Validate all data before initializing state
	if (!Array.isArray(greedyParsed)) {
		throw new Error('greedy.json has an unexpected shape.');
	}

	if (typeof greedyJinxParsed !== 'object' || greedyJinxParsed === null) {
		throw new Error('greedy-jinxes.json has an unexpected shape.');
	}

	if (typeof idMappingsParsed !== 'object' || idMappingsParsed === null) {
		throw new Error('id-mappings.json has an unexpected shape.');
	}

	if (!Array.isArray(rolesParsed)) {
		throw new Error('roles.json has an unexpected shape.');
	}

	if (typeof nightsheetParsed !== 'object' || nightsheetParsed === null) {
		throw new Error('nightsheet.json has an unexpected shape.');
	}

	if (!Array.isArray(jinxParsed)) {
		throw new Error('jinx.json has an unexpected shape.');
	}

	// Construct immutable FetchedData with all validated data
	const fetchedData = new FetchedData({
		greedyJson: greedyParsed as ScriptData,
		greedyJinxData: greedyJinxParsed as JinxEntry[],
		greedyToBaseID: idMappingsParsed as IdMappings,
		rolesData: rolesParsed as CharacterEntry[],
		nightsheetData: nightsheetParsed as NightsheetData,
		jinxData: jinxParsed as CharacterEntry[],
	});

	return { fetchedData };
}
