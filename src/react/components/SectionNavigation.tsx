import React, { useEffect, useMemo, useRef, useState } from 'react';

type SectionItem = {
	id: string;
	label: string;
};

type SectionNavigationProps = {
	sections: readonly SectionItem[];
};

function useReducedMotionPreference(): boolean {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => {
			setPrefersReducedMotion(mediaQuery.matches);
		};

		sync();
		mediaQuery.addEventListener('change', sync);
		return () => {
			mediaQuery.removeEventListener('change', sync);
		};
	}, []);

	return prefersReducedMotion;
}

export function SectionNavigation(props: SectionNavigationProps): React.JSX.Element {
	const { sections } = props;
	const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? '');
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const prefersReducedMotion = useReducedMotionPreference();
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const dialogRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (sections.length === 0) {
			return;
		}

		const resolveActiveSectionFromViewport = () => {
			const sectionElements = sections
				.map((section) => document.getElementById(section.id))
				.filter((section): section is HTMLElement => section instanceof HTMLElement);

			if (sectionElements.length === 0) {
				return;
			}

			const viewportHeight = window.innerHeight;
			const viewportFocusY = viewportHeight * 0.4;
			const visibleSections = sectionElements.filter((element) => {
				const rect = element.getBoundingClientRect();
				return rect.bottom > 0 && rect.top < viewportHeight;
			});

			if (visibleSections.length === 0) {
				return;
			}

			let bestSectionId = visibleSections[0].id;
			let bestDistance = Number.POSITIVE_INFINITY;

			for (const element of visibleSections) {
				const rect = element.getBoundingClientRect();
				const distance = Math.abs(rect.top - viewportFocusY);
				if (distance < bestDistance) {
					bestDistance = distance;
					bestSectionId = element.id;
				}
			}

			setActiveSectionId(bestSectionId);
		};

		const updateFromHash = () => {
			const hash = window.location.hash.replace('#', '');
			if (!hash) {
				resolveActiveSectionFromViewport();
				return;
			}
			const match = sections.find((section) => section.id === hash);
			if (match) {
				setActiveSectionId(match.id);
				return;
			}
			resolveActiveSectionFromViewport();
		};

		let frame = 0;
		const updateFromScroll = () => {
			if (frame !== 0) {
				return;
			}

			frame = window.requestAnimationFrame(() => {
				frame = 0;
				resolveActiveSectionFromViewport();
			});
		};

		updateFromHash();
		window.addEventListener('hashchange', updateFromHash);
		window.addEventListener('popstate', updateFromHash);
		window.addEventListener('scroll', updateFromScroll, { passive: true });
		window.addEventListener('resize', updateFromScroll);

		return () => {
			if (frame !== 0) {
				window.cancelAnimationFrame(frame);
			}
			window.removeEventListener('hashchange', updateFromHash);
			window.removeEventListener('popstate', updateFromHash);
			window.removeEventListener('scroll', updateFromScroll);
			window.removeEventListener('resize', updateFromScroll);
		};
	}, [sections]);

	useEffect(() => {
		if (!isMobileMenuOpen) {
			return;
		}

		document.body.classList.add('section-nav-open');
		const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const dialog = dialogRef.current;
		const firstFocusTarget = dialog?.querySelector<HTMLElement>('[data-nav-dialog-focus]') ?? dialog;
		firstFocusTarget?.focus();

		const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				setIsMobileMenuOpen(false);
				return;
			}

			if (event.key !== 'Tab' || !dialogRef.current) {
				return;
			}

			const focusableElements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
				(element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
			);
			if (focusableElements.length === 0) {
				event.preventDefault();
				return;
			}

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];
			if (event.shiftKey && document.activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
			} else if (!event.shiftKey && document.activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		};

		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.body.classList.remove('section-nav-open');
			document.removeEventListener('keydown', onKeyDown);
			if (triggerRef.current) {
				triggerRef.current.focus();
			} else if (previousFocus) {
				previousFocus.focus();
			}
		};
	}, [isMobileMenuOpen]);

	const onNavigate = (sectionId: string) => {
		const element = document.getElementById(sectionId);
		if (!element) {
			return;
		}

		element.scrollIntoView({
			behavior: prefersReducedMotion ? 'auto' : 'smooth',
			block: 'start',
		});
		if (window.location.hash.replace('#', '') !== sectionId) {
			window.history.replaceState(null, '', `#${sectionId}`);
		}
		setActiveSectionId(sectionId);
		setIsMobileMenuOpen(false);
	};

	const activeLabel = useMemo(
		() => sections.find((section) => section.id === activeSectionId)?.label ?? sections[0]?.label,
		[activeSectionId, sections],
	);

	const closeMobileMenu = () => {
		setIsMobileMenuOpen(false);
	};

	return (
		<>
			<nav className="section-nav section-nav-desktop" aria-label="Panel navigation">
				<p className="section-nav-title">Navigate</p>
				{sections.map((section) => (
					<button
						key={section.id}
						type="button"
						className={`section-nav-link ${activeSectionId === section.id ? 'is-active' : ''}`}
						aria-current={activeSectionId === section.id ? 'location' : undefined}
						onClick={() => {
							onNavigate(section.id);
						}}
					>
						{section.label}
					</button>
				))}
			</nav>

			<nav className="section-nav section-nav-tablet" aria-label="Panel navigation">
				{sections.map((section) => (
					<button
						key={section.id}
						type="button"
						className={`section-nav-chip ${activeSectionId === section.id ? 'is-active' : ''}`}
						aria-current={activeSectionId === section.id ? 'location' : undefined}
						onClick={() => {
							onNavigate(section.id);
						}}
					>
						{section.label}
					</button>
				))}
			</nav>

			<div className="section-nav-mobile">
				<button
					type="button"
					className="section-nav-fab"
					ref={triggerRef}
					onClick={() => {
						setIsMobileMenuOpen((current) => !current);
					}}
					aria-expanded={isMobileMenuOpen}
					aria-controls="section-mobile-sheet"
				>
					Jump: {activeLabel}
				</button>
				{isMobileMenuOpen ? (
					<div
						className="section-nav-sheet-backdrop"
						data-testid="section-nav-sheet-backdrop"
						onClick={() => {
							closeMobileMenu();
						}}
					>
						<div
							id="section-mobile-sheet"
							className="section-nav-sheet"
							role="dialog"
							aria-modal="true"
							aria-label="Jump to section"
							ref={dialogRef}
							onClick={(event) => {
								event.stopPropagation();
							}}
						>
							<p className="section-nav-title">Jump to section</p>
							{sections.map((section) => (
								<button
									key={section.id}
									type="button"
									className={`section-nav-sheet-link ${activeSectionId === section.id ? 'is-active' : ''}`}
									onClick={() => {
										onNavigate(section.id);
									}}
								>
									{section.label}
								</button>
							))}
							<button
								type="button"
								className="section-nav-sheet-link"
								onClick={() => {
									onNavigate(sections[0]?.id ?? '');
								}}
							>
								Back to top
							</button>
							<button
								type="button"
								className="section-nav-close"
								data-nav-dialog-focus="true"
								onClick={() => {
									closeMobileMenu();
								}}
							>
								Close
							</button>
						</div>
					</div>
				) : null}
			</div>
		</>
	);
}
