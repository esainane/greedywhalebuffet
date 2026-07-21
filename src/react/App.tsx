import React from 'react';
import { AppProvider } from './context/AppContext.js';
import { ControlsPanel } from './components/ControlsPanel.js';
import { CharactersPanel } from './components/CharactersPanel.js';

function AppShell(): React.JSX.Element {
	return (
		<>
			<ControlsPanel />
			<CharactersPanel />
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
