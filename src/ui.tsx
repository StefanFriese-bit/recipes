import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Recipe } from './types';
import { coverEmoji, coverHue } from './lib/cover';
import { getState, subscribe, toggleFavourite, type State } from './lib/store';

export function useStore(): State {
  const [s, set] = useState(getState());
  useEffect(() => subscribe(() => set(getState())), []);
  return s;
}

// ---- routing (hash) -------------------------------------------------------------------------------------------------
export type Route = { name: 'stock' | 'find' | 'free' | 'different' | 'saved' | 'imports' | 'import-new' } | { name: 'recipe'; id: string } | { name: 'cook'; id: string } | { name: 'import-edit'; id: string };
export function parseRoute(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, '').split('/');
  if (a === 'r' && b) return { name: 'recipe', id: decodeURIComponent(b) };
  if (a === 'cook' && b) return { name: 'cook', id: decodeURIComponent(b) };
  if (a === 'stock' || a === 'fridge') return { name: 'stock' }; // "fridge" = the first version's address
  if (a === 'discover') return { name: 'free' }; // Discover became Find a recipe > Free rein
  if (a === 'import' && b === 'new') return { name: 'import-new' };
  if (a === 'import' && b) return { name: 'import-edit', id: decodeURIComponent(b) };
  if (a === 'imports') return { name: 'imports' };
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

/** "Italian · 40 min · Easy · Veg"; an imported recipe says so, and shows only what its picture told us. */
export function metaText(r: Recipe): string {
  const veg = r.tags.includes('vegetarian') ? ' · Veg' : '';
  if (r.tags.includes('imported')) return `Your import${r.minutes ? ` · ${minutes(r.minutes)}` : ''}${veg}`;
  return `${r.cuisine} · ${minutes(r.minutes)} · ${EFFORT[r.effort]}${veg}`;
}
export function Meta({ r }: { r: Recipe }) {
  return <span class="meta">{metaText(r)}</span>;
}

/** The star on a recipe in any list: one tap puts it on (or takes it off) your favourites, without opening it. */
export function FavStar({ r }: { r: Recipe }) {
  const s = useStore();
  const fav = s.favourites.includes(r.id);
  return (
    <button class={`fav-star ${fav ? 'on' : ''}`} aria-pressed={fav} aria-label={fav ? `Take ${r.title} off favourites` : `Add ${r.title} to favourites`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavourite(r.id); }}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 17.3 6.2 21l1.6-6.6L3 9.8l6.7-.6L12 3l2.3 6.2 6.7.6-4.8 4.6 1.6 6.6z" /></svg>
    </button>
  );
}

/** The recipe's picture: a dish emoji on a colour wash (one colour family per cuisine), or its own photo. */
export function Cover({ r, size = 'sm', photo }: { r: Recipe; size?: 'sm' | 'md' | 'hero'; photo?: string }) {
  return (
    <div class={`cover cover-${size}`} style={`--h:${coverHue(r)}`} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : <span>{coverEmoji(r)}</span>}
    </div>
  );
}

export function Card({ r, children, badge }: { r: Recipe; children?: ComponentChildren; badge?: string }) {
  return (
    <div class="card-wrap">
      <a class="card" href={recipeHref(r.id)}>
        <Cover r={r} size="md" />
        <div class="card-text">
          <div class="card-top">
            <strong>{r.title}</strong>
          </div>
          <Meta r={r} />
          {badge && <span class="badge">{badge}</span>}
          {r.blurb && <p class="blurb">{r.blurb}</p>}
          {children}
        </div>
      </a>
      <FavStar r={r} />
    </div>
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
        <div class="sheet-grip" aria-hidden="true" />
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
