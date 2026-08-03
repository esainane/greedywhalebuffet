import { getBaseCharacterId } from './character.js';
import type { FetchedData } from './data/fetched.js';

const NO_DEATH_AT_NIGHT_DEMON_IDS = new Set(['leviathan', 'riot', 'armageddon']);
const NO_DEATH_AT_NIGHT_ROLE_IDS = new Set([
	'banshee',
	'exorcist',
	'farmer',
	'grandmother',
	'innkeeper',
	'monk',
	'ravenkeeper',
	'sage',
	'soldier',
	'journalist',
	'pathologist',
]);

function normalizeNoDeathAtNightId(id: string, fetchedData: FetchedData): string {
	const baseId = getBaseCharacterId(id, fetchedData);

	if (baseId === 'armageddon_winningclub') {
		return 'armageddon';
	}

	if (baseId === 'journalist_winningclub') {
		return 'journalist';
	}

	if (baseId === 'pathologist_winningclub') {
		return 'pathologist';
	}

	return baseId;
}

export function isNoDeathAtNightJinxPair(
	sourceId: string,
	targetId: string,
	fetchedData: FetchedData,
): boolean {
	const source = normalizeNoDeathAtNightId(sourceId, fetchedData);
	const target = normalizeNoDeathAtNightId(targetId, fetchedData);

	return (
		(NO_DEATH_AT_NIGHT_DEMON_IDS.has(source) && NO_DEATH_AT_NIGHT_ROLE_IDS.has(target)) ||
		(NO_DEATH_AT_NIGHT_ROLE_IDS.has(source) && NO_DEATH_AT_NIGHT_DEMON_IDS.has(target))
	);
}
