export type AbilityTextParts = {
	mainText: string;
	setupText: string;
};

export type TeamLabelMode = 'strict' | 'passthrough';

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

const TRAILING_SETUP_EFFECT_PATTERN = /(\s*(?:\[[^[]*\]\s*)+)$/;

export function splitAbilityText(abilityText: string): AbilityTextParts {
	const withoutTrailingWhitespace = abilityText.trimEnd();
	if (withoutTrailingWhitespace.length === 0) {
		return { mainText: '', setupText: '' };
	}

	const match = withoutTrailingWhitespace.match(TRAILING_SETUP_EFFECT_PATTERN);
	if (!match) {
		return { mainText: withoutTrailingWhitespace, setupText: '' };
	}

	const setupText = match[1].trim();
	const mainText = withoutTrailingWhitespace
		.slice(0, withoutTrailingWhitespace.length - match[1].length)
		.trimEnd();

	return {
		mainText,
		setupText,
	};
}

export function getTeamLabel(
	team: string | undefined,
	mode: TeamLabelMode = 'strict',
): TeamLabelInfo | null {
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

export function toTeamLabel(team: string | undefined, mode: TeamLabelMode = 'strict'): string | null {
	return getTeamLabel(team, mode)?.label ?? null;
}
