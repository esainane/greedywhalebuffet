import type { Catalog } from './data/catalog.js';
import { GenerationContext } from './data/catalog-entry.js';
import type { CharacterResolver } from './data/catalog-entry.js';
import type { ScriptFile, ScriptEntry, MetaEntry } from './types.js';

/**
 * Mutable workspace for a single generation run.
 * Owns the working ScriptFile copy and the per-generation identity context.
 * Satisfies CharacterResolver so rules can pass it directly to character/jinx helpers.
 */
export class GenerationWorkspace implements CharacterResolver {
	readonly catalog: Catalog;
	readonly generationContext: GenerationContext;
	readonly meta: MetaEntry;
	readonly entries: ScriptEntry[];

	constructor(catalog: Catalog) {
		this.catalog = catalog;
		this.generationContext = new GenerationContext();
		const { meta, entries } = catalog.baseScript;
		this.meta = structuredClone(meta);
		this.entries = structuredClone(entries) as ScriptEntry[];
	}

	toScriptFile(): ScriptFile {
		return [this.meta, ...this.entries];
	}
}
