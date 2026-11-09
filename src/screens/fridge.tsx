import { useMemo, useState } from 'preact/hooks';
import { AISLE_NAMES, INGREDIENTS } from '../data/ingredients';
import { lineText, swapText } from '../lib/lines';
import { fridgeMatches } from '../lib/match';
import { clearFridge, toggleFridge } from '../lib/store';
import type { Aisle } from '../types';
import { Card, Empty, Sheet, useStore } from '../ui';

const ALL = Object.values(INGREDIENTS).filter((i) => !i.staple).sort((a, b) => a.name.localeCompare(b.name));
const AISLE_ORDER: Aisle[] = ['veg', 'meat', 'fish', 'dairy', 'bakery', 'frozen', 'pantry', 'world', 'spice'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function FridgeScreen() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [browse, setBrowse] = useState(false);
  const [strict, setStrict] = useState(false);
  const found = q.trim().length >= 2 ? ALL.filter((i) => norm(i.name).includes(norm(q.trim())) || norm(i.plural).includes(norm(q.trim()))).slice(0, 12) : [];
  const matches = useMemo(() => fridgeMatches(s.fridge, s.hidden, strict ? 0 : 3), [s.fridge, s.hidden, strict]);
  const ready = matches.filter((m) => m.missing.length === 0).length;

  return (
    <div class="page">
      <h1>What have you got?</h1>
      <p class="small">Tick what is in your fridge and cupboard. Salt, pepper, oil, sugar and water are taken as there.</p>
      <div class="search">
        <input type="search" placeholder="Type an ingredient, e.g. leeks" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        <button class="btn" onClick={() => setBrowse(true)}>Browse all</button>
      </div>
      {found.length > 0 && (
        <div class="chips">
          {found.map((i) => (
            <button class={`chip ${s.fridge.includes(i.id) ? 'on' : ''}`} onClick={() => { toggleFridge(i.id); setQ(''); }}>
              {s.fridge.includes(i.id) ? '✓ ' : '+ '}{cap(i.name)}
            </button>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && found.length === 0 && <p class="small">Nothing called that. Try a simpler word ("chicken", "cheese").</p>}

      {s.fridge.length > 0 && (
        <>
          <div class="row-between"><h2>In your fridge ({s.fridge.length})</h2><button class="btn ghost small" onClick={clearFridge}>Clear all</button></div>
          <div class="chips">
            {s.fridge.map((id) => <button class="chip on" onClick={() => toggleFridge(id)} aria-label={`Remove ${INGREDIENTS[id]?.name}`}>{cap(INGREDIENTS[id]?.name ?? id)} ✕</button>)}
          </div>
          <div class="row-between">
            <h2>You could make</h2>
            <label class="switch"><input type="checkbox" checked={strict} onChange={() => setStrict(!strict)} /> Nothing to buy</label>
          </div>
          {matches.length === 0
            ? <Empty>No recipes fit yet. Add a few more things, or switch off "Nothing to buy".</Empty>
            : <p class="small">{ready} ready to cook now{strict ? '' : `, ${matches.length - ready} needing 1-3 things`}.</p>}
          <div class="cards">
            {matches.slice(0, 60).map((m) => (
              <Card r={m.recipe} badge={m.missing.length === 0 ? 'Nothing to buy' : `${m.missing.length} to buy`}>
                <p class="uses">Uses your {m.used.map((u) => INGREDIENTS[u].name).join(', ')}</p>
                {m.missing.length > 0 && <p class="missing">Need: {m.missing.map((l) => INGREDIENTS[l.ing].name).join(', ')}</p>}
                {m.covered.map((c) => <p class="swapline">No {INGREDIENTS[c.line.ing].name}? Use {swapText(c.line, c.swap)} (for {lineText(c.line)})</p>)}
              </Card>
            ))}
          </div>
        </>
      )}
      {s.fridge.length === 0 && <Empty>Start by adding two or three things you want to use up.</Empty>}

      {browse && (
        <Sheet title="Tick what you have" onClose={() => setBrowse(false)}>
          {AISLE_ORDER.map((a) => (
            <section>
              <h3>{AISLE_NAMES[a]}</h3>
              <div class="chips">
                {ALL.filter((i) => i.aisle === a).map((i) => (
                  <button class={`chip ${s.fridge.includes(i.id) ? 'on' : ''}`} onClick={() => toggleFridge(i.id)}>{s.fridge.includes(i.id) ? '✓ ' : ''}{cap(i.name)}</button>
                ))}
              </div>
            </section>
          ))}
        </Sheet>
      )}
    </div>
  );
}
