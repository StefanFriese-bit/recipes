import { useMemo, useState } from 'preact/hooks';
import { FAMILIAR } from '../data/familiar';
import { CUISINES, discover, somethingDifferent, surprise, type Filters } from '../lib/match';
import { Card, Empty, go, recipeHref, useStore } from '../ui';

const POPULAR = ['bolognese', 'roast-chicken', 'chicken-curry', 'braai', 'cottage-pie', 'chicken-stirfry', 'burgers', 'grilled-salmon', 'mac-cheese', 'tacos', 'omelette', 'beef-stew'];
const keep = (k: string, v?: string) => { try { if (v === undefined) return sessionStorage.getItem(k) ?? ''; sessionStorage.setItem(k, v); } catch { /* private mode */ } return v ?? ''; };

export function DifferentScreen() {
  const s = useStore();
  const [q, setQ] = useState(() => keep('diff-q'));
  const set = (v: string) => { setQ(v); keep('diff-q', v); };
  const { familiar, results } = useMemo(() => (q.trim() ? somethingDifferent(q, s.hidden) : { familiar: undefined, results: [] }), [q, s.hidden]);
  return (
    <div class="page">
      <h1>Something different</h1>
      <p class="small">Type a dish you always make. You get new dishes that use the same kind of ingredients.</p>
      <input type="search" placeholder="e.g. spaghetti bolognese" value={q} onInput={(e) => set((e.target as HTMLInputElement).value)} />
      <div class="chips">
        {POPULAR.map((id) => {
          const f = FAMILIAR.find((x) => x.id === id)!;
          return <button class={`chip ${familiar?.id === id ? 'on' : ''}`} onClick={() => set(f.name)}>{f.name}</button>;
        })}
      </div>
      {q.trim() && (
        <>
          {familiar ? <h2>Instead of {familiar.name.toLowerCase()}, try</h2> : results.length > 0 && <h2>Dishes with those ingredients</h2>}
          {results.length === 0 && <Empty>I don't know that dish yet. Try another name, or type its main ingredients ("chicken and leeks").</Empty>}
          <div class="cards">{results.slice(0, 25).map((t) => <Card r={t.recipe}><p class="uses">{t.why}</p></Card>)}</div>
        </>
      )}
    </div>
  );
}

const COURSES: [string, string][] = [['', 'Any course'], ['main', 'Mains'], ['soup', 'Soups'], ['salad', 'Salads'], ['side', 'Sides'], ['breakfast', 'Breakfast & brunch'], ['bake', 'Bread & bakes'], ['dessert', 'Puddings']];

export function DiscoverScreen() {
  const s = useStore();
  const [f, setF] = useState<Filters>(() => { try { return JSON.parse(keep('disc-f') || '{}'); } catch { return {}; } });
  const upd = (x: Partial<Filters>) => { const n = { ...f, ...x }; setF(n); keep('disc-f', JSON.stringify(n)); };
  const list = useMemo(() => discover(f, s.hidden), [f, s.hidden]);
  const hiddenCount = s.hidden.length;
  return (
    <div class="page">
      <div class="row-between">
        <h1>Discover</h1>
        <button class="btn primary" onClick={() => { const r = surprise(s.hidden); if (r) go(recipeHref(r.id)); }}>Surprise me</button>
      </div>
      <input type="search" placeholder="Search: a dish, a country, an ingredient" value={f.text ?? ''} onInput={(e) => upd({ text: (e.target as HTMLInputElement).value })} />
      <div class="chips">
        {([[undefined, 'Any time'], [30, '30 min or less'], [60, '1 hour or less']] as const).map(([v, label]) => (
          <button class={`chip ${f.maxMinutes === v ? 'on' : ''}`} onClick={() => upd({ maxMinutes: v })}>{label}</button>
        ))}
      </div>
      <div class="chips">
        {([[undefined, 'Any effort'], [1, 'Easy'], [3, 'Weekend project']] as const).map(([v, label]) => (
          <button class={`chip ${f.effort === v ? 'on' : ''}`} onClick={() => upd({ effort: v })}>{label}</button>
        ))}
        <button class={`chip ${f.vegetarian ? 'on' : ''}`} onClick={() => upd({ vegetarian: !f.vegetarian })}>Vegetarian</button>
      </div>
      <div class="selects">
        <select value={f.course ?? ''} onChange={(e) => upd({ course: (e.target as HTMLSelectElement).value || undefined })} aria-label="Course">
          {COURSES.map(([v, l]) => <option value={v}>{l}</option>)}
        </select>
        <select value={f.cuisine ?? ''} onChange={(e) => upd({ cuisine: (e.target as HTMLSelectElement).value || undefined })} aria-label="Cuisine">
          <option value="">Any cuisine</option>
          {CUISINES.map((c) => <option value={c}>{c}</option>)}
        </select>
      </div>
      <p class="small">{list.length} recipes{hiddenCount ? ` (${hiddenCount} you know are left out)` : ''}.</p>
      <div class="cards">{list.map((r) => <Card r={r} />)}</div>
      {list.length === 0 && <Empty>Nothing fits all of that. Loosen a filter.</Empty>}
    </div>
  );
}
