import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { JinxFile } from './types.js';

/**
 * Helper for comparing official and greedy jinx pair direction.
 */
type FlattenedJinxPair = {
	pairKey: string;
	direction: string;
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const staticRoot = path.join(repoRoot, 'static');

async function readJson(filePath: string): Promise<JinxFile> {
	return JSON.parse(await readFile(filePath, 'utf8')) as JinxFile;
}

function buildPairKey(sourceId: string, targetId: string): string {
	return sourceId < targetId ? sourceId + '|' + targetId : targetId + '|' + sourceId;
}

function flattenJinxPairs(payload: JinxFile): FlattenedJinxPair[] {
	const pairs: FlattenedJinxPair[] = [];

	for (const sourceEntry of payload) {
		for (const targetEntry of sourceEntry.jinx ?? []) {
			pairs.push({
				pairKey: buildPairKey(sourceEntry.id, targetEntry.id),
				direction: sourceEntry.id + '=>' + targetEntry.id,
			});
		}
	}

	return pairs;
}

describe('jinx source ordering validation', () => {
	it('keeps source-target direction consistent for shared jinx pairs', async () => {
		const officialPairs = flattenJinxPairs(
			await readJson(path.join(staticRoot, 'jinxes.json')),
		);
		const greedyPairs = flattenJinxPairs(
			await readJson(path.join(staticRoot, 'greedy_jinxes.json')),
		);

		const greedyPairKeys = new Set(greedyPairs.map((pair) => pair.pairKey));
		const sharedPairKeys = officialPairs
			.map((pair) => pair.pairKey)
			.filter((pairKey) => greedyPairKeys.has(pairKey));

		// For readable expect() output
		const officialDirectionByPairKey = new Map(
			officialPairs.map((pair) => [pair.pairKey, pair.direction] as const),
		);
		const greedyDirectionByPairKey = new Map(
			greedyPairs.map((pair) => [pair.pairKey, pair.direction] as const),
		);

		expect(sharedPairKeys.length).toBeGreaterThan(0);

		// Collect all failures at once
		const mismatches = [...new Set(sharedPairKeys)]
			.sort()
			.map((pairKey) => ({
				pairKey,
				officialDirection: officialDirectionByPairKey.get(pairKey),
				greedyDirection: greedyDirectionByPairKey.get(pairKey),
			}))
			.filter(
				(entry) =>
					entry.officialDirection !== undefined &&
					entry.greedyDirection !== undefined &&
					entry.officialDirection !== entry.greedyDirection,
			);

		expect(mismatches).toEqual([]);
	});
});
