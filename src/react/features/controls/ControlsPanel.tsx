import React, { useCallback } from 'react';
import type { GenerationOptions } from '../../../types.js';
import type { GenerationOptionName } from '../../../options.js';
import { GENERATION_OPTIONS, getOptionDependencies } from '../../../options.js';
import { BOTC_SCRIPT_ENTRY_LIMIT } from '../../../constants.js';
import { HelpBubble } from '../../components/HelpBubble.js';
import { Switch } from '../../components/Switch.js';
import { useAppActions } from '../../context/AppContext.js';
import {
	useCharacterView,
	useGenerationDerivedState,
	useIsLoading,
	usePreferencesView,
	useSelectedCharacterIds,
	useStatus,
} from '../../context/selectors.js';

function optionIsEnabled(optionName: GenerationOptionName, options: GenerationOptions): boolean {
	const dependencies = getOptionDependencies(optionName);
	if (dependencies.length === 0) {
		return true;
	}

	return dependencies.every((dependencyName) => Boolean(options[dependencyName]));
}

export function ControlsPanel(): React.JSX.Element {
	const actions = useAppActions();
	const loading = useIsLoading();
	const status = useStatus();
	const {
		displayScriptName: displayedScriptName,
		generationResult,
		unsatisfiedDependencyCharacterIds,
	} = useGenerationDerivedState();
	const { visibleCharacters: characters } = useCharacterView();
	const { options } = usePreferencesView();
	const selectedCharacterIds = useSelectedCharacterIds();
	const availableCharacterCount = characters.length;
	const enabledVisibleCharacterCount = characters.filter((character) =>
		selectedCharacterIds.has(character.id),
	).length;
	const deselectedCharacterCount = availableCharacterCount - enabledVisibleCharacterCount;
	const dependencyRemovedCharacterCount = characters.filter(
		(character) =>
			selectedCharacterIds.has(character.id) &&
			unsatisfiedDependencyCharacterIds.has(character.id),
	).length;
	const exportedEntryCount = generationResult?.script.length ?? 0;
	const charactersToRemove = Math.max(0, exportedEntryCount - BOTC_SCRIPT_ENTRY_LIMIT);

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

	const onReset = useCallback(() => {
		actions.resetPreferences();
	}, [actions]);

	return (
		<section
			id="section-generate"
			className="panel controls-layout"
			aria-label="Generate and options"
		>
			<p className="eyebrow">Generate</p>
			<div className="controls-content">
				<section className="status-copy-panel">
					<form id="copy-form" className="copy-form" onSubmit={onSubmit}>
						<div className="actions">
							<button
								id="copy-button"
								type="submit"
								disabled={loading}
								aria-describedby={charactersToRemove > 0 ? 'script-size-warning' : undefined}
							>
								{charactersToRemove > 0 ? (
									<svg
										className="copy-warning-icon"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path d="M12 3 2.5 20h19L12 3Z" />
										<path d="M12 9v5M12 17.5v.5" />
									</svg>
								) : null}
								Copy JSON to clipboard
							</button>
							<button
								id="reload-button"
								type="button"
								className="secondary"
								disabled={loading}
								onClick={onReload}
							>
								Reload
							</button>
							<button
								id="reset-button"
								type="button"
								className="danger"
								disabled={loading}
								onClick={onReset}
							>
								Reset
							</button>
						</div>
					</form>

					<dl className="meta" id="meta">
						<div className="meta-script-name">
							<dt>Name</dt>
							<dd id="script-name">{displayedScriptName}</dd>
						</div>
						<div>
							<dt>Available</dt>
							<dd id="available-character-count">{availableCharacterCount}</dd>
						</div>
						<div>
							<dt>Enabled</dt>
							<dd id="character-count">{enabledVisibleCharacterCount}</dd>
						</div>
						<div>
							<dt>Deselected</dt>
							<dd id="deselected-character-count">{deselectedCharacterCount}</dd>
						</div>
						<div>
							<dt>Blocked</dt>
							<dd id="dependency-removed-character-count">{dependencyRemovedCharacterCount}</dd>
						</div>
					</dl>

					<p id="status" className="status" data-tone={status.tone} aria-live="polite">
						{status.message}
					</p>
					{charactersToRemove > 0 ? (
						<p
							id="script-size-warning"
							className="status"
							data-tone="warning"
							role="alert"
						>
							There are too many characters selected, and the BotC App will refuse it. Remove at
							least {charactersToRemove} more {charactersToRemove === 1 ? 'character' : 'characters'}
							{' '}for the BotC App to accept it.
						</p>
					) : null}
				</section>

				<section className="panel options-panel">
					<p className="eyebrow">Options</p>
					<form className="copy-form">
						{GENERATION_OPTIONS.map((option) => {
							const checked = options[option.name];
							const isEnabled = optionIsEnabled(option.name, options);
							const optionLabelId = `${option.id}-label`;

							return (
								<div
									key={option.id}
									className={`toggle ${isEnabled ? '' : 'is-disabled'}`}
									data-dependencies={option.dependsOn?.join(',')}
								>
									<div className="toggle-main">
										<span id={optionLabelId} className="toggle-label">{option.label}</span>
										<Switch
											id={option.id}
											name={option.id}
											ariaLabelledBy={optionLabelId}
											checked={checked}
											disabled={!isEnabled}
											dataOptionName={option.name}
											onChange={(event) => {
												actions.toggleOption(option.name, event.currentTarget.checked);
											}}
										/>
									</div>
									<HelpBubble optionId={option.id} label={option.label} helpText={option.helpText} />
								</div>
							);
						})}
					</form>
				</section>
			</div>
		</section>
	);
}
