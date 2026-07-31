import React from 'react';
import { AppProvider } from './context/AppContext.js';
import { ControlsPanel } from './features/controls/ControlsPanel.js';
import { CharactersPanel } from './features/characters/CharactersPanel.js';
import { GreedyReferencePanel } from './features/greedy-reference/GreedyReferencePanel.js';

function AppShell(): React.JSX.Element {
	return (
		<>
			<ControlsPanel />
			<CharactersPanel />
			<GreedyReferencePanel />
		</>
	);
}

export function App(): React.JSX.Element {
	return (
		<AppProvider>
			<AppShell />
		</AppProvider>
	);
}
