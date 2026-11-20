import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type ChangelogSection = {
	title: string;
	changes: string[];
};

type ChangelogRelease = {
	version: string;
	status: 'released' | 'unreleased';
	date?: string;
	title?: string;
	sections: ChangelogSection[];
};

type MaterializedChangelog = {
	schemaVersion: 1;
	releases: ChangelogRelease[];
};

type ChangelogModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onNewChangesChange: (hasNewChanges: boolean) => void;
	triggerRef: React.RefObject<HTMLButtonElement | null>;
	fallbackFocusRef: React.RefObject<HTMLButtonElement | null>;
};

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const LAST_SEEN_VERSION_KEY = 'gwb:changelog:last-seen-version';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isMaterializedChangelog(value: unknown): value is MaterializedChangelog {
	return isRecord(value)
		&& value.schemaVersion === 1
		&& Array.isArray(value.releases)
		&& value.releases.length > 0
		&& value.releases.every((release) => {
			if (!isRecord(release) || typeof release.version !== 'string') {
				return false;
			}
			if (release.status !== 'released' && release.status !== 'unreleased') {
				return false;
			}
			if (release.date !== undefined && typeof release.date !== 'string') {
				return false;
			}
			if (release.title !== undefined && typeof release.title !== 'string') {
				return false;
			}
			return Array.isArray(release.sections)
				&& release.sections.every(
					(section) =>
						isRecord(section)
						&& typeof section.title === 'string'
						&& isStringArray(section.changes),
				);
		});
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function unseenReleaseVersions(
	changelog: MaterializedChangelog,
	lastSeenVersion: string | null,
): ReadonlySet<string> {
	if (lastSeenVersion === null) {
		return new Set();
	}

	const lastSeenIndex = changelog.releases.findIndex(
		(release) => release.version === lastSeenVersion,
	);
	const unseenReleases =
		lastSeenIndex === -1
			? changelog.releases
			: changelog.releases.slice(0, lastSeenIndex);
	return new Set(unseenReleases.map((release) => release.version));
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
	const tokenPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/gu;
	const rendered: React.ReactNode[] = [];
	let cursor = 0;

	for (const match of text.matchAll(tokenPattern)) {
		const index = match.index;
		if (index > cursor) {
			rendered.push(text.slice(cursor, index));
		}

		const key = `${index}-${match[0]}`;
		if (match[1] !== undefined && match[2] !== undefined) {
			rendered.push(
				<a key={key} href={match[2]} target="_blank" rel="noopener noreferrer">
					{match[1]}
				</a>,
			);
		} else if (match[3] !== undefined) {
			rendered.push(<strong key={key}>{match[3]}</strong>);
		} else if (match[4] !== undefined) {
			rendered.push(<code key={key}>{match[4]}</code>);
		} else if (match[5] !== undefined) {
			rendered.push(<em key={key}>{match[5]}</em>);
		}
		cursor = index + match[0].length;
	}

	if (cursor < text.length) {
		rendered.push(text.slice(cursor));
	}

	return rendered;
}

export function ChangelogModal(props: ChangelogModalProps): React.JSX.Element | null {
	const { isOpen, onClose, onNewChangesChange, triggerRef, fallbackFocusRef } = props;
	const [changelog, setChangelog] = useState<MaterializedChangelog | null>(null);
	const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(null);
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [loadError, setLoadError] = useState<string | null>(null);
	const [storageError, setStorageError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const dialogRef = useRef<HTMLDivElement | null>(null);
	const closeButtonRef = useRef<HTMLButtonElement | null>(null);
	const closeDialog = () => {
		if (changelog) {
			const latestVersion = changelog.releases[0].version;
			try {
				window.localStorage.setItem(LAST_SEEN_VERSION_KEY, latestVersion);
				setLastSeenVersion(latestVersion);
			} catch (error) {
				setStorageError(`Could not save the last-seen changelog version: ${errorMessage(error)}`);
			}
		}
		onClose();
	};
	const closeDialogRef = useRef(closeDialog);
	closeDialogRef.current = closeDialog;

	useEffect(() => {
		if (changelog) {
			return;
		}

		const controller = new AbortController();
		setLoadState('loading');
		setLoadError(null);
		setStorageError(null);

		const loadChangelog = async () => {
			try {
				const response = await fetch('./changelog.json', {
					cache: 'no-store',
					signal: controller.signal,
				});
				if (!response.ok) {
					throw new Error(`Changelog request failed (${response.status}).`);
				}

				const payload: unknown = await response.json();
				if (!isMaterializedChangelog(payload)) {
					throw new Error('The materialized changelog has an invalid format.');
				}

				let storedVersion: string | null = null;
				try {
					storedVersion = window.localStorage.getItem(LAST_SEEN_VERSION_KEY);
				} catch (error) {
					setStorageError(`Could not read the last-seen changelog version: ${errorMessage(error)}`);
				}

				setLastSeenVersion(storedVersion);
				setChangelog(payload);
				setLoadState('ready');
			} catch (error) {
				if (controller.signal.aborted) {
					return;
				}
				setLoadError(errorMessage(error));
				setLoadState('error');
			}
		};

		void loadChangelog();
		return () => {
			controller.abort();
		};
	}, [changelog, retryCount]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const previousFocus = document.activeElement instanceof HTMLElement
			? document.activeElement
			: null;
		const focusableSelector = 'button, a[href], [tabindex]:not([tabindex="-1"])';
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				closeDialogRef.current();
				return;
			}
			if (event.key !== 'Tab' || !dialogRef.current) {
				return;
			}

			const focusableElements = Array.from(
				dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
			).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
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

		document.body.classList.add('changelog-modal-open');
		closeButtonRef.current?.focus();
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.body.classList.remove('changelog-modal-open');
			document.removeEventListener('keydown', onKeyDown);
			if (triggerRef.current?.isConnected) {
				triggerRef.current.focus();
			} else if (fallbackFocusRef.current?.isConnected) {
				fallbackFocusRef.current.focus();
			} else {
				previousFocus?.focus();
			}
		};
	}, [fallbackFocusRef, isOpen, onClose, triggerRef]);

	const unseenVersions = useMemo(
		() => changelog ? unseenReleaseVersions(changelog, lastSeenVersion) : new Set<string>(),
		[changelog, lastSeenVersion],
	);
	const hasNewChanges = changelog !== null
		&& (lastSeenVersion === null || unseenVersions.size > 0);

	useEffect(() => {
		onNewChangesChange(hasNewChanges);
	}, [hasNewChanges, onNewChangesChange]);

	if (!isOpen) {
		return null;
	}

	return createPortal(
		<div
			className="changelog-modal-backdrop"
			data-testid="changelog-modal-backdrop"
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					closeDialog();
				}
			}}
		>
			<div
				id="changelog-dialog"
				className="changelog-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="changelog-dialog-title"
				ref={dialogRef}
			>
				<header className="changelog-modal-header">
					<div>
						<p className="eyebrow">Updates</p>
						<h2 id="changelog-dialog-title">Changelog</h2>
					</div>
					<button
						type="button"
						className="section-nav-close changelog-modal-close"
						ref={closeButtonRef}
						onClick={closeDialog}
					>
						Close
					</button>
				</header>

				{storageError ? <p className="status" data-tone="error" role="alert">{storageError}</p> : null}
				{loadState === 'error' ? (
					<div className="changelog-load-error" role="alert">
						<p>Could not load the changelog: {loadError}</p>
						<button
							type="button"
							className="secondary"
							onClick={() => {
								setRetryCount((count) => count + 1);
							}}
						>
							Retry
						</button>
					</div>
				) : null}
				{loadState === 'idle' || loadState === 'loading' ? (
					<p className="status" role="status">Loading changelog…</p>
				) : null}

				{changelog ? (
					<>
						<p className="changelog-summary">
							{unseenVersions.size > 0
								? `New changes since v${lastSeenVersion}.`
								: ''}
						</p>
						<div className="changelog-releases">
							{changelog.releases.map((release) => {
								const isUnseen = unseenVersions.has(release.version);
								return (
									<article
										key={release.version}
										className={`changelog-release${isUnseen ? ' is-unseen' : ''}`}
									>
										<header className="changelog-release-header">
											<div>
												<h3>v{release.version}</h3>
												{release.title ? <p>{release.title}</p> : null}
												{release.date ? <time>{release.date}</time> : null}
												{release.status === 'unreleased' ? <span>Unreleased</span> : null}
											</div>
											{isUnseen ? <span className="changelog-new-badge">New</span> : null}
										</header>
										{release.sections.map((section) => (
											<section key={section.title} className="changelog-section">
												<h4>{section.title}</h4>
												<ul>
													{section.changes.map((change, index) => (
														<li key={`${section.title}-${index}`}>
															{renderInlineMarkdown(change)}
														</li>
													))}
												</ul>
											</section>
										))}
									</article>
								);
							})}
						</div>
					</>
				) : null}
			</div>
		</div>,
		document.body,
	);
}
