#!/usr/bin/env -S pnpm tsx

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import type { AnySchemaObject } from 'ajv';
import addFormats from 'ajv-formats';

const SCHEMA_NAMES = ['script', 'roles', 'jinx'] as const;

type SchemaName = typeof SCHEMA_NAMES[number];

type CliOptions = {
	file: string;
	schema: SchemaName;
};

const HELP = `Usage: pnpm file-validate <file> [schema]
       pnpm file-validate <file> --schema <schema>

Validate a JSON file against one of the repository's schemas.

Schemas:
  script  Full script schema (default)
  roles   Supplementary character definitions
  jinx    Supplementary jinx definitions

Options:
  -s, --schema <schema>  Schema to use
  -h, --help             Show this help`;

function parseSchemaName(value: string): SchemaName {
	if ((SCHEMA_NAMES as readonly string[]).includes(value)) {
		return value as SchemaName;
	}

	throw new Error(`Unknown schema: ${value}. Expected one of: ${SCHEMA_NAMES.join(', ')}`);
}

function parseArgs(args: readonly string[]): CliOptions | null {
	let selectedSchema: SchemaName | undefined;
	const positional: string[] = [];

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		switch (arg) {
			case '-h':
			case '--help':
				return null;
			case '-s':
			case '--schema': {
				const value = args[index + 1];
				if (!value) {
					throw new Error(`${arg} requires a schema name`);
				}
				selectedSchema = parseSchemaName(value);
				index += 1;
				break;
			}
			default:
				if (arg.startsWith('--schema=')) {
					selectedSchema = parseSchemaName(arg.slice('--schema='.length));
				} else if (arg.startsWith('-')) {
					throw new Error(`Unknown option: ${arg}`);
				} else {
					positional.push(arg);
				}
		}
	}

	if (positional.length === 0) {
		throw new Error('A file path is required');
	}
	if (positional.length > 2) {
		throw new Error('Too many positional arguments');
	}
	if (positional[1]) {
		if (selectedSchema) {
			throw new Error('Specify the schema either positionally or with --schema, not both');
		}
		selectedSchema = parseSchemaName(positional[1]);
	}

	return {
		file: positional[0],
		schema: selectedSchema ?? 'script',
	};
}

async function readJson(filePath: string): Promise<unknown> {
	return JSON.parse(await readFile(filePath, 'utf8')) as unknown;
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	if (!options) {
		console.log(HELP);
		return;
	}

	const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
	const schemaPath = path.resolve(
		toolDirectory,
		`../schemas/${options.schema}-schema.json`,
	);
	const filePath = path.resolve(options.file);
	const [schema, payload] = await Promise.all([
		readJson(schemaPath),
		readJson(filePath),
	]);

	const ajv = new Ajv2020({ allErrors: true, strict: false });
	addFormats(ajv);
	const validate = ajv.compile(schema as AnySchemaObject);

	if (!validate(payload)) {
		const details = ajv.errorsText(validate.errors, { separator: '\n' });
		throw new Error(`${options.file} failed ${options.schema} schema validation:\n${details}`);
	}

	console.log(`${options.file} is valid against the ${options.schema} schema.`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
