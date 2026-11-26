/**
 * Hero figure for any atlas: scattered particles settle into a small tree of
 * nodes and edges. Stages come from "hero stages" (default: Noise, Structure).
 */
import { useEffect, useRef, useState } from 'react';
import type { Hero } from '../../content/types';

const N = 900;

function targets() {
  // A three-level tree: 1 → 3 → 7 nodes, particles sit on nodes and edges.
  const levels = [[0.5], [0.22, 0.5, 0.78], [0.1, 0.24, 0.38, 0.5, 0.62, 0.76, 0.9]];
  const nodes = levels.flatMap((xs, li) => xs.map((x) => [x, 0.2 + li * 0.3] as [number, number]));
  const edges: [number, number][] = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 6], [2, 7], [3, 8], [3, 9], [3, 10]];
  let seed = 7;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: N }, (_, i) => {
    let t: [number, number];
    if (i % 3 === 0) {
      const n = nodes[i % nodes.length];
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.028;
      t = [n[0] + Math.cos(a) * r, n[1] + Math.sin(a) * r * 1.6];
    } else {
      const [a, b] = edges[i % edges.length];
      const k = rand();
      t = [nodes[a][0] + (nodes[b][0] - nodes[a][0]) * k, nodes[a][1] + (nodes[b][1] - nodes[a][1]) * k];
    }
    return { t, s: [rand(), rand()] as [number, number], n: rand() };
  });
}

export function NoiseField({ hero }: { hero: Hero }) {
  const stages = hero.stages.length >= 2 ? hero.stages : ['Noise', 'Structure'];
  const [stage, setStage] = useState(stages.length - 1);
  const ref = useRef<HTMLCanvasElement>(null);
  const level = useRef(stages.length - 1);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pts = targets();
    let raf = 0;
    const paint = () => {
      const { width: w, height: h } = canvas.getBoundingClientRect();
      if (!w || !h) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const k = level.current / (stages.length - 1);
      for (const p of pts) {
        const e = Math.pow(k, 0.6 + p.n);
        const x = (p.s[0] * (1 - e) + p.t[0] * e) * w;
        const y = (p.s[1] * (1 - e) + p.t[1] * e) * h;
        ctx.fillStyle = `rgba(190, 220, 200, ${0.35 + 0.5 * p.n})`;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
    };
    const animate = () => {
      level.current += 0.12 * (stage - level.current);
      paint();
      if (Math.abs(stage - level.current) > 0.005) raf = requestAnimationFrame(animate);
      else level.current = stage;
    };
    animate();
    const ro = new ResizeObserver(paint);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [stage, stages.length]);

  return (
    <figure className="plate hero-plate">
      <div className="plate-canvas">
        <canvas ref={ref} aria-label="Particles settling into a tree" />
      </div>
      <figcaption className="plate-caption">
        <span className="plate-label">
          <i /> {hero.caption || 'Field'}
        </span>
        <span className="plate-stages">
          {stages.map((s, i) => (
            <button key={s} type="button" aria-pressed={stage === i} onClick={() => setStage(i)}>
              {s}
            </button>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
