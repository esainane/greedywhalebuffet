import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type TooltipPosition = {
	top: number;
	left: number;
	width: number;
};

export type HelpBubbleProps = {
	optionId: string;
	label: string;
	helpText: string;
};

export function HelpBubble(props: HelpBubbleProps): React.JSX.Element {
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
			window.innerWidth - maxWidth - viewportPadding
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
					document.body
				)
				: null}
		</div>
	);
}
