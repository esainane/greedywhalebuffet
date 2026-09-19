import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { AlmanacEntry, CharacterEntry } from './types.js';
import { readJson } from './test-helpers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.resolve(here, '../static');
const supportedTeams = new Set(['townsfolk', 'outsider', 'minion', 'demon']);

describe('Greedier almanac consistency', () => {
	it('covers each standard-team character once, in its matching set, and excludes other teams', async () => {
		const files = (await readdir(path.join(staticRoot, 'greedier')))
			.filter((file) => file.endsWith('.json'));
		const seen = new Set<string>();
		let expectedCount = 0;

		for (const file of files) {
			const characters = await readJson<CharacterEntry[]>(path.join(staticRoot, 'greedier', file));
			const almanacs = await readJson<AlmanacEntry[]>(path.join(staticRoot, 'almanac', file));
			const expectedIds = characters.filter((entry) => supportedTeams.has(entry.team)).map((entry) => entry.id);
			const actualIds = almanacs.map((entry) => entry.id);

			expect(actualIds, file).toEqual(expectedIds);
			expectedCount += expectedIds.length;
			for (const id of actualIds) {
				expect(seen.has(id), `duplicate almanac id ${id}`).toBe(false);
				seen.add(id);
			}
		}

		expect(expectedCount).toBe(56);
		expect(seen.size).toBe(56);
	});
});
