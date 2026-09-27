import React from 'react';
import { ReferenceFields } from './ReferenceField.js';

type ReferenceCardProps = {
	header: React.ReactNode;
	children: React.ReactNode;
};

export function ReferenceCard(props: ReferenceCardProps): React.JSX.Element {
	const { header, children } = props;

	return (
		<article className="reference-card">
			<header className="reference-header">{header}</header>
			<ReferenceFields>{children}</ReferenceFields>
		</article>
	);
}
