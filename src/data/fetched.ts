/**
 * Compatibility shim: wraps Catalog to preserve the FetchedData API during migration.
 * New code should use Catalog directly; FetchedData will be removed once all consumers migrate.
 */

import type { ScriptFile, CharacterEntry, CatalogCharacter, JinxFile, NightsheetFile } from '../types.js';
import { Catalog, OneToOneIdMap, NightOrderIndex } from './catalog.js';
import { serializeScriptDocument, parseScriptFile } from '../model/script-document.js';
import { GenerationContext } from './catalog-entry.js';

export class FetchedData {
	readonly catalog: Catalog;
	/** Per-instance generation context; catalog stays stateless. */
	readonly generationContext: GenerationContext;

	private constructor(catalog: Catalog) {
		this.catalog = catalog;
		this.generationContext = new GenerationContext();
	}

	static fromCatalog(catalog: Catalog): FetchedData {
		return new FetchedData(catalog);
	}

	/** For tests that build synthetic data without a full load. */
	static fromRaw(data: {
		greedyJson: ScriptFile;
		greedyJinxData: JinxFile;
		greedierJinxData: JinxFile;
		greedierCharactersData: CatalogCharacter[];
		greedyToBaseID: Record<string, string>;
		rolesData: CharacterEntry[];
		nightsheetFile: NightsheetFile;
		jinxData: JinxFile;
	}): FetchedData {
		const greedyDocument = parseScriptFile(data.greedyJson, 'synthetic');
		const catalog = Catalog.create({
			baseScript: greedyDocument,
			roles: data.rolesData,
			greedierCharacters: data.greedierCharactersData,
			idMappings: OneToOneIdMap.fromRecord(data.greedyToBaseID),
			nightOrder: new NightOrderIndex(data.nightsheetFile),
			officialJinxes: data.jinxData,
			greedyJinxes: data.greedyJinxData,
			greedierJinxes: data.greedierJinxData,
		});
		return new FetchedData(catalog);
	}

	cloneGreedyJson(): ScriptFile {
		return structuredClone(serializeScriptDocument(this.catalog.baseScript));
	}

	getGreedyJinxData(): Readonly<JinxFile> {
		return this.catalog.greedyJinxes;
	}

	getGreedierJinxData(): Readonly<JinxFile> {
		return this.catalog.greedierJinxes;
	}

	getJinxData(): Readonly<JinxFile> {
		return this.catalog.officialJinxes;
	}

	getGreedyToBaseID(id: string): string | undefined {
		return this.catalog.idMappings.toBase(id);
	}

	getBaseToGreedyID(id: string): string | undefined {
		return this.catalog.idMappings.toCustom(id);
	}

	getAutoToBaseID(id: string): string | undefined {
		return this.generationContext.resolveBaseId(id);
	}

	getBaseToAutoID(id: string): string | undefined {
		return this.generationContext.resolveCustomId(id);
	}

	/** Called by character expansion during generation; delegates to per-instance context. */
	setAutoIdMapping(baseId: string, customId: string): void {
		this.generationContext.register(baseId, customId);
	}
}
