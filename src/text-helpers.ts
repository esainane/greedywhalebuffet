export function normalizeCharacterName(name: string): string {
	return name.replace(/ Ω$/u, '');
}
