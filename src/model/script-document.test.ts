import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readJson } from '../test-helpers.js';
import type { ScriptFile } from '../types.js';
import { parseScriptFile, serializeScriptDocument } from './script-document.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const staticRoot = path.join(repoRoot, 'static');

describe('script document boundary', () => {
	it('round-trips greedy.json without changing content', async () => {
		const script = await readJson<ScriptFile>(path.join(staticRoot, 'greedy.json'));
		const document = parseScriptFile(script, 'greedy.json');
		const serialized = serializeScriptDocument(document);

		expect(serialized).toEqual(script);
	});

	it('rejects missing leading _meta entry', () => {
		expect(() => parseScriptFile(['washerwoman'], 'test-script')).toThrow(
			/must include a leading _meta entry|must begin with an object entry with id "_meta"/,
		);
	});

	it('rejects misplaced duplicate _meta entries', () => {
		const malformed = [
			{ id: '_meta', name: 'Good Meta' },
			'washerwoman',
			{ id: '_meta', name: 'Bad Meta' },
		] as unknown as ScriptFile;

		expect(() => parseScriptFile(malformed, 'test-script')).toThrow(
			/must include only one _meta entry, and it must be the first item/,
		);
	});
});
