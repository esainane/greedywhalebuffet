import { describe, expect, it } from 'vitest';
import { parseDataSourcesManifest } from './data/manifest.js';

const validManifest = {
	coreSources: [
		{ name: 'greedyScript', kind: 'script', path: './greedy.json' },
		{ name: 'greedyJinxes', kind: 'jinx', path: './greedy_jinxes.json' },
		{ name: 'greedierJinxes', kind: 'jinx', path: './greedier_jinxes.json' },
		{ name: 'idMappings', kind: 'mapping', path: './id_mappings.json' },
		{ name: 'rolesScript', kind: 'script', path: './roles.json' },
		{ name: 'nightsheet', kind: 'nightsheet', path: './nightsheet.json' },
		{ name: 'officialJinxes', kind: 'jinx', path: './jinxes.json' },
	],
	greedierScripts: [{ kind: 'roles', path: './greedier/greedier-s1.json', sourceSet: 1 }],
};

describe('data sources manifest validation', () => {
	it('rejects duplicate source paths', () => {
		expect(() =>
			parseDataSourcesManifest({
				...validManifest,
				greedierScripts: [
					{ kind: 'roles', path: './greedier/greedier-s1.json', sourceSet: 1 },
					{ kind: 'roles', path: './greedier/greedier-s1.json', sourceSet: 2 },
				],
			}),
		).toThrow(/duplicate source path/);
	});

	it('rejects duplicate greedier source sets', () => {
		expect(() =>
			parseDataSourcesManifest({
				...validManifest,
				greedierScripts: [
					{ kind: 'roles', path: './greedier/greedier-s1.json', sourceSet: 1 },
					{ kind: 'roles', path: './greedier/greedier-s2.json', sourceSet: 1 },
				],
			}),
		).toThrow(/duplicate greedier sourceSet/);
	});

	it('rejects unsupported source kinds', () => {
		expect(() =>
			parseDataSourcesManifest({
				coreSources: [
					{ name: 'greedyScript', kind: 'unexpected-kind', path: './greedy.json' },
				],
				greedierScripts: [],
			}),
		).toThrow(/unsupported source kind/);
	});
});
