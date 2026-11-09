import { useMemo, useState } from 'preact/hooks';
import { FAMILIAR } from '../data/familiar';
import { somethingDifferent } from '../lib/match';
import { Card, Empty, useStore } from '../ui';

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
