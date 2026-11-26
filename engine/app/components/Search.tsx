/** Header search over atlases, milestones and papers. Press "/" anywhere to focus. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { plain } from '../../content/doc';
import { navigate } from '../router';
import { useContent } from '../store';
import { Icon } from './bits';

interface Hit {
  kind: 'Atlas' | 'Milestone' | 'Paper';
  title: string;
  meta: string;
  href: string;
  hay: string;
  head: string;
}

export function Search() {
  const content = useContent();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const index = useMemo<Hit[]>(() => {
    const hits: Hit[] = [];
    for (const a of content.atlases) {
      hits.push({ kind: 'Atlas', title: a.plainTitle, meta: a.kicker, href: `/atlas/${a.slug}`, head: a.plainTitle.toLowerCase(), hay: [a.plainTitle, a.kicker, a.summary].join(' ').toLowerCase() });
      for (const m of a.milestones)
        hits.push({
          kind: 'Milestone',
          title: m.title,
          meta: `${m.date} · ${a.plainTitle}`,
          href: `/atlas/${a.slug}/${m.id}`,
          head: `${m.title} ${m.id}`.toLowerCase(),
          hay: [m.title, m.id, m.date, plain(m.lead), ...m.parts.map((p) => p.body)].join(' ').toLowerCase(),
        });
    }
    for (const p of content.papers)
      hits.push({
        kind: 'Paper',
        title: p.title,
        meta: `${p.citeAs} · ${p.published}`,
        href: `/library/${p.id}`,
        head: `${p.title} ${p.id}`.toLowerCase(),
        hay: [p.title, p.id, p.authors, p.published, p.arxiv, ...p.tags, p.notes].join(' ').toLowerCase(),
      });
    return hits;
  }, [content]);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return index
      .filter((h) => words.every((w) => h.hay.includes(w)))
      .map((h) => ({ h, score: (h.head.startsWith(words[0]) ? 3 : 0) + (words.every((w) => h.head.includes(w)) ? 2 : 0) + (h.kind === 'Milestone' ? 0.5 : 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.h);
  }, [q, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !/input|textarea|select/i.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (h: Hit) => {
    setOpen(false);
    setQ('');
    input.current?.blur();
    navigate(h.href);
  };

  return (
    <div className="search" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <Icon name="search" size={13} className="search-icon" />
      <input
        ref={input}
        type="search"
        placeholder="Search"
        value={q}
        aria-label="Search milestones and papers"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(results.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter' && results[active]) go(results[active]);
          else if (e.key === 'Escape') {
            setOpen(false);
            input.current?.blur();
          }
        }}
      />
      <kbd>/</kbd>
      {open && q.trim() && (
        <div className="search-results" role="listbox">
          {results.map((h, i) => (
            <a
              key={h.href}
              href={h.href}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseEnter={() => setActive(i)}
              onClick={(e) => {
                e.preventDefault();
                go(h);
              }}
            >
              <span className="label">{h.kind}</span>
              <span className="hit-title">{h.title}</span>
              <span className="hit-meta">{h.meta}</span>
            </a>
          ))}
          {!results.length && <div className="search-empty">Nothing found for “{q}”.</div>}
        </div>
      )}
    </div>
  );
}
