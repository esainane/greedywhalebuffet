import React from 'react';
import { TeamLabel } from '../../shared/TeamLabel.js';

type CharacterHeaderData = {
	name: string;
	team?: string;
	imageUrl?: string;
};

type CharacterHeaderProps = {
	character: CharacterHeaderData;
};

export function CharacterHeader(props: CharacterHeaderProps): React.JSX.Element {
	const { character } = props;

	return (
		<div className="reference-title-wrap">
			{character.imageUrl ? (
				<img src={character.imageUrl} alt={character.name} className="character-icon" />
			) : null}
			<div className="reference-title-text">
				<h3>{character.name}</h3>
				<TeamLabel team={character.team} mode="passthrough" />
			</div>
		</div>
	);
}
