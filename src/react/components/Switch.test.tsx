import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Switch } from './Switch.js';

describe('Switch', () => {
	it('wires input id/name and optional aria-labelledby', () => {
		const html = renderToStaticMarkup(
			<Switch
				id="sort-toggle"
				name="sort-toggle"
				checked={false}
				ariaLabelledBy="sort-toggle-label"
				onChange={() => {}}
			/>,
		);

		expect(html).toContain('<label class="switch" for="sort-toggle">');
		expect(html).toContain('id="sort-toggle"');
		expect(html).toContain('name="sort-toggle"');
		expect(html).toContain('aria-labelledby="sort-toggle-label"');
	});
});
