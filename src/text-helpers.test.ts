import { describe, expect, it } from 'vitest';
import { normalizeCharacterName } from './text-helpers.js';

describe('normalizeCharacterName', () => {
	it('removes only a trailing Omega suffix and its preceding space', () => {
		expect(normalizeCharacterName('Alpha Ω')).toBe('Alpha');
		expect(normalizeCharacterName('Omega Alpha')).toBe('Omega Alpha');
	});
});
