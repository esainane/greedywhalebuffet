import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { SectionNavigation } from './SectionNavigation.js';

afterEach(() => {
	cleanup();
});

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {},
	}),
});

function setup() {
	const sections = [
		{ id: 'section-generate', label: 'Generate & Options' },
		{ id: 'section-characters', label: 'Characters' },
	];

	const view = render(<SectionNavigation sections={sections} />);
	return { sections, view };
}

describe('SectionNavigation', () => {
	it('updates the active section as viewport position changes on scroll', async () => {
		const sections = [
			{ id: 'section-generate', label: 'Generate & Options' },
			{ id: 'section-characters', label: 'Characters' },
		];

		const generateSection = document.createElement('section');
		generateSection.id = 'section-generate';
		const charactersSection = document.createElement('section');
		charactersSection.id = 'section-characters';
		document.body.append(generateSection, charactersSection);

		let scrolledToCharacters = false;
		Object.defineProperty(window, 'innerHeight', {
			value: 1000,
			writable: true,
			configurable: true,
		});

		generateSection.getBoundingClientRect = () =>
			scrolledToCharacters
				? ({ top: -850, bottom: -150 } as DOMRect)
				: ({ top: 80, bottom: 780 } as DOMRect);
		charactersSection.getBoundingClientRect = () =>
			scrolledToCharacters
				? ({ top: 120, bottom: 820 } as DOMRect)
				: ({ top: 760, bottom: 1460 } as DOMRect);

		render(<SectionNavigation sections={sections} />);

		await waitFor(() => {
			expect(screen.getAllByRole('button', { name: 'Generate & Options' })[0].className).toContain('is-active');
		});

		scrolledToCharacters = true;
		window.dispatchEvent(new Event('scroll'));
		await new Promise((resolve) => {
			window.requestAnimationFrame(() => {
				resolve(undefined);
			});
		});

		await waitFor(() => {
			expect(screen.getAllByRole('button', { name: 'Characters' })[0].className).toContain('is-active');
		});

		generateSection.remove();
		charactersSection.remove();
	});

	it('opens the mobile sheet and moves focus into it', async () => {
		setup();
		const user = userEvent.setup();
		const trigger = screen.getAllByRole('button', { name: /jump:/i })[0];
		await user.click(trigger);

		const dialog = screen.getByRole('dialog', { name: /jump to section/i });
		expect(dialog).toBeInTheDocument();
		expect(document.activeElement).toBe(screen.getByRole('button', { name: /close/i }));
	});

	it('closes on Escape and returns focus to the trigger', async () => {
		setup();
		const user = userEvent.setup();
		const trigger = screen.getAllByRole('button', { name: /jump:/i })[0];
		await user.click(trigger);
		await user.keyboard('{Escape}');

		expect(screen.queryByRole('dialog', { name: /jump to section/i })).not.toBeInTheDocument();
		expect(document.activeElement).toBe(trigger);
	});

	it('closes when the backdrop is clicked', async () => {
		setup();
		const user = userEvent.setup();
		const trigger = screen.getAllByRole('button', { name: /jump:/i })[0];
		await user.click(trigger);
		await user.click(screen.getByTestId('section-nav-sheet-backdrop'));

		expect(screen.queryByRole('dialog', { name: /jump to section/i })).not.toBeInTheDocument();
		expect(document.activeElement).toBe(trigger);
	});
});
