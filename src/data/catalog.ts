import type {
	ScriptDocument,
	CharacterEntry,
	JinxFile,
	MappingFile,
	NightsheetFile,
	CatalogCharacter,
	SelectableCharacter,
	ScriptEntry,
} from '../types.js';
import { CatalogEntry } from './catalog-entry.js';
import { FILTERABLE_TEAMS } from '../constants.js';

export type CatalogParams = {
	baseScript: ScriptDocument;
	roles: CharacterEntry[];
	greedierCharacters: CatalogCharacter[];
	idMappings: OneToOneIdMap;
	nightOrder: NightOrderIndex;
	officialJinxes: JinxFile;
	greedyJinxes: JinxFile;
	greedierJinxes: JinxFile;
};

/** Immutable validated one-to-one ID mapping. */
export class OneToOneIdMap {
	private readonly forward: ReadonlyMap<string, string>;
	private readonly reverse: ReadonlyMap<string, string>;

	private constructor(forward: Map<string, string>, reverse: Map<string, string>) {
		this.forward = forward;
		this.reverse = reverse;
	}

	static fromRecord(mappings: Readonly<MappingFile>, sourceName = 'id_mappings'): OneToOneIdMap {
		const forward = new Map<string, string>();
		const reverse = new Map<string, string>();

		for (const [sourceId, targetId] of Object.entries(mappings)) {
			const existing = reverse.get(targetId);
			if (existing !== undefined) {
				throw new Error(
					`${sourceName} is not one-to-one: "${existing}" and "${sourceId}" both map to "${targetId}".`,
				);
			}
			forward.set(sourceId, targetId);
			reverse.set(targetId, sourceId);
		}

		return new OneToOneIdMap(forward, reverse);
	}

	/** Resolve a greedy/custom source ID -> base role ID. */
	toBase(sourceId: string): string | undefined {
		return this.forward.get(sourceId);
	}

	/** Resolve a base role ID -> greedy/custom source ID. */
	toCustom(baseId: string): string | undefined {
		return this.reverse.get(baseId);
	}
}

/** Night-order index with O(1) position lookups. */
export class NightOrderIndex {
	private readonly firstNightByBaseId: ReadonlyMap<string, number>;
	private readonly otherNightByBaseId: ReadonlyMap<string, number>;
	private readonly firstNightOrdered: readonly string[];
	private readonly otherNightOrdered: readonly string[];

	constructor(nightsheet: Readonly<NightsheetFile>) {
		this.firstNightOrdered = nightsheet.firstNight;
		this.otherNightOrdered = nightsheet.otherNight;
		this.firstNightByBaseId = new Map(nightsheet.firstNight.map((id, i) => [id, i + 1]));
		this.otherNightByBaseId = new Map(nightsheet.otherNight.map((id, i) => [id, i + 1]));
	}

	firstNight(baseId: string): number | undefined {
		return this.firstNightByBaseId.get(baseId);
	}

	otherNight(baseId: string): number | undefined {
		return this.otherNightByBaseId.get(baseId);
	}

	toNightsheetFile(): NightsheetFile {
		return {
			firstNight: [...this.firstNightOrdered],
			otherNight: [...this.otherNightOrdered],
		};
	}
}

/**
 * Immutable catalog of all application data, constructed once per load.
 * All lookups are O(1). No mutation after construction.
 */
export class Catalog {
	readonly baseScript: ScriptDocument;
	readonly idMappings: OneToOneIdMap;
	readonly nightOrder: NightOrderIndex;
	readonly officialJinxes: Readonly<JinxFile>;
	readonly greedyJinxes: Readonly<JinxFile>;
	readonly greedierJinxes: Readonly<JinxFile>;

	/** Base roles indexed by base ID. */
	readonly rolesById: ReadonlyMap<string, CatalogEntry>;

	/** Greedier characters indexed by their ID (already custom). */
	readonly greedierById: ReadonlyMap<string, CatalogEntry>;

	/** Combined lookup: base roles + greedy script entries + greedier characters, by any known ID. */
	private readonly allEntriesById: Map<string, CatalogEntry>;

	private constructor(params: CatalogParams) {
		this.baseScript = params.baseScript;
		this.idMappings = params.idMappings;
		this.nightOrder = params.nightOrder;
		this.officialJinxes = params.officialJinxes;
		this.greedyJinxes = params.greedyJinxes;
		this.greedierJinxes = params.greedierJinxes;

		const allEntries = new Map<string, CatalogEntry>();

		const rolesById = new Map<string, CatalogEntry>();
		for (const role of params.roles) {
			const customId = params.idMappings.toCustom(role.id);
			const catalogEntry = new CatalogEntry(
				{ ...role },
				role.id,
				customId ?? role.id,
			);
			rolesById.set(role.id, catalogEntry);
			allEntries.set(role.id, catalogEntry);
			if (customId) {
				allEntries.set(customId, catalogEntry);
			}
		}
		this.rolesById = rolesById;

		const greedierById = new Map<string, CatalogEntry>();
		for (const { entry, sourceSet } of params.greedierCharacters) {
			const cloned: CharacterEntry = { ...entry, edition: 'greedier' };
			const catalogEntry = new CatalogEntry(cloned, entry.id, entry.id, sourceSet);
			greedierById.set(entry.id, catalogEntry);
			allEntries.set(entry.id, catalogEntry);
		}
		this.greedierById = greedierById;

		// Index any inline character objects from the base script that aren't in roles.
		for (const entry of params.baseScript.entries) {
			if (typeof entry === 'string') continue;
			if (allEntries.has(entry.id)) continue;
			const catalogEntry = new CatalogEntry({ ...entry }, entry.id, entry.id);
			allEntries.set(entry.id, catalogEntry);
		}

		this.allEntriesById = allEntries;
	}

	static create(params: CatalogParams): Catalog {
		return new Catalog(params);
	}

	/**
	 * Resolve a base or custom character ID to its CatalogEntry.
	 * Returns null if the ID is not known to this catalog.
	 */
	lookupById(id: string): CatalogEntry | null {
		return this.allEntriesById.get(id) ?? null;
	}

	/**
	 * Resolve the base ID for any known character ID (greedy custom or base).
	 * Returns the input unchanged if not in the catalog.
	 */
	resolveBaseId(id: string): string {
		return this.idMappings.toBase(id) ?? id;
	}

	/**
	 * Resolve the greedy-custom ID for a base ID, if one exists.
	 */
	resolveCustomId(baseId: string): string | undefined {
		return this.idMappings.toCustom(baseId);
	}

	/**
	 * Create a SelectableCharacter from a raw CharacterEntry.
	 * Uses the entry's own image data when present; falls back to catalog image resolution.
	 * Attaches sourceSet from greedierById when the entry is a Greedier character.
	 */
	selectableFor(entry: CharacterEntry): SelectableCharacter {
		const tempEntry = new CatalogEntry(entry, this.resolveBaseId(entry.id), entry.id);
		return {
			...tempEntry.toSelectable(),
			sourceSet: this.greedierById.get(entry.id)?.sourceSet,
		};
	}

	/**
	 * Resolve the nightsheet first-night order for a character ID.
	 */
	firstNightOrder(id: string): number | undefined {
		return this.nightOrder.firstNight(this.resolveBaseId(id));
	}

	/**
	 * Resolve the nightsheet other-night order for a character ID.
	 */
	otherNightOrder(id: string): number | undefined {
		return this.nightOrder.otherNight(this.resolveBaseId(id));
	}

	/**
	 * Return selectable base-script characters in script order.
	 * Uses inline entry image data when present and skips non-filterable entries.
	 */
	baseSelectableCharacters(): SelectableCharacter[] {
		const characters: SelectableCharacter[] = [];

		for (const entry of this.baseScript.entries) {
			const id = typeof entry === 'string' ? entry : entry.id;
			if (id === 'choose_your_chars') continue;

			const catalogEntry = this.lookupById(id);
			if (!catalogEntry || !FILTERABLE_TEAMS.has(catalogEntry.team)) continue;

			characters.push(this.toSelectableCharacter(entry, catalogEntry));
		}

		return characters;
	}

	private toSelectableCharacter(entry: ScriptEntry, catalogEntry: CatalogEntry): SelectableCharacter {
		return typeof entry === 'string' ? catalogEntry.toSelectable() : this.selectableFor(entry);
	}
}
