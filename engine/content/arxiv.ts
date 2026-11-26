/**
 * Fetch title, authors and date for an arXiv id from the public arXiv API.
 * Used by "Add paper" in the library and `npm run add-paper`.
 */
import { arxivIdFrom } from './deeplinks.ts';

export interface ArxivMeta {
  id: string;
  title: string;
  authors: string[];
  published: string;
  categories: string[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function decode(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseArxivAtom(xml: string): ArxivMeta | null {
  const entry = /<entry>([\s\S]*?)<\/entry>/.exec(xml)?.[1];
  if (!entry) return null;
  const idUrl = /<id>([^<]+)<\/id>/.exec(entry)?.[1] ?? '';
  const id = arxivIdFrom(idUrl).replace(/v\d+$/, '');
  const title = decode(/<title>([\s\S]*?)<\/title>/.exec(entry)?.[1] ?? '');
  if (!id || !title) return null;
  const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => decode(m[1]));
  const date = /<published>(\d{4})-(\d{2})/.exec(entry);
  const published = date ? `${MONTHS[Number(date[2]) - 1]} ${date[1]}` : '';
  const categories = [...entry.matchAll(/<category[^>]*term="([^"]+)"/g)].map((m) => m[1]);
  return { id, title, authors, published, categories };
}

export async function fetchArxiv(input: string): Promise<ArxivMeta> {
  const id = arxivIdFrom(input).replace(/v\d+$/, '');
  if (!id) throw new Error(`"${input}" is not an arXiv link or id.`);
  const res = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`, {
    headers: { 'User-Agent': 'mtree-atlas/0.1 (local notes app)' },
  });
  if (!res.ok) throw new Error(`arXiv answered ${res.status}.`);
  const meta = parseArxivAtom(await res.text());
  if (!meta) throw new Error(`arXiv has no paper with id ${id}.`);
  return meta;
}

/** Up to four names in full, otherwise the first three and "et al." */
export function formatAuthors(authors: string[]): string {
  if (authors.length <= 4) return authors.join(', ');
  return `${authors.slice(0, 3).join(', ')} et al.`;
}
