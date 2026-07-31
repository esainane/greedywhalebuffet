import React from 'react';
import type { GreedyHomebrewDetail } from './greedyReferenceData.js';
import { splitAbilityText, toTeamLabel } from './characterHelpers.js';

type GreedyHomebrewDetailProps = {
	items: GreedyHomebrewDetail[];
	loading: boolean;
};

export function GreedyHomebrewDetail(props: GreedyHomebrewDetailProps): React.JSX.Element {
	const { items, loading } = props;

	if (loading) {
		return <p className="status">Loading Greedier homebrew details...</p>;
	}

	if (items.length === 0) {
		return <p className="status">No Greedier homebrew characters were found.</p>;
	}

	return (
		<div className="reference-list">
			{items.map((item) => {
				const abilityParts = splitAbilityText(item.ability);
				const hasMainText = abilityParts.mainText.length > 0;
				const hasSetupText = abilityParts.setupText.length > 0;

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
						</div>
					</div>
				</article>
				);
			})}
		</div>
	);
}
