import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GreedyJinxesDetail } from './GreedyJinxesDetail.js';

describe('GreedyJinxesDetail', () => {
	it('always shows the meaningful jinx status label', () => {
		const character = {
			id: 'alpha',
			name: 'Alpha',
			team: 'townsfolk',
			imageUrl: 'alpha.png',
		};
		const target = {
			id: 'beta',
			name: 'Beta',
			team: 'demon',
			imageUrl: 'beta.png',
		};
		const html = renderToStaticMarkup(
			<GreedyJinxesDetail
				items={[
					{ source: character, target, officialReason: null, reason: 'New reason', origin: 'greedy' },
					{
						source: character,
						target,
						officialReason: 'Official reason',
						reason: 'Changed reason',
						origin: 'greedy',
					},
					{
						source: character,
						target,
						officialReason: 'Removed reason',
						reason: '',
						origin: 'greedy',
					},
					{
						source: character,
						target,
						officialReason: null,
						reason: 'Homebrew reason',
						origin: 'greedier-homebrew',
					},
				]}
				loading={false}
			/>,
		);

		expect(html).toContain('>New jinx<');
		expect(html).toContain('>Changed jinx<');
		expect(html).toContain('>Removed jinx<');
		expect(html).toContain('>Greedier Homebrew Jinx<');
		expect(html).toContain('New reason');
		expect(html).toContain('class="diff-added">Changed<');
		expect(html).toContain('<span> reason</span>');
		expect(html).toContain('Removed reason');
		expect(html).toContain('Homebrew reason');
	});
});
