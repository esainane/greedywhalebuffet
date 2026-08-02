import React from 'react';
import type { GreedyJinxDetail } from './greedyReferenceData.js';
import { InlineWordDiff } from '../../components/InlineWordDiff.js';
import { AbilityBlock } from './AbilityBlock.js';
import { CharacterHeader } from './CharacterHeader.js';
import { DetailListState } from './DetailListState.js';
import { ReferenceCard } from './ReferenceCard.js';

type GreedyJinxesDetailProps = {
	items: GreedyJinxDetail[];
	loading: boolean;
};

type JinxStatus = {
	label: 'New jinx' | 'Changed jinx' | 'Removed jinx' | 'Greedier Homebrew Jinx';
	labelClassName:
		| 'jinx-status-new'
		| 'jinx-status-changed'
		| 'jinx-status-removed'
		| 'jinx-status-greedier-homebrew';
	before: string;
	after: string;
};

function getJinxStatus(item: GreedyJinxDetail): JinxStatus {
	const officialReason = item.officialReason ?? '';
	const greedyReason = item.reason;

	if (greedyReason.trim().length === 0) {
		return {
			label: 'Removed jinx',
			labelClassName: 'jinx-status-removed',
			before: officialReason,
			after: '',
		};
	}

	if (officialReason.trim().length === 0) {
		if (item.origin === 'greedier-homebrew') {
			return {
				label: 'Greedier Homebrew Jinx',
				labelClassName: 'jinx-status-greedier-homebrew',
				before: '',
				after: greedyReason,
			};
		}

		return {
			label: 'New jinx',
			labelClassName: 'jinx-status-new',
			before: '',
			after: greedyReason,
		};
	}

	return {
		label: 'Changed jinx',
		labelClassName: 'jinx-status-changed',
		before: officialReason,
		after: greedyReason,
	};
}
export function GreedyJinxesDetail(props: GreedyJinxesDetailProps): React.JSX.Element {
	const { items, loading } = props;

	return (
		<DetailListState
			loading={loading}
			isEmpty={items.length === 0}
			loadingText="Loading Greedy jinx details..."
			emptyText="No Greedy jinx entries were found."
		>
			<div className="reference-list">
				{items.map((item, index) => {
					const status = getJinxStatus(item);
					const isChangedJinx = status.label === 'Changed jinx';
					const plainJinxText = status.label === 'Removed jinx' ? status.before : status.after;

					return (
						<ReferenceCard
							key={`${item.source.id}-${item.target.id}-${index}`}
							header={
								<div className="reference-pair">
									<CharacterHeader character={item.source} />
									<span className="pair-separator">and</span>
									<CharacterHeader character={item.target} />
								</div>
							}
						>
							<AbilityBlock
								label={status.label}
								labelClassName={status.labelClassName}
								className={status.labelClassName}
							>
								{isChangedJinx ? (
									<InlineWordDiff
										before={status.before}
										after={status.after}
										emptyText="No jinx text available."
									/>
								) : (
									<p>{plainJinxText || 'No jinx text available.'}</p>
								)}
							</AbilityBlock>
						</ReferenceCard>
					);
				})}
			</div>
		</DetailListState>
	);
}
