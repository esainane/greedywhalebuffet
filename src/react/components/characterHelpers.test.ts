import { describe, expect, it } from 'vitest';
import { splitAbilityText } from './characterHelpers.js';

describe('splitAbilityText', () => {
	it('leaves ability text intact when there is no trailing setup effect', () => {
		expect(splitAbilityText('Each night, choose a player.')).toEqual({
			mainText: 'Each night, choose a player.',
			setupText: '',
		});
	});

	it('splits a single trailing setup bracket block', () => {
		expect(splitAbilityText('You start knowing 3 bluffs. [+1 Outsider]')).toEqual({
			mainText: 'You start knowing 3 bluffs.',
			setupText: '[+1 Outsider]',
		});
	});

	it('splits multiple trailing setup bracket blocks', () => {
		expect(splitAbilityText('You have no ability. [+1 Outsider] [Drunk in play]')).toEqual({
			mainText: 'You have no ability.',
			setupText: '[+1 Outsider] [Drunk in play]',
		});
	});

	it('does not split bracketed content that is not at the end', () => {
		expect(splitAbilityText('[Info] You are sober and healthy. Each night, choose a player.')).toEqual({
			mainText: '[Info] You are sober and healthy. Each night, choose a player.',
			setupText: '',
		});
	});
});
