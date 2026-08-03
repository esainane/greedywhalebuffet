import type { Catalog } from './data/catalog.js';
import { GenerationContext } from './data/catalog-entry.js';
import type { CharacterResolver } from './data/catalog-entry.js';
import { applySelectedJinxes } from './jinxes.js';
import { DUPLICATE_LINE, REMOVED_CHARACTERS_PREFIX, FILTERABLE_TEAMS } from './constants.js';
import type { ScriptFile, ScriptEntry, MetaEntry, CharacterEntry } from './types.js';

/** Characters excluded during a generation, grouped for bootlegger message construction. */
export type ExclusionRecord = {
	readonly removedBaseNames: readonly string[];
	readonly removedGreedierNames: readonly string[];
	readonly addedGreedierNames: readonly string[];
};

type JinxOptions = {
	includeOfficial: boolean;
	includeGreedy: boolean;
	includeGreedier: boolean;
	includeNoDeathAtNight: boolean;
};

/**
 * Mutable workspace for a single generation run.
 * Owns the working ScriptFile copy, the per-generation identity context, and all stage methods.
 * Satisfies CharacterResolver so it can be passed directly to character/jinx functions.
 */
export class GenerationWorkspace implements CharacterResolver {
	readonly catalog: Catalog;
	readonly generationContext: GenerationContext;
	private readonly meta: MetaEntry;
	private entries: ScriptEntry[];

	constructor(catalog: Catalog) {
		this.catalog = catalog;
		this.generationContext = new GenerationContext();
		const { meta, entries } = catalog.baseScript;
		this.meta = structuredClone(meta);
		this.entries = structuredClone(entries) as ScriptEntry[];
	}

	/** Append all Greedier characters from the catalog that aren't already present. */
	addGreedierCharacters(): void {
		const existingIds = new Set(
			this.entries
				.filter((e): e is CharacterEntry => typeof e === 'object' && e !== null && 'id' in e)
				.map((e) => e.id)
				.concat(this.entries.filter((e): e is string => typeof e === 'string')),
		);

		for (const ce of this.catalog.greedierById.values()) {
			if (!existingIds.has(ce.entry.id)) {
				this.entries.push(structuredClone(ce.entry));
				existingIds.add(ce.entry.id);
			}
		}
	}

	/** Remove characters not in exportableIds; return names grouped for removal messages. */
	filterToExportable(exportableIds: ReadonlySet<string>): ExclusionRecord {
		const removedBaseNames: string[] = [];
		const removedGreedierNames: string[] = [];
		const kept: ScriptEntry[] = [];

		for (const entry of this.entries) {
			let id: string | undefined;
			let name: string | undefined;
			let alwaysInclude = false;
			let filterable = false;

			if (typeof entry === 'string') {
				id = entry;
				name = this.catalog.rolesById.get(entry)?.entry.name ?? entry;
				const team = this.catalog.rolesById.get(entry)?.entry.team;
				filterable = !!team && FILTERABLE_TEAMS.has(team);
			} else if (typeof entry === 'object' && entry !== null && 'id' in entry) {
				const ce = entry as CharacterEntry;
				id = ce.id;
				name = ce.name || id;
				alwaysInclude = id === 'choose_your_chars';
				filterable = !!ce.team && FILTERABLE_TEAMS.has(ce.team);
			}

			if (!filterable || alwaysInclude || (id && exportableIds.has(id))) {
				kept.push(entry);
			} else if (filterable && id && name) {
				if (this.catalog.greedierById.has(id)) {
					removedGreedierNames.push(name);
				} else {
					removedBaseNames.push(name);
				}
			}
		}

		this.entries = kept;

		const addedGreedierNames = [...this.catalog.greedierById.values()]
			.filter((ce) => exportableIds.has(ce.entry.id))
			.map((ce) => ce.entry.name || ce.entry.id);

		return { removedBaseNames, removedGreedierNames, addedGreedierNames };
	}

	/** Write the removal/addition bootlegger message to the meta entry. */
	setBootleggerCharacterLine(exclusion: ExclusionRecord): void {
		const { removedBaseNames, removedGreedierNames, addedGreedierNames } = exclusion;
		if (removedBaseNames.length === 0 && removedGreedierNames.length === 0) return;

		const bootlegger = Array.isArray(this.meta.bootlegger) ? [...this.meta.bootlegger] : [];
		const allRemoved = [...removedBaseNames, ...removedGreedierNames];
		const allRemovedLine = `${REMOVED_CHARACTERS_PREFIX}${allRemoved.join(', ')}`;
		const addedLine = `The following Greedier characters have been added: ${addedGreedierNames.join(', ')}`;

		const canMixed = removedBaseNames.length > 0 && removedGreedierNames.length > 0 && addedGreedierNames.length > 0;
		if (canMixed) {
			const mixed = `${REMOVED_CHARACTERS_PREFIX}${removedBaseNames.join(', ')}. ${addedLine}`;
			bootlegger.push(mixed.length < allRemovedLine.length ? mixed : allRemovedLine);
		} else if (removedBaseNames.length === 0 && removedGreedierNames.length > 0 && addedGreedierNames.length > 0 && addedLine.length < allRemovedLine.length) {
			bootlegger.push(addedLine);
		} else {
			bootlegger.push(allRemovedLine);
		}

		this.meta.bootlegger = bootlegger;
	}

	setScriptName(name: string): void {
		this.meta.name = name;
	}

	addDuplicateCharactersLine(): void {
		this.meta.bootlegger = [...(this.meta.bootlegger ?? []), DUPLICATE_LINE];
	}

	applySpiritOfIvory(): void {
		const SOI = 'spiritofivory';
		if (!this.entries.some((e) => (typeof e === 'string' ? e : (e as CharacterEntry).id) === SOI)) {
			this.entries.push(SOI);
		}
	}

	applyAlejoRules(): void {
		const snakeCharmer = this.generationContext.findOrExpandCharacter('snakecharmer', this.entries, this.catalog);
		if (snakeCharmer) snakeCharmer.firstNight = this.catalog.firstNightOrder('philosopher');
	}

	applyJinxRules(opts: JinxOptions): void {
		applySelectedJinxes(this.entries, this, opts);
	}

	/** Ensure Leviathan/Riot/Armageddon have a prompt night-order position for NDAN jinx selection. */
	ensureNDANPromptOrder(): void {
		const promptOrder = this.catalog.otherNightOrder('riot') ?? this.catalog.otherNightOrder('leviathan') ?? 50;
		for (const sourceId of ['leviathan', 'riot', 'armageddon_winningclub']) {
			const entry = this.generationContext.findOrExpandCharacter(sourceId, this.entries, this.catalog);
			if (entry) entry.otherNight ??= promptOrder;
		}
	}

	/** Revert Leviathan/Riot export fields to upstream values when NDAN jinxes are disabled. */
	revertNDANExportFields(): void {
		for (const entry of this.entries) {
			if (typeof entry === 'string') continue;
			const characterEntry = entry as CharacterEntry;
			const baseId = this.generationContext.resolveBaseIdFor(characterEntry.id, this.catalog);
			if (baseId !== 'leviathan' && baseId !== 'riot') continue;

			const upstream = this.catalog.rolesById.get(baseId);
			if (!upstream) continue;
			const upstreamEntry = upstream.entry;

			const fn = this.catalog.firstNightOrder(baseId);
			if (fn === undefined) {
				delete characterEntry.firstNight;
			} else {
				characterEntry.firstNight = fn;
			}
			const on = this.catalog.otherNightOrder(baseId);
			if (on === undefined) {
				delete characterEntry.otherNight;
			} else {
				characterEntry.otherNight = on;
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
	}

	toScriptFile(): ScriptFile {
		return [this.meta, ...this.entries];
	}
}
