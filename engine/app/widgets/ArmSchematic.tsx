/**
 * Hero figure: a deterministic point cloud of a robot arm that condenses from noise.
 * Ported from the original Diffusion → Action atlas. Stage labels come from
 * "hero stages" in atlas.md (three stages: noise, structure, action).
 */
import { useEffect, useRef, useState } from 'react';
import type { Hero } from '../../content/types';

type V3 = [number, number, number];
interface Dot { p: V3; c: number[]; r: number; scatter: [number, number]; noise: number }
interface Face { v: [V3, V3, V3]; z: number; c: number[] }

let geometry: { dots: Dot[]; faces: Face[] } | null = null;

function buildGeometry() {
  if (geometry) return geometry;
  const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = (a: V3) => mul(a, 1 / Math.hypot(...a));
  const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  let seed = 3456543;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const light = unit([-0.6, 1, 1.5]);
  const eye = unit([0.24, 0.3, 1]);
  const dots: Dot[] = [];
  const faces: Face[] = [];
  const colors: Record<string, number[]> = { shell: [191, 216, 203], bright: [209, 233, 221], metal: [133, 166, 151], dark: [69, 98, 87], green: [184, 239, 138] };
  function tri(a: V3, b: V3, c: V3, normal: V3, material: string, density = 710) {
    const v = sub(b, a);
    const w = sub(c, a);
    const area = Math.hypot(...cross(v, w)) / 2;
    if (area < 0.000001 || dot(normal, eye) < -0.12) return;
    const shade = 0.34 + 0.66 * Math.max(0, dot(normal, light));
    const color = colors[material];
    const tint = (f: number) => color.map((n) => Math.round(Math.min(255, n * f)));
    faces.push({ v: [a, b, c], z: dot(add(add(a, b), c), eye) / 3, c: tint(shade * 0.38) });
    for (let j = 0, n = Math.ceil(area * density); j < n; j++) {
      let u = rand();
      let k = rand();
      if (u + k > 1) {
        u = 1 - u;
        k = 1 - k;
      }
      const pt = add(a, add(mul(v, u), mul(w, k)));
      dots.push({ p: pt, c: tint(shade * (0.73 + 0.42 * rand())), r: 0.48 + 0.6 * rand(), scatter: [rand() - 0.5, rand() - 0.5], noise: rand() });
    }
  }
  function tube(a: V3, b: V3, ra: number, rb: number, material: string, count = 36, density = 710) {
    const axis = unit(sub(b, a));
    const aux: V3 = Math.abs(axis[1]) < 0.85 ? [0, 1, 0] : [0, 0, 1];
    const u = unit(cross(axis, aux));
    const v = unit(cross(axis, u));
    const at = (i: number) => add(mul(u, Math.cos((i * 2 * Math.PI) / count)), mul(v, Math.sin((i * 2 * Math.PI) / count)));
    for (let i = 0; i < count; i++) {
      const f = at(i);
      const g = at(i + 1);
      const n = unit(add(f, g));
      const p = add(a, mul(f, ra));
      const q = add(a, mul(g, ra));
      const r = add(b, mul(f, rb));
      const s = add(b, mul(g, rb));
      tri(p, q, s, n, material, density);
      tri(p, s, r, n, material, density);
      tri(a, q, p, mul(axis, -1), material, density);
      tri(b, r, s, axis, material, density);
    }
  }
  function box(center: V3, size: V3, material: string) {
    const [x, y, z] = center;
    const [w, h, d] = size.map((n) => n / 2);
    const a = (i: number, j: number, k: number): V3 => [x + i * w, y + j * h, z + k * d];
    const quads: [V3, V3[]][] = [
      [[0, 0, 1], [a(-1, -1, 1), a(1, -1, 1), a(1, 1, 1), a(-1, 1, 1)]],
      [[0, 0, -1], [a(1, -1, -1), a(-1, -1, -1), a(-1, 1, -1), a(1, 1, -1)]],
      [[1, 0, 0], [a(1, -1, 1), a(1, -1, -1), a(1, 1, -1), a(1, 1, 1)]],
      [[-1, 0, 0], [a(-1, -1, -1), a(-1, -1, 1), a(-1, 1, 1), a(-1, 1, -1)]],
      [[0, 1, 0], [a(-1, 1, 1), a(1, 1, 1), a(1, 1, -1), a(-1, 1, -1)]],
      [[0, -1, 0], [a(-1, -1, -1), a(1, -1, -1), a(1, -1, 1), a(-1, -1, 1)]],
    ];
    for (const [n, q] of quads) {
      tri(q[0], q[1], q[2], n, material);
      tri(q[0], q[2], q[3], n, material);
    }
  }
  function link(a: V3, b: V3, r1: number, r2: number) {
    const delta = sub(b, a);
    const p = (t: number) => add(a, mul(delta, t));
    const rings = [[0, 0.83], [0.08, 1], [0.18, 1.02], [0.75, 0.86], [0.88, 0.91], [1, 0.82]];
    for (let i = 1; i < rings.length; i++) {
      const [t0, k0] = rings[i - 1];
      const [t1, k1] = rings[i];
      const rr = (t: number) => r1 * (1 - t) + r2 * t;
      tube(p(t0), p(t1), rr(t0) * k0, rr(t1) * k1, i === 1 ? 'metal' : 'shell', 34);
    }
    const offset: V3 = [0, 0, -r1 * 0.8];
    tube(add(p(0.1), offset), add(p(0.9), offset), 0.052, 0.052, 'dark', 12);
  }
  function joint(p: V3, r: number, depth: number) {
    const at = (z: number) => add(p, [0, 0, z]);
    tube(at(-depth), at(depth * 0.82), r, r, 'metal', 42);
    tube(at(depth * 0.84), at(depth), r * 0.97, r * 0.94, 'bright', 42);
    tube(at(depth * 1.02), at(depth * 1.08), r * 0.7, r * 0.7, 'dark', 38);
    tube(at(depth * 1.09), at(depth * 1.16), r * 0.52, r * 0.52, 'shell', 38);
    for (let i = 0; i < 8; i++) {
      const th = (i * Math.PI) / 4;
      const off: V3 = [r * 0.795 * Math.cos(th), r * 0.795 * Math.sin(th), 0];
      tube(add(at(depth), off), add(at(depth * 1.04), off), r * 0.052, r * 0.052, 'dark', 8);
    }
  }
  const A: V3 = [1.06, 0.68, 0];
  const B: V3 = [1.46, 2.47, -0.06];
  const C: V3 = [-0.34, 3.14, 0.02];
  const D: V3 = [-1.44, 2.3, 0.18];
  const E: V3 = [-1.46, 1.85, 0.18];
  box([1.06, 0.055, 0], [1.13, 0.11, 1.0], 'metal');
  tube([1.06, 0.11, 0], [1.06, 0.28, 0], 0.53, 0.47, 'dark');
  tube([1.06, 0.28, 0], [1.06, 0.41, 0], 0.47, 0.44, 'bright');
  tube([1.06, 0.41, 0], A, 0.4, 0.32, 'metal');
  link(A, B, 0.3, 0.26);
  link(B, C, 0.255, 0.213);
  link(C, D, 0.215, 0.145);
  joint(A, 0.366, 0.3);
  joint(B, 0.323, 0.26);
  joint(C, 0.255, 0.22);
  joint(D, 0.174, 0.16);
  link(D, E, 0.132, 0.13);
  tube(add(E, [0, 0.09, 0]), add(E, [0, -0.02, 0]), 0.169, 0.169, 'dark');
  box(add(E, [0, -0.101, 0]), [0.48, 0.18, 0.245], 'metal');
  for (const sign of [-1, 1]) {
    box(add(E, [sign * 0.196, -0.267, 0]), [0.082, 0.23, 0.14], 'bright');
    tube(add(E, [sign * 0.197, -0.36, 0]), add(E, [sign * 0.138, -0.53, 0]), 0.048, 0.038, 'green', 12);
  }
  box([-1.46, 0.17, 0.18], [0.34, 0.34, 0.34], 'green');
  faces.sort((a, b) => a.z - b.z);
  dots.sort((a, b) => dot(a.p, eye) - dot(b.p, eye));
  geometry = { dots, faces };
  return geometry;
}

export function ArmSchematic({ hero }: { hero: Hero }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stages = hero.stages.length === 3 ? hero.stages : ['Noise', 'Structure', 'Action'];
  const [stage, setStage] = useState(2);
  const levelRef = useRef(2);
  const stageRef = useRef(2);
  const paintRef = useRef<() => void>(() => {});
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { dots, faces } = buildGeometry();
    const B: V3 = [1.46, 2.47, -0.06];
    const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const paint = () => {
      const { width: w, height: h } = canvas.getBoundingClientRect();
      if (!w || !h) return;
      const level = levelRef.current;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const scale = Math.min(h * 0.254, w * 0.163);
      const cx = w * 0.506;
      const cy = h * 0.898;
      const project = ([x, y, z]: V3): [number, number] => [cx + scale * (x - 0.27 * z), cy + scale * (-y + 0.24 * z + 0.06 * x)];
      const line = (a: V3, b: V3, color: string, dash: number[] = []) => {
        const p = project(a);
        const q = project(b);
        ctx.setLineDash(dash);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(...p);
        ctx.lineTo(...q);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      for (let i = -6; i <= 6; i++) {
        const pos = i * 0.48;
        line([-2.9, 0, pos], [2.9, 0, pos], '#33453a');
        line([pos, 0, -2.85], [pos, 0, 2.85], '#33453a');
      }
      const scatter = Math.max(0, 1.25 - level) / 1.25;
      if (scatter < 0.97) {
        ctx.globalAlpha = (1 - scatter) * 0.95;
        for (const f of faces) {
          const [a, b, c] = f.v.map(project);
          ctx.fillStyle = `rgb(${f.c.join(',')})`;
          ctx.beginPath();
          ctx.moveTo(...a);
          ctx.lineTo(...b);
          ctx.lineTo(...c);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      for (const d of dots) {
        const [x, y] = project(d.p);
        const alpha = scatter * (0.3 + d.noise * 0.7);
        const move = alpha * alpha;
        const xx = x + move * (cx + d.scatter[0] * w * 0.95 - x);
        const yy = y + move * (h * 0.46 + d.scatter[1] * h * 0.92 - y);
        ctx.fillStyle = `rgb(${d.c.join(',')})`;
        const r = Math.max(0.48, d.r * scale * 0.013);
        ctx.fillRect(xx, yy, r, r);
      }
      const annotation = (pt: V3, dx: number, dy: number, label: string) => {
        const [x, y] = project(pt);
        const t = x + dx * w;
        ctx.strokeStyle = '#91b098';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(x, y, 2.3, 0, 2 * Math.PI);
        ctx.moveTo(x, y);
        ctx.lineTo(t, y + dy);
        ctx.lineTo(t + (dx > 0 ? 12 : -12), y + dy);
        ctx.stroke();
        ctx.fillStyle = '#bfd2bf';
        ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = dx > 0 ? 'left' : 'right';
        ctx.fillText(label, t + (dx > 0 ? 15 : -15), y + dy + 3);
      };
      if (level > 1.6) {
        ctx.globalAlpha = Math.min(1, (level - 1.6) * 2.5);
        line([-1.46, 0.37, 0.18], [-1.46, 1.28, 0.18], '#b9e89a', [3, 4]);
        if (w > 410) {
          annotation(add(B, [0.08, 0.04, 0.28]), 0.083, -24, 'Joint state');
          annotation([-1.46, 0.38, 0.18], -0.058, -12, 'Target');
        }
        ctx.globalAlpha = 1;
      }
    };
    paintRef.current = paint;
    const ro = new ResizeObserver(paint);
    ro.observe(canvas);
    paint();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const go = (s: number) => {
    setStage(s);
    stageRef.current = s;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      levelRef.current = s;
      paintRef.current();
      return;
    }
    const animate = () => {
      levelRef.current += 0.16 * (stageRef.current - levelRef.current);
      if (Math.abs(stageRef.current - levelRef.current) < 0.01) {
        levelRef.current = stageRef.current;
        rafRef.current = 0;
        paintRef.current();
        return;
      }
      paintRef.current();
      rafRef.current = requestAnimationFrame(animate);
    };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(animate);
  };

  return (
    <figure className="plate hero-plate">
      <div className="plate-canvas arm">
        <canvas ref={canvasRef} aria-label="Illustrative point cloud of a mechanical arm reaching for a cube" />
      </div>
      <figcaption className="plate-caption">
        <span className="plate-label">
          <i /> {hero.caption || 'Schematic'}
        </span>
        <span className="plate-stages" aria-label="Schematic view">
          {stages.map((label, i) => (
            <button key={label} type="button" aria-pressed={stage === i} onClick={() => go(i)}>
              {label}
            </button>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
