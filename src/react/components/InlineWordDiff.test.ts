import { describe, expect, it } from 'vitest';
import { buildInlineWordDiffRuns } from './InlineWordDiff.js';

describe('buildInlineWordDiffRuns', () => {
	it('returns empty for empty inputs', () => {
		expect(buildInlineWordDiffRuns('', '')).toEqual([]);
	});

	it('keeps unchanged punctuation outside highlighted word changes', () => {
		const runs = buildInlineWordDiffRuns('Outsider]', 'Outsiders]');
		expect(runs).toEqual([
			{ type: 'add', text: 'Outsiders' },
			{ type: 'remove', text: 'Outsider' },
			{ type: 'equal', text: ']' },
		]);
	});

	it('prefers remove-before-add ordering at the same edit position', () => {
		const runs = buildInlineWordDiffRuns('A gets 3 bluffs.', 'A starts knowing a different in-play good character.');
		expect(runs).toEqual([
			{ type: 'equal', text: 'A' },
			{ type: 'add', text: ' starts knowing a different in-play good character' },
			{ type: 'remove', text: 'gets 3 bluffs' },
			{ type: 'equal', text: '.' },
		]);
	});

	it('keeps contiguous added runs over internal spaces', () => {
		const runs = buildInlineWordDiffRuns('Each Minion gets bluffs', 'Each Minion starts knowing good characters');
		expect(runs).toEqual([
			{ type: 'equal', text: 'Each Minion' },
			{ type: 'add', text: ' starts knowing good characters' },
			{ type: 'remove', text: 'gets bluffs' },
		]);
	});

	it('preserves spacing around ampersands in reconstructed edit runs', () => {
		const before = 'An Alchemist-Mastermind has no Mastermind ability and the Mastermind is not-in-play.';
		const after = 'An Alchemist-Mastermind has no Mastermind ability & the Mastermind is not-in-play.';
		const runs = buildInlineWordDiffRuns(
			before,
			after,
		);

		const visibleAfter = runs
			.filter((run) => run.type === 'equal' || run.type === 'add')
			.map((run) => run.text)
			.join('');
		const visibleBefore = runs
			.filter((run) => run.type === 'equal' || run.type === 'remove')
			.map((run) => run.text)
			.join('');

		expect(visibleAfter).toBe(after);
		expect(visibleBefore).toBe(before);
		expect(runs.some((run) => run.type === 'add' && run.text.includes('&'))).toBe(true);
		expect(visibleAfter.includes('ability & the')).toBe(true);
	});
});
