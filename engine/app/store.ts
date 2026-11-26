/**
 * The current content, kept live: in dev the server pushes a fresh copy
 * whenever a file in human/ changes, and every component re-renders.
 */
import { useSyncExternalStore } from 'react';
import initial from 'virtual:mtree/content';
import type { Content } from '../content/types';

let current: Content = initial;
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useContent(): Content {
  return useSyncExternalStore(subscribe, () => current);
}

export function getContent(): Content {
  return current;
}

if (import.meta.hot) {
  import.meta.hot.on('mtree:content', (next: Content) => {
    current = next;
    listeners.forEach((l) => l());
  });
}

/** True when the dev server is running and can write notes into human/. */
export const EDITABLE = import.meta.env.DEV;

export async function api(path: string, body: unknown): Promise<{ ok: boolean; id?: string; error?: string; existed?: boolean }> {
  const res = await fetch(`/__mtree${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  try {
    return await res.json();
  } catch {
    return { ok: false, error: `The dev server answered ${res.status}.` };
  }
}

/** Ask the dev server to open a human file at a line in your editor. */
export function openInEditor(file: string, line = 1) {
  if (!EDITABLE) return;
  fetch(`/__open-in-editor?file=${encodeURIComponent(`${file}:${line}`)}`);
}
