/**
 * Application-wide constants.
 */

// Message constants
export const DUPLICATE_LINE = 'Duplicate characters might be in play.';
export const REMOVED_CHARACTERS_PREFIX = 'The following characters are not available: ';

// Data source URLs
export const GREEDY_JSON_URL = './greedy.json';
export const GREEDY_JINX_JSON_URL = './greedy_jinxes.json';
export const ID_MAPPINGS_JSON_URL = './id_mappings.json';
export const ROLES_JSON_URL = './roles.json';
export const NIGHTSHEET_JSON_URL = './nightsheet.json';
export const JINX_JSON_URL = './jinxes.json';

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
