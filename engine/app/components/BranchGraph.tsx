/**
 * One branch of the tree: milestones on the grid written in branches.md,
 * with connections routed through the gutters between cards.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { Atlas, Branch } from '../../content/types';
import { KindSymbol } from './bits';

interface Wire {
  key: string;
  d: string;
  arrow: string;
  style: string;
  on: boolean;
}

type Pt = [number, number];

function roundedPath(points: Pt[]): string {
  const pts = points.filter((p, i) => !i || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const prev = pts[i - 1];
    const next = pts[i + 1];
    const l1 = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    const l2 = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const r = Math.min(5, l1 / 2, l2 / 2);
    const before = [p[0] + ((prev[0] - p[0]) * r) / l1, p[1] + ((prev[1] - p[1]) * r) / l1];
    const after = [p[0] + ((next[0] - p[0]) * r) / l2, p[1] + ((next[1] - p[1]) * r) / l2];
    d += ` L${before[0]} ${before[1]} Q${p[0]} ${p[1]} ${after[0]} ${after[1]}`;
  }
  const end = pts[pts.length - 1];
  return d + ` L${end[0]} ${end[1]}`;
}

function arrowHead(points: Pt[]): string {
  const end = points[points.length - 1];
  const prev = points[points.length - 2];
  const dx = Math.sign(end[0] - prev[0]);
  const dy = Math.sign(end[1] - prev[1]);
  return `M${end[0] - dx * 5 - dy * 3} ${end[1] - dy * 5 + dx * 3} L${end[0]} ${end[1]} L${end[0] - dx * 5 + dy * 3} ${end[1] - dy * 5 - dx * 3}`;
}

export function BranchGraph({ atlas, branch, selected, onSelect }: { atlas: Atlas; branch: Branch; selected: string; onSelect: (id: string) => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  const [wires, setWires] = useState<Wire[]>([]);
  const cols = Math.max(1, ...branch.grid.map((r) => r.length));
  const byId = new Map(atlas.milestones.map((m) => [m.id, m]));
  const kinds = new Map(atlas.kinds.map((k) => [k.id, k]));
  const styles = new Map(atlas.linkKinds.map((k) => [k.verb, k.style]));
  const neighbours = new Set(atlas.connections.flatMap((c) => (c.from === selected ? [c.to] : c.to === selected ? [c.from] : [])));

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const tiles = tilesRef.current;
    if (!frame || !tiles) return;
    const draw = () => {
      const f = frame.getBoundingClientRect();
      const b: Record<string, { x: number; t: number; b: number; l: number; r: number; w: number }> = {};
      tiles.querySelectorAll<HTMLElement>('[data-node]').forEach((el) => {
        const r = el.getBoundingClientRect();
        b[el.dataset.node!] = { x: r.x - f.x + r.width / 2, t: r.y - f.y, b: r.bottom - f.y, l: r.x - f.x, r: r.right - f.x, w: r.width };
      });
      const gap = parseFloat(getComputedStyle(tiles).columnGap) || 24;
      const visible = atlas.connections.filter((c) => b[c.from] && b[c.to]);
      // Draw the selected milestone's wires last so they sit on top.
      visible.sort((x, y) => Number([x.from, x.to].includes(selected)) - Number([y.from, y.to].includes(selected)));
      setWires(
        visible.map((c) => {
          const a = b[c.from];
          const z = b[c.to];
          let p: Pt[];
          if (Math.abs(a.t - z.t) < 3) {
            const sign = Math.sign(z.x - a.x) || 1;
            const start = sign > 0 ? a.r : a.l;
            const end = sign > 0 ? z.l : z.r;
            const mid = (a.t + a.b) / 2;
            if (Math.abs(a.x - z.x) > 1.8 * a.w) {
              const lane = a.t - 9;
              p = [[start, mid], [start + sign * gap * 0.3, mid], [start + sign * gap * 0.3, lane], [end - sign * gap * 0.3, lane], [end - sign * gap * 0.3, mid], [end, mid]];
            } else p = [[start, mid], [end, mid]];
          } else {
            const sign = Math.sign(z.t - a.t);
            const start = sign === 1 ? a.b : a.t;
            const end = sign === 1 ? z.t : z.b;
            if (Math.abs(end - start) < 55) {
              const mid = (start + end) / 2;
              p = [[a.x, start], [a.x, mid], [z.x, mid], [z.x, end]];
            } else {
              const side = z.x > a.x ? 1 : z.x < a.x ? -1 : a.x < f.width * 0.5 ? 1 : -1;
              const corridor = side > 0 ? a.r + gap * 0.4 : a.l - gap * 0.4;
              p = [[a.x, start], [a.x, start + sign * 9], [corridor, start + sign * 9], [corridor, end - sign * 10], [z.x, end - sign * 10], [z.x, end]];
            }
          }
          return { key: `${c.from}>${c.to}`, d: roundedPath(p), arrow: arrowHead(p), style: styles.get(c.verb) ?? 'solid', on: c.from === selected || c.to === selected };
        }),
      );
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [atlas, branch, selected]);

  return (
    <div className="branch-graph" ref={frameRef}>
      <svg className="wires" aria-hidden="true">
        {wires.map((w) => (
          <g key={w.key} className={`wire wire-${w.style}${w.on ? ' on' : ''}`}>
            <path d={w.d} />
            <path d={w.arrow} className="wire-arrow" />
          </g>
        ))}
      </svg>
      <div className="tiles" ref={tilesRef} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {branch.grid.map((row, y) =>
          row.map((id, x) => {
            if (!id) return null;
            const m = byId.get(id);
            if (!m) return null;
            const on = id === selected;
            return (
              <button
                key={id}
                type="button"
                className={`node${on ? ' selected' : ''}${selected && !on && neighbours.has(id) ? ' near' : ''}`}
                data-node={id}
                style={{ gridColumn: x + 1, gridRow: y + 1 }}
                aria-pressed={on}
                aria-label={`${m.title}, ${m.date}`}
                onClick={() => onSelect(id)}
              >
                <span className="node-meta">
                  <KindSymbol kind={kinds.get(m.kind)} size={8} />
                  {m.date}
                </span>
                <strong>{m.title}</strong>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
