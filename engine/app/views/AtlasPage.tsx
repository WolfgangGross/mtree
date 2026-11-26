/** One atlas: cover, then each "## Section" of atlas.md as a band, top to bottom. */
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { Atlas, Section } from '../../content/types';
import { color, EditLink } from '../components/bits';
import { Md } from '../components/Md';
import { flatBranch, type AtlasState, type TreeViewMode } from '../components/TreeView';
import { navigate, type Route } from '../router';
import { useContent } from '../store';
import { BLOCKS, FIGURES, HEROES } from '../widgets/registry';
import { citedPapers } from '../widgets/simple';
import { NotFound } from './NotFound';

function useAtlasState(atlas: Atlas | undefined, route: Route): AtlasState {
  const empty: AtlasState = { selected: '', branch: null, view: 'branches', select: () => {} };
  if (!atlas) return empty;
  const has = (id: string) => atlas.milestones.some((m) => m.id === id);
  const view: TreeViewMode = route.query.get('view') === 'timeline' || !atlas.branches.length ? 'timeline' : 'branches';
  let branch = atlas.branches.find((b) => b.id === route.query.get('in')) ?? null;
  let selected = has(route.params.milestone) ? route.params.milestone : '';
  if (!selected) {
    const b = branch ?? atlas.branches[0];
    selected = (b && (b.start || flatBranch(b)[0])) || atlas.milestones[0]?.id || '';
  }
  if (!branch || !flatBranch(branch).includes(selected)) branch = atlas.branches.find((b) => flatBranch(b).includes(selected)) ?? branch ?? atlas.branches[0] ?? null;

  const select: AtlasState['select'] = (id, opts = {}) => {
    let b = opts.branch ? atlas.branches.find((x) => x.id === opts.branch) ?? branch : branch;
    if (!b || !flatBranch(b).includes(id)) b = atlas.branches.find((x) => flatBranch(x).includes(id)) ?? b;
    const placed = Boolean(b && flatBranch(b).includes(id));
    const v = opts.view ?? (placed ? view : 'timeline');
    const q = new URLSearchParams();
    if (b && v === 'branches') q.set('in', b.id);
    if (v === 'timeline') q.set('view', 'timeline');
    navigate(`/atlas/${atlas.slug}/${id}${q.size ? `?${q}` : ''}`, { replace: true, keepScroll: true });
  };
  return { selected, branch, view, select };
}

function SectionBand({ atlas, section, state }: { atlas: Atlas; section: Section; state: AtlasState }) {
  const render = (b: Section['blocks'][number], i: number) => {
    if (b.type === 'prose') return <Md key={i} source={b.md} atlas={atlas.slug} />;
    const Block = BLOCKS[b.name as keyof typeof BLOCKS];
    if (!Block)
      return (
        <p key={i} className="broken-block">
          Unknown block “{b.name}” at {b.loc.file}:{b.loc.line}
        </p>
      );
    return (
      <div key={i} className={`block block-${b.name}`}>
        <Block atlas={atlas} state={state} args={b.args} body={b.body} />
      </div>
    );
  };
  const figures = section.blocks.filter((b) => b.type === 'directive' && FIGURES.has(b.name));
  const rest = section.blocks.filter((b) => !figures.includes(b));
  return (
    <section id={section.id} className={`band band-${section.layout}`}>
      <div className="wrap">
        <header className="band-head">
          <div>
            {section.kicker && (
              <span className="kicker">
                <i /> {section.kicker}
              </span>
            )}
            <h2>{section.title}</h2>
          </div>
          {section.intro && <Md source={section.intro} atlas={atlas.slug} inline as="p" className="band-intro" />}
        </header>
        {section.layout === 'split' && figures.length ? (
          <div className="split">
            <div className="split-text">{rest.map(render)}</div>
            <div className="split-figure">{figures.map(render)}</div>
          </div>
        ) : (
          section.blocks.map(render)
        )}
      </div>
    </section>
  );
}

export function AtlasPage({ route }: { route: Route }) {
  const content = useContent();
  const atlas = content.atlases.find((a) => a.slug === route.params.slug);
  const state = useAtlasState(atlas, route);
  const first = useRef(true);
  const sources = useMemo(() => (atlas ? citedPapers(atlas, content.papers).length : 0), [atlas, content.papers]);

  useEffect(() => {
    if (atlas) document.title = `${atlas.plainTitle} · ${content.site.title}`;
  }, [atlas, content.site.title]);

  // Bring the details panel into view when a milestone is chosen from elsewhere on the page.
  useEffect(() => {
    const wasFirst = first.current;
    first.current = false;
    if (!route.params.milestone) return;
    const insp = document.getElementById('inspector');
    if (!insp) return;
    const r = insp.getBoundingClientRect();
    const visible = r.top < innerHeight - 120 && r.bottom > 120;
    if (!visible || wasFirst) {
      const mobile = matchMedia('(max-width: 860px)').matches;
      const section = insp.closest('section') ?? insp;
      // On a fresh load, wait for web fonts so the page above has its final height.
      if (wasFirst) document.fonts.ready.then(() => requestAnimationFrame(() => section.scrollIntoView({ block: 'start' })));
      else (mobile ? insp : section).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state.selected, route.params.milestone]);

  if (!atlas) return <NotFound what={`atlas called “${route.params.slug}”`} />;
  const Hero = atlas.hero ? HEROES[atlas.hero.widget as keyof typeof HEROES] : null;
  const nav = atlas.sections.filter((s) => s.nav);
  const [plainHead, ...kickerRest] = atlas.kicker.split('/');

  return (
    <div className="atlas-page" style={{ '--accent': color(atlas.accent, 'var(--accent)') } as CSSProperties}>
      <div className="atlas-bar">
        <div className="wrap atlas-bar-in">
          <a className="atlas-bar-title" href={`/atlas/${atlas.slug}`} onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0, behavior: 'smooth' }))}>
            {atlas.plainTitle}
          </a>
          <nav aria-label="On this page">
            {nav.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.nav}
              </a>
            ))}
            <EditLink file={atlas.loc.file} line={atlas.loc.line} label="atlas.md" />
          </nav>
        </div>
      </div>
      <section className="cover">
        <div className={`wrap cover-grid${Hero ? '' : ' no-hero'}`}>
          <div className="cover-copy">
            {atlas.kicker && (
              <span className="kicker">
                <i /> {plainHead.trim()}
                {kickerRest.length > 0 && <em> / {kickerRest.join('/').trim()}</em>}
              </span>
            )}
            <Md as="h1" inline source={atlas.title} className="cover-title" />
            {atlas.summary && <Md source={atlas.summary} atlas={atlas.slug} className="cover-summary" />}
            {atlas.actions.length > 0 && (
              <div className="cover-actions">
                {atlas.actions.map((a, i) => (
                  <a key={a.href + i} href={a.href} className={i === 0 ? 'btn-ink' : 'btn-plain'}>
                    {a.label}
                  </a>
                ))}
              </div>
            )}
            <div className="cover-meta label">
              {atlas.milestones.length} milestones · {atlas.connections.length} connections · {sources} sources
              {atlas.updated ? ` · updated ${atlas.updated}` : ''}
            </div>
          </div>
          {Hero && atlas.hero && <Hero hero={atlas.hero} />}
        </div>
      </section>
      {atlas.sections.map((s) => (
        <SectionBand key={s.id} atlas={atlas} section={s} state={state} />
      ))}
    </div>
  );
}
