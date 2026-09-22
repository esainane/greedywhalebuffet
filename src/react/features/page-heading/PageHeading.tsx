import React from 'react';

export function PageHeading(): React.JSX.Element {
	return (
		<section className="panel hero">
			<h1>Greedy Whalebuffet</h1>
			<p className="lede">
				Not your normal choose your character Clocktower!
			</p>
			<p>You don&apos;t directly choose. You don&apos;t draft from a small set of options. You pick a set of characters you are willing to play, giving the Storyteller at least two normal Townsfolk, Outsiders, Minions, and Demons to work with, and they create a balanced and curated game from everyone&apos;s picks!</p>
			<p />
			<a href="https://discord.gg/Px3wvyGC4w" target="_blank" rel="noopener noreferrer" className="discord-link">
				<img src="https://cdn.simpleicons.org/discord/ffffff" alt="" aria-hidden="true" />
				Discord guild
			</a>
			<a href="https://github.com/esainane/greedywhalebuffet" target="_blank" rel="noopener noreferrer" className="github-link" aria-label="View GitHub repository">
				<img src="https://cdn.simpleicons.org/github/ffffff" alt="" aria-hidden="true" />
				Source
			</a>
		</section>
	);
}
