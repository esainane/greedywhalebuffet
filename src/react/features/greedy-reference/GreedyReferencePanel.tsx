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
			homebrew: deriveGreedyHomebrew(state.fetchedData),
		};
	}, [state.fetchedData]);

	return (
		<>
			<section className="panel reference-panel">
				<p className="eyebrow">Greedy Characters</p>
				<p className="lede">Some characters have been modified to be different from their base version. This might be to make them perform better with a very large script or with characters they weren't originally written for, permit combinations that would be nonsensical otherwise, open new possibilities, or prevent annoyances.</p>
				<GreedyDifferencesDetail items={details.differences} loading={state.loading} />
			</section>

			<section className="panel reference-panel">
				<p className="eyebrow">Greedy Jinxes</p>
				<p className="lede">Detailed incompatibility notes for Greedy jinx pairs.</p>
				<GreedyJinxesDetail items={details.jinxes} loading={state.loading} />
			</section>

			<section className="panel reference-panel">
				<p className="eyebrow">Greedier Characters</p>
				<p className="lede">Detailed listing of Greedier homebrew characters.</p>
				<GreedyHomebrewDetail items={details.homebrew} loading={state.loading} />
			</section>
		</>
	);
}
