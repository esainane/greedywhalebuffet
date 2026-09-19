import React, { useMemo } from 'react';
import type { AlmanacCharacterReference } from '../../../types.js';

type AlmanacTextProps = {
	text: string;
	characters: readonly AlmanacCharacterReference[];
};

type AlmanacTextToken =
	| { kind: 'text'; value: string }
	| { kind: 'emphasis'; value: string }
	| { kind: 'character'; value: string; team: string };

export function normalizeCharacterName(name: string): string {
	return name.replace(/ (?:Ω|Omega)$/u, '');
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAllCapsPhrase(value: string): boolean {
	return /[A-Z]/.test(value) && value === value.toUpperCase();
}

export function tokenizeAlmanacText(
	text: string,
	characters: readonly AlmanacCharacterReference[],
): AlmanacTextToken[] {
	const characterByName = new Map<string, AlmanacCharacterReference>();
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
	const pattern = namesPattern
		? new RegExp(`\\*([^*]+)\\*|(?<![A-Za-z0-9])(${namesPattern})(?![A-Za-z0-9])`, 'gu')
		: /\*([^*]+)\*/gu;
	const tokens: AlmanacTextToken[] = [];
	let cursor = 0;

	for (const match of text.matchAll(pattern)) {
		const index = match.index;
		if (index > cursor) {
			tokens.push({ kind: 'text', value: text.slice(cursor, index) });
		}

		const emphasizedText = match[1];
		const characterName = match[2];
		if (emphasizedText !== undefined && isAllCapsPhrase(emphasizedText)) {
			tokens.push({ kind: 'emphasis', value: emphasizedText });
		} else if (characterName !== undefined) {
			tokens.push({
				kind: 'character',
				value: characterName,
				team: characterByName.get(characterName)?.team ?? '',
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

export function AlmanacText(props: AlmanacTextProps): React.JSX.Element {
	const { text, characters } = props;
	const tokens = useMemo(() => tokenizeAlmanacText(text, characters), [characters, text]);

	return (
		<>
			{tokens.map((token, index) => {
				const key = `${index}-${token.value}`;
				if (token.kind === 'emphasis') {
					return <strong key={key}>{token.value}</strong>;
				}
				if (token.kind === 'character') {
					return <strong key={key} className={`almanac-character-reference team-${token.team}`}>{token.value}</strong>;
				}
				return <React.Fragment key={key}>{token.value}</React.Fragment>;
			})}
		</>
	);
}
