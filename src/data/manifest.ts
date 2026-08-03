export const DATA_SOURCES_MANIFEST_URL = './data_sources_manifest.json';

export type DataSourceKind = 'script' | 'script-extra' | 'jinx' | 'mapping' | 'nightsheet';

export type CoreSourceName =
	| 'greedyScript'
	| 'greedyJinxes'
	| 'greedierJinxes'
	| 'idMappings'
	| 'rolesScript'
	| 'nightsheet'
	| 'officialJinxes';

export type CoreDataSource = {
	name: CoreSourceName;
	kind: Exclude<DataSourceKind, 'script-extra'>;
	path: string;
};

export type GreedierScriptDataSource = {
	kind: 'script-extra';
	path: string;
	sourceSet: number;
};

export type DataSourcesManifest = {
	coreSources: CoreDataSource[];
	greedierScripts: GreedierScriptDataSource[];
};

const SUPPORTED_KINDS = new Set<DataSourceKind>([
	'script',
	'script-extra',
	'jinx',
	'mapping',
	'nightsheet',
]);

const REQUIRED_CORE_NAMES: CoreSourceName[] = [
	'greedyScript',
	'greedyJinxes',
	'greedierJinxes',
	'idMappings',
	'rolesScript',
	'nightsheet',
	'officialJinxes',
];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidJsonPath(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith('./') && value.endsWith('.json');
}

function isValidSourceSet(value: unknown): value is number {
	return Number.isInteger(value) && (value as number) > 0;
}

export function parseDataSourcesManifest(
	value: unknown,
	sourceName = 'data_sources_manifest.json',
): DataSourcesManifest {
	if (!isObjectRecord(value)) {
		throw new Error(`${sourceName} must be a JSON object.`);
	}

	const { coreSources, greedierScripts } = value;
	if (!Array.isArray(coreSources)) {
		throw new Error(`${sourceName} must include a coreSources array.`);
	}
	if (!Array.isArray(greedierScripts)) {
		throw new Error(`${sourceName} must include a greedierScripts array.`);
	}

	const normalizedCoreSources: CoreDataSource[] = [];
	const normalizedGreedierScripts: GreedierScriptDataSource[] = [];
	const seenPaths = new Set<string>();
	const seenCoreNames = new Set<CoreSourceName>();
	const seenSourceSets = new Set<number>();

	for (const entry of coreSources) {
		if (!isObjectRecord(entry)) {
			throw new Error(`${sourceName} has a non-object entry in coreSources.`);
		}

		const { name, kind, path } = entry;
		if (typeof name !== 'string' || !REQUIRED_CORE_NAMES.includes(name as CoreSourceName)) {
			throw new Error(`${sourceName} has an unsupported core source name: ${String(name)}.`);
		}
		if (typeof kind !== 'string' || !SUPPORTED_KINDS.has(kind as DataSourceKind)) {
			throw new Error(`${sourceName} has an unsupported source kind: ${String(kind)}.`);
		}
		if (kind === 'script-extra') {
			throw new Error(`${sourceName} core source ${name} cannot use kind script-extra.`);
		}
		if (!isValidJsonPath(path)) {
			throw new Error(`${sourceName} core source ${name} has invalid path: ${String(path)}.`);
		}
		if (seenCoreNames.has(name as CoreSourceName)) {
			throw new Error(`${sourceName} has duplicate core source name: ${name}.`);
		}
		if (seenPaths.has(path)) {
			throw new Error(`${sourceName} has duplicate source path: ${path}.`);
		}

		seenCoreNames.add(name as CoreSourceName);
		seenPaths.add(path);
		normalizedCoreSources.push({
			name: name as CoreSourceName,
			kind: kind as Exclude<DataSourceKind, 'script-extra'>,
			path,
		});
	}

	for (const requiredCoreName of REQUIRED_CORE_NAMES) {
		if (!seenCoreNames.has(requiredCoreName)) {
			throw new Error(`${sourceName} is missing required core source: ${requiredCoreName}.`);
		}
	}

	for (const entry of greedierScripts) {
		if (!isObjectRecord(entry)) {
			throw new Error(`${sourceName} has a non-object entry in greedierScripts.`);
		}

		const { kind, path, sourceSet } = entry;
		if (kind !== 'script-extra') {
			throw new Error(`${sourceName} greedier script must use kind script-extra.`);
		}
		if (!isValidJsonPath(path)) {
			throw new Error(`${sourceName} greedier script has invalid path: ${String(path)}.`);
		}
		if (!isValidSourceSet(sourceSet)) {
			throw new Error(`${sourceName} greedier script ${path} has invalid sourceSet: ${String(sourceSet)}.`);
		}
		if (seenPaths.has(path)) {
			throw new Error(`${sourceName} has duplicate source path: ${path}.`);
		}
		if (seenSourceSets.has(sourceSet)) {
			throw new Error(`${sourceName} has duplicate greedier sourceSet: ${sourceSet}.`);
		}

		seenPaths.add(path);
		seenSourceSets.add(sourceSet);
		normalizedGreedierScripts.push({
			kind,
			path,
			sourceSet,
		});
	}

	return {
		coreSources: normalizedCoreSources,
		greedierScripts: normalizedGreedierScripts,
	};
}

export function getCoreSourceByName(
	manifest: DataSourcesManifest,
	name: CoreSourceName,
): CoreDataSource {
	const source = manifest.coreSources.find((entry) => entry.name === name);
	if (!source) {
		throw new Error(`data_sources_manifest.json is missing core source ${name}.`);
	}

	return source;
}
