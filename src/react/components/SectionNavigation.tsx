import React, { useEffect, useMemo, useState } from 'react';

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

	useEffect(() => {
		if (sections.length === 0) {
			return;
		}

		const sectionElements = sections
			.map((section) => document.getElementById(section.id))
			.filter((section): section is HTMLElement => section instanceof HTMLElement);

		if (sectionElements.length === 0) {
			return;
		}

		const resolveActiveSectionFromScrollPosition = () => {
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
				resolveActiveSectionFromScrollPosition();
				return;
			}
			const match = sections.find((section) => section.id === hash);
			if (match) {
				setActiveSectionId(match.id);
				return;
			}
			resolveActiveSectionFromScrollPosition();
		};

		let frame = 0;
		const updateFromScroll = () => {
			if (frame !== 0) {
				return;
			}

			frame = window.requestAnimationFrame(() => {
				frame = 0;
				resolveActiveSectionFromScrollPosition();
			});
		};

		const observer = new IntersectionObserver(
			(entries) => {
				const visibleEntries = entries
					.filter((entry) => entry.isIntersecting)
					.sort((left, right) => right.intersectionRatio - left.intersectionRatio);

				if (visibleEntries.length === 0) {
					return;
				}

				const topEntry = visibleEntries[0];
				if (!(topEntry.target instanceof HTMLElement)) {
					return;
				}
				setActiveSectionId(topEntry.target.id);
			},
			{
				root: null,
				rootMargin: '-18% 0px -65% 0px',
				threshold: [0.2, 0.45, 0.7],
			},
		);

		for (const element of sectionElements) {
			observer.observe(element);
		}

		updateFromHash();
		window.addEventListener('hashchange', updateFromHash);
		window.addEventListener('popstate', updateFromHash);
		window.addEventListener('scroll', updateFromScroll, { passive: true });
		window.addEventListener('resize', updateFromScroll);

		return () => {
			if (frame !== 0) {
				window.cancelAnimationFrame(frame);
			}
			observer.disconnect();
			window.removeEventListener('hashchange', updateFromHash);
			window.removeEventListener('popstate', updateFromHash);
			window.removeEventListener('scroll', updateFromScroll);
			window.removeEventListener('resize', updateFromScroll);
		};
	}, [sections]);

	useEffect(() => {
		if (!activeSectionId) {
			return;
		}
		window.history.replaceState(null, '', `#${activeSectionId}`);
	}, [activeSectionId]);

	const onNavigate = (sectionId: string) => {
		const element = document.getElementById(sectionId);
		if (!element) {
			return;
		}

		element.scrollIntoView({
			behavior: prefersReducedMotion ? 'auto' : 'smooth',
			block: 'start',
		});
		setActiveSectionId(sectionId);
		setIsMobileMenuOpen(false);
	};

	const activeLabel = useMemo(
		() => sections.find((section) => section.id === activeSectionId)?.label ?? sections[0]?.label,
		[activeSectionId, sections],
	);

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
					onClick={() => {
						setIsMobileMenuOpen((current) => !current);
					}}
					aria-expanded={isMobileMenuOpen}
					aria-controls="section-mobile-sheet"
				>
					Jump: {activeLabel}
				</button>
				{isMobileMenuOpen ? (
					<div className="section-nav-sheet-backdrop">
						<div id="section-mobile-sheet" className="section-nav-sheet" role="dialog" aria-label="Jump to section">
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
								onClick={() => {
									setIsMobileMenuOpen(false);
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
