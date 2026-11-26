/**
 * :::control-loop — a tabletop walkthrough of observe → predict → act → replan.
 * Ported from the original atlas. The steps and labels are written in atlas.md:
 *
 *   :::control-loop “Put the cube in the bowl.”
 *   perturb:  Move the bowl
 *   **Observe** — Read the current scene
 *   The camera locates …
 *   :::
 */
import { useEffect, useRef, useState } from 'react';
import { paragraphs, parseFactLine } from '../../content/doc';
import { Md } from '../components/Md';

export interface Step {
  label: string;
  title: string;
  text: string;
}

export function parseLoop(body: string) {
  const facts: Record<string, string> = {};
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length && (lines[i].trim() === '' || parseFactLine(lines[i]))) {
    const f = parseFactLine(lines[i]);
    if (f) facts[f.key] = f.value;
    i++;
  }
  const steps: Step[] = paragraphs(lines.slice(i).join('\n'), 1).map((p) => {
    const [first, ...rest] = p.text.split('\n');
    const m = /^\*\*(.+?)\*\*\s*[—–:-]?\s*(.*)$/.exec(first.trim());
    return m ? { label: m[1], title: m[2], text: rest.join(' ') } : { label: first, title: '', text: rest.join(' ') };
  });
  return { facts, steps };
}

export function ControlLoop({ args, body, atlas }: { args: string; body: string; atlas: string }) {
  const { facts, steps } = parseLoop(body);
  const [step, setStep] = useState(0);
  const [bowlMoved, setBowlMoved] = useState(false);
  const [plannedForMoved, setPlannedForMoved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = steps.length - 1;

  useEffect(() => {
    const lab = canvasRef.current;
    const c = lab?.getContext('2d');
    if (!lab || !c) return;
    const draw = () => {
      const { width: w, height: h } = lab.getBoundingClientRect();
      if (!w || !h) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      lab.width = Math.round(w * dpr);
      lab.height = Math.round(h * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      const scale = Math.min(w / 440, h / 210);
      c.translate((w - 440 * scale) / 2, (h - 210 * scale) / 2);
      c.scale(scale, scale);
      for (let x = -30; x < 475; x += 15)
        for (let y = 4; y < 225; y += 15) {
          c.fillStyle = '#385043';
          c.fillRect(x, y, 1.25, 1.25);
        }
      const goals: [number, number][] = [[339, 143], [311, 62]];
      const goal = goals[+bowlMoved];
      const old = goals[+plannedForMoved];
      const cube: [number, number] = step < 2 ? [185, 105] : [235, 82];
      const tip: [number, number] = step < 2 ? [141, 133] : [235, 82];
      const ring = (x: number, y: number, r: number, stroke: string, line = 1) => {
        c.strokeStyle = stroke;
        c.lineWidth = line;
        c.beginPath();
        c.arc(x, y, r, 0, 2 * Math.PI);
        c.stroke();
      };
      ring(goal[0], goal[1], 24, '#b8d6d5', 2);
      ring(goal[0], goal[1], 18, '#698f8b', 1.4);
      if (bowlMoved && !plannedForMoved && step > 0) {
        c.setLineDash([2, 4]);
        ring(old[0], old[1], 21, '#799184', 1);
        c.setLineDash([]);
      }
      if (step > 0) {
        c.strokeStyle = '#bcea99';
        c.lineWidth = 2;
        c.setLineDash([4, 5]);
        c.beginPath();
        const from = step === 1 ? tip : cube;
        c.moveTo(...from);
        if (step === 1) c.quadraticCurveTo(156, 126, 185, 105);
        c.quadraticCurveTo(234, 52, old[0], old[1]);
        c.stroke();
        c.setLineDash([]);
      }
      const base: [number, number] = [60, 156];
      const elbow: [number, number] = step < 2 ? [85, 67] : [132, 51];
      const bar = (a: [number, number], b: [number, number], color: string, width: number) => {
        c.strokeStyle = color;
        c.lineWidth = width;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(...a);
        c.lineTo(...b);
        c.stroke();
      };
      bar(base, elbow, '#94aea0', 12);
      bar(elbow, tip, '#bdd1be', 8);
      for (const [x, y, r] of [[...base, 13], [...elbow, 8], [...tip, 5]]) {
        c.fillStyle = '#283d33';
        c.beginPath();
        c.arc(x, y, r, 0, 2 * Math.PI);
        c.fill();
        ring(x, y, r, '#bed3bf', 2);
      }
      c.save();
      c.translate(...cube);
      c.rotate(0.17);
      c.fillStyle = '#dfaa74';
      c.fillRect(-7, -7, 14, 14);
      c.restore();
      c.font = '12px "JetBrains Mono", ui-monospace, monospace';
      c.fillStyle = '#b3c5b8';
      c.fillText('Gripper', base[0] - 15, base[1] + 30);
      c.fillStyle = '#d3b293';
      c.fillText('Cube', cube[0] - 13, cube[1] + 26);
      c.fillStyle = '#b3d2cf';
      c.fillText('Bowl', goal[0] - 14, goal[1] + 42);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(lab);
    return () => ro.disconnect();
  }, [step, bowlMoved, plannedForMoved]);

  if (!steps.length) return <p className="empty">This control loop has no steps yet.</p>;

  const selectStep = (i: number) => {
    if (i === 0 || i < step) {
      setBowlMoved(false);
      setPlannedForMoved(false);
    } else if (i === last) setPlannedForMoved(bowlMoved);
    setStep(i);
  };
  const note = bowlMoved ? (step === last ? facts['replanned note'] ?? '' : facts['moved note'] ?? '') : '';
  const current = steps[Math.min(step, last)];

  return (
    <div className="loop-card">
      <div className="plate loop-scene">
        <div className="plate-caption top">
          <span className="plate-label">Tabletop view</span>
          <span className="plate-label">Illustration</span>
        </div>
        <canvas ref={canvasRef} aria-label="Top-down schematic of a gripper, a cube and a target bowl" />
        <div className="scene-legend">
          <span>
            <i className="dot-cube" /> Cube
          </span>
          <span>
            <i className="dot-bowl" /> Bowl
          </span>
          <span>
            <i className="dot-path" /> Predicted path
          </span>
        </div>
      </div>
      <div className="loop-copy">
        <span className="label">Instruction</span>
        <h3>{args || 'Control loop'}</h3>
        <div className="step-tabs" aria-label="Control loop steps">
          {steps.map((s, i) => (
            <button key={s.label} type="button" aria-pressed={i === step} onClick={() => selectStep(i)}>
              {s.label}
            </button>
          ))}
        </div>
        <h4>{current.title}</h4>
        <Md source={current.text} atlas={atlas} inline as="p" className="step-text" />
        <div className="loop-actions">
          <button type="button" className="btn-ink" onClick={() => selectStep((step + 1) % steps.length)}>
            {step === last ? 'Restart example' : 'Next step'}
          </button>
          {facts.perturb && (
            <button type="button" className="btn-plain" disabled={step === 0 || step === last || bowlMoved} onClick={() => setBowlMoved(true)}>
              {facts.perturb}
            </button>
          )}
        </div>
        <div className="scene-note" role="status">
          {note}
        </div>
      </div>
    </div>
  );
}
