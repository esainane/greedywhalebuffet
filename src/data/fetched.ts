/**
 * Immutable fetched data container.
 * Constructed once by the loader with validated JSON data.
 * All access is read-only except for auto ID mapping during character expansion.
 */

import type {
	ScriptFile,
	CharacterEntry,
	JinxFile,
	NightsheetFile,
	MappingFile,
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
	 * Initialize from an existing MappingFile object.
	 */
	initializeFrom(mappings: Readonly<MappingFile>): void {
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
	private readonly greedyJson: ScriptFile;
	private readonly greedyJinxData: JinxFile;
	private readonly greedierJinxData: JinxFile;
	private readonly greedierCharactersData: CharacterEntry[];

	// ID mapping data (bidirectional, synchronized)
	private readonly greedyIdMapping: BidirectionalMap;
	private readonly autoIdMapping: BidirectionalMap; // mutable for character expansion

	// Official reference data (read-only after construction)
	private readonly rolesData: CharacterEntry[];
	private readonly nightsheetFile: NightsheetFile;
	private readonly jinxData: JinxFile;

	constructor(data: {
		greedyJson: ScriptFile;
		greedyJinxData: JinxFile;
		greedierJinxData: JinxFile;
		greedierCharactersData: CharacterEntry[];
		greedyToBaseID: MappingFile;
		rolesData: CharacterEntry[];
		nightsheetFile: NightsheetFile;
		jinxData: JinxFile;
	}) {
		this.greedyJson = deepFreeze(data.greedyJson);
		this.greedyJinxData = deepFreeze(data.greedyJinxData);
		this.greedierJinxData = deepFreeze(data.greedierJinxData);

		data.greedierCharactersData.forEach((entry: CharacterEntry) => {
			entry.edition = 'greedier';
		});

		this.greedierCharactersData = deepFreeze(data.greedierCharactersData);
		this.rolesData = deepFreeze(data.rolesData);
		this.nightsheetFile = deepFreeze(data.nightsheetFile);
		this.jinxData = deepFreeze(data.jinxData);

		// Initialize bidirectional mappings
		this.greedyIdMapping = new BidirectionalMap();
		this.greedyIdMapping.initializeFrom(data.greedyToBaseID);

		this.autoIdMapping = new BidirectionalMap();
	}

	// Read-only getters for core data
	getGreedyJson(): Readonly<ScriptFile> {
		return this.greedyJson;
	}

	cloneGreedyJson(): ScriptFile {
		return structuredClone(this.greedyJson);
	}

	getGreedyJinxData(): Readonly<JinxFile> {
		return this.greedyJinxData;
	}

	getGreedierCharactersData(): Readonly<CharacterEntry[]> {
		return this.greedierCharactersData;
	}

	getGreedierJinxData(): Readonly<JinxFile> {
		return this.greedierJinxData;
	}

	getRolesData(): Readonly<CharacterEntry[]> {
		return this.rolesData;
	}

	getNightsheetFile(): Readonly<NightsheetFile> {
		return this.nightsheetFile;
	}

	getJinxData(): Readonly<JinxFile> {
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
