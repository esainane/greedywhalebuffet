import React, { useMemo } from 'react';
import type { RichCharacterReference } from '../../types.js';

type RichTextProps = {
	text: string;
	characters: readonly RichCharacterReference[];
};

type RichTextToken =
	| { kind: 'text'; value: string }
	| { kind: 'emphasis'; value: string }
	| { kind: 'character'; value: string; team: string }
	| { kind: 'team'; value: string; team: string };

const TEAM_BY_NAME = new Map<string, string>([
	['Townsfolk', 'townsfolk'],
	['Outsiders', 'outsider'],
	['Outsider', 'outsider'],
	['Minions', 'minion'],
	['Minion', 'minion'],
	['Demons', 'demon'],
	['Demon', 'demon'],
	['Travellers', 'traveller'],
	['Traveller', 'traveller'],
	['Fabled', 'fabled'],
	['Lorics', 'loric'],
	['Loric', 'loric'],
]);

export function normalizeCharacterName(name: string): string {
	return name.replace(/ (?:Ω|Omega)$/u, '');
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function tokenizeRichText(
	text: string,
	characters: readonly RichCharacterReference[],
): RichTextToken[] {
	const characterByName = new Map<string, RichCharacterReference>();
	for (const character of characters) {
		const normalizedName = normalizeCharacterName(character.name);
		if (normalizedName) {
			characterByName.set(normalizedName, character);
		}
	}

	const namesPattern = [...characterByName.keys()]
		.sort((left, right) => right.length - left.length)
		.map(escapeRegExp)
		.join('|');
	const teamsPattern = [...TEAM_BY_NAME.keys()]
		.sort((left, right) => right.length - left.length)
		.map(escapeRegExp)
		.join('|');
	const referencesPattern = `(?<character>${namesPattern || '(?!)'})|(?<team>${teamsPattern})`;
	const pattern = new RegExp(
		`\\*(?<emphasis>[^*]+)\\*|(?<![A-Za-z0-9])(?:${referencesPattern})(?![A-Za-z0-9])`,
		'gu',
	);
	const tokens: RichTextToken[] = [];
	let cursor = 0;

	for (const match of text.matchAll(pattern)) {
		const index = match.index;
		if (index > cursor) {
			tokens.push({ kind: 'text', value: text.slice(cursor, index) });
		}

		const emphasizedText = match.groups?.emphasis;
		const characterName = match.groups?.character;
		const teamName = match.groups?.team;
		if (emphasizedText !== undefined) {
			tokens.push({ kind: 'emphasis', value: emphasizedText });
		} else if (characterName !== undefined) {
			tokens.push({
				kind: 'character',
				value: characterName,
				team: characterByName.get(characterName)?.team ?? '',
			});
		} else if (teamName !== undefined) {
			tokens.push({
				kind: 'team',
				value: teamName,
				team: TEAM_BY_NAME.get(teamName) ?? '',
			});
		} else {
			tokens.push({ kind: 'text', value: match[0] });
		}
		cursor = index + match[0].length;
	}

	if (cursor < text.length) {
		tokens.push({ kind: 'text', value: text.slice(cursor) });
	}

	return tokens;
}

export function RichText(props: RichTextProps): React.JSX.Element {
	const { text, characters } = props;
	const tokens = useMemo(() => tokenizeRichText(text, characters), [characters, text]);

	return (
		<>
			{tokens.map((token, index) => {
				const key = `${index}-${token.value}`;
				if (token.kind === 'emphasis') {
					return <strong key={key}>{token.value}</strong>;
				}
				if (token.kind === 'character') {
					return <strong key={key} className={`text-character-reference team-${token.team}`}>{token.value}</strong>;
				}
				if (token.kind === 'team') {
					return <strong key={key} className={`text-team-reference team-${token.team}`}>{token.value}</strong>;
				}
				return <React.Fragment key={key}>{token.value}</React.Fragment>;
			})}
		</>
	);
}
