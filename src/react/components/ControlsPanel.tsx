import React, { useCallback } from 'react';
import type { GenerationOptions } from '../../types.js';
import { GENERATION_OPTIONS, getOptionDependencies } from '../../options.js';
import { useAppActions, useAppState } from '../context/AppContext.js';

function optionIsEnabled(optionId: string, options: GenerationOptions): boolean {
	const dependencies = getOptionDependencies(optionId);
	if (dependencies.length === 0) {
		return true;
	}

	return dependencies.every((dependencyId) => {
		const option = GENERATION_OPTIONS.find((entry) => entry.id === dependencyId);
		if (!option) {
			return false;
		}
		return Boolean(options[option.name]);
	});
}

export function ControlsPanel(): React.JSX.Element {
	const state = useAppState();
	const actions = useAppActions();

	const onSubmit = useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			await actions.copyToClipboard();
		},
		[actions],
	);

	const onReload = useCallback(async () => {
		await actions.reload();
	}, [actions]);

	return (
		<div className="controls-layout">
			<section className="panel status-copy-panel">
				<p className="eyebrow">Generate</p>
				<form id="copy-form" className="copy-form" onSubmit={onSubmit}>
					<div className="actions">
						<button id="copy-button" type="submit" disabled={state.loading}>
							Copy JSON to clipboard
						</button>
						<button
							id="reload-button"
							type="button"
							className="secondary"
							disabled={state.loading}
							onClick={onReload}
						>
							Reload
						</button>
					</div>
				</form>

				<dl className="meta" id="meta">
					<div>
						<dt>Name</dt>
						<dd id="script-name">{state.scriptName}</dd>
					</div>
					<div>
						<dt>Enabled characters</dt>
						<dd id="character-count">{state.selectedCharacterIds.size}</dd>
					</div>
				</dl>

				<p id="status" className="status" data-tone={state.statusTone} aria-live="polite">
					{state.status}
				</p>
			</section>

			<section className="panel options-panel">
				<p className="eyebrow">Options</p>
				<form className="copy-form">
					{GENERATION_OPTIONS.map((option) => {
						const checked = state.options[option.name];
						const isEnabled = optionIsEnabled(option.id, state.options);
						const optionLabelId = `${option.id}-label`;

						return (
							<div
								key={option.id}
								className={`toggle ${isEnabled ? '' : 'is-disabled'}`}
								data-dependencies={option.dependsOn?.join(',')}
							>
								<div className="toggle-main">
									<span id={optionLabelId} className="toggle-label">{option.label}</span>
									<label className="switch" htmlFor={option.id}>
										<input
											id={option.id}
											name={option.id}
											type="checkbox"
											aria-labelledby={optionLabelId}
											checked={checked}
											disabled={!isEnabled}
											onChange={(event) => {
												actions.toggleOption(option.name, event.currentTarget.checked);
											}}
											data-option-name={option.name}
										/>
										<span className="slider" aria-hidden="true" />
									</label>
								</div>
								<div className="help-bubble">
									<button
										type="button"
										className="help-trigger"
										aria-label={`Help for ${option.label}`}
										aria-describedby={`${option.id}-help-text`}
									>
										?
									</button>
									<span id={`${option.id}-help-text`} className="help-tooltip" role="tooltip">
										{option.helpText}
									</span>
								</div>
							</div>
						);
					})}
				</form>
			</section>
		</div>
	);
}
