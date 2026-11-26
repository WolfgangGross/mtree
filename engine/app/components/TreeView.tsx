/** The ::tree block: branch tabs, the graph (branch grid or timeline) and the inspector. */
import { useState } from 'react';
import type { Atlas, Branch } from '../../content/types';
import { BranchGraph } from './BranchGraph';
import { Icon, KindSymbol } from './bits';
import { Inspector } from './Inspector';
import { Timeline } from './Timeline';

export type TreeViewMode = 'branches' | 'timeline';

export interface AtlasState {
  selected: string;
  branch: Branch | null;
  view: TreeViewMode;
  select: (id: string, opts?: { branch?: string; view?: TreeViewMode }) => void;
}

export function flatBranch(b: Branch): string[] {
  return b.grid.flat().filter((x): x is string => Boolean(x));
}

export function Legend({ atlas }: { atlas: Atlas }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <footer className="legend">
        {atlas.linkKinds.map((k) => (
          <span key={k.verb} title={k.explanation}>
            <i className={`line-sample line-${k.style}`} /> {k.label}
          </span>
        ))}
        <span className="legend-sep" />
        {atlas.kinds.map((k) => (
          <span key={k.id}>
            <KindSymbol kind={k} size={8} /> {k.label}
          </span>
        ))}
        <button type="button" className="legend-help" aria-expanded={open} aria-label="Explain the connection types" onClick={() => setOpen(!open)}>
          ?
        </button>
      </footer>
      {open && (
        <div className="keynote">
          <p>Read connections from earlier ideas toward later ones; the arrow points at the later idea.</p>
          <ul>
            {atlas.linkKinds.map((k) => (
              <li key={k.verb}>
                <i className={`line-sample line-${k.style}`} /> <strong>{k.label}</strong> (“{k.verb}”): {k.explanation}
              </li>
            ))}
          </ul>
          <p>Connections to milestones on other branches are listed in the details panel.</p>
        </div>
      )}
    </>
  );
}

export function TreeView({ atlas, state }: { atlas: Atlas; state: AtlasState }) {
  const { selected, branch, view, select } = state;
  const milestone = atlas.milestones.find((m) => m.id === selected) ?? atlas.milestones[0];
  if (!milestone) return <p className="empty">This atlas has no milestones yet. Add some to milestones.md.</p>;

  const byDate = [...atlas.milestones].sort((a, b) => (a.when ?? 9999) - (b.when ?? 9999));
  const sequence = view === 'branches' && branch ? flatBranch(branch) : byDate.map((m) => m.id);
  const index = Math.max(0, sequence.indexOf(milestone.id));
  const position = view === 'branches' && branch ? `${index + 1} of ${sequence.length} · ${branch.short}` : `${index + 1} of ${sequence.length} · by date`;
  const next = () => select(sequence[(index + 1) % sequence.length]);

  return (
    <div className="tree">
      <div className="tree-bar">
        <div className="branch-tabs" aria-label="Branches">
          {atlas.branches.map((b) => (
            <button key={b.id} type="button" aria-pressed={view === 'branches' && branch?.id === b.id} onClick={() => select(b.start || flatBranch(b)[0], { branch: b.id, view: 'branches' })}>
              <Icon name={b.icon} size={15} />
              {b.short}
            </button>
          ))}
        </div>
        <div className="view-toggle" aria-label="View">
          <button type="button" aria-pressed={view === 'branches'} onClick={() => select(selected, { view: 'branches' })} disabled={!atlas.branches.length}>
            Branches
          </button>
          <button type="button" aria-pressed={view === 'timeline'} onClick={() => select(selected, { view: 'timeline' })}>
            Timeline
          </button>
        </div>
      </div>
      <div className={`tree-layout${view === 'timeline' || !branch ? ' is-timeline' : ''}`}>
        <section className="graph-box" aria-label="Milestone graph">
          <header className="graph-head">
            <span className="graph-title">{view === 'timeline' || !branch ? 'Every milestone, by date and kind' : branch.summary || branch.label}</span>
            <span className="label">{view === 'timeline' || !branch ? atlas.milestones.length : flatBranch(branch).length} milestones</span>
          </header>
          {view === 'timeline' || !branch ? <Timeline atlas={atlas} selected={milestone.id} onSelect={(id) => select(id)} /> : <BranchGraph atlas={atlas} branch={branch} selected={milestone.id} onSelect={(id) => select(id)} />}
          <Legend atlas={atlas} />
        </section>
        <aside className="inspector-wrap" id="inspector">
          <Inspector atlas={atlas} milestone={milestone} onSelect={(id) => select(id)} onNext={next} position={position} />
        </aside>
      </div>
    </div>
  );
}
