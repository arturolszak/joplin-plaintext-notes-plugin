import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';

// CSS class applied to lines inside a ```plaintext fence to override code-block styling
const plaintextLineClass = 'cm-plaintext-line';
const plaintextFenceClass = 'cm-plaintext-fence';

// Line decoration (applied per-line, not per-range)
const plaintextLineDeco = Decoration.line({ class: plaintextLineClass });
const plaintextFenceDeco = Decoration.line({ class: plaintextFenceClass });

/**
 * Walk the syntax tree, find FencedCode nodes whose opening line is ```plaintext,
 * and return line decorations that restyle those lines as normal text.
 */
function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;

	syntaxTree(view.state).iterate({
		enter(node) {
			if (node.name !== 'FencedCode') return;

			// Get the first line of the fenced code block (the opening fence)
			const firstLine = doc.lineAt(node.from);
			const firstLineText = firstLine.text.trimStart();

			// Only target ```plaintext blocks
			if (!firstLineText.startsWith('```plaintext')) return;

			// Get the last line of the fenced code block (the closing fence)
			const lastLine = doc.lineAt(node.to);

			// Apply decorations to every line in the block
			for (let lineNo = firstLine.number; lineNo <= lastLine.number; lineNo++) {
				const line = doc.line(lineNo);
				const lineText = line.text.trimStart();

				if (lineNo === firstLine.number || lineNo === lastLine.number) {
					// Opening/closing fence markers — dim them
					builder.add(line.from, line.from, plaintextFenceDeco);
				} else {
					// Content lines — style as normal text
					builder.add(line.from, line.from, plaintextLineDeco);
				}
			}
		},
	});

	return builder.finish();
}

/**
 * ViewPlugin that rebuilds decorations on document or viewport changes.
 */
const plaintextDecoPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}
		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged || update.selectionSet) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/**
 * Shared overrides to remove code-block visual styling (background, borders, monospace).
 * cm-codeBlock is a LINE-level class (on the same .cm-line element), not a child span.
 * cm-regionFirstLine / cm-regionLastLine are also line-level classes on first/last lines.
 */
const resetCodeBlock = {
	fontFamily: 'inherit !important',
	fontSize: 'inherit !important',
	backgroundColor: 'transparent !important',
	color: 'inherit !important',
	border: 'none !important',
	borderLeft: 'none !important',
	borderRight: 'none !important',
	borderTop: 'none !important',
	borderBottom: 'none !important',
	outline: 'none !important',
	boxShadow: 'none !important',
	borderRadius: '0 !important',
};

const plaintextTheme = EditorView.baseTheme({
	// Content lines inside ```plaintext — normal text appearance
	'.cm-plaintext-line': { ...resetCodeBlock },
	// Same-element: .cm-line has both .cm-plaintext-line and .cm-codeBlock
	'.cm-plaintext-line.cm-codeBlock': { ...resetCodeBlock },
	// Also override region first/last line borders
	'.cm-plaintext-line.cm-regionFirstLine': { ...resetCodeBlock },
	'.cm-plaintext-line.cm-regionLastLine': { ...resetCodeBlock },
	// Override any code-related spans inside content lines
	'.cm-plaintext-line .tok-comment': { fontFamily: 'inherit !important', color: 'inherit !important' },
	'.cm-plaintext-line .tok-meta': { fontFamily: 'inherit !important', color: 'inherit !important' },

	// Fence marker lines — dimmed, also override code block styling
	'.cm-plaintext-fence': { ...resetCodeBlock, opacity: '0.35' },
	'.cm-plaintext-fence.cm-codeBlock': { ...resetCodeBlock, opacity: '0.35' },
	'.cm-plaintext-fence.cm-regionFirstLine': { ...resetCodeBlock, opacity: '0.35' },
	'.cm-plaintext-fence.cm-regionLastLine': { ...resetCodeBlock, opacity: '0.35' },
	'.cm-plaintext-fence .tok-meta': { fontFamily: 'inherit !important', color: 'inherit !important' },
});

/**
 * Joplin CM6 content script entry point.
 * Registers CodeMirror 6 extensions with the editor.
 */
export default (_context: { contentScriptId: string; postMessage: any }) => {
	return {
		plugin: (codeMirrorWrapper: any) => {
			codeMirrorWrapper.addExtension([plaintextDecoPlugin, plaintextTheme]);

			// Register a command that the main plugin can invoke via editor.execCommand
			// to toggle the ```plaintext wrapper directly in the editor document.
			codeMirrorWrapper.registerCommand('togglePlaintext', () => {
				const cm: EditorView = codeMirrorWrapper.editor;
				const doc = cm.state.doc;
				const text = doc.toString();
				const trimmed = text.trimStart();

				let newText: string;
				if (trimmed.startsWith('```plaintext\n') || trimmed.startsWith('```plaintext\r\n')) {
					// Unwrap
					newText = text;
					const openIdx = newText.indexOf('```plaintext');
					if (openIdx !== -1) {
						const afterFence = newText.indexOf('\n', openIdx);
						newText = newText.slice(0, openIdx) + newText.slice(afterFence + 1);
					}
					// Remove closing ```
					const closeIdx = newText.lastIndexOf('```');
					if (closeIdx !== -1) {
						// Also remove the newline before closing fence
						const before = closeIdx > 0 && newText[closeIdx - 1] === '\n' ? closeIdx - 1 : closeIdx;
						newText = newText.slice(0, before) + newText.slice(closeIdx + 3);
					}
				} else {
					// Wrap
					newText = '```plaintext\n' + text + '\n```';
				}

				cm.dispatch({
					changes: { from: 0, to: doc.length, insert: newText },
				});
			});
		},
	};
};
