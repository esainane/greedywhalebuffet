import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GreedyHomebrewDetail } from './GreedyHomebrewDetail.js';

describe('GreedyHomebrewDetail', () => {
	it('renders sort switch without nested labels', () => {
		const html = renderToStaticMarkup(
			<GreedyHomebrewDetail
				items={[
					{
						character: {
							id: 'alpha',
							name: 'Alpha Ω',
							team: 'townsfolk',
							imageUrl: 'alpha.png',
						},
						ability: 'Ability text [2 Townsfolk]',
					},
				]}
				loading={false}
				sortBySet={true}
				onSortBySetChange={() => {}}
			/>,
		);

		expect(html).toContain('greedier-sort-by-set-detail-label');
		expect(html.match(/<label/g)?.length ?? 0).toBeGreaterThan(0);
		expect(html).not.toContain('<label class="inline-switch-control"');
		expect(html).not.toContain('>Ability<');
		expect(html).toContain('alt="Alpha"');
		expect(html).toContain('<h3>Alpha</h3>');
		expect(html).not.toContain('Ω');
		expect(html).toContain('Ability text');
		expect(html).toContain('class="setup-ability"');
	});
});
