# AGENTS.md — joplin-plaintext-notes-plugin

## Project Overview

This is a Joplin plugin for plaintext notes. It is part of a family of Joplin plugins located under the `joplin_plugins` workspace (siblings: `joplin-encrypted-notes-plugin`, `joplin-note-boards-plugin`).

- **Repository:** https://github.com/crestreach/joplin-plaintext-notes-plugin
- **Language/Stack:** TypeScript (Joplin Plugin API)

## Rules

### General

- Do exactly and only what the user asks. Do not add anything that wasn't requested.
- If something seems worth extending or adding, ask first and discuss before changing the file.
- Do not make assumptions. If anything is vague, unclear, or you disagree with it, ask questions and raise concerns before proceeding.
- Match existing style in the touched files (naming, imports, formatting) before introducing new patterns.
- Large or risky changes: summarize the plan in a few bullets, then implement — reduces wrong-direction work.
- One retry path, then escalate: try a reasonable alternative once; if still blocked, summarize evidence (error output, file/line) and ask for a decision instead of thrashing.
- Run the checks the task implies (tests, linter, typecheck, formatter) when the project has them; if a command fails, fix or report before declaring done.

### Git & Version Control

- **Do not commit or push** unless the user explicitly asks you to (e.g. "commit", "push", "commit and push"). Staging is fine only if they asked for it; default is to leave `git commit` / `git push` to them unless instructed otherwise.
- Prefer **small, focused commits** with clear messages when you do commit.
- Do not rewrite published history (force-push, rebase onto public `main`) unless the user explicitly requests it.
- Never commit secrets (tokens, keys, .env with real values). If something looks sensitive, redact and tell the user instead of pasting it into chat or files.
