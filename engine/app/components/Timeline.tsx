/**
 * Every milestone of an atlas on one timeline, in lanes by kind.
 * Laid out automatically, so new milestones appear here before you place them in a branch.
 * Busy years get more room; empty stretches are squeezed.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Atlas, Milestone } from '../../content/types';
import { color, KindSymbol } from './bits';

const ROW = 30;
const LANE_TOP = 30;
const LANE_BOTTOM = 12;
const AXIS = 34;

let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(s: string, font: string) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return s.length * 7;
  measureCtx.font = font;
  return measureCtx.measureText(s).width;
}

interface Placed {
  m: Milestone;
  x: number;
  y: number;
  x0: number;
  x1: number;
  flip: boolean;
}

function layout(atlas: Atlas, width: number, font: string) {
  const dated = atlas.milestones.filter((m) => m.when != null).sort((a, b) => a.when! - b.when!);
  if (!dated.length) return null;
  const minY = Math.floor(dated[0].when!);
  const maxY = Math.floor(dated[dated.length - 1].when!);
  const years: { year: number; count: number; weight: number; x: number; w: number }[] = [];
  for (let y = minY; y <= maxY; y++) {
    const count = dated.filter((m) => Math.floor(m.when!) === y).length;
    years.push({ year: y, count, weight: count ? 1 + 0.8 * (count - 1) : 0.3, x: 0, w: 0 });
  }
  const padL = 14;
  const padR = 14;
  const total = years.reduce((s, y) => s + y.weight, 0);
  let x = padL;
  for (const y of years) {
    y.w = ((width - padL - padR) * y.weight) / total;
    y.x = x;
    x += y.w;
  }
  // Inside a year, spread milestones evenly in date order.
  const xOf = new Map<string, number>();
  for (const y of years) {
    const inYear = dated.filter((m) => Math.floor(m.when!) === y.year);
    inYear.forEach((m, i) => xOf.set(m.id, y.x + ((i + 0.5) / inYear.length) * y.w));
  }

  const lanes = atlas.kinds.length ? atlas.kinds.map((k) => k.id) : [''];
  const extra = [...new Set(atlas.milestones.map((m) => m.kind).filter((k) => !lanes.includes(k)))];
  const allLanes = [...lanes, ...extra];
  const placed: Placed[] = [];
  let top = AXIS;
  const laneBands: { kind: string; top: number; height: number }[] = [];
  for (const kind of allLanes) {
    const rows: number[] = [];
    const rowSpans: [number, number][][] = [];
    const inLane = dated.filter((m) => (m.kind || '') === kind);
    const local: Placed[] = [];
    for (const m of inLane) {
      const cx = xOf.get(m.id)!;
      // dot + gap + padding + border, plus a little air so text never ellipsises
      const w = Math.ceil(textWidth(m.title, font)) + 32;
      // Label to the right of the dot, or to the left; fits the left edge / right edge.
      const right = { flip: false, x0: cx - 6, x1: cx + w - 6 };
      const left = { flip: true, x0: cx - w + 6, x1: cx + 6 };
      const options = [right, left].filter((o) => o.x0 >= 2 && o.x1 <= width - 2);
      if (!options.length) options.push(cx < width / 2 ? right : left);
      // Each row remembers the intervals it holds; take the first row and side that fit.
      let chosen: { row: number; o: (typeof options)[number] } | null = null;
      for (let r = 0; r < rows.length && !chosen; r++) {
        for (const o of options) {
          if (rowSpans[r].every(([a, b]) => o.x0 > b + 6 || o.x1 < a - 6)) {
            chosen = { row: r, o };
            break;
          }
        }
      }
      if (!chosen) {
        rows.push(0);
        rowSpans.push([]);
        chosen = { row: rows.length - 1, o: options[0] };
      }
      rowSpans[chosen.row].push([chosen.o.x0, chosen.o.x1]);
      local.push({ m, x: cx, y: chosen.row, x0: chosen.o.x0, x1: chosen.o.x1, flip: chosen.o.flip });
    }
    const height = LANE_TOP + Math.max(1, rows.length) * ROW + LANE_BOTTOM;
    for (const p of local) placed.push({ ...p, y: top + LANE_TOP + p.y * ROW + ROW / 2 });
    laneBands.push({ kind, top, height });
    top += height;
  }
  return { years, placed, lanes: laneBands, height: top + 8 };
}

export function Timeline({ atlas, selected, onSelect }: { atlas: Atlas; selected: string; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [fontsReady, setFontsReady] = useState(document.fonts?.status === 'loaded');
  useLayoutEffect(() => {
    if (!fontsReady) document.fonts?.ready.then(() => setFontsReady(true));
  }, [fontsReady]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(880, el.clientWidth)));
    ro.observe(el);
    setWidth(Math.max(880, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const font = '500 12.5px Inter, system-ui, sans-serif';
  const L = useMemo(() => (width ? layout(atlas, width, font) : null), [atlas, width, fontsReady]);
  const kinds = new Map(atlas.kinds.map((k) => [k.id, k]));
  const styles = new Map(atlas.linkKinds.map((k) => [k.verb, k.style]));
  const pos = new Map(L?.placed.map((p) => [p.m.id, p]) ?? []);
  const near = new Set(atlas.connections.flatMap((c) => (c.from === selected ? [c.to] : c.to === selected ? [c.from] : [])));
  const undated = atlas.milestones.filter((m) => m.when == null);

  return (
    <div className="timeline-scroll" ref={ref}>
      {L && (
        <div className="timeline" style={{ width, height: L.height }}>
          <svg width={width} height={L.height} className="timeline-svg" aria-hidden="true">
            {L.years.map((y) => (
              <g key={y.year}>
                <line x1={y.x} x2={y.x} y1={AXIS - 8} y2={L.height} className={y.count ? 'year-rule' : 'year-rule faint'} />
                {y.count > 0 && (
                  <text x={y.x + 6} y={18} className="year-label">
                    {y.year}
                  </text>
                )}
                {y.count === 0 && y.w > 14 && (
                  <text x={y.x + y.w / 2} y={18} className="year-gap" textAnchor="middle">
                    ·
                  </text>
                )}
              </g>
            ))}
            {L.lanes.map((lane, i) => (
              <g key={lane.kind}>
                {i > 0 && <line x1={0} x2={width} y1={lane.top} y2={lane.top} className="lane-rule" />}
              </g>
            ))}
            {[...atlas.connections]
              .sort((a, b) => Number([a.from, a.to].includes(selected)) - Number([b.from, b.to].includes(selected)))
              .map((c) => {
                const a = pos.get(c.from);
                const b = pos.get(c.to);
                if (!a || !b) return null;
                const dx = Math.max(24, Math.abs(b.x - a.x) / 2);
                const on = c.from === selected || c.to === selected;
                const d = `M${a.x} ${a.y} C${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`;
                return <path key={`${c.from}>${c.to}`} d={d} className={`tl-wire wire-${styles.get(c.verb) ?? 'solid'}${on ? ' on' : selected ? ' off' : ''}`} />;
              })}
          </svg>
          {L.lanes.map((lane) => (
            <div key={lane.kind} className="lane-label" style={{ top: lane.top + 9 }}>
              <KindSymbol kind={kinds.get(lane.kind)} size={8} /> {kinds.get(lane.kind)?.label ?? 'Other'}
            </div>
          ))}
          {L.placed.map((p) => {
            const on = p.m.id === selected;
            const dim = selected && !on && !near.has(p.m.id);
            return (
              <button
                key={p.m.id}
                type="button"
                className={`tl-node${on ? ' selected' : ''}${dim ? ' dim' : ''}${p.flip ? ' flip' : ''}`}
                style={{ left: p.x0, top: p.y - 11, width: p.x1 - p.x0, '--kind': color(kinds.get(p.m.kind)?.color) } as React.CSSProperties}
                onClick={() => onSelect(p.m.id)}
                title={`${p.m.title} · ${p.m.date}`}
                aria-pressed={on}
              >
                <i className="tl-dot" />
                <span>{p.m.title}</span>
              </button>
            );
          })}
        </div>
      )}
      {undated.length > 0 && <p className="timeline-note">Not on the timeline (no date): {undated.map((m) => m.title).join(', ')}</p>}
    </div>
  );
}
