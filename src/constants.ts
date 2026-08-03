/**
 * Application-wide constants.
 */

// Message constants
export const DUPLICATE_LINE = 'Duplicate characters might be in play.';
export const REMOVED_CHARACTERS_PREFIX = 'The following characters are not available: ';

// Character filtering
export const FILTERABLE_TEAMS = new Set(['townsfolk', 'outsider', 'minion', 'demon']);

// Commonly banned characters for quick removal
export const COMMON_BANS = [
	'alchemist_popppp',
	'atheist',
	'bountyhunter',
	'cultleader_popppp',
	'philosopher_ultimate',
	'poppygrower_popppp',
	'snakecharmer',
	'heretic_popppp',
	'goon',
	'pithag_ultimate',
	'wizard_popppp',
	'legion_popppp',
	'leviathan_popppp',
	'riot_popppp',
	'zombuul',
];

// Character ID suffix for custom characters
export const CUSTOM_CHARACTER_ID_SUFFIX = '_custom';
