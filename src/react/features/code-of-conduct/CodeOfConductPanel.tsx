import React from 'react';

export function CodeOfConductPanel(): React.JSX.Element {
	return (
		<section id="section-code-of-conduct" className="panel conduct-panel">
			<p className="eyebrow">Code of Conduct</p>
			<div className="conduct-responsibilities">
				<section aria-labelledby="player-responsibilities-heading">
					<h2 id="player-responsibilities-heading">Player responsibilities</h2>
					<p>
						Keep the lobby respectful and fun. Do not talk over others, misgender them,
						dominate the conversation, or bait them (such as bluffing an Ogre pick).
						Ask the Storyteller to raise concerns with other players, rather than airing grievances publicly.
					</p>
				</section>
				<section aria-labelledby="storyteller-responsibilities-heading">
					<h2 id="storyteller-responsibilities-heading">Storyteller responsibilities</h2>
					<p>
						Intervene when necessary.
						Absent or removed players can leave issues. Greedy has many novel interactions.
						Commonly troublesome abilities remind the player they may be asked or told to reconsider.
						Asking for different choices, retroactively fixing game state, adding Doomsayer or Fiddler, and even inventing ad-hoc jinxes are all available tools for exceptional circumstances.
						The Storyteller has a broad mandate to keep the game fun, balanced, and well-paced.
					</p>
				</section>
			</div>
		</section>
	);
}
