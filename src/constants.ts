/**
 * Application-wide constants.
 */

import scriptSchema from '../schemas/script-schema.json';

// Message constants
export const DUPLICATE_LINE = 'Duplicate characters might be in play.';
export const REMOVED_CHARACTERS_PREFIX = 'The following characters are not available: ';

// Character filtering
export const FILTERABLE_TEAMS = new Set(['townsfolk', 'outsider', 'minion', 'demon']);

/** Maximum number of entries accepted by the upstream BotC script schema. */
export const BOTC_SCRIPT_ENTRY_LIMIT = scriptSchema.maxItems;

// Character ID suffix for custom characters
export const CUSTOM_CHARACTER_ID_SUFFIX = '_custom';
