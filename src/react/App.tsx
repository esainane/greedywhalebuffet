import React from 'react';
import { AppProvider } from './context/AppContext.js';
import { ControlsPanel } from './components/ControlsPanel.js';
import { CharactersPanel } from './components/CharactersPanel.js';
import { GreedyReferencePanel } from './components/GreedyReferencePanel.js';

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
