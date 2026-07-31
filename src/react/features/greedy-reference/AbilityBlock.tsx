import React from 'react';

type AbilityBlockProps = {
	label: string;
	labelClassName?: string;
	children: React.ReactNode;
};

export function AbilityBlock(props: AbilityBlockProps): React.JSX.Element {
	const { label, labelClassName, children } = props;
	const className = ['ability-label', labelClassName].filter(Boolean).join(' ');

	return (
		<div className="ability-block">
			<p className={className}>{label}</p>
			{children}
		</div>
	);
}
