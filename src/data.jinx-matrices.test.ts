import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { CharacterEntry, JinxEntry, ScriptData } from './types.js';

type LoadedMatrixData = {
	official: JinxEntry[];
	greedy: JinxEntry[];
	greedier: JinxEntry[];
	greedierCharacterIds: Set<string>;
};

type NoDeathTemplateKind =
	| 'demonbane-gainer'
	| 'demonbane-trigger'
	| 'journalist'
	| 'pathologist'
	| 'protector'
	| 'vulnerable'
	| 'king'
	| 'soldier';

type NoDeathTargetInfo = {
	id: string;
	name: string;
	kind: NoDeathTemplateKind;
	protectedSuffix?: string;
};

type EvilTurnGoodKind = 'sole' | 'side-effect';

type EvilTurnGoodTargetInfo = {
	id: string;
	name: string;
	kind: EvilTurnGoodKind;
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const staticRoot = path.join(repoRoot, 'static');

const NO_DEATH_DEMONS = ['leviathan', 'riot', 'armageddon_winningclub'] as const;
const NO_DEATH_TARGETS: NoDeathTargetInfo[] = [
	{ id: 'banshee', name: 'Banshee', kind: 'demonbane-gainer' },
	{ id: 'exorcist', name: 'Exorcist', kind: 'protector', protectedSuffix: 'the Exorcist-chosen player' },
	{ id: 'farmer', name: 'Farmer', kind: 'demonbane-trigger' },
	{ id: 'grandmother', name: 'Grandmother', kind: 'vulnerable' },
	{ id: 'innkeeper', name: 'Innkeeper', kind: 'protector', protectedSuffix: 'an Innkeeper-protected player' },
	{ id: 'journalist_winningclub', name: 'Journalist', kind: 'journalist' },
	{ id: 'king', name: 'King', kind: 'king' },
	{ id: 'monk', name: 'Monk', kind: 'protector', protectedSuffix: 'the Monk-protected player' },
	{ id: 'pathologist_winningclub', name: 'Pathologist', kind: 'pathologist' },
	{ id: 'ravenkeeper', name: 'Ravenkeeper', kind: 'demonbane-trigger' },
	{ id: 'sage', name: 'Sage', kind: 'demonbane-trigger' },
	{ id: 'soldier', name: 'Soldier', kind: 'soldier' },
];

const EVIL_TURN_GOOD_SOURCES = ['boffin', 'barber', 'pithag'] as const;
const EVIL_TURN_GOOD_TARGETS: EvilTurnGoodTargetInfo[] = [
	{ id: 'cultleader', name: 'Cult Leader', kind: 'side-effect' },
	{ id: 'goon', name: 'Goon', kind: 'side-effect' },
	{ id: 'ogre', name: 'Ogre', kind: 'sole' },
	{ id: 'politician', name: 'Politician', kind: 'sole' },
	{ id: 'portiafeatherington_winningclub', name: 'Portia Featherington', kind: 'sole' },
	{ id: 'sympath', name: 'Sympath', kind: 'sole' },
];

const NO_DEATH_SOURCE_PHRASES: Record<(typeof NO_DEATH_DEMONS)[number], string> = {
	leviathan: 'the Leviathan',
	riot: 'Riot',
	armageddon_winningclub: 'the Armageddon',
};

async function readJson<T>(filePath: string): Promise<T> {
	return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function isCharacterEntry(value: unknown): value is CharacterEntry {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof (value as { id?: unknown }).id === 'string' &&
		(value as { id: string }).id !== '_meta'
	);
}

function findDirectedReasons(entries: JinxEntry[], sourceId: string, targetId: string): string[] {
	const source = entries.find((entry) => entry.id === sourceId);
	return (source?.jinx ?? [])
		.filter((target) => target.id === targetId)
		.map((target) => target.reason);
}

function capitalizeFirst(value: string): string {
	if (value.length === 0) {
		return value;
	}

	return value[0].toUpperCase() + value.slice(1);
}

async function collectGreedierDefinedIds(): Promise<Set<string>> {
	const greedierDir = path.join(staticRoot, 'greedier');
	const fileNames = await readdir(greedierDir);
	const ids = new Set<string>();

	for (const fileName of fileNames) {
		if (!fileName.endsWith('.json')) {
			continue;
		}

		const script = await readJson<ScriptData>(path.join(greedierDir, fileName));
		for (const entry of script) {
			if (isCharacterEntry(entry)) {
				ids.add(entry.id);
			}
		}
	}

	return ids;
}

function getNoDeathExpectedReason(sourceId: string, target: NoDeathTargetInfo): string | undefined {
	const sourcePhrase = NO_DEATH_SOURCE_PHRASES[sourceId as keyof typeof NO_DEATH_SOURCE_PHRASES];
	if (!sourcePhrase) {
		return undefined;
	}

	if (target.kind === 'demonbane-trigger') {
		return `Each night*, ${sourcePhrase} chooses an alive good player (different to previous nights): a chosen ${target.name} uses their ability but does not die.`;
	}

	if (target.kind === 'demonbane-gainer') {
		return `Each night*, ${sourcePhrase} chooses an alive good player (different to previous nights): a chosen ${target.name} dies & gains their ability.`;
	}

	if (target.kind === 'journalist') {
		return `${capitalizeFirst(sourcePhrase)} does not learn ${target.name} picks. Each night*, ${sourcePhrase} chooses an alive good player (different to previous nights): if a ${target.name}-chosen player is chosen, the ${target.name} learns a true statement, even if dead.`;
	}

	if (target.kind === 'pathologist') {
		return `Each night*, ${sourcePhrase} chooses an alive good player (different to previous nights): if a ${target.name}-chosen player is chosen, the ${target.name} learns ${sourcePhrase} is in play.`;
	}

	if (target.kind === 'protector') {
		return `If ${sourcePhrase} nominates and executes ${target.protectedSuffix}, good wins.`;
	}

	if (target.kind === 'vulnerable') {
		return `If ${sourcePhrase} is in play and the Grandchild dies by execution, evil wins.`;
	}

	if (target.kind === 'king') {
		return `If ${sourcePhrase} is in play, and at least 1 player is dead, the King learns an alive character each night.`;
	}

	if (target.kind === 'soldier') {
		return `If ${sourcePhrase} nominates and executes the Soldier, good wins.`;
	}

	return undefined;
}

function getEvilTurnGoodExpectedReason(sourceId: string, target: EvilTurnGoodTargetInfo): string | undefined {
	if (sourceId === 'boffin') {
		if (target.kind === 'side-effect') {
			return `If the Demon has the ${target.name} ability, they can’t turn good due to this ability.`;
		}

		return `The Demon cannot have the ${target.name} ability.`;
	}

	if (sourceId === 'barber' || sourceId === 'pithag') {
		const sourceName = sourceId === 'barber' ? 'Barber' : 'Pit-Hag';
		return `If the ${sourceName} turns an evil player into the ${target.name}, they can't turn good due to their own ability.`;
	}

	return undefined;
}

function collectPairIssues(
	data: LoadedMatrixData,
	sourceId: string,
	targetId: string,
	options: { exactReason?: string } = {},
): string[] {
	const officialReasons = findDirectedReasons(data.official, sourceId, targetId);
	const greedyReasons = findDirectedReasons(data.greedy, sourceId, targetId);
	const greedierReasons = findDirectedReasons(data.greedier, sourceId, targetId);
	const issues: string[] = [];
	const label = `${sourceId} <-> ${targetId}`;

	const expectedSource =
		data.greedierCharacterIds.has(sourceId) || data.greedierCharacterIds.has(targetId)
			? 'greedier'
		: officialReasons.length > 0
			? 'official'
			: 'greedy';
	const exactReasonNeedsGreedyException =
		options.exactReason !== undefined &&
		!officialReasons.includes(options.exactReason) &&
		greedyReasons.includes(options.exactReason);

	if (expectedSource === 'greedier') {
		if (greedierReasons.length === 0) {
			issues.push(`${label} involves a greedier character, so it must be present in greedier_jinxes.json`);
		}
	} else if (expectedSource === 'official') {
		if (officialReasons.length === 0) {
			issues.push(`${label} should be present in jinxes.json`);
		}

		const hasGreedyEntry = greedyReasons.length > 0;
		if (hasGreedyEntry !== exactReasonNeedsGreedyException) {
			issues.push(
				exactReasonNeedsGreedyException
					? `${label} may also be in greedy_jinxes.json because the exact required line is missing from jinxes.json but present in greedy_jinxes.json`
					: `${label} is in jinxes.json, so it must not also be in greedy_jinxes.json`,
			);
		}
	} else if (greedyReasons.length === 0) {
		issues.push(`${label} is not in jinxes.json, so it must be present in greedy_jinxes.json`);
	}

	const assertedReasons =
		expectedSource === 'greedier'
			? greedierReasons
			: expectedSource === 'greedy'
				? greedyReasons
				: exactReasonNeedsGreedyException
					? [...officialReasons, ...greedyReasons]
					: officialReasons;

	if (assertedReasons.length === 0) {
		issues.push(`${label} should have at least one reason`);
	}

	if (options.exactReason !== undefined && !assertedReasons.includes(options.exactReason)) {
		issues.push(`${label} should include the exact expected reason: ${options.exactReason}`);
	}

	return issues;
}

describe('jinx matrices', () => {
	let matrixData: LoadedMatrixData;

	beforeAll(async () => {
		const [official, greedy, greedier, greedierCharacterIds] = await Promise.all([
			readJson<JinxEntry[]>(path.join(staticRoot, 'jinxes.json')),
			readJson<JinxEntry[]>(path.join(staticRoot, 'greedy_jinxes.json')),
			readJson<JinxEntry[]>(path.join(staticRoot, 'greedier_jinxes.json')),
			collectGreedierDefinedIds(),
		]);

		matrixData = { official, greedy, greedier, greedierCharacterIds };
	});

	it('No Death at Night matrix has expected pair placement and templating', async () => {
		const issues: string[] = [];

		for (const demon of NO_DEATH_DEMONS) {
			for (const target of NO_DEATH_TARGETS) {
				const expectedReason = getNoDeathExpectedReason(demon, target);
				if (expectedReason === undefined) {
					issues.push(`${demon} <-> ${target.id} should have a constructed expected template`);
					continue;
				}

				issues.push(...collectPairIssues(matrixData, demon, target.id, { exactReason: expectedReason }));
			}
		}

		expect(issues).toEqual([]);
	});

	it('Evil Turn Good matrix has expected pair placement', async () => {
		const issues: string[] = [];

		for (const sourceId of EVIL_TURN_GOOD_SOURCES) {
			for (const targetId of EVIL_TURN_GOOD_TARGETS) {
				const expectedReason = getEvilTurnGoodExpectedReason(sourceId, targetId);
				issues.push(...collectPairIssues(matrixData, sourceId, targetId.id, { exactReason: expectedReason }));
			}
		}

		expect(issues).toEqual([]);
	});
});
