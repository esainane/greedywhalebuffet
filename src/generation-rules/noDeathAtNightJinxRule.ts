import type { GenerationRule } from './types.js';
import type { CharacterEntry } from '../types.js';

export const noDeathAtNightJinxRule: GenerationRule = {
	name: 'useNoDeathAtNightJinxes',
	apply({ workspace, options }) {
		if (options.useNoDeathAtNightJinxes) {
			const promptOrder = workspace.catalog.otherNightOrder('riot') ?? workspace.catalog.otherNightOrder('leviathan') ?? 50;
			for (const sourceId of ['leviathan', 'riot', 'armageddon_winningclub']) {
				const entry = workspace.generationContext.findOrExpandCharacter(sourceId, workspace.entries, workspace.catalog);
				if (entry) {
					entry.otherNight ??= promptOrder;
				}
			}
			return;
		}

		for (const entry of workspace.entries) {
			if (typeof entry === 'string') {
				continue;
			}

			const characterEntry = entry as CharacterEntry;
			const baseId = workspace.generationContext.resolveBaseIdFor(characterEntry.id, workspace.catalog);
			if (baseId !== 'leviathan' && baseId !== 'riot') {
				continue;
			}

			const upstream = workspace.catalog.rolesById.get(baseId);
			if (!upstream) {
				continue;
			}

			const upstreamEntry = upstream.entry;
			const firstNight = workspace.catalog.firstNightOrder(baseId);
			if (firstNight === undefined) {
				delete characterEntry.firstNight;
			} else {
				characterEntry.firstNight = firstNight;
			}

			const otherNight = workspace.catalog.otherNightOrder(baseId);
			if (otherNight === undefined) {
				delete characterEntry.otherNight;
			} else {
				characterEntry.otherNight = otherNight;
			}

			if (typeof upstreamEntry.firstNightReminder === 'string') {
				characterEntry.firstNightReminder = upstreamEntry.firstNightReminder;
			} else {
				delete characterEntry.firstNightReminder;
			}

			if (typeof upstreamEntry.otherNightReminder === 'string') {
				characterEntry.otherNightReminder = upstreamEntry.otherNightReminder;
			} else {
				delete characterEntry.otherNightReminder;
			}

			if (Array.isArray(upstreamEntry.reminders)) {
				characterEntry.reminders = [...upstreamEntry.reminders];
			} else {
				delete characterEntry.reminders;
			}
		}
	},
};
