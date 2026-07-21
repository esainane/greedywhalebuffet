import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GenerationOptions } from '../../types.js';
import { GENERATION_OPTIONS, getOptionDependencies } from '../../options.js';
import { useAppActions, useAppState } from '../context/AppContext.js';

type TooltipPosition = {
	top: number;
	left: number;
	width: number;
};

type HelpBubbleProps = {
	optionId: string;
	label: string;
	helpText: string;
};

function HelpBubble(props: HelpBubbleProps): React.JSX.Element {
	const { optionId, label, helpText } = props;
	const [isHovered, setIsHovered] = useState(false);
	const [isFocused, setIsFocused] = useState(false);
	const [isPinned, setIsPinned] = useState(false);
	const [position, setPosition] = useState<TooltipPosition | null>(null);
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const tooltipId = `${optionId}-help-text`;
	const isOpen = isPinned || isHovered || isFocused;

	const updatePosition = useCallback(() => {
		if (!triggerRef.current) {
			return;
		}

		const rect = triggerRef.current.getBoundingClientRect();
		const viewportPadding = 12;
		const maxWidth = Math.min(300, Math.max(220, window.innerWidth - viewportPadding * 2));
		const left = Math.min(
			Math.max(viewportPadding, rect.right - maxWidth),
			window.innerWidth - maxWidth - viewportPadding,
		);

		setPosition({
			top: rect.bottom + 8,
			left,
			width: maxWidth,
		});
	}, []);

	const onMouseEnter = useCallback(() => {
		setIsHovered(true);
		updatePosition();
	}, [updatePosition]);

	const onMouseLeave = useCallback(() => {
		setIsHovered(false);
	}, []);

	const onFocus = useCallback(() => {
		setIsFocused(true);
		updatePosition();
	}, [updatePosition]);

	const onBlur = useCallback(() => {
		setIsFocused(false);
	}, []);

	const onClick = useCallback(() => {
		if (isPinned) {
			setIsPinned(false);
			setIsFocused(false);
			triggerRef.current?.blur();
			return;
		}

		setIsPinned(true);
		updatePosition();
	}, [isPinned, updatePosition]);

	useEffect(() => {
		if (!isPinned) {
			return;
		}

		const onDocumentPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) {
				return;
			}

			if (triggerRef.current?.contains(target)) {
				return;
			}

			setIsPinned(false);
			setIsFocused(false);
			triggerRef.current?.blur();
		};

		const onDocumentKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') {
				return;
			}

			setIsPinned(false);
			setIsFocused(false);
			triggerRef.current?.blur();
		};

		document.addEventListener('pointerdown', onDocumentPointerDown);
		document.addEventListener('keydown', onDocumentKeyDown);

		return () => {
			document.removeEventListener('pointerdown', onDocumentPointerDown);
			document.removeEventListener('keydown', onDocumentKeyDown);
		};
	}, [isPinned]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const onViewportChange = () => {
			updatePosition();
		};

		window.addEventListener('resize', onViewportChange);
		window.addEventListener('scroll', onViewportChange, true);

		return () => {
			window.removeEventListener('resize', onViewportChange);
			window.removeEventListener('scroll', onViewportChange, true);
		};
	}, [isOpen, updatePosition]);

	return (
		<div className="help-bubble">
			<button
				type="button"
				className="help-trigger"
				ref={triggerRef}
				aria-label={`Help for ${label}`}
				aria-describedby={isOpen ? tooltipId : undefined}
				aria-expanded={isOpen}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				onFocus={onFocus}
				onBlur={onBlur}
				onClick={onClick}
			>
				?
			</button>
			{isOpen && position
				? createPortal(
						<div
							id={tooltipId}
							className="help-tooltip help-tooltip-layer"
							role="tooltip"
							style={{
								top: `${position.top}px`,
								left: `${position.left}px`,
								width: `${position.width}px`,
							}}
						>
							{helpText}
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}

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
								<HelpBubble optionId={option.id} label={option.label} helpText={option.helpText} />
							</div>
						);
					})}
				</form>
			</section>
		</div>
	);
}
