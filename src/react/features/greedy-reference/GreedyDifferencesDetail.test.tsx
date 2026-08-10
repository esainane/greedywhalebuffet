import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GreedyDifferencesDetail } from './GreedyDifferencesDetail.js';

describe('GreedyDifferencesDetail', () => {
	it('hides non-ability sections when the toggle is off', () => {
		const html = renderToStaticMarkup(
			<GreedyDifferencesDetail
				items={[
					{
						character: {
							id: 'alpha',
							name: 'Alpha',
							team: 'townsfolk',
							imageUrl: 'alpha.png',
						},
						officialAbility: 'Same ability',
						greedyAbility: 'Same ability',
						officialFirstNight: 1,
						greedyFirstNight: 2,
						officialOtherNight: 3,
						greedyOtherNight: 4,
						officialFirstNightReminder: 'First reminder',
						greedyFirstNightReminder: 'Different first reminder',
						officialOtherNightReminder: 'Other reminder',
						greedyOtherNightReminder: 'Different other reminder',
					},
				]}
				loading={false}
				showNonAbilityDifferences={false}
				onShowNonAbilityDifferencesChange={() => {}}
			/>,
		);

		expect(html).toContain('Show non-ability differences');
		expect(html).not.toContain('Night order');
		expect(html).not.toContain('Night reminders');
	});
});
