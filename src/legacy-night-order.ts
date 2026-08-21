import type { Catalog } from './data/catalog.js';
import type { CharacterEntry, ScriptFile } from './types.js';

export type Night = 'firstNight' | 'otherNight';

export type LegacyNightOrderEntry = {
	readonly id: string;
	readonly name: string;
	readonly order: number;
	readonly reminder: string;
};

export type LegacyNightOrders = {
	readonly firstNight: readonly LegacyNightOrderEntry[];
	readonly otherNight: readonly LegacyNightOrderEntry[];
};

const ALWAYS_INCLUDED_IDS = new Set(['dusk', 'dawn', 'minioninfo', 'demoninfo']);

const SPECIAL_NAMES: Readonly<Record<string, string>> = {
	dusk: 'Dusk',
	dawn: 'Dawn',
	minioninfo: 'Minion Info',
	demoninfo: 'Demon Info',
};

function reminderFieldFor(night: Night): 'firstNightReminder' | 'otherNightReminder' {
	return night === 'firstNight' ? 'firstNightReminder' : 'otherNightReminder';
}

function compareIds(left: LegacyNightOrderEntry, right: LegacyNightOrderEntry): number {
	return left.id.localeCompare(right.id, undefined, { sensitivity: 'base' }) || left.id.localeCompare(right.id);
}

function entryForCharacter(
	id: string,
	scriptEntry: CharacterEntry | undefined,
	catalog: Catalog,
	night: Night,
): LegacyNightOrderEntry | null {
	const catalogEntry = catalog.lookupById(id)?.entry;
	const source = scriptEntry ?? catalogEntry;
	if (!source) {
		return null;
	}

	const hasExplicitOrder = scriptEntry !== undefined && night in scriptEntry;
	const explicitOrder = scriptEntry?.[night];
	if (hasExplicitOrder && (!Number.isInteger(explicitOrder) || (explicitOrder as number) <= 0)) {
		return null;
	}

	const order = hasExplicitOrder
		? explicitOrder
		: night === 'firstNight'
			? catalog.firstNightOrder(id)
			: catalog.otherNightOrder(id);
	if (!Number.isInteger(order) || (order as number) <= 0) {
		return null;
	}

	const reminderField = reminderFieldFor(night);
	return {
		id,
		name: source.name || id,
		order: order as number,
		reminder: source[reminderField] ?? '',
	};
}

export function buildLegacyNightOrder(
	script: Readonly<ScriptFile>,
	catalog: Catalog,
	night: Night,
): LegacyNightOrderEntry[] {
	const buckets = new Map<number, Map<string, LegacyNightOrderEntry>>();
	const add = (entry: LegacyNightOrderEntry): void => {
		const bucket = buckets.get(entry.order) ?? new Map<string, LegacyNightOrderEntry>();
		bucket.set(entry.id, entry);
		buckets.set(entry.order, bucket);
	};

	const referenceOrder = catalog.nightOrder.toNightsheetFile()[night];
	for (const id of ALWAYS_INCLUDED_IDS) {
		const index = referenceOrder.indexOf(id);
		if (index >= 0) {
			add({ id, name: SPECIAL_NAMES[id] ?? id, order: index + 1, reminder: '' });
		}
	}

	for (const rawEntry of script) {
		if (typeof rawEntry !== 'string' && rawEntry.id === '_meta') {
			continue;
		}

		const id = typeof rawEntry === 'string' ? rawEntry : rawEntry.id;
		const entry = entryForCharacter(
			id,
			typeof rawEntry === 'string' ? undefined : rawEntry as CharacterEntry,
			catalog,
			night,
		);
		if (entry) {
			add(entry);
		}
	}

	return [...buckets.entries()]
		.sort(([left], [right]) => left - right)
		.flatMap(([, entries]) => [...entries.values()].sort(compareIds));
}

export function buildLegacyNightOrders(script: Readonly<ScriptFile>, catalog: Catalog): LegacyNightOrders {
	return {
		firstNight: buildLegacyNightOrder(script, catalog, 'firstNight'),
		otherNight: buildLegacyNightOrder(script, catalog, 'otherNight'),
	};
}

export function formatLegacyNightOrdersAsJson(
	orders: LegacyNightOrders,
	options: { names?: boolean } = {},
): string {
	const valueFor = (entry: LegacyNightOrderEntry): string => options.names ? entry.name : entry.id;
	return JSON.stringify({
		firstNight: orders.firstNight.map(valueFor),
		otherNight: orders.otherNight.map(valueFor),
	}, null, 2);
}

function textLine(entry: LegacyNightOrderEntry): string {
	const name = entry.name.replace(/\s+/g, ' ').trim();
	const reminder = entry.reminder.replace(/\s+/g, ' ').trim();
	return `${name}\t${entry.order}\t${reminder}`;
}

export function formatLegacyNightOrdersAsText(orders: LegacyNightOrders): string {
	return [
		'First night:',
		...orders.firstNight.map(textLine),
		'',
		'Other night:',
		...orders.otherNight.map(textLine),
	].join('\n');
}
