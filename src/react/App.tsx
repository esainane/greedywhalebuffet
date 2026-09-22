import React from 'react';
import { AppProvider } from './context/AppContext.js';
import { ControlsPanel } from './features/controls/ControlsPanel.js';
import { CharactersPanel } from './features/characters/CharactersPanel.js';
import { GreedyReferencePanel } from './features/greedy-reference/GreedyReferencePanel.js';
import { CodeOfConductPanel } from './features/code-of-conduct/CodeOfConductPanel.js';
import { SectionNavigation } from './components/SectionNavigation.js';
import { useIsLoading } from './context/selectors.js';

const APP_SECTIONS = [
	{ id: 'section-generate', label: 'Generate & Options' },
	{ id: 'section-code-of-conduct', label: 'Code of Conduct' },
	{ id: 'section-characters', label: 'Characters' },
	{ id: 'section-greedy-characters', label: 'Greedy Characters' },
	{ id: 'section-greedy-jinxes', label: 'Greedy Jinxes' },
	{ id: 'section-greedier-homebrew', label: 'Greedier Homebrew' },
] as const;

function AppShell(): React.JSX.Element {
	const loading = useIsLoading();
	return (
		<div className={`app-layout${loading ? ' is-loading' : ''}`}>
			<SectionNavigation sections={APP_SECTIONS} />
			<div className="content-stack">
				<ControlsPanel />
				<CodeOfConductPanel />
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
