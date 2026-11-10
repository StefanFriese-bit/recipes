import { useState } from 'preact/hooks';
import { INGREDIENTS } from '../data/ingredients';
import {
  PLACES, addManyStock, addOwnStock, addStock, allBackIn, inStock, isOwn, knownIngredient, moveStock, onList, removeStock, stockName, toggleOut, type Place,
} from '../lib/store';
import { Empty, Sheet, useStore } from '../ui';

const ALL = Object.values(INGREDIENTS).filter((i) => !i.staple).sort((a, b) => a.name.localeCompare(b.name));
export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const PLACE_NAMES: Record<Place, string> = { pantry: 'Pantry & cupboard', fridge: 'Fridge', freezer: 'Freezer' };

// What most kitchens keep all the time: one tap to start the list, then remove what you don't keep.
export const BASICS = ['onion', 'garlic', 'potato', 'carrot', 'lemon', 'eggs', 'butter', 'milk', 'cheddar', 'parmesan', 'plain-yoghurt',
  'plain-flour', 'rice', 'spaghetti', 'pasta-short', 'chopped-tomatoes', 'tomato-paste', 'chicken-stock', 'soy-sauce', 'honey', 'dijon',
  'mayonnaise', 'ketchup', 'red-wine-vinegar', 'cumin', 'smoked-paprika', 'paprika', 'chilli-flakes', 'dried-oregano', 'curry-powder',
  'cinnamon', 'bay-leaf', 'peas', 'corn'];

export function StockScreen() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [browse, setBrowse] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const t = norm(q.trim());
  const found = t.length >= 2 ? ALL.filter((i) => norm(i.name).includes(t) || norm(i.plural).includes(t)).slice(0, 12) : [];
  const outCount = s.stock.filter((x) => x.out).length;
  const item = editing ? s.stock.find((x) => x.ing === editing) : undefined;
  // Offer "add as my own" unless the typed word is exactly an ingredient we know (then its chip is the way).
  const known = t.length >= 2 ? knownIngredient(q) : undefined;
  const ownName = q.trim().replace(/\s+/g, ' ');

  return (
    <div class="page">
      <h1>Your stock</h1>
      <p class="small">What you normally keep in the pantry, fridge and freezer. Ran out of something? Tap it to mark it out; it stays on the list. Salt, pepper, oil, sugar and water are always counted as there.</p>
      <div class="search">
        <input type="search" placeholder="Add an ingredient, e.g. leeks" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        <button class="btn" onClick={() => setBrowse(true)}>Browse all</button>
      </div>
      {found.length > 0 && (
        <div class="chips">
          {found.map((i) => (
            <button class={`chip ${onList(s, i.id) ? 'on' : ''}`} onClick={() => { addStock(i.id); setQ(''); }}>
              {onList(s, i.id) ? '✓ ' : '+ '}{cap(i.name)}
            </button>
          ))}
        </div>
      )}
      {t.length >= 2 && !known && (
        <div class="own-add">
          <p class="small">{found.length === 0 ? 'Not on our list.' : 'Not the one?'} Add "{ownName}" as your own to:</p>
          <div class="chips">
            {PLACES.map((p) => (
              <button class="chip" onClick={() => { addOwnStock(ownName, p); setQ(''); }}>+ {PLACE_NAMES[p]}</button>
            ))}
          </div>
        </div>
      )}

      {s.stock.length === 0 && (
        <Empty>
          Your list is empty.<br />
          <button class="btn primary" style="margin-top:12px" onClick={() => addManyStock(BASICS)}>Start with the usual basics</button>
          <p class="small">Adds {BASICS.length} everyday things (onions, eggs, rice, tinned tomatoes, spices …). Remove what you don't keep.</p>
        </Empty>
      )}

      {s.stock.length > 0 && (
        <>
          <div class="row-between">
            <p class="small">{inStock(s).length} in stock{outCount ? `, ${outCount} run out` : ''}.</p>
            {outCount > 0 && <button class="btn ghost small" onClick={allBackIn}>Back from the shops: all in</button>}
          </div>
          {PLACES.map((place) => {
            const items = s.stock.filter((x) => x.place === place).sort((a, b) => stockName(a).localeCompare(stockName(b)));
            if (!items.length) return null;
            return (
              <section>
                <h2>{PLACE_NAMES[place]} ({items.length})</h2>
                <ul class="stock">
                  {items.map((x) => (
                    <li class={x.out ? 'out' : ''}>
                      <button class="stock-name" onClick={() => toggleOut(x.ing)} aria-pressed={!x.out}>
                        <span class="box">{x.out ? '' : '✓'}</span>
                        <span>{cap(stockName(x))}{isOwn(x.ing) && <span class="tag own-tag">own</span>}{x.out && <span class="tag">run out</span>}</span>
                      </button>
                      <button class="btn ghost small" onClick={() => setEditing(x.ing)} aria-label={`Change ${stockName(x)}`}>•••</button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <a class="btn primary big wide" href="#/find">Find a recipe from my stock</a>
        </>
      )}

      {item && (
        <Sheet title={cap(stockName(item))} onClose={() => setEditing(null)}>
          {isOwn(item.ing) && <p class="small">You added this yourself. It stays on your list. The app's own recipes don't use it, but an imported recipe that names it counts it as in stock.</p>}
          <p class="small">Where do you keep it?</p>
          <div class="chips">
            {PLACES.map((p) => <button class={`chip ${item.place === p ? 'on' : ''}`} onClick={() => moveStock(item.ing, p)}>{PLACE_NAMES[p]}</button>)}
          </div>
          <button class="btn" onClick={() => { toggleOut(item.ing); setEditing(null); }}>{item.out ? 'Back in stock' : 'Mark as run out'}</button>
          <button class="btn ghost danger" onClick={() => { removeStock(item.ing); setEditing(null); }}>Take it off my list (I don't keep it)</button>
        </Sheet>
      )}

      {browse && (
        <Sheet title="What do you keep?" onClose={() => setBrowse(false)}>
          {(['veg', 'meat', 'fish', 'dairy', 'bakery', 'frozen', 'pantry', 'world', 'spice'] as const).map((a) => (
            <section>
              <h3>{{ veg: 'Fruit, veg & herbs', meat: 'Meat', fish: 'Fish', dairy: 'Dairy & eggs', bakery: 'Bread', frozen: 'Frozen', pantry: 'Cupboard', world: 'World foods', spice: 'Spices' }[a]}</h3>
              <div class="chips">
                {ALL.filter((i) => i.aisle === a).map((i) => {
                  const on = onList(s, i.id);
                  return <button class={`chip ${on ? 'on' : ''}`} onClick={() => (on ? removeStock(i.id) : addStock(i.id))}>{on ? '✓ ' : ''}{cap(i.name)}</button>;
                })}
              </div>
            </section>
          ))}
        </Sheet>
      )}
    </div>
  );
}
