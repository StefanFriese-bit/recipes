import { useState } from 'preact/hooks';
import { AISLE_NAMES } from '../data/ingredients';
import { RECIPES, recipeById } from '../data/recipes';
import { shoppingList } from '../lib/shopping';
import { clearChecked, getState, inStock, parseState, removePlan, replaceState, toggleChecked, toggleHidden } from '../lib/store';
import type { Aisle } from '../types';
import { Card, Empty, recipeHref, useStore } from '../ui';
import { dayLabel } from './recipe';

type Tab = 'plan' | 'shop' | 'fav' | 'cooked' | 'more';

async function saveBackup(): Promise<string> {
  const text = JSON.stringify(getState(), null, 1);
  const name = `recipes-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([text], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Recipes backup' });
      return 'Backup shared. Choose "Save to Files" → iCloud Drive to keep it.';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return '';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'Backup file saved to your downloads.';
}

export function SavedScreen() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>(() => (s.plans.length ? 'plan' : 'fav'));
  const [msg, setMsg] = useState('');
  const plans = [...s.plans].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
  const list = shoppingList(s.plans, inStock(s));
  const toBuy = list.filter((i) => !i.inFridge);
  const have = list.filter((i) => i.inFridge);
  const aisles = [...new Set(toBuy.map((i) => i.aisle))] as Aisle[];
  const tabs: [Tab, string][] = [['plan', `Planned (${s.plans.length})`], ['shop', 'Shopping'], ['fav', `Saved (${s.favourites.length})`], ['cooked', 'Cooked'], ['more', 'Backup']];

  const restore = async (input: HTMLInputElement) => {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    try {
      const st = parseState(await f.text());
      if (!confirm(`Replace what is on this phone with the backup (${st.favourites.length} saved, ${st.plans.length} planned)?`)) return;
      replaceState(st);
      setMsg('Backup restored.');
    } catch (e) {
      setMsg(`Could not read that file: ${(e as Error).message}`);
    }
  };

  return (
    <div class="page">
      <h1>Your recipes</h1>
      <div class="tabs-inline">{tabs.map(([t, l]) => <button class={`chip ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{l}</button>)}</div>

      {tab === 'plan' && (plans.length === 0
        ? <Empty>Nothing planned. Open a recipe and press "Plan it".</Empty>
        : (
          <ul class="plan-list">
            {plans.map((p) => {
              const r = recipeById(p.id);
              if (!r) return null;
              return (
                <li>
                  <a href={recipeHref(r.id)}><span class="when">{dayLabel(p.date)}</span><strong>{r.title}</strong><span class="small">for {p.serves}</span></a>
                  <button class="btn ghost small" onClick={() => removePlan(p.id)} aria-label={`Take ${r.title} off the plan`}>Remove</button>
                </li>
              );
            })}
          </ul>
        ))}

      {tab === 'shop' && (list.length === 0
        ? <Empty>Your shopping list comes from what you plan. Plan a recipe first.</Empty>
        : (
          <>
            <div class="row-between"><p class="small">For {s.plans.length} planned {s.plans.length === 1 ? 'recipe' : 'recipes'}. Tap to tick off.</p>
              {s.shopping.checked.length > 0 && <button class="btn ghost small" onClick={clearChecked}>Untick all</button>}</div>
            {aisles.map((a) => (
              <section>
                <h3>{AISLE_NAMES[a]}</h3>
                <ul class="shop">
                  {toBuy.filter((i) => i.aisle === a).map((i) => {
                    const done = s.shopping.checked.includes(i.key);
                    return (
                      <li class={done ? 'done' : ''} onClick={() => toggleChecked(i.key)}>
                        <span class="box">{done ? '✓' : ''}</span>
                        <span><span class="item">{i.text}</span><span class="for">{i.forRecipes.join(', ')}</span></span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {have.length > 0 && (
              <section>
                <h3>In your stock (check there is enough)</h3>
                <ul class="shop muted">{have.map((i) => <li><span class="box">·</span><span class="item">{i.text}</span></li>)}</ul>
              </section>
            )}
          </>
        ))}

      {tab === 'fav' && (s.favourites.length === 0
        ? <Empty>No saved recipes yet. Press "☆ Save" on any recipe you like.</Empty>
        : <div class="cards">{s.favourites.map((id) => recipeById(id)).filter(Boolean).map((r) => <Card r={r!} />)}</div>)}

      {tab === 'cooked' && (s.cooked.length === 0
        ? <Empty>Recipes you mark "I cooked this" show here.</Empty>
        : (
          <ul class="plan-list">
            {[...s.cooked].reverse().map((c) => {
              const r = recipeById(c.id);
              return r ? <li><a href={recipeHref(r.id)}><span class="when">{dayLabel(c.date).replace('Tonight', 'Today')}</span><strong>{r.title}</strong></a></li> : null;
            })}
          </ul>
        ))}

      {tab === 'more' && (
        <div class="more">
          <h2>Backup</h2>
          <p class="small">Everything here is kept on this phone only. If the app is deleted from the home screen, its data goes with it, so save a backup now and then.</p>
          <button class="btn primary" onClick={async () => setMsg(await saveBackup())}>Save a backup file</button>
          <label class="btn file">Restore from a backup file<input type="file" accept="application/json,.json" onChange={(e) => restore(e.target as HTMLInputElement)} /></label>
          {msg && <p class="msg">{msg}</p>}
          <h2>Hidden recipes ({s.hidden.length})</h2>
          <p class="small">Ones you marked "I know this one". They are left out of suggestions.</p>
          <ul class="plan-list">
            {s.hidden.map((id) => recipeById(id)).filter(Boolean).map((r) => (
              <li><a href={recipeHref(r!.id)}><strong>{r!.title}</strong></a><button class="btn ghost small" onClick={() => toggleHidden(r!.id)}>Show again</button></li>
            ))}
          </ul>
          <p class="small">Version {__BUILD_DATE__}. {RECIPES.length} recipes, written for this app.</p>
        </div>
      )}
    </div>
  );
}
