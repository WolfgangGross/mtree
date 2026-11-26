# mtree

Tech trees and reading notes for learning technical topics.

Each **atlas** maps one topic as a tree of milestones: what each one unlocked, how it works,
why it matters, and how it connects to the others. Every milestone cites its primary sources,
and every source has a page in the **library** for your notes and highlights, with deep links
back to the exact page, section, figure or sentence of the paper.

The first atlas is *From noise to motion*: how diffusion went from denoising images to
predicting video and controlling robot arms.

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:5199>. While it runs, any file you save in `human/` shows up instantly,
and you can set reading status, write notes and add highlights straight from a paper's page.

## Two folders

```
human/    what you write: atlases, papers and notes, colours and fonts   → human/README.md
engine/   how it works: parser, app, dev server, tests                    → AGENTS.md
```

The split follows a simple idea: you edit the rules and content in a readable format, and a
coding agent builds the machinery that runs them. `human/` is Markdown with a few conventions,
written to be read. When you want something the format cannot express yet, ask an agent for a
new primitive in `engine/`.

## Everyday loops

| You want to | Do |
| --- | --- |
| Add a paper | Paste an arXiv link into **Add a paper** on the library page, or `npm run add-paper -- <link>`, or ask your agent ("add this paper to the diffusion atlas"). |
| Take notes | Open the paper's page → **Write notes**. ⌘S saves into `human/library/<paper>.md`. |
| Mark a passage | **Add a highlight** with `p. 4`, `§3.2`, `Figure 2` or an exact quote; it links straight to that spot. |
| Grow an atlas | Ask your agent; it uses the `extend-atlas` skill. Or edit `milestones.md`, `connections.md`, `branches.md` yourself. |
| Start a topic | `npm run new-atlas -- llm-agents "LLM agents"` |
| Restyle | Edit `human/theme/tokens.css`. |
| Check your edits | `npm run check` prints `file:line` for anything it cannot read. |

## Commands

```bash
npm run dev          # the app with live reload and note editing, port 5199
npm run check        # validate everything in human/
npm test             # engine tests
npm run typecheck    # TypeScript
npm run build        # check, then a static site in dist/ (read-only notes)
npm run preview      # serve dist/ on port 5198
```

The built site is plain static files with client-side routing; any host works as long as
unknown paths fall back to `index.html`.
