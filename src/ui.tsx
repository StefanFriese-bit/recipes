import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Recipe } from './types';
import { getState, subscribe, type State } from './lib/store';

export function useStore(): State {
  const [s, set] = useState(getState());
  useEffect(() => subscribe(() => set(getState())), []);
  return s;
}

// ---- routing (hash) -------------------------------------------------------------------------------------------------
export type Route = { name: 'stock' | 'find' | 'free' | 'different' | 'saved' } | { name: 'recipe'; id: string } | { name: 'cook'; id: string };
export function parseRoute(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, '').split('/');
  if (a === 'r' && b) return { name: 'recipe', id: decodeURIComponent(b) };
  if (a === 'cook' && b) return { name: 'cook', id: decodeURIComponent(b) };
  if (a === 'stock' || a === 'fridge') return { name: 'stock' }; // "fridge" = the first version's address
  if (a === 'discover') return { name: 'free' }; // Discover became Find a recipe > Free rein
  if (a === 'different' || a === 'saved' || a === 'find') return { name: a };
  return { name: 'find' };
}
let current = parseRoute(location.hash);
const routeListeners = new Set<() => void>();
// Listen from the very start, not after the first paint, so no change of address is ever missed.
window.addEventListener('hashchange', () => {
  current = parseRoute(location.hash);
  for (const l of routeListeners) l();
});
export function useRoute(): Route {
  const [r, set] = useState(current);
  useEffect(() => {
    const l = () => set(current);
    routeListeners.add(l);
    return () => { routeListeners.delete(l); };
  }, []);
  return r;
}
export const go = (hash: string) => { location.hash = hash; };
export const recipeHref = (id: string) => `#/r/${encodeURIComponent(id)}`;

// ---- bits -----------------------------------------------------------------------------------------------------------
export const EFFORT = { 1: 'Easy', 2: 'A bit of work', 3: 'Weekend project' } as const;
export function minutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function Meta({ r }: { r: Recipe }) {
  return (
    <span class="meta">
      {r.cuisine} · {minutes(r.minutes)} · {EFFORT[r.effort]}{r.tags.includes('vegetarian') ? ' · Veg' : ''}
    </span>
  );
}

export function Card({ r, children, badge }: { r: Recipe; children?: ComponentChildren; badge?: string }) {
  const s = useStore();
  const fav = s.favourites.includes(r.id);
  return (
    <a class="card" href={recipeHref(r.id)}>
      <div class="card-top">
        <strong>{r.title}</strong>
        {fav && <span class="star" aria-label="Saved">★</span>}
      </div>
      <Meta r={r} />
      {badge && <span class="badge">{badge}</span>}
      <p class="blurb">{r.blurb}</p>
      {children}
    </a>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div class="sheet-back" onClick={onClose}>
      <div class="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div class="sheet-head">
          <h2>{title}</h2>
          <button class="btn ghost" onClick={onClose}>Close</button>
        </div>
        <div class="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ComponentChildren }) {
  return <div class="empty">{children}</div>;
}
