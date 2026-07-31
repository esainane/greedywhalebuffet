import React from 'react';

type SwitchProps = {
	id: string;
	name: string;
	checked: boolean;
	disabled?: boolean;
	ariaLabelledBy?: string;
	dataOptionName?: string;
	onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function Switch(props: SwitchProps): React.JSX.Element {
	const { id, name, checked, disabled = false, ariaLabelledBy, dataOptionName, onChange } = props;

	return (
		<label className="switch" htmlFor={id}>
			<input
				id={id}
				name={name}
				type="checkbox"
				aria-labelledby={ariaLabelledBy}
				checked={checked}
				disabled={disabled}
				onChange={onChange}
				data-option-name={dataOptionName}
			/>
			<span className="slider" aria-hidden="true" />
		</label>
	);
}
