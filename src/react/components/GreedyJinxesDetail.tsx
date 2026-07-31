import React from 'react';
import type { GreedyJinxDetail } from './greedyReferenceData.js';
import { InlineWordDiff } from './InlineWordDiff.js';
import { toTeamLabel } from './characterHelpers.js';

type GreedyJinxesDetailProps = {
	items: GreedyJinxDetail[];
	loading: boolean;
};

type JinxStatus = {
	label: 'New jinx' | 'Changed jinx' | 'Removed jinx';
	labelClassName: 'jinx-status-new' | 'jinx-status-changed' | 'jinx-status-removed';
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

	if (loading) {
		return <p className="status">Loading Greedy jinx details...</p>;
	}

	if (items.length === 0) {
		return <p className="status">No Greedy jinx entries were found.</p>;
	}

	return (
		<div className="reference-list">
			{items.map((item, index) => {
				const status = getJinxStatus(item);
				const isChangedJinx = status.label === 'Changed jinx';
				const plainJinxText = status.label === 'Removed jinx' ? status.before : status.after;

				return (
				<article key={`${item.source.id}-${item.target.id}-${index}`} className="reference-card">
					<header className="reference-header">
						<div className="reference-pair">
							<div className="reference-title-wrap">
								{item.source.imageUrl ? (
									<img src={item.source.imageUrl} alt={item.source.name} className="character-icon" />
								) : null}
								<div className="reference-title-text">
									<h3>{item.source.name}</h3>
									<p className={`team-label team-${item.source.team}`}>
										{toTeamLabel(item.source.team, 'passthrough')}
									</p>
								</div>
							</div>
							<span className="pair-separator">and</span>
							<div className="reference-title-wrap">
								{item.target.imageUrl ? (
									<img src={item.target.imageUrl} alt={item.target.name} className="character-icon" />
								) : null}
								<div className="reference-title-text">
									<h3>{item.target.name}</h3>
									<p className={`team-label team-${item.target.team}`}>
										{toTeamLabel(item.target.team, 'passthrough')}
									</p>
								</div>
							</div>
						</div>
					</header>
					<div className="reference-body">
						<div className="ability-block">
							<p className={`ability-label ${status.labelClassName}`}>{status.label}</p>
							{isChangedJinx ? (
								<InlineWordDiff
									before={status.before}
									after={status.after}
									emptyText="No jinx text available."
								/>
							) : (
								<p>{plainJinxText || 'No jinx text available.'}</p>
							)}
						</div>
					</div>
				</article>
				);
			})}
		</div>
	);
}
