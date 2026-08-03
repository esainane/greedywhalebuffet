import type { Catalog } from './data/catalog.js';

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

function normalizeNoDeathAtNightId(id: string, catalog: Catalog): string {
	const baseId = catalog.resolveBaseId(id);

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
	catalog: Catalog,
): boolean {
	const source = normalizeNoDeathAtNightId(sourceId, catalog);
	const target = normalizeNoDeathAtNightId(targetId, catalog);

	return (
		(NO_DEATH_AT_NIGHT_DEMON_IDS.has(source) && NO_DEATH_AT_NIGHT_ROLE_IDS.has(target)) ||
		(NO_DEATH_AT_NIGHT_ROLE_IDS.has(source) && NO_DEATH_AT_NIGHT_DEMON_IDS.has(target))
	);
}
