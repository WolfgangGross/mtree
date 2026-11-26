/**
 * Deep links into papers.
 *
 * A human writes a locator the way they would in a margin note:
 *   p. 4 · page 12 · §3.2 · Section 4 · Appendix B · Figure 3 · Table 6 · "a quoted sentence"
 * and we turn it into the most precise URL we can:
 *   - pages      → the PDF at #page=N
 *   - sections   → the arXiv HTML rendering at its LaTeXML anchor (#S3.SS2)
 *   - figures    → a text fragment on the caption ("Figure 3:")
 *   - quotes     → a text fragment (#:~:text=…) on the HTML page or blog post
 */
import type { Paper, PaperLinks } from './types.ts';

const ARXIV_ID = /^(\d{4}\.\d{4,5})(v\d+)?$|^([a-z-]+(?:\.[A-Z]{2})?\/\d{7})(v\d+)?$/;

export function isArxivId(id: string): boolean {
  return ARXIV_ID.test(id);
}

/** Extract an arXiv id from a URL or bare id; returns '' if none. */
export function arxivIdFrom(input: string): string {
  const s = input.trim();
  if (isArxivId(s)) return s;
  const m = /arxiv\.org\/(?:abs|pdf|html)\/([^?#\s]+?)(?:\.pdf)?(?:[?#].*)?$/i.exec(s);
  if (m && isArxivId(m[1])) return m[1];
  const ar5iv = /ar5iv(?:\.labs)?\.arxiv\.org\/html\/([^?#\s/]+)/i.exec(s);
  if (ar5iv && isArxivId(ar5iv[1])) return ar5iv[1];
  return '';
}

/** arXiv started publishing native HTML in December 2023; ar5iv covers older papers. */
function arxivHtml(id: string): string {
  const m = /^(\d{2})(\d{2})\./.exec(id);
  if (m && Number(m[1] + m[2]) >= 2312) return `https://arxiv.org/html/${id}`;
  return `https://ar5iv.labs.arxiv.org/html/${id}`;
}

type LinkSource = Pick<Paper, 'arxiv' | 'url' | 'pdf' | 'html' | 'code' | 'project'>;

export function paperLinks(p: LinkSource): PaperLinks {
  const links: PaperLinks = { primary: p.url || '' };
  if (p.arxiv) {
    links.abs = `https://arxiv.org/abs/${p.arxiv}`;
    links.pdf = `https://arxiv.org/pdf/${p.arxiv}`;
    links.html = arxivHtml(p.arxiv);
    links.primary = p.url || links.abs;
  }
  if (p.pdf) links.pdf = p.pdf;
  if (p.html) links.html = p.html;
  if (p.code) links.code = p.code;
  if (p.project) links.project = p.project;
  if (!links.primary) links.primary = links.html || links.pdf || links.code || links.project || '';
  return links;
}

export interface DeepLink {
  href: string;
  /** What the link opens: the PDF, the HTML rendering, or the source page. */
  target: 'pdf' | 'html' | 'page';
  /** True when the link lands on the exact spot, not just the document. */
  exact: boolean;
}

const QUOTE = /^["“”'‘’](.+)["“”'‘’]$/s;

export function unquote(s: string): string {
  const m = QUOTE.exec(s.trim());
  return m ? m[1].trim() : '';
}

/**
 * A text fragment for a quote. Long quotes use the `start,end` form so that
 * inline maths or footnote markers in the middle do not break the match.
 */
export function textFragment(quote: string): string {
  const clean = quote.replace(/\s+/g, ' ').trim();
  const enc = (s: string) => encodeURIComponent(s).replace(/-/g, '%2D').replace(/,/g, '%2C');
  const words = clean.split(' ');
  if (words.length <= 8) return `#:~:text=${enc(clean)}`;
  return `#:~:text=${enc(words.slice(0, 4).join(' '))},${enc(words.slice(-4).join(' '))}`;
}

function withHash(url: string, hash: string): string {
  return url.replace(/#.*$/, '') + hash;
}

/** Section "3.2.1" → LaTeXML anchor "S3.SS2.SSS1"; Appendix "B.2" → "A2.SS2". */
function latexmlAnchor(kind: 'section' | 'appendix', path: string): string {
  const parts = path.split('.').filter(Boolean);
  const prefixes = kind === 'section' ? ['S', 'SS', 'SSS'] : ['A', 'SS', 'SSS'];
  return parts
    .slice(0, 3)
    .map((p, i) => {
      const n = i === 0 && kind === 'appendix' && /^[A-Z]$/i.test(p) ? String(p.toUpperCase().charCodeAt(0) - 64) : p;
      return prefixes[i] + n;
    })
    .join('.');
}

export function locate(paper: LinkSource, locator: string, quote = ''): DeepLink {
  const links = paperLinks(paper);
  const loc = locator.trim();
  const q = quote || unquote(loc);
  const htmlOrPage = links.html || links.primary;
  const target = links.html ? 'html' : 'page';

  if (q && htmlOrPage) {
    return { href: withHash(htmlOrPage, textFragment(q)), target, exact: true };
  }

  const page = /^(?:pp?\.?|page|pg\.?)\s*(\d+)/i.exec(loc);
  if (page) {
    if (links.pdf) return { href: `${withHash(links.pdf, '')}#page=${page[1]}`, target: 'pdf', exact: true };
    return { href: links.primary, target: 'page', exact: false };
  }

  const section = /^(?:§\s*|sec(?:tion)?\.?\s+|§)(\d+(?:\.\d+){0,2})\b/i.exec(loc);
  if (section) {
    if (links.html && paper.arxiv) return { href: withHash(links.html, '#' + latexmlAnchor('section', section[1])), target: 'html', exact: true };
    return { href: links.html || links.primary, target, exact: false };
  }

  const appendix = /^(?:appendix|app\.)\s*([A-Z](?:\.\d+){0,2})\b/i.exec(loc);
  if (appendix) {
    if (links.html && paper.arxiv) return { href: withHash(links.html, '#' + latexmlAnchor('appendix', appendix[1])), target: 'html', exact: true };
    return { href: links.html || links.primary, target, exact: false };
  }

  const figure = /^(fig(?:ure)?\.?|table|tab\.?)\s*(\d+)/i.exec(loc);
  if (figure && htmlOrPage) {
    const word = /^t/i.test(figure[1]) ? 'Table' : 'Figure';
    // In LaTeXML and most blogs the caption reads "Figure 3:"; in-text mentions rarely have the colon.
    return { href: withHash(htmlOrPage, textFragment(`${word} ${figure[2]}:`)), target, exact: true };
  }

  return { href: links.primary, target: 'page', exact: false };
}
