import React, { useMemo } from 'react';
import { useAppState } from '../../context/AppContext.js';
import {
	deriveGreedyDifferences,
	deriveGreedyHomebrew,
	deriveGreedyJinxes,
} from './greedyReferenceData.js';
import { GreedyDifferencesDetail } from './GreedyDifferencesDetail.js';
import { GreedyJinxesDetail } from './GreedyJinxesDetail.js';
import { GreedyHomebrewDetail } from './GreedyHomebrewDetail.js';

export function GreedyReferencePanel(): React.JSX.Element {
	const state = useAppState();

	const details = useMemo(() => {
		if (!state.fetchedData) {
			return {
				differences: [],
				jinxes: [],
				homebrew: [],
			};
		}

		return {
			differences: deriveGreedyDifferences(state.fetchedData),
			jinxes: deriveGreedyJinxes(state.fetchedData),
			homebrew: deriveGreedyHomebrew(state.fetchedData, state.greedierSortBySet),
		};
	}, [state.fetchedData, state.greedierSortBySet]);

	return (
		<>
			<section id="section-greedy-characters" className="panel reference-panel">
				<p className="eyebrow">Greedy Characters</p>
				<p className="lede">Some characters have been modified to be different from their base version. This might be to make them perform better with a very large script or with characters they weren't originally written for, permit combinations that would be nonsensical otherwise, open new possibilities, or prevent annoyances.</p>
				<GreedyDifferencesDetail items={details.differences} loading={state.loading} />
			</section>

			<section id="section-greedy-jinxes" className="panel reference-panel">
				<p className="eyebrow">Greedy Jinxes</p>
				<p className="lede">Greedy jinxes add, remove, or change jinxes from the base version. Changes are made for the same reasons character changes are made, but cover specific interactions between two characters. See the upstream <a href="https://docs.google.com/spreadsheets/d/1Cow0lek_dEKxA09i_pSQJ2aeSw7roOj8zKa2CJKf8ug/" target="_blank" rel="noopener noreferrer">jinx spreadsheet</a>.</p>
				<GreedyJinxesDetail items={details.jinxes} loading={state.loading} />
			</section>

			<section id="section-greedier-homebrew" className="panel reference-panel">
				<p className="eyebrow">Greedier Homebrew</p>
				<p className="lede">The Greedy community runs community contests for homebrew "Greedier" characters, with a variety of exotic abilities.</p>
				<GreedyHomebrewDetail items={details.homebrew} loading={state.loading} />
			</section>
		</>
	);
}
