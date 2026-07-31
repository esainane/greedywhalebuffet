import React, { useMemo } from 'react';
import type { Character } from '../../types.js';
import { splitCharactersByCommonBans } from '../../character.js';
import { useAppActions, useAppState } from '../context/AppContext.js';

// Stub list for future tuning of the "Include popular" action.
const POPULAR_GREEDIER_CHARACTER_IDS: readonly string[] = [
	'hypnotist_winningclub',
	'lolth_winningclub',
	'bingbong_winningclub',
	'secretary_winningclub',
	'baffler_winningclub',
	'hopeful_winningclub',
	'potionseller_winningclub',
	'buffetsgourmet_winningclub',
	'skaldi',
	'archivist',
	'hawkmoth',
	'joe',
];

type CharacterListProps = {
	id: string;
	className: string;
	characters: Character[];
	emptyText: string;
	isQuickRemove: boolean;
};

function CharacterList(props: CharacterListProps): React.JSX.Element {
	const { id, className, characters, emptyText, isQuickRemove } = props;
	const state = useAppState();
	const actions = useAppActions();

	if (characters.length === 0) {
		return (
			<div id={id} className={className}>
				<p className="status">{emptyText}</p>
			</div>
		);
	}

	return (
		<div id={id} className={className}>
			{characters.map((character) => {
				const isSelected = state.selectedCharacterIds.has(character.id);
				const hasMissingDependencies =
					isSelected && state.unsatisfiedDependencyCharacterIds.has(character.id);
				const imageSrc =
					typeof character.imageUrl === 'string'
						? character.imageUrl
						: Array.isArray(character.imageUrl)
							? character.imageUrl[0]
							: undefined;

				return (
					<label
						key={character.id}
						className={`character-item ${isQuickRemove ? 'quick-remove-item' : ''} ${
							isSelected ? '' : 'banned'
						} ${hasMissingDependencies ? 'dependency-missing' : ''}`}
						title={hasMissingDependencies ? 'Missing required character' : undefined}
					>
						<input
							type="checkbox"
							value={character.id}
							checked={isSelected}
							onChange={(event) => {
								actions.toggleCharacter(character.id, event.currentTarget.checked);
							}}
						/>
						{imageSrc ? <img src={imageSrc} alt={character.name} className="character-icon" /> : null}
						<span className="character-name">{character.name}</span>
					</label>
				);
			})}
		</div>
	);
}

export function CharactersPanel(): React.JSX.Element {
	const state = useAppState();
	const actions = useAppActions();
	const { quickRemove, remaining: baseCharacters } = useMemo(
		() => splitCharactersByCommonBans(state.baseCharacters),
		[state.baseCharacters],
	);
	const popularGreedierCharacterIdSet = useMemo(
		() => new Set(POPULAR_GREEDIER_CHARACTER_IDS),
		[],
	);
	const greedierCharacters = useMemo(
		() =>
			state.options.addGreedierHomebrew
				? state.greedierCharacters
				: [],
		[state.greedierCharacters, state.options.addGreedierHomebrew],
	);

	const setGreedierSelection = (isSelected: (characterId: string) => boolean): void => {
		for (const character of greedierCharacters) {
			actions.toggleCharacter(character.id, isSelected(character.id));
		}
	};

	return (
		<section className="panel characters">
			<p className="eyebrow">Characters</p>
			<p className="lede">Click to remove characters from the script</p>
			<div className="quick-remove-box">
				<p className="quick-remove-title">Common bans</p>
				<CharacterList
					id="quick-remove-list"
					className="character-list quick-remove-list"
					characters={quickRemove}
					emptyText={state.loading ? 'Loading quick removals...' : 'No common bans in this script.'}
					isQuickRemove
				/>
			</div>
			{greedierCharacters.length > 0 ? (
				<div className="quick-remove-box">
					<p className="quick-remove-title">Greedier homebrew</p>
					<div className="actions">
						<button
							type="button"
							className="secondary"
							onClick={() => {
								setGreedierSelection(() => true);
							}}
						>
							Include all
						</button>
						<button
							type="button"
							className="secondary"
							onClick={() => {
								setGreedierSelection((characterId) =>
									popularGreedierCharacterIdSet.has(characterId));
							}}
						>
							Include popular
						</button>
						<button
							type="button"
							className="secondary"
							onClick={() => {
								setGreedierSelection(() => false);
							}}
						>
							Include none
						</button>
					</div>
					<CharacterList
						id="greedier-character-list"
						className="character-list"
						characters={greedierCharacters}
						emptyText="No greedier homebrew characters available."
						isQuickRemove={false}
					/>
				</div>
			) : null}
			<CharacterList
				id="character-list"
				className="character-list"
				characters={baseCharacters}
				emptyText={state.loading ? 'Loading base characters...' : 'No base characters available.'}
				isQuickRemove={false}
			/>
		</section>
	);
}
