import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { GreedyHomebrewDetail } from './GreedyHomebrewDetail.js';

afterEach(() => {
	cleanup();
	window.history.replaceState(null, '', window.location.pathname);
});

const almanac = {
	id: 'alpha',
	summary: { description: 'Alpha summary.', rules: ['Alpha rule.'] },
	howToRun: ['Run Alpha.'],
	howToRunExamples: ['If Alpha is selected, mark the chosen player.'],
	examples: ['Alpha example.'],
	tipsAndTricks: ['Alpha tip.'],
	opposingTips: ['Alpha should account for Gamma.'],
};

const characters = [
	{ name: 'Alpha', team: 'townsfolk' },
	{ name: 'Beta', team: 'townsfolk' },
	{ name: 'Gamma', team: 'demon' },
];

function item(id: string, name: string) {
	return {
		character: { id, name, team: 'townsfolk', imageUrl: `${id}.png` },
		ability: `${name} ability`,
		almanac: {
			...almanac,
			id,
			summary: { description: `${name} summary.`, rules: [`${name} rule.`] },
		},
	};
}

describe('GreedyHomebrewDetail', () => {
	it('renders sort switch without nested labels', () => {
		const html = renderToStaticMarkup(
			<GreedyHomebrewDetail
				items={[item('alpha', 'Alpha')]}
				characters={characters}
				loading={false}
				sortBySet={true}
				onSortBySetChange={() => {}}
			/>,
		);

		expect(html).toContain('greedier-sort-by-set-detail-label');
		expect(html.match(/<label/g)?.length ?? 0).toBeGreaterThan(0);
		expect(html).not.toContain('<label class="inline-switch-control"');
	});

	it('keeps abilities visible and permits only one expanded almanac', async () => {
		const user = userEvent.setup();
		render(
			<GreedyHomebrewDetail
				items={[item('alpha', 'Alpha'), item('beta', 'Beta')]}
				characters={characters}
				loading={false}
				sortBySet={true}
				onSortBySetChange={() => {}}
			/>,
		);

		expect(screen.getByText('Alpha ability')).toBeVisible();
		expect(screen.queryByRole('heading', { name: 'Summary' })).not.toBeInTheDocument();
		await user.click(screen.getAllByRole('button', { name: 'View almanac' })[0]);
		expect(screen.getByRole('heading', { name: 'Summary' }).parentElement).toHaveTextContent('Alpha summary.');
		expect(screen.getByRole('list', { name: 'How to Run examples' })).toHaveTextContent(
			'If Alpha is selected, mark the chosen player.',
		);
		expect(screen.getByRole('heading', { name: 'Examples' }).nextElementSibling).toHaveClass('almanac-example-banners');
		expect(screen.getByText('Gamma')).toHaveClass('team-demon');
		expect(window.location.hash).toBe('#almanac-alpha');

		await user.click(screen.getByRole('button', { name: 'View almanac' }));
		expect(screen.getAllByRole('heading', { name: 'Alpha' })).toHaveLength(1);
		expect(screen.getByRole('heading', { name: 'Summary' }).parentElement).toHaveTextContent('Beta summary.');
		expect(window.location.hash).toBe('#almanac-beta');
	});

	it('opens an asynchronously available hash target and closes back to the section hash', async () => {
		window.history.replaceState(null, '', '#almanac-alpha');
		const scrollIntoView = HTMLElement.prototype.scrollIntoView;
		HTMLElement.prototype.scrollIntoView = () => {};
		const view = render(
			<GreedyHomebrewDetail items={[]} characters={characters} loading={true} sortBySet={true} onSortBySetChange={() => {}} />,
		);
		view.rerender(
			<GreedyHomebrewDetail items={[item('alpha', 'Alpha')]} characters={characters} loading={false} sortBySet={true} onSortBySetChange={() => {}} />,
		);

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Summary' }).parentElement).toHaveTextContent('Alpha summary.');
		});
		await userEvent.click(screen.getByRole('button', { name: 'Hide almanac' }));
		expect(window.location.hash).toBe('#section-greedier-homebrew');
		HTMLElement.prototype.scrollIntoView = scrollIntoView;
	});

	it('normalizes the character name in the opposing-tips title', async () => {
		render(
			<GreedyHomebrewDetail
				items={[item('alpha', 'Alpha Ω')]}
				characters={[...characters, { name: 'Alpha Ω', team: 'townsfolk' }]}
				loading={false}
				sortBySet={true}
				onSortBySetChange={() => {}}
			/>,
		);

		await userEvent.click(screen.getByRole('button', { name: 'View almanac' }));
		expect(screen.getByRole('heading', { name: 'Bluffing as the Alpha' })).toBeVisible();
		expect(screen.queryByRole('heading', { name: /Bluffing as the Alpha Ω/ })).not.toBeInTheDocument();
	});
});
