import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { GenerationContext, type CharacterResolver } from './data/catalog-entry.js';
import { Catalog, NightOrderIndex, OneToOneIdMap, type CatalogParams } from './data/catalog.js';
import { parseScriptFile, serializeScriptDocument } from './model/script-document.js';
import { GENERATION_OPTION_NAMES } from './options.js';
import type {
	CatalogCharacter,
	CharacterEntry,
	GenerationOptions,
	JinxFile,
	NightsheetFile,
	ScriptFile,
} from './types.js';

function hasMetaEntry(file: ScriptFile): boolean {
	const first = file[0];
	return (
		typeof first === 'object' &&
		first !== null &&
		'id' in first &&
		(first as { id?: unknown }).id === '_meta' &&
		'name' in first &&
		typeof (first as { name?: unknown }).name === 'string'
	);
}

export function buildTestOptions(overrides: Partial<GenerationOptions> = {}): GenerationOptions {
	const baseline = {} as GenerationOptions;
	for (const optionName of GENERATION_OPTION_NAMES) {
		baseline[optionName] = false;
	}

	return {
		...baseline,
		...overrides,
	};
}

type TestCatalogParams = Partial<Omit<CatalogParams, 'baseScript'>> & {
	baseScript?: ScriptFile;
	greedyJson?: ScriptFile;
	rolesData?: CharacterEntry[];
	greedierCharactersData?: CatalogCharacter[];
	greedyToBaseID?: Record<string, string>;
	nightsheetFile?: NightsheetFile;
	official?: JinxFile;
	greedy?: JinxFile;
	greedier?: JinxFile;
	jinxData?: JinxFile;
	greedyJinxData?: JinxFile;
	greedierJinxData?: JinxFile;
};

export function createTestCatalog(params: TestCatalogParams = {}): Catalog {
	const scriptEntries =
		params.baseScript ??
		(params.greedyJson && hasMetaEntry(params.greedyJson)
			? params.greedyJson
			: params.greedyJson
				? [{ id: '_meta', name: 'Test Script' }, ...params.greedyJson]
				: [{ id: '_meta', name: 'Test Script' }]);

	const catalogParams: CatalogParams = {
		baseScript: parseScriptFile(scriptEntries, 'synthetic'),
		roles: params.roles ?? params.rolesData ?? [],
		greedierCharacters: params.greedierCharacters ?? params.greedierCharactersData ?? [],
		idMappings: params.idMappings ?? OneToOneIdMap.fromRecord(params.greedyToBaseID ?? {}),
		nightOrder: params.nightOrder ?? new NightOrderIndex(params.nightsheetFile ?? { firstNight: [], otherNight: [] }),
		officialJinxes: params.officialJinxes ?? params.official ?? params.jinxData ?? [],
		greedyJinxes: params.greedyJinxes ?? params.greedy ?? params.greedyJinxData ?? [],
		greedierJinxes: params.greedierJinxes ?? params.greedier ?? params.greedierJinxData ?? [],
	};

	return Catalog.create(catalogParams);
}

export function createTestResolver(catalog: Catalog): CharacterResolver {
	return {
		catalog,
		generationContext: new GenerationContext(),
	};
}

export function cloneSerializedScript(catalog: Catalog): ScriptFile {
	return structuredClone(serializeScriptDocument(catalog.baseScript));
}

export function createStaticFetch(staticRoot: string) {
	return async (input: string | URL | Request): Promise<Response> => {
		const requestUrl =
			typeof input === 'string'
				? input
				: input instanceof URL
					? input.toString()
					: input.url;

		if (!requestUrl.startsWith('./')) {
			return new Response(JSON.stringify({ error: `Unsupported URL: ${requestUrl}` }), {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}

		const absolutePath = path.join(staticRoot, requestUrl.slice(2));

		try {
			const content = await readFile(absolutePath, 'utf8');
			return new Response(content, {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		} catch {
			return new Response(JSON.stringify({ error: 'Not Found' }), {
				status: 404,
				headers: { 'content-type': 'application/json' },
			});
		}
	};
}
