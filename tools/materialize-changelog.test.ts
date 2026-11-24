import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseChangelog } from './materialize-changelog.js';

describe('parseChangelog', () => {
	it('builds a source-ordered release hierarchy and preserves inline Markdown', () => {
		const result = parseChangelog(`# Changelog

## [v3.0.4, Unreleased] 2026-09-27

An overview with \`inline code\`.

### General

- First change.
- Second **change**.

### Website

- A website change.

## [v2.0] Upstream Release

Original release.
`);

		expect(result).toEqual({
			schemaVersion: 1,
			releases: [
				{
					version: '3.0.4',
					status: 'unreleased',
					date: '2026-09-27',
					sections: [
						{
							title: 'General',
							changes: [
								'An overview with `inline code`.',
								'First change.',
								'Second **change**.',
							],
						},
						{ title: 'Website', changes: ['A website change.'] },
					],
				},
				{
					version: '2.0',
					status: 'released',
					title: 'Upstream Release',
					sections: [{ title: 'General', changes: ['Original release.'] }],
				},
			],
		});
	});

	it.each([
		'## [v3.0.10] Unreleased',
		'## [v3.0.10, Unreleased]',
	])('recognizes the unreleased marker in %s without emitting a title', (heading) => {
		const result = parseChangelog(`# Changelog

${heading}

- A pending change.
`);

		expect(result.releases).toEqual([
			{
				version: '3.0.10',
				status: 'unreleased',
				sections: [{ title: 'General', changes: ['A pending change.'] }],
			},
		]);
	});

	it('preserves a release title containing the word Unreleased', () => {
		const result = parseChangelog(`# Changelog

## [v1.0.0] Previously Unreleased

- A released change.
`);

		expect(result.releases[0]).toMatchObject({
			status: 'released',
			title: 'Previously Unreleased',
		});
	});

	it('joins lines within a sectionless paragraph', () => {
		const result = parseChangelog(`# Changelog

## [v1.0.0] 2026-01-02

One logical change
continued on another line.
`);

		expect(result.releases[0].sections).toEqual([
			{ title: 'General', changes: ['One logical change continued on another line.'] },
		]);
	});

	it.each([
		['malformed release metadata', '## [3.0.0] 2026-01-01', /line 3: release metadata/],
		['invalid dates', '## [v3.0.0] 2026-02-30', /line 3: invalid ISO date/],
		['content outside a release', 'Unexpected content.', /line 3: content must belong to a release/],
		['unsupported nested blocks', '## [v3.0.0]\n\n  - Nested change.', /line 5: unsupported Markdown block/],
		['unsupported headings', '## [v3.0.0]\n\n#### Detail', /line 5: unsupported heading level/],
	])('rejects %s', (_description, body, expectedError) => {
		expect(() => parseChangelog(`# Changelog\n\n${body}\n`)).toThrow(expectedError);
	});

	it('rejects duplicate section headings', () => {
		expect(() => parseChangelog(`# Changelog

## [v1.0.0]

### Fixes

- One.

### Fixes

- Two.
`)).toThrow(/line 9: duplicate section heading: Fixes/);
	});

	it('parses the repository changelog', async () => {
		const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
		const markdown = await readFile(path.resolve(toolDirectory, '../CHANGELOG.md'), 'utf8');
		const result = parseChangelog(markdown);

		expect(result.releases[0].version).toBeTypeOf('string');
		expect(result.releases[0].status).toBeTypeOf('string');
	});
});
