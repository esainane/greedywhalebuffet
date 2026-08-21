#!/usr/bin/env -S pnpm tsx

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLatestJson, type JsonSourceLoader } from '../src/data/loader.js';
import { generate } from '../src/generation.js';
import {
	buildLegacyNightOrders,
	formatLegacyNightOrdersAsJson,
	formatLegacyNightOrdersAsText,
} from '../src/legacy-night-order.js';
import { defaultGenerationOptions } from '../src/options.js';

type CliOptions = {
	includeGreedier: boolean;
	names: boolean;
	plainText: boolean;
};

const HELP = `Usage: pnpm night-order [options]

Generate legacy firstNight and otherNight orders through the standard script pipeline.

Options:
  --greedier  Include every Greedier character
  --text      Print name, order number, and reminder as tab-separated text
  --names       Print names instead of IDs in JSON output
  -h, --help    Show this help`;

function parseArgs(args: readonly string[]): CliOptions | null {
	const options: CliOptions = {
		includeGreedier: false,
		names: false,
		plainText: false,
	};

	for (const arg of args) {
		switch (arg) {
			case '--greedier':
				options.includeGreedier = true;
				break;
			case '--names':
				options.names = true;
				break;
			case '--text':
				options.plainText = true;
				break;
			case '-h':
			case '--help':
				return null;
			default:
				throw new Error(`Unknown option: ${arg}`);
		}
	}

	return options;
}

function createFileJsonLoader(staticRoot: string): JsonSourceLoader {
	return async (sourcePath): Promise<unknown> => {
		if (!sourcePath.startsWith('./')) {
			throw new Error(`Nonrelative data path: ${sourcePath}`);
		}

		const absolutePath = path.resolve(staticRoot, sourcePath.slice(2));

		return JSON.parse(await readFile(absolutePath, 'utf8')) as unknown;
	};
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	if (!options) {
		console.log(HELP);
		return;
	}

	const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
	const staticRoot = path.resolve(toolDirectory, '../static');
	const { catalog } = await loadLatestJson({
		loadJsonSource: createFileJsonLoader(staticRoot),
	});

	const selectedCharacterIds = new Set([
		...catalog.baseSelectableCharacters().map((char) => char.id),
		...(options.includeGreedier ? catalog.greedierById.keys() : []),
	]);

	const generationOptions = defaultGenerationOptions();
	generationOptions.addGreedierHomebrew = options.includeGreedier;
	const result = generate({ selectedCharacterIds, options: generationOptions }, catalog);

	const orders = buildLegacyNightOrders(result.script, catalog);
	console.log(options.plainText
		? formatLegacyNightOrdersAsText(orders)
		: formatLegacyNightOrdersAsJson(orders, { names: options.names }));
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
