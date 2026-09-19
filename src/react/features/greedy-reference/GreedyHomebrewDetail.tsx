import React, { useEffect, useState } from 'react';
import type { GreedyHomebrewDetail } from '../../../application/reference-queries.js';
import type { AlmanacCharacterReference } from '../../../types.js';
import { splitAbilityText } from './abilityText.js';
import { AbilityBlock } from './AbilityBlock.js';
import { CharacterHeader } from './CharacterHeader.js';
import { DetailListState } from './DetailListState.js';
import { ReferenceCard } from './ReferenceCard.js';
import { Switch } from '../../components/Switch.js';
import { AlmanacText, normalizeCharacterName } from './almanacText.js';

type GreedyHomebrewDetailProps = {
	items: GreedyHomebrewDetail[];
	characters: readonly AlmanacCharacterReference[];
	loading: boolean;
	sortBySet: boolean;
	onSortBySetChange: (checked: boolean) => void;
};

export function GreedyHomebrewDetail(props: GreedyHomebrewDetailProps): React.JSX.Element {
	const { items, characters, loading, sortBySet, onSortBySetChange } = props;
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const renderAlmanacText = (text: string) => (
		<AlmanacText text={text} characters={characters} />
	);

	useEffect(() => {
		const syncFromHash = () => {
			const hash = window.location.hash.slice(1);
			if (!hash.startsWith('almanac-')) {
				setExpandedId(null);
				return;
			}

			const id = hash.slice('almanac-'.length);
			if (!items.some((item) => item.character.id === id)) {
				if (!loading && items.length > 0) {
					setExpandedId(null);
				}
				return;
			}

			setExpandedId(id);
			window.requestAnimationFrame(() => {
				const element = document.getElementById(hash);
				if (typeof element?.scrollIntoView === 'function') {
					element.scrollIntoView({ block: 'start' });
				}
			});
		};

		syncFromHash();
		window.addEventListener('hashchange', syncFromHash);
		window.addEventListener('popstate', syncFromHash);
		return () => {
			window.removeEventListener('hashchange', syncFromHash);
			window.removeEventListener('popstate', syncFromHash);
		};
	}, [items, loading]);

	const toggleAlmanac = (id: string) => {
		if (expandedId === id) {
			setExpandedId(null);
			window.history.pushState(null, '', '#section-greedier-homebrew');
			return;
		}

		setExpandedId(id);
		window.history.pushState(null, '', `#almanac-${id}`);
	};

	return (
		<DetailListState
			loading={loading}
			isEmpty={items.length === 0}
			loadingText="Loading Greedier homebrew details..."
			emptyText="No Greedier homebrew characters were found."
		>
			<div className="reference-toolbar">
				<div className="inline-switch-control">
					<span id="greedier-sort-by-set-detail-label" className="inline-switch-label">Sort by set</span>
					<Switch
						id="greedier-sort-by-set-detail"
						name="greedier-sort-by-set-detail"
						ariaLabelledBy="greedier-sort-by-set-detail-label"
						checked={sortBySet}
						onChange={(event) => {
							onSortBySetChange(event.currentTarget.checked);
						}}
					/>
				</div>
			</div>
			<div className="reference-list">
				{items.map((item) => {
					const abilityParts = splitAbilityText(item.ability);
					const hasMainText = abilityParts.mainText.length > 0;
					const hasSetupText = abilityParts.setupText.length > 0;
					const isExpanded = expandedId === item.character.id;
					const panelId = `almanac-content-${item.character.id}`;

					return (
						<ReferenceCard
							key={item.character.id}
							id={`almanac-${item.character.id}`}
							header={
								<div className="almanac-card-header">
									<CharacterHeader character={item.character} />
									<button
										type="button"
										className="almanac-toggle"
										aria-expanded={isExpanded}
										aria-controls={panelId}
										onClick={() => { toggleAlmanac(item.character.id); }}
									>
										{isExpanded ? 'Hide almanac' : 'View almanac'}
									</button>
								</div>
							}
						>
							<AbilityBlock label="Ability">
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
							</AbilityBlock>
							{isExpanded ? (
								<div id={panelId} className="almanac-content">
									<div className="almanac-overview">
										<section aria-labelledby={`${panelId}-summary`}>
											<h4 id={`${panelId}-summary`}>Summary</h4>
											<p>{renderAlmanacText(item.almanac.summary.description)}</p>
											<ul>{item.almanac.summary.rules.map((rule) => <li key={rule}>{renderAlmanacText(rule)}</li>)}</ul>
										</section>
										<section aria-labelledby={`${panelId}-run`}>
											<h4 id={`${panelId}-run`}>How to Run</h4>
											<ul>{item.almanac.howToRun.map((step) => <li key={step}>{renderAlmanacText(step)}</li>)}</ul>
											{item.almanac.howToRunExamples ? (
												<ul className="how-to-run-examples" aria-label="How to Run examples">
													{item.almanac.howToRunExamples.map((example) => <li key={example}>{renderAlmanacText(example)}</li>)}
												</ul>
											) : null}
										</section>
									</div>
									<section aria-labelledby={`${panelId}-examples`}>
										<h4 id={`${panelId}-examples`}>Examples</h4>
										<ul className="almanac-example-banners">
											{item.almanac.examples.map((example) => <li key={example}>{renderAlmanacText(example)}</li>)}
										</ul>
									</section>
									<section aria-labelledby={`${panelId}-tips`}>
										<h4 id={`${panelId}-tips`}>Tips &amp; Tricks</h4>
										<ul>{item.almanac.tipsAndTricks.map((tip) => <li key={tip}>{renderAlmanacText(tip)}</li>)}</ul>
									</section>
									<section aria-labelledby={`${panelId}-opposing`}>
										<h4 id={`${panelId}-opposing`}>
											{(['minion', 'demon'].includes(item.character.team) ? 'Fighting the ' : 'Bluffing as the ')}
											{normalizeCharacterName(item.character.name)}
										</h4>
										<ul>{item.almanac.opposingTips.map((tip) => <li key={tip}>{renderAlmanacText(tip)}</li>)}</ul>
									</section>
								</div>
							) : null}
						</ReferenceCard>
					);
				})}
			</div>
		</DetailListState>
	);
}
