import joplin from 'api';
import {
	ToolbarButtonLocation,
	MenuItemLocation,
	ContentScriptType,
} from 'api/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLUGIN_ID = 'PlaintextNotes';

const COMMANDS = {
	TOGGLE: `${PLUGIN_ID}.togglePlaintext`,
};

const CONTENT_SCRIPT_ID = 'plaintextNotesViewer';
const EDITOR_CONTENT_SCRIPT_ID = 'plaintextNotesEditor';

const ENCRYPTED_FENCE_RE = /^```encrypted-note\b/m;

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

joplin.plugins.register({
	onStart: async () => {
		// --- Content script (plaintext viewer in rendered pane) ---
		await joplin.contentScripts.register(
			ContentScriptType.MarkdownItPlugin,
			CONTENT_SCRIPT_ID,
			'./contentScripts/plaintextViewer.js',
		);

		// --- Content script (plaintext editor styling in CM6) ---
		await joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			EDITOR_CONTENT_SCRIPT_ID,
			'./contentScripts/plaintextEditor.js',
		);

		// --- Commands ---
		await joplin.commands.register({
			name: COMMANDS.TOGGLE,
			label: 'Toggle Plaintext Mode',
			enabledCondition: 'oneNoteSelected',
			iconName: 'fas fa-remove-format',
			execute: async () => {
				try {
					await togglePlaintext();
				} catch (e) {
					console.error('[PlaintextNotes] togglePlaintext failed:', e);
				}
			},
		});

		// --- Toolbar & Menu ---
		await joplin.views.toolbarButtons.create(
			`${PLUGIN_ID}.editorToolbar`,
			COMMANDS.TOGGLE,
			ToolbarButtonLocation.EditorToolbar,
		);

		await joplin.views.toolbarButtons.create(
			`${PLUGIN_ID}.toolbar`,
			COMMANDS.TOGGLE,
			ToolbarButtonLocation.NoteToolbar,
		);

		await joplin.views.menus.create(
			`${PLUGIN_ID}.menu`,
			'Plaintext Notes',
			[
				{ commandName: COMMANDS.TOGGLE },
			],
			MenuItemLocation.Tools,
		);
	},
});

// ---------------------------------------------------------------------------
// Toggle plaintext — updates note body via data API and reloads the note
// ---------------------------------------------------------------------------

async function togglePlaintext() {
	const note = await getSelectedNote();
	if (!note) return;

	const body: string = note.body || '';

	// Prevent wrapping an encrypted note inside ```plaintext
	if (!isPlaintextNote(body) && ENCRYPTED_FENCE_RE.test(body.trim())) {
		console.warn('[PlaintextNotes] Cannot toggle plaintext on an encrypted note. Decrypt first.');
		return;
	}

	// Try to toggle directly in the editor via the registered CM command.
	// This modifies the document in-place so the change is visible immediately
	// and Joplin's own auto-save will persist it.
	try {
		await joplin.commands.execute('editor.execCommand', {
			name: 'togglePlaintext',
		});
	} catch {
		// Fallback for platforms where editor.execCommand is unavailable:
		// update via data API and reload the note.
		if (isPlaintextNote(body)) {
			await joplin.data.put(['notes', note.id], null, { body: unwrapPlaintext(body) });
		} else {
			await joplin.data.put(['notes', note.id], null, { body: wrapPlaintext(body) });
		}
		await joplin.commands.execute('openNote', note.id);
	}
}

// ---------------------------------------------------------------------------
// Plaintext helpers
// ---------------------------------------------------------------------------

function isPlaintextNote(body: string): boolean {
	const trimmed = body.trim();
	return (
		trimmed.startsWith('```plaintext\n') ||
		trimmed.startsWith('```plaintext\r\n')
	);
}

function unwrapPlaintext(body: string): string {
	let trimmed = body.trim();
	if (trimmed.startsWith('```plaintext\r\n')) {
		trimmed = trimmed.slice('```plaintext\r\n'.length);
	} else if (trimmed.startsWith('```plaintext\n')) {
		trimmed = trimmed.slice('```plaintext\n'.length);
	}
	if (trimmed.endsWith('\r\n```')) {
		trimmed = trimmed.slice(0, -'\r\n```'.length);
	} else if (trimmed.endsWith('\n```')) {
		trimmed = trimmed.slice(0, -'\n```'.length);
	} else if (trimmed.endsWith('```')) {
		trimmed = trimmed.slice(0, -'```'.length);
	}
	return trimmed;
}

function wrapPlaintext(body: string): string {
	return '```plaintext\n' + body + '\n```';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getSelectedNote() {
	try {
		const noteIds = await joplin.workspace.selectedNoteIds();
		if (!noteIds || noteIds.length === 0) return null;
		const note = await joplin.data.get(['notes', noteIds[0]], { fields: ['id', 'body', 'title'] });
		if (!note || !note.id) return null;
		return note;
	} catch {
		return null;
	}
}
