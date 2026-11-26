# The human folder

Everything you write lives here. Everything technical lives in `engine/`.
Save a file while `npm run dev` is running and the open page updates in place.

```
human/
  site.md                     the site name, tagline, footer and about page
  theme/tokens.css            colours, fonts, sizes — the look and feel
  theme/custom.css            your own CSS overrides
  library/<paper>.md          one file per paper: links, status, notes, highlights
  atlases/<topic>/
    atlas.md                  the page: cover, then sections top to bottom
    kinds.md                  the vocabulary: kinds of milestone and of connection
    milestones.md             the milestones (or a milestones/ folder of files)
    branches.md               the tabs of the tree and their grid layouts
    connections.md            how milestones relate, one sentence per line
```

Run `npm run check` at any time: it reads all of this and tells you `file:line` for
anything it cannot understand. In the browser, the small `human/ ✓` badge in the corner
does the same, and clicking a problem opens the file at that line.

---

## The format in one minute

Files are Markdown. Two conventions turn Markdown into structure:

1. **`## Heading`** starts an entry (a milestone, a branch, a paper section, a page section).
2. **Facts** are `key: value` lines directly under a heading. Line them up if you like.

```markdown
## DDPM
id:       ddpm
date:     Jun 2020
kind:     diffusion
sources:  ddpm

Predict the noise that was added to a training image.

### Mechanism
Pick a clean image, draw Gaussian noise …
```

`<!-- HTML comments -->` are ignored everywhere. Use them for notes to yourself.

---

## Milestones — `milestones.md`

| Fact | Meaning |
| --- | --- |
| `id` | Short name used in branch layouts and `[[links]]`. Defaults to the title, slugified. |
| `date` | As papers write it: `Mar 2015`, `2021–22`, `Sep–Oct 2022`. Orders the timeline. |
| `kind` | One of the kinds in `kinds.md`. Sets the symbol and the timeline lane. |
| `sources` | Library file names, comma separated: `ddpm, flow-matching`. |

The first paragraph is the **unlock**: one sentence on what this made possible.
Every `### Part` after it becomes a labelled section in the details panel —
`### Mechanism`, `### Why it matters`, `### Open questions`, anything you like.

## Connections — `connections.md`

One sentence per line. The later idea comes first, then a verb, then the earlier idea,
then why after a colon:

```markdown
- Diffusion Policy builds on DDPM: it applies conditional denoising to action sequences.
- UniPi relates to Visual foresight: both plan with predicted frames.
```

Name milestones by title or id. `## Headings` in this file are only for grouping.
The verbs, and how each is drawn, are defined in `kinds.md`.

## Kinds — `kinds.md`

```markdown
## Kinds of milestone
- **Diffusion** `diffusion` — diamond, violet

## Kinds of connection
- **builds on** — solid line, "Documented use": a method, dataset or model is explicitly reused.
```

Shapes: `diamond`, `square`, `dot`, `triangle`, `ring`, `bar`.
Colours: a name from `theme/tokens.css` (`violet`, `slate`, `green`, `amber`, `rose`, `teal`, `ink`) or any CSS colour.
Line styles: `solid`, `dashed`, `dotted`. Add a new verb (say, **replaces**) and you can use it immediately.

## Branches — `branches.md`

Each branch is a tab. Its layout is a little grid of milestone ids, indented by four spaces:

```markdown
## Diffusion foundations
short:      Foundations
icon:       layers
summary:    Noise, conditioning and transport
starts at:  ddpm

    thermo   ·     flow-matching
    ddpm     ·     ·
    ddim     ldm   cfg
```

`·` (or `.`) is an empty cell. Arrows are drawn between every connected pair on the same branch.
Icons: `layers`, `film`, `robot`, `fork`, `spark`, `book`, `atom`, `chat`, `chip`, `eye`.
A milestone can sit on several branches; one on none still appears on the **Timeline**.

## The page — `atlas.md`

The `# Title` and the facts under it make the cover. `*Emphasis*` in the title is set in the accent colour.

| Cover fact | Meaning |
| --- | --- |
| `kicker` | Small label above the title. `Part / Part` shows the second part lighter. |
| `updated` | Shown on the cover and the front page. |
| `accent` | The atlas colour: a theme colour name or CSS colour. |
| `hero` | The figure beside the title: `arm-schematic` or `noise-field`. |
| `hero caption`, `hero stages` | Its label and its buttons, e.g. `Noise, Structure, Action`. |
| `order` | Position on the front page (lower first). |

A paragraph made only of links becomes the buttons under the summary:
`[Explore the tech tree](#tree) · [Inside the control loop](#loop)`.

Every `## Section` after that is a band of the page, in order:

| Section fact | Meaning |
| --- | --- |
| `id` | The anchor, for links like `#tree`. Defaults to the title. |
| `kicker` | Small label above the title. |
| `intro` | One line beside the title. |
| `nav` | A short name for the page menu. Leave it out to keep the section out of the menu. |
| `layout` | `stacked` (default), `split` (text left, figure right) or `wide`. |

Inside a section, write Markdown and place blocks:

| Block | What it shows |
| --- | --- |
| `::tree` | The tech tree: branch tabs, grid, timeline view, details panel. |
| `::timeline` | Just the timeline. |
| `::sources` | A searchable index of every paper the atlas cites. |
| `:::bars Title` … `:::` | A bar chart. Rows `Label: 12.4%`, `max: 20%` sets the scale, `**Label**` highlights a bar. |
| `:::control-loop Instruction` … `:::` | The observe → predict → act → replan walkthrough. One `**Step** — title` paragraph per step. |
| `:::callout Label` … `:::` | A boxed aside. |

## Papers — `library/<name>.md`

```markdown
# Denoising Diffusion Probabilistic Models

authors:    Jonathan Ho, Ajay Jain, Pieter Abbeel
published:  Jun 2020
type:       paper
arxiv:      2006.11239
code:       https://github.com/hojonathanho/diffusion
status:     reading
tags:       diffusion

Optional one-paragraph summary.

## Notes

Your notes, in your words. Markdown, maths, links.

## Highlights

- §3.4 — "the exact words from the paper" — what you thought
- p. 5 — a page you want to come back to
- Figure 2 — the architecture diagram
```

Facts: `authors`, `cite as` (how citations print; derived from authors if left out),
`published`, `type`, `arxiv`, `url`, `pdf`, `html`, `code`, `project`, `status`
(`to read`, `reading`, `read`, `revisit`), `tags`, `added`.
Any other `## Section` you add (say `## Questions`) shows on the paper page too.

You can also do all of this from the paper page while `npm run dev` runs: set the status,
write notes with a live preview (⌘S saves), and add or remove highlights. The app writes
the same Markdown you would.

---

## Links and deep links, anywhere you write

| Write | Get |
| --- | --- |
| `[[ddpm]]` or `[[ddpm\|the DDPM paper]]` | A link to a milestone. `[[atlas-folder]]` links an atlas. |
| `[@ddpm]` | A citation: author name linking to the paper's notes, plus ↗ to the paper. |
| `[@ddpm, p. 4]` | ↗ opens the PDF at page 4. |
| `[@ddpm, §3.4]` / `Section 3` / `Appendix B` | ↗ opens the HTML version at that section. |
| `[@ddpm, Figure 2]` / `Table 1` | ↗ opens the HTML version at the caption. |
| `[@ddpm, "an exact quote"]` | ↗ opens the paper with that sentence highlighted. |
| `$x_t$`, `$$ … $$` | Maths. |

Section anchors need an arXiv paper (HTML comes from arxiv.org or ar5iv).
Quotes and figures also work on blog posts with a `url`.
On a paper's page, the **copy** button gives you its `[@name]`.

## Look and feel

`theme/tokens.css` holds every colour, font and size, with comments. Change `--paper`
for the background, `--font-display` for the headings, `--accent` for the default accent.
For anything tokens cannot express, add rules to `theme/custom.css`.

## When the format cannot say what you want

Ask your coding agent for a new primitive: a new fact, a new block, a new hero, a new
kind of view. It belongs in `engine/`, and the agent should document it in this file.
