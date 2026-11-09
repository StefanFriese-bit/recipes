import { useMemo, useState } from 'preact/hooks';
import { INGREDIENTS } from '../data/ingredients';
import { lineText, swapText } from '../lib/lines';
import { CUISINES, freeRein, fridgeMatches, surprise, type FridgeMatch, type Filters } from '../lib/match';
import { inStock } from '../lib/store';
import { Card, Empty, go, recipeHref, useStore } from '../ui';

type Mode = 'stock' | 'free';
const keep = (k: string, v?: string) => { try { if (v === undefined) return sessionStorage.getItem(k) ?? ''; sessionStorage.setItem(k, v); } catch { /* private mode */ } return v ?? ''; };
const COURSES: [string, string][] = [['', 'Any course'], ['main', 'Mains'], ['soup', 'Soups'], ['salad', 'Salads'], ['side', 'Sides'], ['breakfast', 'Breakfast & brunch'], ['bake', 'Bread & bakes'], ['dessert', 'Puddings']];

function MatchCard({ m }: { m: FridgeMatch }) {
  const buy = m.missing.length;
  return (
    <Card r={m.recipe} badge={buy === 0 ? 'Nothing to buy' : `${buy} to buy`}>
      {m.used.length > 0 && <p class="uses">Uses your {m.used.map((u) => INGREDIENTS[u].name).join(', ')}</p>}
      {buy > 0 && <p class="missing">Buy: {m.missing.map((l) => INGREDIENTS[l.ing].name).join(', ')}</p>}
      {m.covered.map((c) => <p class="swapline">No {INGREDIENTS[c.line.ing].name}? Use {swapText(c.line, c.swap)} (for {lineText(c.line)})</p>)}
    </Card>
  );
}

export function FindScreen({ start }: { start?: Mode }) {
  const s = useStore();
  const [mode, setModeState] = useState<Mode>(() => start ?? ((keep('find-mode') as Mode) || 'stock'));
  const setMode = (m: Mode) => { setModeState(m); keep('find-mode', m); };
  const [allowBuy, setAllowBuy] = useState(false);
  const [f, setF] = useState<Filters>(() => { try { return JSON.parse(keep('disc-f') || '{}'); } catch { return {}; } });
  const upd = (x: Partial<Filters>) => { const n = { ...f, ...x }; setF(n); keep('disc-f', JSON.stringify(n)); };
  const have = inStock(s);
  const fromStock = useMemo(() => fridgeMatches(have, s.hidden, allowBuy ? 3 : 0), [s.stock, s.hidden, allowBuy]);
  const free = useMemo(() => (mode === 'free' ? freeRein(f, have, s.hidden) : []), [mode, f, s.stock, s.hidden]);

  return (
    <div class="page">
      <h1>Find a recipe</h1>
      <div class="segment" role="tablist">
        <button role="tab" aria-selected={mode === 'stock'} class={mode === 'stock' ? 'on' : ''} onClick={() => setMode('stock')}>From my stock</button>
        <button role="tab" aria-selected={mode === 'free'} class={mode === 'free' ? 'on' : ''} onClick={() => setMode('free')}>Free rein</button>
      </div>

      {mode === 'stock' && (
        <>
          <p class="small">Using the {have.length} things in your stock{s.stock.length > have.length ? ` (${s.stock.length - have.length} marked run out are left out)` : ''}. <a href="#/stock">Check your stock first</a></p>
          {s.stock.length === 0
            ? <Empty>Your stock list is empty. <a href="#/stock">Fill it in</a> first, it only takes a minute.</Empty>
            : (
              <>
                <div class="chips">
                  <button class={`chip ${!allowBuy ? 'on' : ''}`} onClick={() => setAllowBuy(false)}>Nothing to buy</button>
                  <button class={`chip ${allowBuy ? 'on' : ''}`} onClick={() => setAllowBuy(true)}>Up to 3 things to buy</button>
                </div>
                {fromStock.length === 0
                  ? <Empty>{allowBuy ? 'Nothing fits yet. Add more to your stock.' : 'Nothing can be made from stock alone. Try "Up to 3 things to buy".'}</Empty>
                  : <p class="small">{fromStock.length} {fromStock.length === 1 ? 'recipe' : 'recipes'}.</p>}
                <div class="cards">{fromStock.slice(0, 80).map((m) => <MatchCard m={m} />)}</div>
              </>
            )}
        </>
      )}

      {mode === 'free' && (
        <>
          <div class="row-between">
            <p class="small">Anything goes: pick something new and shop for it. Each recipe shows what you'd need to buy.</p>
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
          <p class="small">{free.length} recipes{s.hidden.length ? ` (${s.hidden.length} you know are left out)` : ''}.</p>
          <div class="cards">{free.map((m) => <MatchCard m={m} />)}</div>
          {free.length === 0 && <Empty>Nothing fits all of that. Loosen a filter.</Empty>}
        </>
      )}
    </div>
  );
}
