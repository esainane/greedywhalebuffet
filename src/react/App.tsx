import React from 'react';
import { AppProvider } from './context/AppContext.js';
import { ControlsPanel } from './features/controls/ControlsPanel.js';
import { CharactersPanel } from './features/characters/CharactersPanel.js';
import { GreedyReferencePanel } from './features/greedy-reference/GreedyReferencePanel.js';
import { SectionNavigation } from './components/SectionNavigation.js';

const APP_SECTIONS = [
	{ id: 'section-generate', label: 'Generate & Options' },
	{ id: 'section-characters', label: 'Characters' },
	{ id: 'section-greedy-characters', label: 'Greedy Characters' },
	{ id: 'section-greedy-jinxes', label: 'Greedy Jinxes' },
	{ id: 'section-greedier-homebrew', label: 'Greedier Homebrew' },
] as const;

function AppShell(): React.JSX.Element {
	return (
		<div className="app-layout">
			<SectionNavigation sections={APP_SECTIONS} />
			<div className="content-stack">
				<ControlsPanel />
				<CharactersPanel />
				<GreedyReferencePanel />
			</div>
		</div>
	);
}

export function App(): React.JSX.Element {
	return (
		<AppProvider>
			<AppShell />
		</AppProvider>
	);
}
