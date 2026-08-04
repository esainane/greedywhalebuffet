import React, { useMemo } from 'react';
import type { SelectableCharacter } from '../../../types.js';
import { COMMON_BANNED_CHARACTER_ID_SET, POPULAR_GREEDIER_CHARACTER_ID_SET } from '../../../characterPolicy.js';
import { compareCanonicalCharacterOrder } from '../../../jinxOrder.js';
import { useAppActions } from '../../context/AppContext.js';
import {
	useCharacterView,
	useGenerationDerivedState,
	useIsLoading,
	usePreferencesView,
	useSelectedCharacterIds,
} from '../../context/selectors.js';
import { Switch } from '../../components/Switch.js';
import { TeamLabel } from '../../shared/TeamLabel.js';

function splitCharactersByCommonBans(
	characters: SelectableCharacter[],
): { quickRemove: SelectableCharacter[]; remaining: SelectableCharacter[] } {
	const quickRemove: SelectableCharacter[] = [];
	const remaining: SelectableCharacter[] = [];

	for (const character of characters) {
		if (COMMON_BANNED_CHARACTER_ID_SET.has(character.id)) {
			quickRemove.push(character);
		} else {
			remaining.push(character);
		}
	}

	return { quickRemove, remaining };
}

type CharacterListProps = {
	id: string;
	className: string;
	characters: SelectableCharacter[];
	selectedCharacterIds: ReadonlySet<string>;
	unsatisfiedDependencyCharacterIds: ReadonlySet<string>;
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
	const {
		id,
		className,
		characters,
		selectedCharacterIds,
		unsatisfiedDependencyCharacterIds,
		emptyText,
		isQuickRemove,
		showTeamSubtitle = true,
	} = props;
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
				const isSelected = selectedCharacterIds.has(character.id);
				const hasMissingDependencies =
					isSelected && unsatisfiedDependencyCharacterIds.has(character.id);

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
	const actions = useAppActions();
	const loading = useIsLoading();
	const { baseCharacters: baseCharactersFromState, greedierCharacters: greedierCharactersFromState } =
		useCharacterView();
	const { options, greedierSortBySet } = usePreferencesView();
	const { unsatisfiedDependencyCharacterIds } = useGenerationDerivedState();
	const selectedCharacterIds = useSelectedCharacterIds();
	const { quickRemove, remaining: baseCharacters } = useMemo(
		() => splitCharactersByCommonBans(baseCharactersFromState),
		[baseCharactersFromState],
	);
	const popularGreedierCharacterIdSet = useMemo(
		() => POPULAR_GREEDIER_CHARACTER_ID_SET,
		[],
	);
	const greedierCharacters = useMemo(
		() => {
			if (!options.addGreedierHomebrew) {
				return [];
			}

			if (greedierSortBySet) {
				return greedierCharactersFromState;
			}

			return [...greedierCharactersFromState].sort(compareCanonicalCharacterOrder);
		},
		[greedierCharactersFromState, greedierSortBySet, options.addGreedierHomebrew],
	);

	const setGreedierSelection = (isSelected: (characterId: string) => boolean): void => {
		const nextSelected = new Set(selectedCharacterIds);
		for (const character of greedierCharacters) {
			if (isSelected(character.id)) {
				nextSelected.add(character.id);
			} else {
				nextSelected.delete(character.id);
			}
		}
		actions.setSelectedCharacterIds(nextSelected);
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
					selectedCharacterIds={selectedCharacterIds}
					unsatisfiedDependencyCharacterIds={unsatisfiedDependencyCharacterIds}
					emptyText={loading ? 'Loading quick removals...' : 'No common bans in this script.'}
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
								checked={greedierSortBySet}
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
						selectedCharacterIds={selectedCharacterIds}
						unsatisfiedDependencyCharacterIds={unsatisfiedDependencyCharacterIds}
						emptyText="No greedier homebrew characters available."
						isQuickRemove={false}
					/>
				</div>
			) : null}
			<CharacterList
				id="character-list"
				className="character-list"
				characters={baseCharacters}
				selectedCharacterIds={selectedCharacterIds}
				unsatisfiedDependencyCharacterIds={unsatisfiedDependencyCharacterIds}
				emptyText={loading ? 'Loading base characters...' : 'No base characters available.'}
				isQuickRemove={false}
			/>
		</section>
	);
}
