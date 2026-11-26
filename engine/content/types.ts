/**
 * The content model. Everything under human/ is parsed into these shapes.
 * The parser lives in engine/content; the UI only ever sees a `Content`.
 */

/** Where something was written: a path relative to the repo root and a 1-based line. */
export interface Loc {
  file: string;
  line: number;
}

export interface Diagnostic {
  level: 'error' | 'warning';
  file: string;
  line: number;
  message: string;
}

export interface Site {
  title: string;
  tagline: string;
  footer: string;
  /** Markdown shown on the about page. */
  about: string;
  loc: Loc;
}

export type Shape = 'diamond' | 'square' | 'dot' | 'triangle' | 'ring' | 'bar';
export const SHAPES: Shape[] = ['diamond', 'square', 'dot', 'triangle', 'ring', 'bar'];

/** A kind of milestone, e.g. "Diffusion". Drawn as a small coloured symbol. */
export interface Kind {
  id: string;
  label: string;
  shape: Shape;
  /** A theme colour name (see human/theme/tokens.css) or a CSS colour. */
  color: string;
  loc: Loc;
}

export type LineStyle = 'solid' | 'dashed' | 'dotted';

/** A kind of connection, named by its verb: "builds on", "relates to". */
export interface LinkKind {
  verb: string;
  style: LineStyle;
  label: string;
  explanation: string;
  loc: Loc;
}

export interface Part {
  heading: string;
  body: string;
  loc: Loc;
}

export interface Milestone {
  id: string;
  title: string;
  /** Free text as written, e.g. "Sep–Oct 2022". */
  date: string;
  /** Decimal year parsed from `date`, used for ordering and the timeline. */
  when: number | null;
  kind: string;
  sources: string[];
  /** The one-sentence unlock: what this milestone made possible. Markdown. */
  lead: string;
  parts: Part[];
  loc: Loc;
}

export interface Connection {
  /** The earlier idea (object of the sentence). */
  from: string;
  /** The later idea (subject of the sentence). */
  to: string;
  verb: string;
  note: string;
  loc: Loc;
}

export interface Branch {
  id: string;
  label: string;
  short: string;
  icon: string;
  summary: string;
  start: string;
  /** Rows of milestone ids; null is an empty cell. */
  grid: (string | null)[][];
  loc: Loc;
}

export type Block =
  | { type: 'prose'; md: string; loc: Loc }
  | { type: 'directive'; name: string; args: string; body: string; loc: Loc };

export type SectionLayout = 'stacked' | 'split' | 'wide';

export interface Section {
  id: string;
  title: string;
  kicker: string;
  intro: string;
  nav: string;
  layout: SectionLayout;
  blocks: Block[];
  loc: Loc;
}

export interface Hero {
  widget: string;
  caption: string;
  stages: string[];
  loc: Loc;
}

export interface Atlas {
  slug: string;
  /** Inline markdown, e.g. "From noise *to motion.*" */
  title: string;
  /** Plain-text title for tabs and lists. */
  plainTitle: string;
  kicker: string;
  updated: string;
  accent: string;
  order: number;
  /** Markdown paragraphs under the title. */
  summary: string;
  /** Call-to-action links written as a paragraph of links. */
  actions: { label: string; href: string }[];
  hero: Hero | null;
  kinds: Kind[];
  linkKinds: LinkKind[];
  milestones: Milestone[];
  connections: Connection[];
  branches: Branch[];
  sections: Section[];
  dir: string;
  loc: Loc;
}

export type ReadingStatus = '' | 'to read' | 'reading' | 'read' | 'revisit';
export const STATUSES: ReadingStatus[] = ['to read', 'reading', 'read', 'revisit'];

export interface Highlight {
  locator: string;
  quote: string;
  comment: string;
  loc: Loc;
}

export interface PaperLinks {
  /** The canonical page: arXiv abstract or the url. */
  primary: string;
  abs?: string;
  pdf?: string;
  html?: string;
  code?: string;
  project?: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string;
  citeAs: string;
  published: string;
  year: number | null;
  type: string;
  arxiv: string;
  url: string;
  pdf: string;
  html: string;
  code: string;
  project: string;
  status: ReadingStatus;
  tags: string[];
  added: string;
  /** Markdown under the title, before the first section. */
  summary: string;
  /** Markdown body of the "## Notes" section. */
  notes: string;
  /** Any other sections the human wrote, in order. */
  extra: Part[];
  highlights: Highlight[];
  links: PaperLinks;
  loc: Loc;
}

export interface Content {
  site: Site;
  atlases: Atlas[];
  papers: Paper[];
  diagnostics: Diagnostic[];
}
