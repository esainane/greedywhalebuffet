import React, { useMemo } from 'react';
import type { RichCharacterReference } from '../../../types.js';
import { useCatalog } from '../../context/selectors.js';
import { RichText } from '../../shared/richText.js';

import { PLAYER_RESPONSIBILITIES, STORYTELLER_RESPONSIBILITIES } from './coc-policy.js';

export function CodeOfConductPanel(): React.JSX.Element {
	const catalog = useCatalog();
	const characters = useMemo<readonly RichCharacterReference[]>(
		() => catalog?.textNameTeams ?? [],
		[catalog],
	);

	return (
		<section id="section-code-of-conduct" className="panel conduct-panel">
			<p className="eyebrow">Code of Conduct</p>
			<div className="conduct-responsibilities">
				<section aria-labelledby="player-responsibilities-heading">
					<h2 id="player-responsibilities-heading">Players</h2>
					{PLAYER_RESPONSIBILITIES.map((paragraph, index) => (
						<p key={index}>
							<RichText text={paragraph} characters={characters} />
						</p>
					))}
				</section>
				<section aria-labelledby="storyteller-responsibilities-heading">
					<h2 id="storyteller-responsibilities-heading">Storytellers</h2>
					{STORYTELLER_RESPONSIBILITIES.map((paragraph, index) => (
						<p key={index}>
							<RichText text={paragraph} characters={characters} />
						</p>
					))}
				</section>
			</div>
		</section>
	);
}
