import React, { useMemo } from 'react';
import type { Character } from '../../types.js';
import { splitCharactersByCommonBans } from '../../character.js';
import { useAppActions, useAppState } from '../context/AppContext.js';

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
						}`}
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
	const { quickRemove, remaining } = useMemo(
		() => splitCharactersByCommonBans(state.characters),
		[state.characters],
	);

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
			<CharacterList
				id="character-list"
				className="character-list"
				characters={remaining}
				emptyText={state.loading ? 'Loading characters...' : 'No characters available.'}
				isQuickRemove={false}
			/>
		</section>
	);
}
