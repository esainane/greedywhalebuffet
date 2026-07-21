const DUPLICATE_LINE = 'Duplicate characters might be in play.';
const REMOVED_CHARACTERS_PREFIX = 'The following characters are not available: ';

const GREEDY_JSON_URL = './greedy.json';
const GREEDY_JINX_JSON_URL = './greedy_jinxes.json';

const ID_MAPPINGS_JSON_URL = './id_mappings.json';

const ROLES_JSON_URL = './roles.json';
const NIGHTSHEET_JSON_URL = './nightsheet.json';
const JINX_JSON_URL = './jinxes.json';

const FILTERABLE_TEAMS = new Set(['townsfolk', 'outsider', 'minion', 'demon']);
const COMMON_BANS = [
	'alchemist_popppp',
	'atheist',
	'bountyhunter',
	'cultleader_popppp',
	'philosopher_ultimate',
	'poppygrower_popppp',
	'snakecharmer',
	'heretic_popppp',
	'goon',
	'pithag_ultimate',
	'wizard_popppp',
	'legion_popppp',
	'leviathan_popppp',
	'riot_popppp',
	'zombuul'
];

type IdMappings = Record<string, string>;

type MetaEntry = {
	id?: string;
	name?: string;
	bootlegger?: string[];
};

type CharacterEntry = {
	id: string;
	name?: string;
	image?: string[];
	team?: string;
	jinxes?: { id: string, reason: string }[];
	[key: string]: unknown;
};

type JinxEntry = {
	id: string;
	jinx?: { id: string, reason: string }[];
};

type ScriptData = (MetaEntry | CharacterEntry | string)[];

type NightsheetData = {
	firstNight: [string];
	otherNight: [string];
};

type Character = {
	id: string;
	name: string;
	imageUrl?: string | string[];
};

type GenerationOptions = {
	appendDuplicateLine: boolean;
	alejoRules: boolean;
	listOfficialJinxes: boolean;
	revertRecluseMarionetteJinx: boolean;
	listGreedyJinxes: boolean;
};

function requireElement<T extends Element>(selector: string, ctor: { new(): T }): T {
	const element = document.querySelector(selector);

	if (!(element instanceof ctor)) {
		throw new Error(`Expected element ${selector} to be a ${ctor.name}.`);
	}

	return element;
}

const form = requireElement('#copy-form', HTMLFormElement);
const appendDuplicateLineInput = requireElement('#append-duplicate-line', HTMLInputElement);
const alejoRulesInput = requireElement('#alejo-rules', HTMLInputElement);
const listOfficialJinxesInput = requireElement('#list-official-jinxes', HTMLInputElement);
const revertRecluseMarionetteJinxInput = requireElement('#revert-recluse-marionette-jinx', HTMLInputElement);
const listGreedyJinxesInput = requireElement('#list-greedy-jinxes', HTMLInputElement);
const reloadButton = requireElement('#reload-button', HTMLButtonElement);
const statusElement = requireElement('#status', HTMLParagraphElement);
const scriptName = requireElement('#script-name', HTMLElement);
const characterCount = requireElement('#character-count', HTMLElement);
const quickRemoveList = requireElement('#quick-remove-list', HTMLDivElement);
const characterList = requireElement('#character-list', HTMLDivElement);

const allOptionInputs = [
	appendDuplicateLineInput,
	alejoRulesInput,
	listOfficialJinxesInput,
	revertRecluseMarionetteJinxInput,
	listGreedyJinxesInput,
];

const officialJinxDependentInputs = [
	revertRecluseMarionetteJinxInput,
];

const CUSTOM_CHARACTER_ID_SUFFIX = '_custom';

let greedyJson: ScriptData | null = null;
let greedyJinxData: JinxEntry[] | null = null;

/// Greedy custom ID -> TPI ID
let greedyToBaseID: IdMappings | null = null;
/// TPI ID -> Greedy custom ID
let baseToGreedyID: IdMappings | null = null;

let rolesData: CharacterEntry[] | null = null;
let nightsheetData: NightsheetData | null = null;
let jinxData: JinxEntry[] | null = null;
// TPI ID -> Auto custom ID
let baseToAutoID: IdMappings = {};
// Auto custom ID -> TPI ID
let autoToBaseID: IdMappings = {};

const selectedCharacterIds = new Set<string>();

function setStatus(message: string, tone: 'info' | 'success' | 'error' = 'info'): void {
	statusElement.textContent = message;
	statusElement.dataset.tone = tone;
}

function cloneJson(value: ScriptData): ScriptData {
	return structuredClone(value);
}

function getMetaEntry(data: ScriptData): MetaEntry | null {
	return Array.isArray(data) ? data[0] as MetaEntry ?? null : null;
}

function getImageArray(entry: CharacterEntry): string[] {
	const roleImage = entry.image;
	const team = entry?.team as string | undefined;
	if (!team || !FILTERABLE_TEAMS.has(team)) {
		throw new Error(`Could not find valid team for character ${entry.id}: ${team}`);
	}
	if (typeof roleImage === 'string') {
		return [roleImage];
	} else if (Array.isArray(roleImage)) {
		return roleImage;
	}
	// Fallback to Klutzbanana URL
	// Work out whether to ask for g or e as the standard image
	const baseId = getBaseCharacterId(entry.id);
	const [ teamId, otherId ] = ['townsfolk', 'outsider'].includes(team) ? ['g', 'e'] : ['e', 'g'];
	return [
		`https://images.klutzbanana.com/characters_official/${baseId}_${teamId}.png`,
		`https://images.klutzbanana.com/characters_official/${baseId}_${otherId}.png`
	];
}

function getCharacters(data: ScriptData, roles: CharacterEntry[] | null): Character[] {
	const characters: Character[] = [];

	for (let i = 1; i < data.length; i++) {
		const entry = data[i];

		if (typeof entry === 'string') {
			// Simple string ID - look up in roles.json
			const roleEntry = roles?.find(r => r.id === entry);
			const team = roleEntry?.team as string | undefined;

			// Only include if team is valid
			if (!roleEntry || !team || !FILTERABLE_TEAMS.has(team)) {
				continue;
			}

			characters.push({
				id: entry,
				name: roleEntry?.name || (entry.charAt(0).toUpperCase() + entry.slice(1)),
				imageUrl: getImageArray(roleEntry)[0],
			});
		} else if (typeof entry === 'object' && entry !== null) {
			const charEntry = entry as CharacterEntry;

			// Skip the "Choose your characters" pseudo-character
			if (charEntry.id === 'choose_your_chars') {
				continue;
			}

			// Only include characters with valid team types
			if (!charEntry.team || !FILTERABLE_TEAMS.has(charEntry.team)) {
				continue;
			}

			const imageUrl = Array.isArray(charEntry.image) ? charEntry.image[0] : undefined;
			characters.push({
				id: charEntry.id,
				name: charEntry.name || charEntry.id,
				imageUrl,
			});
		}
	}

	return characters;
}

function splitCharactersByCommonBans(characters: Character[]): { quickRemove: Character[]; remaining: Character[] } {
	const quickRemove: Character[] = [];
	const remaining: Character[] = [];

	for (const character of characters) {
		if (COMMON_BANS.includes(character.id)) {
			quickRemove.push(character);
		} else {
			remaining.push(character);
		}
	}

	return { quickRemove, remaining };
}

function getBaseCharacterId(id: string): string {
	return greedyToBaseID![id] ?? autoToBaseID[id] ?? id;
}

function getCustomCharacterId(id: string): string {
	const baseId = getBaseCharacterId(id);
	if (baseId in baseToGreedyID!) {
		return baseToGreedyID![baseId];
	}
	return baseToGreedyID![baseId] ?? baseToAutoID[baseId] ?? `${baseId}${CUSTOM_CHARACTER_ID_SUFFIX}`;
}

function nightOrder(id: string, ordering: string[]): number | undefined {
	const baseId = getBaseCharacterId(id);
	const pos = ordering.indexOf(baseId);
	if (pos === -1) {
		return undefined;
	}
	return pos + 1;
}

function firstNightOrder(id: string): number | undefined {
	return nightOrder(id, nightsheetData?.firstNight ?? []);
}

function otherNightOrder(id: string): number | undefined {
	return nightOrder(id, nightsheetData?.otherNight ?? []);
}

function findOrExpandCharacter(id: string, data: ScriptData): CharacterEntry | null {
	const baseId = getBaseCharacterId(id);
	const customId = getCustomCharacterId(baseId);

	const needle = [id, baseId, customId];

	// Return existing full object if already expanded (base or custom ID).
	const existing = data.find(
		(entry) =>
			typeof entry === 'object' &&
			entry !== null &&
			'id' in entry &&
			needle.includes((entry as CharacterEntry).id)
	) as CharacterEntry | undefined;
	if (existing) {
		return existing;
	}

	// Find the string entry index (supports base and custom ID calls).
	const index = data.findIndex((d) => typeof d === 'string' && needle.includes(d));
	if (index === -1) {
		return null;
	}

	const roleDef = rolesData?.find((d) => d.id === baseId);
	if (!roleDef) {
		return null;
	}

	const clone = structuredClone(roleDef);
	clone.id = customId;
	baseToAutoID[baseId] = customId;
	autoToBaseID[customId] = baseId;

	clone.firstNight ??= firstNightOrder(baseId);
	clone.otherNight ??= otherNightOrder(baseId);
	clone.image ??= getImageArray(roleDef);

	data[index] = clone;
	return clone;
}

function mergeJinxes(data: ScriptData, jinxEntries: CharacterEntry[]): void {
	const mentionedIds = new Set<string>();

	for (const source of jinxEntries) {
		if (!source?.id) {
			continue;
		}

		mentionedIds.add(source.id);

		if (!Array.isArray(source.jinx)) {
			continue;
		}

		for (const jinx of source.jinx) {
			if (jinx?.id) {
				mentionedIds.add(jinx.id);
			}
		}
	}

	for (const id of mentionedIds) {
		findOrExpandCharacter(id, data);
	}

	for (const source of jinxEntries) {
		if (!source?.id || !Array.isArray(source.jinx) || source.jinx.length === 0) {
			continue;
		}

		const sourceEntry = findOrExpandCharacter(source.id, data);
		if (!sourceEntry) {
			continue;
		}

		const existingJinxes = Array.isArray(sourceEntry.jinx) ? sourceEntry.jinx : [];
		const mergedJinxes = [...existingJinxes];

		for (const jinx of source.jinx) {
			if (!jinx?.id || typeof jinx.reason !== 'string') {
				continue;
			}

			const targetEntry = findOrExpandCharacter(jinx.id, data);
			if (!targetEntry) {
				continue;
			}

			const alreadyPresent = mergedJinxes.some(
				(existing) => existing.id === targetEntry.id && existing.reason === jinx.reason,
			);
			if (!alreadyPresent) {
				mergedJinxes.push({ id: targetEntry.id, reason: jinx.reason });
			}
		}

		sourceEntry.jinxes = mergedJinxes;
	}
}

function getGenerationOptions(): GenerationOptions {
	return {
		appendDuplicateLine: appendDuplicateLineInput.checked,
		alejoRules: alejoRulesInput.checked,
		listOfficialJinxes: listOfficialJinxesInput.checked,
		revertRecluseMarionetteJinx: revertRecluseMarionetteJinxInput.checked,
		listGreedyJinxes: listGreedyJinxesInput.checked,
	};
}

function syncOfficialJinxDependencies(): void {
	const isEnabled = listOfficialJinxesInput.checked;

	for (const input of officialJinxDependentInputs) {
		input.disabled = !isEnabled;
		if (!isEnabled) {
			input.checked = false;
		}

		const toggle = input.closest('.toggle');
		if (toggle) {
			toggle.classList.toggle('is-disabled', !isEnabled);
		}
	}
}

function applyDuplicateLine(data: ScriptData): void {
	const metaEntry = getMetaEntry(data);
	if (!metaEntry) {
		return;
	}

	metaEntry.bootlegger = [...metaEntry.bootlegger ?? [], DUPLICATE_LINE];
}

function applyAlejoRules(_data: ScriptData): void {
	const snakeCharmer = findOrExpandCharacter('snakecharmer', _data);

	if (!snakeCharmer) {
		return;
	}

	snakeCharmer.firstNight = firstNightOrder('philosopher');
}

function applyOfficialJinxes(_data: ScriptData): void {
	if (!jinxData || jinxData.length === 0) {
		return;
	}

	mergeJinxes(_data, jinxData);
}

function revertRecluseMarionetteJinx(_data: ScriptData): void {
	// TODO: Implement Recluse-Marionette jinx revert.
}

function applyGreedyJinxes(_data: ScriptData): void {
	if (!greedyJinxData || greedyJinxData.length === 0) {
		return;
	}

	mergeJinxes(_data, greedyJinxData);
}

function applyOptions(data: ScriptData, options: GenerationOptions): void {
	if (options.appendDuplicateLine) {
		applyDuplicateLine(data);
	}

	if (options.alejoRules) {
		applyAlejoRules(data);
	}

	if (options.listOfficialJinxes) {
		applyOfficialJinxes(data);

		if (options.revertRecluseMarionetteJinx) {
			revertRecluseMarionetteJinx(data);
		}
	}

	if (options.listGreedyJinxes) {
		applyGreedyJinxes(data);
	}
}

function buildCopyPayload(data: ScriptData): string {
	const options = getGenerationOptions();
	const nextData = cloneJson(data);
	const metaEntry = getMetaEntry(nextData);
	const removedCharacterNames: string[] = [];

	// Filter out deselected characters
	const filteredData: ScriptData = [nextData[0] as MetaEntry]; // Keep metadata
	for (let i = 1; i < nextData.length; i++) {
		const entry = nextData[i];
		let entryId: string | undefined;
		let entryName: string | undefined;
		let shouldAlwaysInclude = false;
		let isFilterableCharacter = false;

		if (typeof entry === 'string') {
			entryId = entry;
			entryName = rolesData?.find((role) => role.id === entry)?.name ?? entry;
			const roleTeam = rolesData?.find((role) => role.id === entry)?.team;
			isFilterableCharacter = !!roleTeam && FILTERABLE_TEAMS.has(roleTeam);
		} else if (typeof entry === 'object' && entry !== null && 'id' in entry) {
			entryId = (entry as CharacterEntry).id;
			entryName = (entry as CharacterEntry).name || entryId;
			shouldAlwaysInclude = entryId === 'choose_your_chars';
			const entryTeam = (entry as CharacterEntry).team;
			isFilterableCharacter = !!entryTeam && FILTERABLE_TEAMS.has(entryTeam);
		}

		if (!isFilterableCharacter || shouldAlwaysInclude || (entryId && selectedCharacterIds.has(entryId))) {
			filteredData.push(entry);
		} else if (isFilterableCharacter && entryId && entryName) {
			removedCharacterNames.push(entryName);
		}
	}

	if (metaEntry && removedCharacterNames.length > 0) {
		const bootlegger = Array.isArray(metaEntry.bootlegger) ? metaEntry.bootlegger : [];
		bootlegger.push(`${REMOVED_CHARACTERS_PREFIX}${removedCharacterNames.join(', ')}`);
		metaEntry.bootlegger = bootlegger;
	}

	applyOptions(filteredData, options);

	return JSON.stringify(filteredData, null, 2);
}

function renderCharacters(characters: Character[]): void {
	const { quickRemove, remaining } = splitCharactersByCommonBans(characters);
	renderCharacterList(quickRemoveList, quickRemove, true);
	renderCharacterList(characterList, remaining, false);
}

function renderCharacterList(container: HTMLDivElement, characters: Character[], isQuickRemove = false): void {
	if (characters.length === 0) {
		container.innerHTML = `<p class="status">${isQuickRemove ? 'No common bans in this script.' : 'No characters available.'}</p>`;
		return;
	}

	container.innerHTML = '';

	for (const character of characters) {
		const label = document.createElement('label');
		label.className = `character-item ${isQuickRemove ? 'quick-remove-item' : ''} ${selectedCharacterIds.has(character.id) ? '' : 'disabled'}`;

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.value = character.id;
		checkbox.checked = selectedCharacterIds.has(character.id);
		checkbox.addEventListener('change', (e) => {
			const target = e.target as HTMLInputElement;
			if (target.checked) {
				selectedCharacterIds.add(character.id);
			} else {
				selectedCharacterIds.delete(character.id);
			}
			label.classList.toggle('disabled', !target.checked);
			updateCharacterCount();
		});

		label.appendChild(checkbox);

		if (character.imageUrl) {
			let src: string;
			const urlDef: string | Array<string> = character.imageUrl;
			if (Array.isArray(urlDef)) {
				src = urlDef[0];
			} else {
				src = urlDef;
			}
			const img = document.createElement('img');
			img.src = src;
			img.alt = character.name;
			img.className = 'character-icon';
			label.appendChild(img);
		}

		const nameEl = document.createElement('span');
		nameEl.className = 'character-name';
		nameEl.textContent = character.name;
		label.appendChild(nameEl);

		container.appendChild(label);
	}
}

function updateCharacterCount(): void {
	characterCount.textContent = String(selectedCharacterIds.size);
}

async function loadLatestJson(): Promise<void> {
	setStatus('Loading latest script...');

	const dataSources = [
		GREEDY_JSON_URL,
		GREEDY_JINX_JSON_URL,
		ID_MAPPINGS_JSON_URL,
		ROLES_JSON_URL,
		NIGHTSHEET_JSON_URL,
		JINX_JSON_URL
	];

	const responses = await Promise.all(dataSources.map(d => fetch(d, { cache: 'no-store' })));
	if (responses.some(r => !r.ok)) {
		const failedSources = responses
			.map((r, i) => ({ response: r, source: dataSources[i] }))
			.filter(({ response }) => !response.ok)
			.map(({ source, response }) => `${source} (${response.status})`)
			.join(', ');

		throw new Error(`Failed to load data: ${failedSources}`);
	}

	const [greedyParsed, greedyJinxParsed, idMappingsParsed, rolesParsed, nightsheetParsed, jinxParsed] = await Promise.all(responses.map(r => r.json()));

	if (!Array.isArray(greedyParsed)) {
		throw new Error('greedy.json has an unexpected shape.');
	}
	greedyJson = greedyParsed as ScriptData;

	if (typeof greedyJinxParsed !== 'object' || greedyJinxParsed === null) {
		throw new Error('greedy-jinxes.json has an unexpected shape.');
	}
	greedyJinxData = greedyJinxParsed as CharacterEntry[];

	if (typeof idMappingsParsed !== 'object' || idMappingsParsed === null) {
		throw new Error('id-mappings.json has an unexpected shape.');
	}
	greedyToBaseID = idMappingsParsed as IdMappings;
	baseToGreedyID = Object.fromEntries(Object.entries(greedyToBaseID).map(([key, value]) => [value, key]));

	if (!Array.isArray(rolesParsed)) {
		throw new Error('roles.json has an unexpected shape.');
	}
	rolesData = rolesParsed as CharacterEntry[];

	if (typeof nightsheetParsed !== 'object' || nightsheetParsed === null) {
		throw new Error('nightsheet.json has an unexpected shape.');
	}
	nightsheetData = nightsheetParsed as NightsheetData;

	if (!Array.isArray(jinxParsed)) {
		throw new Error('jinx.json has an unexpected shape.');
	}
	jinxData = jinxParsed as CharacterEntry[];
	baseToAutoID = {};
	autoToBaseID = {};

	const metaEntry = getMetaEntry(greedyJson);
	scriptName.textContent = metaEntry?.name ?? 'Unknown script';

	const characters = getCharacters(greedyJson, rolesData);
	selectedCharacterIds.clear();
	for (const char of characters) {
		selectedCharacterIds.add(char.id);
	}
	renderCharacters(characters);
	updateCharacterCount();
}

async function copyJson(event: SubmitEvent): Promise<void> {
	event.preventDefault();

	if (!greedyJson) {
		setStatus('Load latest.json before copying.', 'error');
		return;
	}

	const payload = buildCopyPayload(greedyJson);

	await navigator.clipboard.writeText(payload);
	setStatus('Copied!', 'success');
}

for (const input of allOptionInputs) {
	input.addEventListener('change', () => {
		if (input === listOfficialJinxesInput) {
			syncOfficialJinxDependencies();
		}
	});
}

syncOfficialJinxDependencies();

reloadButton.addEventListener('click', async () => {
	try {
		await loadLatestJson();
		setStatus('Script reloaded.', 'success');
	} catch (error: unknown) {
		setStatus(error instanceof Error ? error.message : 'Unable to reload latest.json.', 'error');
	}
});

form.addEventListener('submit', async (event) => {
	try {
		await copyJson(event as SubmitEvent);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Copy failed.';
		setStatus(message, 'error');
	}
});

async function bootstrap(): Promise<void> {
	try {
		await loadLatestJson();
		setStatus('Script loaded.', 'success');
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unable to load latest.json.';
		setStatus(message, 'error');
	}
}

void bootstrap();