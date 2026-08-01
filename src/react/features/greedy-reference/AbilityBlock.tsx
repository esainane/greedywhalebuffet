import React from 'react';

type AbilityBlockProps = {
	label: string;
	labelClassName?: string;
	className?: string;
	children: React.ReactNode;
};

export function AbilityBlock(props: AbilityBlockProps): React.JSX.Element {
	const { label, labelClassName, className, children } = props;
	const labelClasses = ['ability-label', labelClassName].filter(Boolean).join(' ');
	const blockClassName = ['ability-block', className].filter(Boolean).join(' ');

	return (
		<div className={blockClassName}>
			<p className={labelClasses}>{label}</p>
			{children}
		</div>
	);
}
