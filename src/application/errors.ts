export type ApplicationErrorCode =
	| 'load_failed'
	| 'preferences_unavailable'
	| 'preferences_parse_failed'
	| 'clipboard_unavailable'
	| 'clipboard_write_failed'
	| 'generation_failed';

export type ApplicationError = {
	code: ApplicationErrorCode;
	message: string;
	cause?: unknown;
};

export function asApplicationError(
	code: ApplicationErrorCode,
	fallbackMessage: string,
	cause: unknown,
): ApplicationError {
	if (cause instanceof Error && cause.message) {
		return { code, message: cause.message, cause };
	}

	return { code, message: fallbackMessage, cause };
}
