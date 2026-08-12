import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AlmanacText, normalizeCharacterName, tokenizeAlmanacText } from './almanacText.js';

const characters = [
	{ name: 'Alpha Ω', team: 'townsfolk' },
	{ name: 'Alpha Wolf Ω', team: 'demon' },
];

describe('normalizeCharacterName', () => {
	it('removes only a trailing Omega suffix and its preceding space', () => {
		expect(normalizeCharacterName('Alpha Ω')).toBe('Alpha');
		expect(normalizeCharacterName('Alpha Omega')).toBe('Alpha');
		expect(normalizeCharacterName('Omega Alpha')).toBe('Omega Alpha');
	});
});

describe('AlmanacText', () => {
	it('emphasizes marked all-caps phrases and longest matching normalized character names', () => {
		const html = renderToStaticMarkup(
			<AlmanacText
				text="Show *YOU ARE* to Alpha Wolf, then wake Alpha."
				characters={characters}
			/>,
		);

		expect(html).toContain('<strong>YOU ARE</strong>');
		expect(html).toContain('<strong class="almanac-character-reference team-demon">Alpha Wolf</strong>');
		expect(html).toContain('<strong class="almanac-character-reference team-townsfolk">Alpha</strong>');
		expect(html).not.toContain('*YOU ARE*');
	});

	it('preserves asterisk pairs that are not all caps and avoids partial name matches', () => {
		expect(tokenizeAlmanacText('*Not caps* and Alphabet', characters)).toEqual([
			{ kind: 'text', value: '*Not caps*' },
			{ kind: 'text', value: ' and Alphabet' },
		]);
	});
});
