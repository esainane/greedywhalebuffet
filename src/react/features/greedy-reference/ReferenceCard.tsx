import React from 'react';

type ReferenceCardProps = {
	header: React.ReactNode;
	children: React.ReactNode;
	id?: string;
};

export function ReferenceCard(props: ReferenceCardProps): React.JSX.Element {
	const { header, children, id } = props;

	return (
		<article id={id} className="reference-card">
			<header className="reference-header">{header}</header>
			<div className="reference-body">{children}</div>
		</article>
	);
}
