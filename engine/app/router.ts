/**
 * A very small router on top of the History API.
 * Links are plain <a href="/…">; App intercepts clicks and calls navigate().
 */
import { useSyncExternalStore } from 'react';

export interface Route {
  name: 'home' | 'atlas' | 'library' | 'paper' | 'about' | 'missing';
  params: Record<string, string>;
  query: URLSearchParams;
  path: string;
}

const listeners = new Set<() => void>();
let snapshot = location.pathname + location.search;

function emit() {
  snapshot = location.pathname + location.search;
  listeners.forEach((l) => l());
}

window.addEventListener('popstate', emit);

export function navigate(to: string, opts: { replace?: boolean; keepScroll?: boolean } = {}) {
  const url = new URL(to, location.href);
  const same = url.pathname + url.search === location.pathname + location.search;
  if (opts.replace || same) history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  else history.pushState(null, '', url.pathname + url.search + url.hash);
  emit();
  if (url.hash) {
    requestAnimationFrame(() => document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  } else if (!opts.keepScroll && !same) {
    window.scrollTo({ top: 0 });
  }
}

export function match(pathAndQuery: string): Route {
  const url = new URL(pathAndQuery, 'http://local');
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const r = (name: Route['name'], params: Record<string, string> = {}): Route => ({ name, params, query: url.searchParams, path: url.pathname });
  if (parts.length === 0) return r('home');
  if (parts[0] === 'atlas' && parts[1] && parts.length <= 3) return r('atlas', { slug: parts[1], milestone: parts[2] ?? '' });
  if (parts[0] === 'library' && parts.length === 1) return r('library');
  if (parts[0] === 'library' && parts.length === 2) return r('paper', { id: parts[1] });
  if (parts[0] === 'about' && parts.length === 1) return r('about');
  return r('missing');
}

export function useRoute(): Route {
  const s = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => snapshot,
  );
  return match(s);
}

/** Intercept clicks on same-origin links so the page does not reload. */
export function installLinkInterceptor() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a');
    if (!a || a.target || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^[a-z]+:/i.test(href) || href.startsWith('//')) return;
    e.preventDefault();
    navigate(href, { keepScroll: a.dataset.keepScroll === 'true' });
  });
}
