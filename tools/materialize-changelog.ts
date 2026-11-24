#!/usr/bin/env -S pnpm tsx

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export type ChangelogSection = {
	title: string;
	changes: string[];
};

export type ChangelogRelease = {
	version: string;
	status: 'released' | 'unreleased';
	date?: string;
	title?: string;
	sections: ChangelogSection[];
};

export type Changelog = {
	schemaVersion: 1;
	releases: ChangelogRelease[];
};

type MutableRelease = ChangelogRelease & {
	explicitSectionTitles: Set<string>;
	generalSectionWasSynthesized: boolean;
};

const RELEASE_HEADING = /^## \[(?<metadata>[^\]]+)\](?: (?<suffix>.+))?$/u;
const RELEASE_METADATA = /^v(?<version>\d+\.\d+(?:\.\d+)?)(?:, (?<marker>Unreleased))?$/u;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const DATE_LIKE_SUFFIX = /^\d{4}-/u;
const UNSUPPORTED_BLOCK = /^(?:[ \t]|>|[*+] |\d+[.)] |```|~~~|!\[|\||<|_{3,}$|\*{3,}$)/u;

function parseError(lineNumber: number, message: string): Error {
	return new Error(`CHANGELOG.md line ${lineNumber}: ${message}`);
}

function isValidIsoDate(value: string): boolean {
	if (!ISO_DATE.test(value)) {
		return false;
	}

	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year
		&& date.getUTCMonth() === month - 1
		&& date.getUTCDate() === day;
}

function parseReleaseHeading(line: string, lineNumber: number): MutableRelease {
	const headingMatch = RELEASE_HEADING.exec(line);
	if (!headingMatch?.groups) {
		throw parseError(lineNumber, 'malformed release heading');
	}

	const metadataMatch = RELEASE_METADATA.exec(headingMatch.groups.metadata);
	if (!metadataMatch?.groups?.version) {
		throw parseError(lineNumber, 'release metadata must contain a v-prefixed version and optional Unreleased marker');
	}

	const suffix = headingMatch.groups.suffix;
	const release: MutableRelease = {
		version: metadataMatch.groups.version,
		status: metadataMatch.groups.marker === 'Unreleased' || suffix === 'Unreleased' ? 'unreleased' : 'released',
		sections: [],
		explicitSectionTitles: new Set<string>(),
		generalSectionWasSynthesized: false,
	};

	if (suffix !== undefined && suffix !== 'Unreleased') {
		if (isValidIsoDate(suffix)) {
			release.date = suffix;
		} else if (DATE_LIKE_SUFFIX.test(suffix)) {
			throw parseError(lineNumber, `invalid ISO date: ${suffix}`);
		} else {
			release.title = suffix;
		}
	}

	return release;
}

function createSection(
	release: MutableRelease,
	title: string,
	lineNumber: number,
): ChangelogSection {
	if (release.explicitSectionTitles.has(title)) {
		throw parseError(lineNumber, `duplicate section heading: ${title}`);
	}
	release.explicitSectionTitles.add(title);

	if (title === 'General' && release.generalSectionWasSynthesized) {
		const generalSection = release.sections.find((candidate) => candidate.title === 'General');
		if (!generalSection || release.sections.at(-1) !== generalSection) {
			throw parseError(lineNumber, 'sectionless changes cannot be merged with a non-contiguous General section');
		}
		release.generalSectionWasSynthesized = false;
		return generalSection;
	}

	const section = { title, changes: [] };
	release.sections.push(section);
	return section;
}

function addSectionlessChange(release: MutableRelease, change: string): void {
	let generalSection = release.sections.find((candidate) => candidate.title === 'General');
	if (!generalSection) {
		generalSection = { title: 'General', changes: [] };
		release.sections.push(generalSection);
		release.generalSectionWasSynthesized = true;
	}
	generalSection.changes.push(change);
}

function finalizeRelease(release: MutableRelease, lineNumber: number): ChangelogRelease {
	if (release.sections.length === 0) {
		throw parseError(lineNumber, `release ${release.version} has no changes`);
	}
	for (const section of release.sections) {
		if (section.changes.length === 0) {
			throw parseError(lineNumber, `section ${section.title} in release ${release.version} has no changes`);
		}
	}

	return {
		version: release.version,
		status: release.status,
		...(release.date === undefined ? {} : { date: release.date }),
		...(release.title === undefined ? {} : { title: release.title }),
		sections: release.sections,
	};
}

export function parseChangelog(markdown: string): Changelog {
	const lines = markdown.replace(/^\uFEFF/u, '').replaceAll('\r\n', '\n').split('\n');
	if (lines[0] !== '# Changelog') {
		throw parseError(1, 'document must begin with "# Changelog"');
	}

	const releases: ChangelogRelease[] = [];
	const seenVersions = new Set<string>();
	let release: MutableRelease | undefined;
	let section: ChangelogSection | undefined;
	let paragraph: string[] = [];
	let previousContentWasBullet = false;
	let releaseClosedBySeparator = false;

	const flushParagraph = (lineNumber: number): void => {
		if (paragraph.length === 0) {
			return;
		}
		if (!release) {
			throw parseError(lineNumber, 'content must belong to a release');
		}
		const change = paragraph.join(' ');
		if (section) {
			section.changes.push(change);
		} else {
			addSectionlessChange(release, change);
		}
		paragraph = [];
	};

	const closeRelease = (lineNumber: number): void => {
		flushParagraph(lineNumber);
		if (!release) {
			return;
		}
		releases.push(finalizeRelease(release, lineNumber));
		release = undefined;
		section = undefined;
	};

	for (let index = 1; index < lines.length; index += 1) {
		const line = lines[index];
		const lineNumber = index + 1;

		if (line === '') {
			flushParagraph(lineNumber);
			previousContentWasBullet = false;
			continue;
		}

		if (line === '---') {
			if (!release) {
				throw parseError(lineNumber, 'separator must follow a release');
			}
			closeRelease(lineNumber);
			releaseClosedBySeparator = true;
			previousContentWasBullet = false;
			continue;
		}

		if (line.startsWith('## ')) {
			flushParagraph(lineNumber);
			closeRelease(lineNumber);
			const nextRelease = parseReleaseHeading(line, lineNumber);
			if (seenVersions.has(nextRelease.version)) {
				throw parseError(lineNumber, `duplicate release version: ${nextRelease.version}`);
			}
			seenVersions.add(nextRelease.version);
			release = nextRelease;
			section = undefined;
			releaseClosedBySeparator = false;
			previousContentWasBullet = false;
			continue;
		}

		if (releaseClosedBySeparator) {
			throw parseError(lineNumber, 'only a release heading may follow a separator');
		}

		if (line.startsWith('### ')) {
			flushParagraph(lineNumber);
			if (!release) {
				throw parseError(lineNumber, 'section heading must belong to a release');
			}
			const title = line.slice('### '.length).trim();
			if (!title) {
				throw parseError(lineNumber, 'section heading cannot be empty');
			}
			section = createSection(release, title, lineNumber);
			previousContentWasBullet = false;
			continue;
		}

		if (line.startsWith('#')) {
			throw parseError(lineNumber, 'unsupported heading level or malformed heading');
		}

		if (line.startsWith('- ')) {
			flushParagraph(lineNumber);
			if (!release) {
				throw parseError(lineNumber, 'change must belong to a release');
			}
			const change = line.slice(2).trim();
			if (!change) {
				throw parseError(lineNumber, 'change cannot be empty');
			}
			if (section) {
				section.changes.push(change);
			} else {
				addSectionlessChange(release, change);
			}
			previousContentWasBullet = true;
			continue;
		}

		if (UNSUPPORTED_BLOCK.test(line)) {
			throw parseError(lineNumber, 'unsupported Markdown block');
		}
		if (!release) {
			throw parseError(lineNumber, 'content must belong to a release');
		}
		if (previousContentWasBullet) {
			throw parseError(lineNumber, 'multi-line list items are not supported');
		}
		paragraph.push(line);
	}

	closeRelease(lines.length);
	if (releases.length === 0) {
		throw parseError(1, 'document must contain at least one release');
	}

	return { schemaVersion: 1, releases };
}

async function main(): Promise<void> {
	const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
	const changelogPath = path.join(repositoryRoot, 'CHANGELOG.md');
	const outputDirectory = path.join(repositoryRoot, 'static');
	const outputPath = path.join(outputDirectory, 'changelog.json');
	const changelog = parseChangelog(await readFile(changelogPath, 'utf8'));

	await mkdir(outputDirectory, { recursive: true });
	await writeFile(outputPath, `${JSON.stringify(changelog, null, 2)}\n`, 'utf8');
}

const entryPoint = process.argv[1];
if (entryPoint && path.resolve(entryPoint) === fileURLToPath(import.meta.url)) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
