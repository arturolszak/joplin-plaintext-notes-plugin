/**
 * MarkdownIt content script that detects plaintext notes (fenced with
 * ```plaintext) and renders them as normal-looking plain text — no
 * markdown interpretation, no monospace, no code-block frame.
 *
 * This also works when the encrypted-notes plugin is active in
 * CodeMirror mode — the decrypted content that starts with ```plaintext
 * will be rendered as plain text in the viewer.
 */
export default function (context: any) {
	return {
		plugin: function (markdownIt: any, _options: any) {
			const defaultFence =
				markdownIt.renderer.rules.fence ||
				function (tokens: any, idx: number, options: any, env: any, self: any) {
					return self.renderToken(tokens, idx, options);
				};

			markdownIt.renderer.rules.fence = function (
				tokens: any,
				idx: number,
				options: any,
				env: any,
				self: any,
			) {
				const token = tokens[idx];
				const info = (token.info || '').trim().toLowerCase();

				if (info === 'plaintext' || info === 'plain-text' || info === 'plain') {
					const content = token.content || '';
					// Convert plain text to HTML paragraphs, preserving blank-line
					// separation as paragraph breaks, and single newlines as <br>.
					const escaped = content
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;')
						.replace(/"/g, '&quot;');

					// Split on blank lines to create paragraphs, convert single
					// newlines within a paragraph to <br> tags.
					const paragraphs = escaped.split(/\n{2,}/);
					const html = paragraphs
						.map(p => p.trim())
						.filter(p => p.length > 0)
						.map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>')
						.join('\n');

					return '<div class="plaintext-note-view">' + html + '</div>';
				}

				return defaultFence(tokens, idx, options, env, self);
			};
		},
		assets: function () {
			return [
				{ name: 'plaintextViewer.css' },
			];
		},
	};
}
