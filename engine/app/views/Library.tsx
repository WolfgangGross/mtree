/** Every paper in human/library, filterable by status and tag, plus "add a paper". */
import { useEffect, useMemo, useState } from 'react';
import { parseWhen } from '../../content/dates';
import { arxivIdFrom } from '../../content/deeplinks';
import { STATUSES } from '../../content/types';
import { StatusDot } from '../components/bits';
import { navigate, type Route } from '../router';
import { api, EDITABLE, useContent } from '../store';
import { citedIn } from './PaperPage';

function AddPaper() {
  const [input, setInput] = useState('');
  const [title, setTitle] = useState('');
  const [state, setState] = useState<{ busy: boolean; error: string }>({ busy: false, error: '' });
  const isArxiv = Boolean(arxivIdFrom(input));
  const isUrl = /^https?:\/\//.test(input.trim()) && !isArxiv;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ busy: true, error: '' });
    const r = await api('/paper', { input, title });
    if (r.ok && r.id) navigate(`/library/${r.id}`);
    else setState({ busy: false, error: r.error ?? 'Could not add the paper.' });
  };
  return (
    <form className="add-paper" onSubmit={submit}>
      <span className="label">Add a paper</span>
      <div className="add-fields">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste an arXiv link or id, or any URL" aria-label="arXiv link, id or URL" />
        {isUrl && <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" aria-label="Title" />}
        <button type="submit" className="btn-ink" disabled={state.busy || (!isArxiv && !(isUrl && title.trim()))}>
          {state.busy ? 'Adding…' : 'Add'}
        </button>
      </div>
      <span className="label hint">{isArxiv ? 'Title, authors and date come from arXiv.' : 'Creates human/library/<name>.md with status “to read”.'}</span>
      {state.error && <span className="error">{state.error}</span>}
    </form>
  );
}

export function Library({ route }: { route: Route }) {
  const content = useContent();
  const [query, setQuery] = useState('');
  const status = route.query.get('status') ?? '';
  const tag = route.query.get('tag') ?? '';
  const sort = route.query.get('sort') ?? 'newest';
  useEffect(() => {
    document.title = `Library · ${content.site.title}`;
  }, [content.site.title]);

  const setParam = (key: string, value: string) => {
    const q = new URLSearchParams(route.query);
    if (value) q.set(key, value);
    else q.delete(key);
    navigate(`/library${q.size ? `?${q}` : ''}`, { replace: true, keepScroll: true });
  };

  const cites = useMemo(() => new Map(content.papers.map((p) => [p.id, citedIn(content, p.id).length])), [content]);
  const tags = useMemo(() => [...new Set(content.papers.flatMap((p) => p.tags))].sort(), [content.papers]);
  const q = query.trim().toLowerCase();
  const papers = content.papers
    .filter((p) => !status || (status === 'notes' ? p.notes.trim() || p.highlights.length : status === 'unread' ? !p.status : p.status === status))
    .filter((p) => !tag || p.tags.includes(tag))
    .filter((p) => !q || [p.title, p.authors, p.citeAs, p.published, p.type, p.arxiv, ...p.tags, p.notes].join(' ').toLowerCase().includes(q))
    .sort((a, b) => {
      const wa = parseWhen(a.published) ?? 0;
      const wb = parseWhen(b.published) ?? 0;
      return (sort === 'title' ? a.title.localeCompare(b.title) : sort === 'oldest' ? wa - wb : wb - wa) || a.title.localeCompare(b.title);
    });

  const count = (s: string) => content.papers.filter((p) => (s === 'notes' ? p.notes.trim() || p.highlights.length : s === 'unread' ? !p.status : p.status === s)).length;

  return (
    <div className="page narrow library">
      <h1 className="list-heading">Library</h1>
      <p className="lede">
        {content.papers.length} papers, posts and reports. Each has a page for notes and highlights that link straight back into the source.
      </p>
      {EDITABLE && <AddPaper />}
      <div className="filters">
        <div className="chip-row" role="group" aria-label="Filter by status">
          {[['', 'All', content.papers.length], ...STATUSES.map((s) => [s, s, count(s)]), ['notes', 'with notes', count('notes')]].map(([value, label, n]) => (
            <button key={String(value)} type="button" className="chip" aria-pressed={status === value} onClick={() => setParam('status', String(value))}>
              {label} <span>{n}</span>
            </button>
          ))}
        </div>
        <div className="filter-line">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles, authors, notes" aria-label="Search the library" />
          <select value={tag} onChange={(e) => setParam('tag', e.target.value)} aria-label="Filter by tag">
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setParam('sort', e.target.value === 'newest' ? '' : e.target.value)} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">By title</option>
          </select>
        </div>
      </div>
      <ol className="entries">
        {papers.map((p) => {
          const n = cites.get(p.id) ?? 0;
          const noted = p.notes.trim() || p.highlights.length;
          return (
            <li key={p.id} className="entry">
              <div className="entry-head">
                <a className="entry-title" href={`/library/${p.id}`}>
                  {p.title}
                </a>
                <span className="label entry-date">{p.published}</span>
              </div>
              <p className="entry-text">{p.authors || p.citeAs}</p>
              <div className="tag-row">
                {p.type && <span className="tag">{p.type}</span>}
                {p.tags.map((t) => (
                  <button key={t} type="button" className="tag" onClick={() => setParam('tag', t)}>
                    {t}
                  </button>
                ))}
                <StatusDot status={p.status} />
                {noted ? <span className="tag tag-ink">{p.highlights.length ? `${p.highlights.length} highlights` : 'notes'}</span> : null}
                {n > 0 && <span className="label cited-count">cited by {n}</span>}
              </div>
            </li>
          );
        })}
        {!papers.length && <li className="empty">Nothing matches these filters.</li>}
      </ol>
    </div>
  );
}
