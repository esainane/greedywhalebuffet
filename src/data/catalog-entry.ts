import type { Catalog } from './catalog.js';
import type { CharacterEntry, ScriptFile, SelectableCharacter } from '../types.js';
import { FILTERABLE_TEAMS, CUSTOM_CHARACTER_ID_SUFFIX } from '../constants.js';

const GREEDY_HOST_PREFIX = 'https://greedy.antihype.space/';

function normalizeImageUrl(url: string): string {
	return url.startsWith(GREEDY_HOST_PREFIX) ? url.slice(GREEDY_HOST_PREFIX.length) : url;
}

function fallbackUrls(baseId: string, edition: string, team: string): string[] {
	const [teamId, otherId] = ['townsfolk', 'outsider'].includes(team) ? ['g', 'e'] : ['e', 'g'];
	return [
		`${GREEDY_HOST_PREFIX}icons/${edition}/${baseId}_${teamId}.webp`,
		`${GREEDY_HOST_PREFIX}icons/${edition}/${baseId}_${otherId}.webp`,
	];
}

function fallbackDisplayUrl(team: string): string {
	const basename = FILTERABLE_TEAMS.has(team) ? team : 'custom';
	return `${GREEDY_HOST_PREFIX}icons/generic/${basename}.webp`;
}

/**
 * A character entry enriched with catalog-level identity and image helpers.
 * Owns all ID resolution and image computation for one character.
 */
export class CatalogEntry {
	readonly entry: CharacterEntry;
	readonly sourceSet: number | undefined;

	/** Resolved base ID (e.g. alchemist, not alchemist_popppp). */
	readonly baseId: string;

	/** Resolved export-facing custom ID (e.g. alchemist_popppp or alchemist_custom). */
	readonly customId: string;

	constructor(
		entry: CharacterEntry,
		baseId: string,
		customId: string,
		sourceSet?: number,
	) {
		this.entry = entry;
		this.baseId = baseId;
		this.customId = customId;
		this.sourceSet = sourceSet;
	}

	get id(): string { return this.entry.id; }
	get name(): string { return this.entry.name; }
	get team(): string { return this.entry.team; }
	get edition(): string | undefined { return this.entry.edition; }

	/** Absolute URLs for use in exported script payloads. */
	scriptImageUrls(): string[] {
		const image = this.entry.image;
		if (!FILTERABLE_TEAMS.has(this.team)) {
			throw new Error(`Cannot resolve image for non-filterable team: ${this.id}`);
		}
		if (typeof image === 'string') return [image];
		if (Array.isArray(image)) return image;
		return fallbackUrls(this.baseId, this.entry.edition ?? 'carousel', this.team);
	}

	/** Relative-or-external URLs normalized for display (greedy host stripped). */
	displayImageUrls(): string[] {
		return this.scriptImageUrls().map(normalizeImageUrl);
	}

	/** Primary display image URL, with generic fallback. */
	primaryDisplayImageUrl(): string {
		if (!FILTERABLE_TEAMS.has(this.team)) return fallbackDisplayUrl(this.team);
		return this.displayImageUrls()[0] ?? fallbackDisplayUrl(this.team);
	}

	/** Build the SelectableCharacter view model from this entry. */
	toSelectable(): SelectableCharacter {
		return {
			id: this.entry.id,
			name: this.entry.name,
			team: this.entry.team,
			edition: this.entry.edition,
			imageUrl: this.primaryDisplayImageUrl(),
			sourceSet: this.sourceSet,
		};
	}
}

/**
 * Per-generation auto-ID context: tracks custom IDs assigned during script expansion.
 * Isolated from catalog so catalog stays stateless across multiple generations.
 */
export class GenerationContext {
	private readonly baseByCustom = new Map<string, string>();
	private readonly customByBase = new Map<string, string>();

	resolveBaseId(id: string): string | undefined {
		return this.baseByCustom.get(id);
	}

	resolveCustomId(baseId: string): string | undefined {
		return this.customByBase.get(baseId);
	}

	register(baseId: string, customId: string): void {
		if (this.customByBase.has(baseId) && this.customByBase.get(baseId) !== customId) {
			throw new Error(
				`Auto-ID collision: base "${baseId}" already mapped to "${this.customByBase.get(baseId)}", cannot remap to "${customId}".`,
			);
		}
		this.baseByCustom.set(customId, baseId);
		this.customByBase.set(baseId, customId);
	}

	resolveBaseIdFor(id: string, catalog: Catalog): string {
		return catalog.idMappings.toBase(id) ?? this.resolveBaseId(id) ?? id;
	}

	resolveCustomIdFor(id: string, catalog: Catalog): string {
		const baseId = this.resolveBaseIdFor(id, catalog);
		const greedyCustom = catalog.idMappings.toCustom(baseId);
		if (greedyCustom) return greedyCustom;
		return this.resolveCustomId(baseId) ?? `${baseId}${CUSTOM_CHARACTER_ID_SUFFIX}`;
	}

	findCharacterId(id: string, data: ScriptFile, catalog: Catalog): string {
		const baseId = this.resolveBaseIdFor(id, catalog);
		const customId = this.resolveCustomIdFor(baseId, catalog);
		const needle = [id, baseId, customId];

		const existing = data.find(
			(entry) =>
				typeof entry === 'object' &&
				entry !== null &&
				'id' in entry &&
				needle.includes((entry as CharacterEntry).id),
		) as CharacterEntry | undefined;
		if (existing) {
			return existing.id;
		}

		return baseId;
	}

	findOrExpandCharacter(
		id: string,
		data: ScriptFile,
		catalog: Catalog,
	): CharacterEntry | null {
		const baseId = this.resolveBaseIdFor(id, catalog);
		const customId = this.resolveCustomIdFor(baseId, catalog);
		const needle = [id, baseId, customId];

		const existing = data.find(
			(entry) =>
				typeof entry === 'object' &&
				entry !== null &&
				'id' in entry &&
				needle.includes((entry as CharacterEntry).id),
		) as CharacterEntry | undefined;
		if (existing) {
			return existing;
		}

		const index = data.findIndex((d) => typeof d === 'string' && needle.includes(d));
		if (index === -1) {
			return null;
		}

		const catalogRoleDef = catalog.rolesById.get(baseId);
		if (!catalogRoleDef) {
			return null;
		}

		const clone = structuredClone(catalogRoleDef.entry);
		clone.id = customId;
		this.register(baseId, customId);
		clone.firstNight ??= catalog.firstNightOrder(baseId);
		clone.otherNight ??= catalog.otherNightOrder(baseId);
		clone.image ??= catalogRoleDef.scriptImageUrls();

		data[index] = clone;
		return clone;
	}

	deriveCustomId(baseId: string, greedyCustomId: string | undefined): string {
		return greedyCustomId ?? this.customByBase.get(baseId) ?? `${baseId}${CUSTOM_CHARACTER_ID_SUFFIX}`;
	}
}

/** Minimal resolver context used by generation/jinx processing helpers. */
export type CharacterResolver = {
	readonly catalog: Catalog;
	readonly generationContext: GenerationContext;
};
