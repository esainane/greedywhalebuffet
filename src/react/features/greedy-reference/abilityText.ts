export type AbilityTextParts = {
	mainText: string;
	setupText: string;
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
