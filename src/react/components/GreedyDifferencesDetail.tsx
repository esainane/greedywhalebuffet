import React from 'react';
import type { GreedyDifferenceDetail } from './greedyReferenceData.js';
import { InlineWordDiff } from './InlineWordDiff.js';
import { splitAbilityText, toTeamLabel } from './characterHelpers.js';

type GreedyDifferencesDetailProps = {
	items: GreedyDifferenceDetail[];
	loading: boolean;
};

export function GreedyDifferencesDetail(props: GreedyDifferencesDetailProps): React.JSX.Element {
	const { items, loading } = props;

	if (loading) {
		return <p className="status">Loading difference details...</p>;
	}

	if (items.length === 0) {
		return <p className="status">No ability differences found between Greedy and official roles.</p>;
	}

	return (
		<div className="reference-list">
			{items.map((item) => {
				const officialParts = splitAbilityText(item.officialAbility);
				const greedyParts = splitAbilityText(item.greedyAbility);
				const hasSetupSection =
					officialParts.setupText.length > 0 || greedyParts.setupText.length > 0;

				return (
					<article key={item.character.id} className="reference-card">
						<header className="reference-header">
							<div className="reference-title-wrap">
								{item.character.imageUrl ? (
									<img
										src={item.character.imageUrl}
										alt={item.character.name}
										className="character-icon"
									/>
								) : null}
								<div className="reference-title-text">
									<h3>{item.character.name}</h3>
									<p className={`team-label team-${item.character.team}`}>
										{toTeamLabel(item.character.team, 'passthrough')}
									</p>
								</div>
							</div>
						</header>
						<div className="reference-body">
							<div className="ability-block">
								<p className="ability-label">Ability</p>
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
							</div>
						</div>
					</article>
				);
			})}
		</div>
	);
}
