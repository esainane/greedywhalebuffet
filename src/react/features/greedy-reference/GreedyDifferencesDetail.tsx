import React from 'react';
import type { GreedyDifferenceDetail } from '../../../application/reference-queries.js';
import { InlineWordDiff } from '../../components/InlineWordDiff.js';
import { splitAbilityText } from './abilityText.js';
import { AbilityBlock } from './AbilityBlock.js';
import { CharacterHeader } from './CharacterHeader.js';
import { DetailListState } from './DetailListState.js';
import { ReferenceCard } from './ReferenceCard.js';

type GreedyDifferencesDetailProps = {
	items: GreedyDifferenceDetail[];
	loading: boolean;
};

export function GreedyDifferencesDetail(props: GreedyDifferencesDetailProps): React.JSX.Element {
	const { items, loading } = props;

	return (
		<DetailListState
			loading={loading}
			isEmpty={items.length === 0}
			loadingText="Loading difference details..."
			emptyText="No ability differences found between Greedy and official roles."
		>
			<div className="reference-list">
				{items.map((item) => {
					const officialParts = splitAbilityText(item.officialAbility);
					const greedyParts = splitAbilityText(item.greedyAbility);
					const hasSetupSection =
						officialParts.setupText.length > 0 || greedyParts.setupText.length > 0;
					const hasNightOrderDifference =
						item.officialFirstNight !== item.greedyFirstNight ||
						item.officialOtherNight !== item.greedyOtherNight;
					const hasReminderDifference =
						item.officialFirstNightReminder !== item.greedyFirstNightReminder ||
						item.officialOtherNightReminder !== item.greedyOtherNightReminder;

					return (
						<ReferenceCard
							key={item.character.id}
							header={<CharacterHeader character={item.character} />}
						>
							<AbilityBlock label="Ability">
								<p>
									<InlineWordDiff
										before={officialParts.mainText}
										after={greedyParts.mainText}
										emptyText="No ability text available."
									/>
									{hasSetupSection ? (
										<InlineWordDiff
											before={officialParts.setupText}
											after={greedyParts.setupText}
											emptyText="No setup effect text available."
											extraClassNames="setup-ability"
										/>
									) : null}
								</p>
							</AbilityBlock>
							{hasNightOrderDifference ? (
								<AbilityBlock label="Night order">
									<p>
										{item.officialFirstNight !== item.greedyFirstNight ? (
											<>
												<strong>First night:</strong>{' '}
												<InlineWordDiff
													before={item.officialFirstNight?.toString() ?? '—'}
													after={item.greedyFirstNight?.toString() ?? '—'}
													emptyText="No first-night order available."
												/>
											</>
										) : null}
										{item.officialOtherNight !== item.greedyOtherNight ? (
											<>
												{item.officialFirstNight !== item.greedyFirstNight ? <br /> : null}
												<strong>Other nights:</strong>{' '}
												<InlineWordDiff
													before={item.officialOtherNight?.toString() ?? '—'}
													after={item.greedyOtherNight?.toString() ?? '—'}
													emptyText="No other-night order available."
												/>
											</>
										) : null}
									</p>
								</AbilityBlock>
							) : null}
							{hasReminderDifference ? (
								<AbilityBlock label="Night reminders">
									<p>
										{item.officialFirstNightReminder !== item.greedyFirstNightReminder ? (
											<>
												<strong>First night:</strong>{' '}
												<InlineWordDiff
													before={item.officialFirstNightReminder ?? '—'}
													after={item.greedyFirstNightReminder ?? '—'}
													emptyText="No first-night reminder available."
												/>
											</>
										) : null}
										{item.officialOtherNightReminder !== item.greedyOtherNightReminder ? (
											<>
												{item.officialFirstNightReminder !== item.greedyFirstNightReminder ? <br /> : null}
												<strong>Other nights:</strong>{' '}
												<InlineWordDiff
													before={item.officialOtherNightReminder ?? '—'}
													after={item.greedyOtherNightReminder ?? '—'}
													emptyText="No other-night reminder available."
												/>
											</>
										) : null}
									</p>
								</AbilityBlock>
							) : null}
						</ReferenceCard>
					);
				})}
			</div>
		</DetailListState>
	);
}
