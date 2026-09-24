import React, { useMemo } from 'react';
import { useCatalog } from '../../context/selectors.js';
import { RichText } from '../../shared/richText.js';
import { RichCharacterReference } from '../../../types.js';
import { HelpBubble } from '../../components/HelpBubble.js';
import { PLAYER_RESPONSIBILITIES, STORYTELLER_RESPONSIBILITIES } from './coc-policy.js';

export function PageHeading(): React.JSX.Element {
	const catalog = useCatalog();
	const characters = useMemo<readonly RichCharacterReference[]>(
		() => catalog?.textNameTeams ?? [],
		[catalog],
	);

	return (
		<section className="panel hero">
			<h1>Greedy Whalebuffet</h1>
			<p className="lede">
				Not your normal choose your character Clocktower!
			</p>
			<p>
				<RichText
					text="You don&apos;t directly choose. You don&apos;t draft from a small set of options. You pick a set of characters you are willing to play, giving the Storyteller at least two normal Townsfolk, Outsiders, Minions, and Demons to work with, and they create a balanced and curated game from everyone&apos;s picks!"
					characters={characters}
				/>
			</p>
			<section aria-labelledby="normal-picks-description" className="panel">
				<p className="eyebrow">Normal Picks</p>
				<p><RichText
					text="You can make as many picks as you want, but you still need to give the Storyteller enough normal picks to work with. They can't build a balanced bag when everyone's good picks are Cult Leader, Alchemist, Politician, and Ogre!"
					characters={characters}
				/></p>
				<p>
					{"To make balanced bags possible, \"normal\" picks are characters which do not adjust alignments"}
					<HelpBubble
						optionId="normal-picks"
						label="Normal Picks"
						helpText={<>
							<p><RichText
								text="Base characters which adjust alignment: Bounty Hunter, Cult Leader, Snake Charmer, Goon, Ogre, Politician, Mezepheles, Pit-Hag, Summoner, Fang Gu, and Lord of Typhon."
								characters={characters}
							/></p>
							<p><RichText
								text="Greedier Homebrew characters which adjust alignment: Jester, Portia Featherington, Sympath, Daki, Dragon, Lolth, and Shadowseeker."
								characters={characters}
							/></p>
						</>}
					/>
					{" or are explicitly abnormal"}
					<HelpBubble
						optionId="abnormal-picks"
						label="Abnormal Picks"
						helpText={<>
							<p><RichText
								text="Characters considered abnormal by default: Atheist, Alchemist, Magician, Philosopher, Poppy Grower, Heretic, Legion, or Lil' Monsta."
								characters={characters}
							/></p>
						</>}
					/>
					{"."}
				</p>
			</section>
			<span className="conduct-responsibilities">
				<section aria-labelledby="player-responsibilities-heading" className="panel">
					<p className="eyebrow" id="player-responsibilities-heading">Players</p>
					{PLAYER_RESPONSIBILITIES.map((paragraph, index) => (
						<p key={index}>
							<RichText text={paragraph} characters={characters} />
						</p>
					))}
				</section>
				<section aria-labelledby="storyteller-responsibilities-heading" className="panel">
					<p className="eyebrow" id="storyteller-responsibilities-heading">Storytellers</p>
					{STORYTELLER_RESPONSIBILITIES.map((paragraph, index) => (
						<p key={index}>
							<RichText text={paragraph} characters={characters} />
						</p>
					))}
				</section>
			</span>
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
