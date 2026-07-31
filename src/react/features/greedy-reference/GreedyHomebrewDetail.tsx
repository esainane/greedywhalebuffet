import React from 'react';
import type { GreedyHomebrewDetail } from './greedyReferenceData.js';
import { splitAbilityText } from './abilityText.js';
import { AbilityBlock } from './AbilityBlock.js';
import { CharacterHeader } from './CharacterHeader.js';
import { DetailListState } from './DetailListState.js';
import { ReferenceCard } from './ReferenceCard.js';

type GreedyHomebrewDetailProps = {
	items: GreedyHomebrewDetail[];
	loading: boolean;
};

export function GreedyHomebrewDetail(props: GreedyHomebrewDetailProps): React.JSX.Element {
	const { items, loading } = props;

	return (
		<DetailListState
			loading={loading}
			isEmpty={items.length === 0}
			loadingText="Loading Greedier homebrew details..."
			emptyText="No Greedier homebrew characters were found."
		>
			<div className="reference-list">
				{items.map((item) => {
					const abilityParts = splitAbilityText(item.ability);
					const hasMainText = abilityParts.mainText.length > 0;
					const hasSetupText = abilityParts.setupText.length > 0;

					return (
						<ReferenceCard
							key={item.character.id}
							header={<CharacterHeader character={item.character} />}
						>
							<AbilityBlock label="Ability">
								{hasMainText || hasSetupText ? (
									<p>
										{hasMainText ? abilityParts.mainText : null}
										{hasSetupText ? (
											<span className="setup-ability">{abilityParts.setupText}</span>
										) : null}
									</p>
								) : (
									<p>No ability text available.</p>
								)}
							</AbilityBlock>
						</ReferenceCard>
					);
				})}
			</div>
		</DetailListState>
	);
}
