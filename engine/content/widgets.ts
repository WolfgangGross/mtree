/**
 * Names of the building blocks a human can place in atlas.md.
 * `::name` is a leaf (one line); `:::name … :::` wraps content.
 * The React side registers a component for each (engine/app/widgets/registry.tsx);
 * a test keeps the two lists in sync.
 */
export const DIRECTIVES = {
  tree: 'The technology tree: branch tabs, milestone grid and the inspector.',
  timeline: 'Every milestone on one timeline, in lanes by kind.',
  sources: 'A searchable index of every paper this atlas cites.',
  bars: 'A small bar chart. One "Label: 12.4%" row per line, "max: 20%" sets the scale; **bold** marks the highlighted bar.',
  'control-loop': 'The observe → predict → act → replan walkthrough. One "**Step** — title" paragraph per step.',
  callout: 'A boxed aside for a definition or a caveat.',
} as const;

export type DirectiveName = keyof typeof DIRECTIVES;

export const HERO_WIDGETS = {
  'arm-schematic': 'A point-cloud robot arm that assembles from noise. Stages come from "hero stages".',
  'noise-field': 'A quiet field of particles that settles into a grid. Works for any topic.',
} as const;

export type HeroWidgetName = keyof typeof HERO_WIDGETS;

export const ICONS = ['layers', 'film', 'robot', 'fork', 'spark', 'book', 'atom', 'chat', 'chip', 'eye'] as const;
