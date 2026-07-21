import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './react/App';

const rootElement = document.querySelector('#app-root');
if (!(rootElement instanceof HTMLElement)) {
	throw new Error('Expected #app-root to be present in the document.');
}

createRoot(rootElement).render(
	React.createElement(
		React.StrictMode,
		null,
		React.createElement(App, null),
	),
);
