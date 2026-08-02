import React, { useMemo } from 'react';
import type { SelectableCharacter } from '../../../types.js';
import { splitCharactersByCommonBans } from '../../../character.js';
import { compareCanonicalCharacterOrder } from '../../../jinxOrder.js';
import { useAppActions, useAppState } from '../../context/AppContext.js';
import { Switch } from '../../components/Switch.js';
import { TeamLabel } from '../../shared/TeamLabel.js';

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
	characters: SelectableCharacter[];
	emptyText: string;
	isQuickRemove: boolean;
	showTeamSubtitle?: boolean;
};

type CharacterCardProps = {
	character: SelectableCharacter;
	isSelected: boolean;
	hasMissingDependencies: boolean;
	isQuickRemove: boolean;
	showTeamSubtitle: boolean;
	onToggle: (checked: boolean) => void;
};

function CharacterCard(props: CharacterCardProps): React.JSX.Element {
	const {
		character,
		isSelected,
		hasMissingDependencies,
		isQuickRemove,
		showTeamSubtitle,
		onToggle,
	} = props;
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
					onToggle(event.currentTarget.checked);
				}}
			/>
			{imageSrc ? <img src={imageSrc} alt={character.name} className="character-icon" /> : null}
			<div className="character-label-stack">
				<span className="character-name">{character.name}</span>
				{showTeamSubtitle ? <TeamLabel team={character.team} /> : null}
				{showTeamSubtitle && character.sourceSet ? (
					<span className="character-subtitle">Set {character.sourceSet}</span>
				) : null}
			</div>
		</label>
	);
}

function CharacterList(props: CharacterListProps): React.JSX.Element {
	const { id, className, characters, emptyText, isQuickRemove, showTeamSubtitle = true } = props;
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

				return (
					<CharacterCard
						key={character.id}
						character={character}
						isSelected={isSelected}
						hasMissingDependencies={hasMissingDependencies}
						isQuickRemove={isQuickRemove}
						showTeamSubtitle={showTeamSubtitle}
						onToggle={(checked) => {
							actions.toggleCharacter(character.id, checked);
						}}
					/>
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
		() => {
			if (!state.options.addGreedierHomebrew) {
				return [];
			}

			if (state.greedierSortBySet) {
				return state.greedierCharacters;
			}

			return [...state.greedierCharacters].sort(compareCanonicalCharacterOrder);
		},
		[state.greedierCharacters, state.greedierSortBySet, state.options.addGreedierHomebrew],
	);

	const setGreedierSelection = (isSelected: (characterId: string) => boolean): void => {
		for (const character of greedierCharacters) {
			actions.toggleCharacter(character.id, isSelected(character.id));
		}
	};

	return (
		<section id="section-characters" className="panel characters">
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
						<label className="inline-switch-control" htmlFor="greedier-sort-by-set-characters">
							<span className="inline-switch-label">Sort by set</span>
							<Switch
								id="greedier-sort-by-set-characters"
								name="greedier-sort-by-set-characters"
								checked={state.greedierSortBySet}
								onChange={(event) => {
									actions.setGreedierSortBySet(event.currentTarget.checked);
								}}
							/>
						</label>
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
