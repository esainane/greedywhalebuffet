import React from 'react';

type ReferenceFieldProps = {
	label: string;
	labelClassName?: string;
	className?: string;
	alwaysShowLabel?: boolean;
	children: React.ReactNode;
};

type ReferenceFieldsProps = {
	children: React.ReactNode;
};

const ReferenceFieldLabelVisibilityContext = React.createContext(true);

export function ReferenceFields(props: ReferenceFieldsProps): React.JSX.Element {
	const fields = React.Children.toArray(props.children);

	return (
		<ReferenceFieldLabelVisibilityContext.Provider value={fields.length > 1}>
			<div className="reference-body">{fields}</div>
		</ReferenceFieldLabelVisibilityContext.Provider>
	);
}

export function ReferenceField(props: ReferenceFieldProps): React.JSX.Element {
	const { label, labelClassName, className, alwaysShowLabel = false, children } = props;
	const showLabels = React.useContext(ReferenceFieldLabelVisibilityContext);
	const labelClasses = ['reference-field-label', labelClassName].filter(Boolean).join(' ');
	const fieldClassName = ['reference-field', className]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={fieldClassName}>
			{showLabels || alwaysShowLabel ? <p className={labelClasses}>{label}</p> : null}
			{children}
		</div>
	);
}
