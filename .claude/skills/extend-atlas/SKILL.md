---
name: extend-atlas
description: Grow the atlases in human/ from reading material. Use when the user shares a paper, arXiv link, blog post or report to add; asks to add or revise milestones, connections or branches; or asks for a new atlas on a topic.
---

# Extend an atlas

`human/README.md` is the format reference. Read it before the first edit.

## Steps

1. **Library entry.** For an arXiv paper run `npm run add-paper -- <link or id>`; it fetches title,
   authors and date and prints the `[@id]` to cite. For anything else create
   `human/library/<surname>-<year>-<keyword>.md` with `url:`, `type:`, `authors:` and `published:`.
   Leave `## Notes` empty: it belongs to the human.
   Done when the file exists and `npm run check` reports no error for it.

2. **Read the source.** Read the paper or post itself: abstract, method, key figures, results.
   Everything you write next comes from it. Done when you can state, from the source, what it
   unlocked in one sentence and which earlier work it explicitly uses.

3. **Choose the atlas.** Read the candidate atlas's `milestones.md`, `connections.md` and
   `branches.md`. If no atlas fits, run `npm run new-atlas -- <folder> "Title"` and define its
   `kinds.md` first.

4. **Write the milestone** in `milestones.md`, inside the group of its kind: `id` (short, readable in
   a grid), `date` (first public version), `kind`, `sources`; then the unlock sentence;
   then `### Mechanism` and `### Why it matters`, three sentences or fewer each, in the house voice.

5. **Connect it.** One line per relation in `connections.md`, later idea first, reason after the colon.
   Use `builds on` only for reuse the source documents; parallels and precedents use `relates to`.
   Done when every relation from step 2 has a line.

6. **Place it** in each branch where it belongs in `branches.md`: earlier ideas in higher rows,
   connected milestones near each other, columns aligned.

7. **Verify.** `npm run check` passes with no new warnings. In the running app, open the atlas, click
   the new milestone, and confirm: its card on each branch, its wires, the details panel, its source
   links, and "Cited in" on the paper's page.
