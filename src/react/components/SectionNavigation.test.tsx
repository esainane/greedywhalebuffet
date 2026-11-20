import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { SectionNavigation } from './SectionNavigation.js';

afterEach(() => {
	cleanup();
	window.localStorage.clear();
	vi.unstubAllGlobals();
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

	it('opens the materialized changelog, highlights unseen releases, and records the latest version', async () => {
		const changelog = {
			schemaVersion: 1,
			releases: [
				{
					version: '3.0.6',
					status: 'unreleased',
					sections: [{ title: 'Options', changes: ['A **new** option.'] }],
				},
				{
					version: '3.0.5',
					status: 'released',
					date: '2026-11-07',
					sections: [{ title: 'Character Updated', changes: ['A previous change.'] }],
				},
			],
		};
		window.localStorage.setItem('gwb:changelog:last-seen-version', '3.0.5');
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify(changelog), { status: 200 })),
		);
		setup();

		const user = userEvent.setup();
		const trigger = screen.getAllByRole('button', { name: /changelog/i })[0];
		await user.click(trigger);

		const dialog = await screen.findByRole('dialog', { name: 'Changelog' });
		await screen.findByText('new');
		const releaseCards = dialog.querySelectorAll('.changelog-release');
		expect(trigger).toHaveClass('has-new-changes');
		expect(releaseCards[0].className).toContain('is-unseen');
		expect(releaseCards[1].className).not.toContain('is-unseen');
		expect(dialog.querySelector('.changelog-new-badge')).toBeInTheDocument();
		expect(window.localStorage.getItem('gwb:changelog:last-seen-version')).toBe('3.0.5');

		await user.click(screen.getByRole('button', { name: 'Close' }));
		expect(screen.queryByRole('dialog', { name: 'Changelog' })).not.toBeInTheDocument();
		expect(document.activeElement).toBe(trigger);
		expect(window.localStorage.getItem('gwb:changelog:last-seen-version')).toBe('3.0.6');

		await user.click(trigger);
		expect(screen.queryByText('New')).not.toBeInTheDocument();
	});

	it('highlights the navigation button on first visit without highlighting releases in the modal', async () => {
		const changelog = {
			schemaVersion: 1,
			releases: [
				{
					version: '3.0.6',
					status: 'unreleased',
					sections: [{ title: 'Options', changes: ['A new option.'] }],
				},
			],
		};
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify(changelog), { status: 200 })),
		);
		setup();

		const user = userEvent.setup();
		const [trigger] = await screen.findAllByRole('button', { name: /changelog, new changes/i });
		expect(trigger).toHaveClass('has-new-changes');

		await user.click(trigger);
		const dialog = await screen.findByRole('dialog', { name: 'Changelog' });
		expect(dialog.querySelector('.changelog-new-badge')).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Close' }));
		await waitFor(() => {
			expect(trigger).not.toHaveClass('has-new-changes');
		});
		expect(window.localStorage.getItem('gwb:changelog:last-seen-version')).toBe('3.0.6');
	});

	it('returns focus to the mobile navigation trigger after opening the changelog from its sheet', async () => {
		const changelog = {
			schemaVersion: 1,
			releases: [
				{
					version: '3.0.6',
					status: 'unreleased',
					sections: [{ title: 'Options', changes: ['A new option.'] }],
				},
			],
		};
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify(changelog), { status: 200 })),
		);
		setup();

		const user = userEvent.setup();
		const jumpTrigger = screen.getAllByRole('button', { name: /jump:/i })[0];
		await user.click(jumpTrigger);
		const mobileChangelogTrigger = screen.getAllByRole('button', { name: /changelog/i }).at(-1);
		if (!mobileChangelogTrigger) {
			throw new Error('Expected the mobile changelog navigation button');
		}
		await user.click(mobileChangelogTrigger);
		await screen.findByRole('dialog', { name: 'Changelog' });
		await user.keyboard('{Escape}');

		expect(document.activeElement).toBe(jumpTrigger);
	});
});
