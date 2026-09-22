import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RichText, normalizeCharacterName, tokenizeRichText } from './richText.js';

const characters = [
	{ name: 'Alpha Ω', team: 'townsfolk' },
	{ name: 'Alpha Wolf Ω', team: 'demon' },
	{ name: 'Storm Catcher', team: 'loric' },
	{ name: 'Angel', team: 'fabled' },
	{ name: 'Butcher', team: 'traveller' },
];

describe('normalizeCharacterName', () => {
	it('removes only a trailing Omega suffix and its preceding space', () => {
		expect(normalizeCharacterName('Alpha Ω')).toBe('Alpha');
		expect(normalizeCharacterName('Alpha Omega')).toBe('Alpha');
		expect(normalizeCharacterName('Omega Alpha')).toBe('Omega Alpha');
	});
});

describe('RichText', () => {
	it('emphasizes marked all-caps phrases and longest matching normalized character names', () => {
		const html = renderToStaticMarkup(
			<RichText
				text="Show *YOU ARE* to Alpha Wolf, then wake Alpha."
				characters={characters}
			/>,
		);

		expect(html).toContain('<strong>YOU ARE</strong>');
		expect(html).toContain('<strong class="text-character-reference team-demon">Alpha Wolf</strong>');
		expect(html).toContain('<strong class="text-character-reference team-townsfolk">Alpha</strong>');
		expect(html).not.toContain('*YOU ARE*');
	});

	it('emphasizes mixed-case marked text and avoids partial name matches', () => {
		expect(tokenizeRichText('*Not caps* and Alphabet', characters)).toEqual([
			{ kind: 'emphasis', value: 'Not caps' },
			{ kind: 'text', value: ' and Alphabet' },
		]);
	});

	it('recognizes lorics, Fabled, and travellers', () => {
		const html = renderToStaticMarkup(
			<RichText
				text="Angel protects the Alpha. Storm Catcher protects the Butcher."
				characters={characters}
			/>,
		);

		expect(html).toContain('<strong class="text-character-reference team-loric">Storm Catcher</strong>');
		expect(html).toContain('<strong class="text-character-reference team-fabled">Angel</strong>');
		expect(html).toContain('<strong class="text-character-reference team-traveller">Butcher</strong>');
	});
});
