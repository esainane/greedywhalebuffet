/**
 * Immutable fetched data container.
 * Constructed once by the loader with validated JSON data.
 * All access is read-only except for auto ID mapping during character expansion.
 */

import type {
	ScriptData,
	CharacterEntry,
	JinxEntry,
	NightsheetData,
	IdMappings,
} from '../types.js';

function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
		for (const nested of Object.values(value as Record<string, unknown>)) {
			deepFreeze(nested);
		}
		Object.freeze(value);
	}

	return value;
}

/**
 * Bidirectional mapping that keeps both directions synchronized.
 */
class BidirectionalMap {
	private forward: Map<string, string> = new Map();
	private reverse: Map<string, string> = new Map();

	/**
	 * Set a mapping in both directions atomically.
	 */
	set(key: string, value: string): void {
		const previousValue = this.forward.get(key);
		if (previousValue !== undefined && previousValue !== value) {
			this.reverse.delete(previousValue);
		}

		const previousKey = this.reverse.get(value);
		if (previousKey !== undefined && previousKey !== key) {
			this.forward.delete(previousKey);
		}

		this.forward.set(key, value);
		this.reverse.set(value, key);
	}

	/**
	 * Get value from forward mapping (key -> value).
	 */
	getForward(key: string): string | undefined {
		return this.forward.get(key);
	}

	/**
	 * Get value from reverse mapping (value -> key).
	 */
	getReverse(value: string): string | undefined {
		return this.reverse.get(value);
	}

	/**
	 * Clear all mappings.
	 */
	clear(): void {
		this.forward.clear();
		this.reverse.clear();
	}

	/**
	 * Initialize from an existing IdMappings object.
	 */
	initializeFrom(mappings: Readonly<IdMappings>): void {
		this.clear();
		for (const [key, value] of Object.entries(mappings)) {
			this.set(key, value);
		}
	}
}

/**
 * Immutable container for all fetched JSON data.
 * Constructed once by the loader with validated data.
 */
export class FetchedData {
	// Core script data (read-only after construction)
	private readonly greedyJson: ScriptData;
	private readonly greedyJinxData: JinxEntry[];
	private readonly greedierCharactersData: CharacterEntry[];

	// ID mapping data (bidirectional, synchronized)
	private readonly greedyIdMapping: BidirectionalMap;
	private readonly autoIdMapping: BidirectionalMap; // mutable for character expansion

	// Official reference data (read-only after construction)
	private readonly rolesData: CharacterEntry[];
	private readonly nightsheetData: NightsheetData;
	private readonly jinxData: JinxEntry[];

	constructor(data: {
		greedyJson: ScriptData;
		greedyJinxData: JinxEntry[];
		greedierCharactersData: CharacterEntry[];
		greedyToBaseID: IdMappings;
		rolesData: CharacterEntry[];
		nightsheetData: NightsheetData;
		jinxData: JinxEntry[];
	}) {
		this.greedyJson = deepFreeze(data.greedyJson);
		this.greedyJinxData = deepFreeze(data.greedyJinxData);
		this.greedierCharactersData = deepFreeze(data.greedierCharactersData);
		this.rolesData = deepFreeze(data.rolesData);
		this.nightsheetData = deepFreeze(data.nightsheetData);
		this.jinxData = deepFreeze(data.jinxData);

		// Initialize bidirectional mappings
		this.greedyIdMapping = new BidirectionalMap();
		this.greedyIdMapping.initializeFrom(data.greedyToBaseID);

		this.autoIdMapping = new BidirectionalMap();
	}

	// Read-only getters for core data
	getGreedyJson(): Readonly<ScriptData> {
		return this.greedyJson;
	}

	cloneGreedyJson(): ScriptData {
		return structuredClone(this.greedyJson);
	}

	getGreedyJinxData(): Readonly<JinxEntry[]> {
		return this.greedyJinxData;
	}

	getGreedierCharactersData(): Readonly<CharacterEntry[]> {
		return this.greedierCharactersData;
	}

	getRolesData(): Readonly<CharacterEntry[]> {
		return this.rolesData;
	}

	getNightsheetData(): Readonly<NightsheetData> {
		return this.nightsheetData;
	}

	getJinxData(): Readonly<JinxEntry[]> {
		return this.jinxData;
	}

	// ID mapping accessors (forward direction: custom -> base)
	getGreedyToBaseID(id: string): string | undefined {
		return this.greedyIdMapping.getForward(id);
	}

	getAutoToBaseID(id: string): string | undefined {
		return this.autoIdMapping.getReverse(id);
	}

	// ID mapping accessors (reverse direction: base -> custom)
	getBaseToGreedyID(id: string): string | undefined {
		return this.greedyIdMapping.getReverse(id);
	}

	getBaseToAutoID(id: string): string | undefined {
		return this.autoIdMapping.getForward(id);
	}

	/**
	 * Set an auto ID mapping (updates both directions atomically).
	 * This is the only mutation allowed, used during character expansion.
	 */
	setAutoIdMapping(baseId: string, customId: string): void {
		this.autoIdMapping.set(baseId, customId);
	}
}
