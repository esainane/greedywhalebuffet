import React from 'react';

type DetailListStateProps = {
	loading: boolean;
	isEmpty: boolean;
	loadingText: string;
	emptyText: string;
	children: React.ReactNode;
};

export function DetailListState(props: DetailListStateProps): React.JSX.Element {
	const { loading, isEmpty, loadingText, emptyText, children } = props;

	if (loading) {
		return <p className="status">{loadingText}</p>;
	}

	if (isEmpty) {
		return <p className="status">{emptyText}</p>;
	}

	return <>{children}</>;
}
