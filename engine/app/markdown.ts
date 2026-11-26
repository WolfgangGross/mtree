/**
 * Markdown → HTML for everything a human writes, with three additions:
 *   [[id]] or [[id|label]]   link to a milestone (or [[atlas-slug]] to an atlas)
 *   [@paper] or [@paper, p. 4] / [@paper, §3.2] / [@paper, "a quote"]   cite a paper, deep-linked
 *   $x$ and $$x$$            maths, rendered with KaTeX
 */
import { Marked, type Tokens } from 'marked';
import katex from 'katex';
import type { Content } from '../content/types';
import { locate, unquote } from '../content/deeplinks';
import { resolveWiki } from '../content/validate';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function milestoneHref(slug: string, id?: string) {
  return id ? `/atlas/${slug}/${id}` : `/atlas/${slug}`;
}

export function locatorLabel(locator: string): string {
  const q = unquote(locator);
  if (q) return `“${q.length > 36 ? q.slice(0, 34).trim() + '…' : q}”`;
  return locator;
}

function math(tex: string, display: boolean) {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' });
  } catch {
    return `<code>${esc(tex)}</code>`;
  }
}

function build(content: Content, atlas?: string): Marked {
  const m = new Marked({ gfm: true, breaks: false });
  m.use({
    extensions: [
      {
        name: 'mathBlock',
        level: 'block',
        start: (src: string) => src.match(/^\$\$/m)?.index,
        tokenizer(src: string) {
          const r = /^\$\$\s*([\s\S]+?)\s*\$\$[ \t]*(?:\n+|$)/.exec(src);
          if (r) return { type: 'mathBlock', raw: r[0], text: r[1] };
        },
        renderer: (t) => `<div class="math-block">${math((t as any).text, true)}</div>`,
      },
      {
        name: 'mathInline',
        level: 'inline',
        start: (src: string) => src.indexOf('$'),
        tokenizer(src: string) {
          const r = /^\$(?!\s)((?:\\\$|[^$\n])+?)(?<!\s)\$(?!\d)/.exec(src);
          if (r) return { type: 'mathInline', raw: r[0], text: r[1] };
        },
        renderer: (t) => math((t as any).text, false),
      },
      {
        name: 'wiki',
        level: 'inline',
        start: (src: string) => src.indexOf('[['),
        tokenizer(src: string) {
          const r = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(src);
          if (r) return { type: 'wiki', raw: r[0], ref: r[1].trim(), label: r[2]?.trim() ?? '' };
        },
        renderer(t) {
          const { ref, label } = t as any;
          const hit = resolveWiki(content, ref, atlas);
          if (!hit) return `<span class="broken-ref" title="No milestone or atlas called ${esc(ref)}">${esc(label || ref)}</span>`;
          const ms = hit.milestone ? hit.atlas.milestones.find((x) => x.id === hit.milestone) : undefined;
          const text = label || ms?.title || hit.atlas.plainTitle;
          return `<a class="mlink" href="${milestoneHref(hit.atlas.slug, hit.milestone)}" data-keep-scroll="${hit.atlas.slug === atlas}">${esc(text)}</a>`;
        },
      },
      {
        name: 'cite',
        level: 'inline',
        start: (src: string) => src.indexOf('[@'),
        tokenizer(src: string) {
          const r = /^\[@([a-z0-9][a-z0-9-]*)(?:\s*,\s*([^\]]+))?\]/i.exec(src);
          if (r) return { type: 'cite', raw: r[0], id: r[1], locator: r[2]?.trim() ?? '' };
        },
        renderer(t) {
          const { id, locator } = t as any;
          const paper = content.papers.find((p) => p.id === id);
          if (!paper) return `<span class="broken-ref" title="Not in the library">@${esc(id)}</span>`;
          const deep = locator ? locate(paper, locator) : { href: paper.links.primary, target: 'page', exact: false };
          const where = locator ? locatorLabel(locator) : '';
          const title = `${paper.title}${paper.published ? ` (${paper.published})` : ''}`;
          return (
            `<span class="cite"><a class="cite-name" href="/library/${esc(id)}" title="${esc(title)}">${esc(paper.citeAs)}</a>` +
            (deep.href
              ? `<a class="cite-loc" href="${esc(deep.href)}" target="_blank" rel="noopener" title="Open ${esc(locator || 'the source')}${deep.target === 'pdf' ? ' in the PDF' : ''}">${where ? esc(where) + ' ' : ''}↗</a>`
              : '') +
            `</span>`
          );
        },
      },
    ],
    renderer: {
      link({ href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
      },
    },
  });
  return m;
}

const cache = new WeakMap<Content, Map<string, Marked>>();

function instance(content: Content, atlas?: string): Marked {
  let byAtlas = cache.get(content);
  if (!byAtlas) cache.set(content, (byAtlas = new Map()));
  const key = atlas ?? '';
  let m = byAtlas.get(key);
  if (!m) byAtlas.set(key, (m = build(content, atlas)));
  return m;
}

export function renderMarkdown(md: string, content: Content, opts: { atlas?: string; inline?: boolean } = {}): string {
  const m = instance(content, opts.atlas);
  return (opts.inline ? m.parseInline(md, { async: false }) : m.parse(md, { async: false })) as string;
}
