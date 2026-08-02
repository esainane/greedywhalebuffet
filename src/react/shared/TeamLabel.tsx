import React from 'react';

type TeamLabelMode = 'strict' | 'passthrough';

type TeamLabelInfo = {
	label: string;
	className: string;
};

const TEAM_LABELS: Record<string, TeamLabelInfo> = {
	townsfolk: {
		label: 'Townsfolk',
		className: 'team-townsfolk',
	},
	outsider: {
		label: 'Outsider',
		className: 'team-outsider',
	},
	minion: {
		label: 'Minion',
		className: 'team-minion',
	},
	demon: {
		label: 'Demon',
		className: 'team-demon',
	},
};

function getTeamLabel(team: string | undefined, mode: TeamLabelMode = 'strict'): TeamLabelInfo | null {
	if (!team) {
		return null;
	}

	const knownTeam = TEAM_LABELS[team];
	if (knownTeam) {
		return knownTeam;
	}

	if (mode === 'passthrough') {
		return {
			label: team,
			className: '',
		};
	}

	return null;
}

type TeamLabelProps = {
	team: string | undefined;
	mode?: TeamLabelMode;
};

export function TeamLabel(props: TeamLabelProps): React.JSX.Element | null {
	const { team, mode = 'passthrough' } = props;
	const labelInfo = getTeamLabel(team, mode);

	if (!labelInfo) {
		return null;
	}

	const classNames = ['team-label', labelInfo.className].filter(Boolean).join(' ');
	return <p className={classNames}>{labelInfo.label}</p>;
}
