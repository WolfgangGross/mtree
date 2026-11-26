# mtree

A local web app that turns Markdown in `human/` into tech-tree atlases and reading notes.
Two folders, two owners:

- **`human/`** — the human's content and look and feel, written in a small Markdown house format.
  `human/README.md` is the format reference: read it before writing or parsing any file in `human/`.
- **`engine/`** — everything technical: the parser and validator (`engine/content`), the dev-server
  bridge that hot-reloads content and writes notes (`engine/vite`), the React app (`engine/app`),
  the CLIs (`engine/cli`) and the tests (`engine/tests`).

## Working in human/

- To add a paper, milestones, connections, branches or a whole new atlas, use the `extend-atlas` skill.
- `## Notes` and `## Highlights` in `human/library/*.md` are the human's own words. Edit them only
  when asked; put what you add in milestone text or a paper's summary paragraph instead.
- Every fact comes from the source: quotes verbatim, page and section locators checked against the paper.
- House voice: short declarative sentences, one concrete example per idea, no hype. Match the existing milestones.

## Working in engine/

- The engine stays topic-agnostic: every word a reader sees comes from `human/`. A widget takes its
  labels and steps from its block body or facts.
- New capability is a **primitive**: a fact, a block, a hero, a view. Each one is complete when it is
  1. parsed in `engine/content`, with a `file:line` diagnostic for misuse,
  2. rendered in `engine/app` (block and hero names live in `engine/content/widgets.ts`, components in `engine/app/widgets/registry.tsx`),
  3. documented in `human/README.md`, in the table beside its siblings,
  4. covered in `engine/tests`.
- Styling reads tokens: `engine/app/styles/app.css` uses `var(--…)` only, and every visual knob is a
  commented token in `human/theme/tokens.css`.
- The dev API in `engine/vite/plugin.ts` writes only `human/library/*.md`, through the surgical edits in
  `engine/content/edit.ts`, so bytes it does not touch stay as the human wrote them.

## Done means

`npm run check`, `npm test` and `npm run typecheck` pass, and every UI change has been looked at in the
running app (`npm run dev`, port 5199) at desktop and phone width.
