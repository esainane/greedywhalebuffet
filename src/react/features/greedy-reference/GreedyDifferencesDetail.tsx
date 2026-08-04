import React from 'react';
import type { GreedyDifferenceDetail } from '../../../application/reference-queries.js';
import { InlineWordDiff } from '../../components/InlineWordDiff.js';
import { splitAbilityText } from './abilityText.js';
import { AbilityBlock } from './AbilityBlock.js';
import { CharacterHeader } from './CharacterHeader.js';
import { DetailListState } from './DetailListState.js';
import { ReferenceCard } from './ReferenceCard.js';

type GreedyDifferencesDetailProps = {
	items: GreedyDifferenceDetail[];
	loading: boolean;
};

export function GreedyDifferencesDetail(props: GreedyDifferencesDetailProps): React.JSX.Element {
	const { items, loading } = props;

	return (
		<DetailListState
			loading={loading}
			isEmpty={items.length === 0}
			loadingText="Loading difference details..."
			emptyText="No ability differences found between Greedy and official roles."
		>
			<div className="reference-list">
				{items.map((item) => {
					const officialParts = splitAbilityText(item.officialAbility);
					const greedyParts = splitAbilityText(item.greedyAbility);
					const hasSetupSection =
						officialParts.setupText.length > 0 || greedyParts.setupText.length > 0;

					return (
						<ReferenceCard
							key={item.character.id}
							header={<CharacterHeader character={item.character} />}
						>
							<AbilityBlock label="Ability">
								<p>
									<InlineWordDiff
										before={officialParts.mainText}
										after={greedyParts.mainText}
										emptyText="No ability text available."
									/>
									{hasSetupSection ? (
										<InlineWordDiff
											before={officialParts.setupText}
											after={greedyParts.setupText}
											emptyText="No setup effect text available."
											extraClassNames="setup-ability"
										/>
									) : null}
								</p>
							</AbilityBlock>
						</ReferenceCard>
					);
				})}
			</div>
		</DetailListState>
	);
}
