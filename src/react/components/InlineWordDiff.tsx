import React from 'react';

type DiffOp = {
	type: 'equal' | 'remove' | 'add';
	value: string;
};

type DiffRun = {
	type: DiffOp['type'];
	text: string;
};

type InlineWordDiffRun = DiffRun;

type InlineWordDiffProps = {
	before: string;
	after: string;
	emptyText?: string;
	extraClassNames?: string;
};

function tokenizeText(text: string): string[] {
	const tokens = text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu);
	return tokens ?? [];
}

function buildWordDiff(beforeTokens: string[], afterTokens: string[]): DiffOp[] {
	const rowCount = beforeTokens.length + 1;
	const columnCount = afterTokens.length + 1;
	const lcs: number[][] = Array.from({ length: rowCount }, () => Array<number>(columnCount).fill(0));

	for (let i = 1; i < rowCount; i++) {
		for (let j = 1; j < columnCount; j++) {
			if (beforeTokens[i - 1] === afterTokens[j - 1]) {
				lcs[i][j] = lcs[i - 1][j - 1] + 1;
				continue;
			}

			lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
		}
	}

	const diffOps: DiffOp[] = [];
	let i = beforeTokens.length;
	let j = afterTokens.length;

	while (i > 0 && j > 0) {
		if (beforeTokens[i - 1] === afterTokens[j - 1]) {
			diffOps.push({ type: 'equal', value: beforeTokens[i - 1] });
			i -= 1;
			j -= 1;
			continue;
		}

		if (lcs[i - 1][j] >= lcs[i][j - 1]) {
			diffOps.push({ type: 'remove', value: beforeTokens[i - 1] });
			i -= 1;
			continue;
		}

		diffOps.push({ type: 'add', value: afterTokens[j - 1] });
		j -= 1;
	}

	while (i > 0) {
		diffOps.push({ type: 'remove', value: beforeTokens[i - 1] });
		i -= 1;
	}

	while (j > 0) {
		diffOps.push({ type: 'add', value: afterTokens[j - 1] });
		j -= 1;
	}

	diffOps.reverse();
	return diffOps;
}

function normalizeDiffOps(diffOps: DiffOp[]): DiffOp[] {
	const normalized: DiffOp[] = [];
	let pendingEdits: DiffOp[] = [];

	const flushPendingEdits = (): void => {
		if (pendingEdits.length === 0) {
			return;
		}

		const removed = pendingEdits.filter((op) => op.type === 'remove');
		const added = pendingEdits.filter((op) => op.type === 'add');
		normalized.push(...removed, ...added);
		pendingEdits = [];
	};

	for (const op of diffOps) {
		if (op.type === 'equal') {
			flushPendingEdits();
			normalized.push(op);
			continue;
		}

		pendingEdits.push(op);
	}

	flushPendingEdits();
	return normalized;
}

function buildDiffRuns(diffOps: DiffOp[]): DiffRun[] {
	if (diffOps.length === 0) {
		return [];
	}

	const runs: DiffRun[] = [];
	let currentType: DiffOp['type'] = diffOps[0].type;
	let currentValues: string[] = [diffOps[0].value];

	for (let i = 1; i < diffOps.length; i++) {
		const op = diffOps[i];
		if (op.type === currentType) {
			currentValues.push(op.value);
			continue;
		}

		runs.push({ type: currentType, text: currentValues.join('') });
		currentType = op.type;
		currentValues = [op.value];
	}

	runs.push({ type: currentType, text: currentValues.join('') });
	return runs;
}

function isWhitespaceOnly(text: string): boolean {
	return /^\s+$/.test(text);
}

function startsWithWordChar(text: string): boolean {
	return /^[\p{L}\p{N}_]/u.test(text);
}

function startsWithLetter(text: string): boolean {
	return /^[\p{L}_]/u.test(text);
}

function endsWithWordChar(text: string): boolean {
	return /[\p{L}\p{N}_]$/u.test(text);
}

function shouldInsertSyntheticSpace(left: string, right: string): boolean {
	if (
		left.length === 0 ||
		right.length === 0 ||
		left.endsWith(' ') ||
		right.startsWith(' ')
	) {
		return false;
	}

	if (endsWithWordChar(left) && startsWithWordChar(right)) {
		return true;
	}

	const leftLast = left.at(-1);
	const rightFirst = right[0];

	if (leftLast === '&' && startsWithWordChar(right)) {
		return true;
	}

	if (endsWithWordChar(left) && rightFirst === '&') {
		return true;
	}

	if (leftLast === ',' && startsWithLetter(right)) {
		return true;
	}

	return false;
}

function combineFragments(fragments: string[]): string {
	if (fragments.length === 0) {
		return '';
	}

	let combined = fragments[0];
	for (let i = 1; i < fragments.length; i++) {
		const next = fragments[i];
		if (shouldInsertSyntheticSpace(combined, next)) {
			combined += ' ';
		}

		combined += next;
	}

	return combined;
}

function collapseWhitespaceEditClusters(runs: DiffRun[]): DiffRun[] {
	if (runs.length === 0) {
		return runs;
	}

	const collapsed: DiffRun[] = [];
	let i = 0;

	while (i < runs.length) {
		const current = runs[i];

		if (current.type === 'equal' && !isWhitespaceOnly(current.text)) {
			collapsed.push(current);
			i += 1;
			continue;
		}

		if (current.type === 'equal' && isWhitespaceOnly(current.text)) {
			collapsed.push(current);
			i += 1;
			continue;
		}

		const addFragments: string[] = [];
		const removeFragments: string[] = [];
		let lastEditType: 'add' | 'remove' | null = null;

		while (i < runs.length) {
			const run = runs[i];

			if (run.type === 'equal' && !isWhitespaceOnly(run.text)) {
				break;
			}

			if (run.type === 'add') {
				addFragments.push(run.text);
				lastEditType = 'add';
				i += 1;
				continue;
			}

			if (run.type === 'remove') {
				removeFragments.push(run.text);
				lastEditType = 'remove';
				i += 1;
				continue;
			}

			if (lastEditType === 'add') {
				addFragments.push(run.text);
			} else if (lastEditType === 'remove') {
				removeFragments.push(run.text);
			}

			i += 1;
		}

		const addText = combineFragments(addFragments);
		if (addText.length > 0) {
			collapsed.push({ type: 'add', text: addText });
		}

		const removeText = combineFragments(removeFragments);
		if (removeText.length > 0) {
			collapsed.push({ type: 'remove', text: removeText });
		}
	}

	return collapsed;
}

export function InlineWordDiff(props: InlineWordDiffProps): React.JSX.Element {
	const { before, after, emptyText = 'No text available.' } = props;
	const diffOps = buildInlineWordDiffRuns(before, after);

	if (diffOps.length === 0) {
		return <p>{emptyText}</p>;
	}

	return (
		<span className={`inline-word-diff${props.extraClassNames ? ` ${props.extraClassNames}` : ''}`}>
			{diffOps.map((op, index) => (
				<React.Fragment key={`${op.type}-${op.text}-${index}`}>
					{op.type === 'equal' ? <span>{op.text}</span> : null}
					{op.type === 'remove' ? <span className="diff-removed">{op.text}</span> : null}
					{op.type === 'add' ? <span className="diff-added">{op.text}</span> : null}
				</React.Fragment>
			))}
		</span>
	);
}

export function buildInlineWordDiffRuns(before: string, after: string): InlineWordDiffRun[] {
	const beforeTokens = tokenizeText(before);
	const afterTokens = tokenizeText(after);

	if (beforeTokens.length === 0 && afterTokens.length === 0) {
		return [];
	}

	return collapseWhitespaceEditClusters(
		buildDiffRuns(normalizeDiffOps(buildWordDiff(beforeTokens, afterTokens))),
	);
}
