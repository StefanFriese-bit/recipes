import { useEffect, useState } from 'preact/hooks';
import { INGREDIENTS, ingredient } from '../data/ingredients';
import { isImported, recipeById } from '../data/recipes';
import { getPhotos } from '../lib/photos';
import { lineText, swapText, swapsFor } from '../lib/lines';
import { scaleLine } from '../lib/units';
import {
  addDays, addPlan, inStock, markCooked, removePlan, servesFor, setMeatEaters, setServes, today, toggleFavourite, toggleHidden,
} from '../lib/store';
import type { Line } from '../types';
import { Empty, Meta, Sheet, go, useStore } from '../ui';

function nextDay(weekday: number): string {
  const d = new Date();
  const add = (weekday - d.getDay() + 7) % 7 || 7;
  return addDays(today(d), add);
}
export function dayLabel(iso: string | null): string {
  if (!iso) return 'Some day';
  const t = today();
  if (iso === t) return 'Tonight';
  if (iso === addDays(t, 1)) return 'Tomorrow';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** The kept pictures of an imported recipe, as addresses the page can show (freed when it closes). */
function usePhotoUrls(id: string, count: number): string[] {
  const [urls, set] = useState<string[]>([]);
  useEffect(() => {
    if (!count) { set([]); return; }
    let made: string[] = [];
    let gone = false;
    void getPhotos(id, count).then((blobs) => {
      if (gone) return;
      made = blobs.map((b) => URL.createObjectURL(b));
      set(made);
    });
    return () => { gone = true; made.forEach((u) => URL.revokeObjectURL(u)); };
  }, [id, count]);
  return urls;
}

export function RecipeScreen({ id }: { id: string }) {
  const s = useStore();
  const r = recipeById(id);
  const [swapLine, setSwapLine] = useState<Line | null>(null);
  const [planning, setPlanning] = useState(false);
  const [pick, setPick] = useState('');
  const imp = s.imported.find((x) => x.id === id);
  const photos = usePhotoUrls(id, imp?.photos ?? 0);
  const [bigPhoto, setBigPhoto] = useState<string | null>(null);
  if (!r) return <Empty>That recipe is not in the app any more. <a href="#/find">Find another</a></Empty>;
  const serves = servesFor(s, r.id);
  const f = serves / r.serves;
  const fav = s.favourites.includes(r.id);
  const hidden = s.hidden.includes(r.id);
  const plan = s.plans.find((p) => p.id === r.id);
  const got = new Set(inStock(s));
  const cookedTimes = s.cooked.filter((c) => c.id === r.id).length;
  const meat = r.meatSide ? s.meatEaters : 0;
  const doPlan = (date: string | null) => { addPlan({ id: r.id, date, serves, ...(r.meatSide ? { meat } : {}) }); setPlanning(false); };

  return (
    <div class="page recipe">
      <button class="btn ghost back" onClick={() => (history.length > 1 ? history.back() : go('#/find'))}>‹ Back</button>
      <h1>{r.title}</h1>
      <Meta r={r} />
      <p class="lead">{r.blurb}</p>

      <div class="actions">
        <button class={`btn ${fav ? 'on' : ''}`} aria-pressed={fav} onClick={() => toggleFavourite(r.id)}>{fav ? '★ Favourite' : '☆ Favourite'}</button>
        <button class={`btn ${plan ? 'on' : ''}`} onClick={() => setPlanning(true)}>{plan ? `Planned: ${dayLabel(plan.date)}` : 'Plan it'}</button>
        {isImported(r)
          ? <a class="btn" href={`#/import/${encodeURIComponent(r.id)}`}>Change it</a>
          : <button class={`btn ${hidden ? 'on' : ''}`} onClick={() => toggleHidden(r.id)}>{hidden ? 'Hidden — show again' : 'I know this one'}</button>}
      </div>
      {cookedTimes > 0 && <p class="small">You have cooked this {cookedTimes === 1 ? 'once' : `${cookedTimes} times`}.</p>}

      <div class="serves">
        <span>For</span>
        <button class="btn round" aria-label="Fewer people" onClick={() => setServes(r.id, serves - 1)}>−</button>
        <strong>{serves}</strong>
        <button class="btn round" aria-label="More people" onClick={() => setServes(r.id, serves + 1)}>+</button>
        <span>{serves === 1 ? 'person' : 'people'}</span>
      </div>

      <h2>Ingredients</h2>
      <ul class="lines">
        {r.lines.map((l) => {
          const sl = scaleLine(l, f);
          const swaps = swapsFor(l.ing);
          const staple = ingredient(l.ing).staple;
          return (
            <li class={got.has(l.ing) ? 'have' : ''}>
              <div>
                <span class="line-text">{lineText(sl)}</span>
                {l.note && <span class="note">, {l.note}</span>}
                {l.optional && <span class="tag">optional</span>}
                {got.has(l.ing) && <span class="tag have-tag">in stock</span>}
              </div>
              {swaps.length > 0 && !staple && <button class="btn small" onClick={() => setSwapLine(sl)}>Swap</button>}
            </li>
          );
        })}
      </ul>

      {r.meatSide && (
        <section class="meat-side">
          <h2>Meat on the side</h2>
          <p class="small">The dish stays vegetarian. For the meat-eaters: {r.meatSide.name.toLowerCase()}, cooked in its own pan and added on their plates.</p>
          <div class="serves">
            <span>For</span>
            <button class="btn round" aria-label="Fewer meat-eaters" onClick={() => setMeatEaters(meat - 1)}>−</button>
            <strong class="meat-count">{meat}</strong>
            <button class="btn round" aria-label="More meat-eaters" onClick={() => setMeatEaters(meat + 1)}>+</button>
            <span>{meat === 1 ? 'meat-eater' : 'meat-eaters'}</span>
          </div>
          {meat === 0
            ? <p class="small">Nobody wants meat this time: it is left off the shopping list and the cooking steps.</p>
            : (
              <>
                <ul class="lines">
                  {r.meatSide.lines.map((l) => (
                    <li class={got.has(l.ing) ? 'have' : ''}>
                      <div>
                        <span class="line-text">{lineText(scaleLine(l, meat))}</span>
                        {l.note && <span class="note">, {l.note}</span>}
                        {got.has(l.ing) && <span class="tag have-tag">in stock</span>}
                      </div>
                    </li>
                  ))}
                </ul>
                <ol class="steps">{r.meatSide.steps.map((st) => <li>{st}</li>)}</ol>
              </>
            )}
        </section>
      )}

      <h2>Method</h2>
      {r.steps.length === 0 && <p class="small">No method yet. <a href={`#/import/${encodeURIComponent(r.id)}`}>Add it</a>.</p>}
      <ol class="steps">{r.steps.map((st) => <li>{st}</li>)}</ol>
      {imp && (
        <>
          {imp.notes && <p class="tip"><strong>Notes:</strong> {imp.notes}</p>}
          <p class="small">Imported {dayLabel(imp.added).replace('Tonight', 'today')}.</p>
          {photos.length > 0 && (
            <>
              <h2>The original {photos.length === 1 ? 'picture' : 'pictures'}</h2>
              <div class="thumbs">{photos.map((u) => <button class="thumb" onClick={() => setBigPhoto(u)} aria-label="Show the picture bigger"><img src={u} alt="The picture this recipe was read from" /></button>)}</div>
            </>
          )}
        </>
      )}
      {r.tip && <p class="tip"><strong>Tip:</strong> {r.tip}</p>}
      {f !== 1 && <p class="small">Amounts are worked out for {serves}. Cooking times stay about the same; a much bigger batch may need a bigger pan or a little longer.</p>}

      <div class="bottom-actions">
        {r.steps.length > 0 && <a class="btn primary big" href={`#/cook/${encodeURIComponent(r.id)}`}>Start cooking</a>}
        <button class="btn big" onClick={() => markCooked(r.id, today())}>I cooked this</button>
      </div>

      {bigPhoto && (
        <Sheet title="Original picture" onClose={() => setBigPhoto(null)}>
          <img class="big-photo" src={bigPhoto} alt="The picture this recipe was read from" />
        </Sheet>
      )}

      {swapLine && (
        <Sheet title={`No ${ingredient(swapLine.ing).name}?`} onClose={() => setSwapLine(null)}>
          <p class="small">Instead of {lineText(swapLine)}{swapLine.note ? ` (${swapLine.note})` : ''}:</p>
          <ul class="swaps">
            {swapsFor(swapLine.ing).map((sw) => {
              const haveAll = sw.parts.every((p) => got.has(p.ing) || INGREDIENTS[p.ing].staple);
              return (
                <li>
                  <strong>{swapText(swapLine, sw)}</strong>
                  {haveAll && got.size > 0 && <span class="tag have-tag">you have this</span>}
                  <p>{sw.note}</p>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}

      {planning && (
        <Sheet title="When will you cook it?" onClose={() => setPlanning(false)}>
          <div class="grid2">
            <button class="btn" onClick={() => doPlan(today())}>Tonight</button>
            <button class="btn" onClick={() => doPlan(addDays(today(), 1))}>Tomorrow</button>
            <button class="btn" onClick={() => doPlan(nextDay(6))}>Saturday</button>
            <button class="btn" onClick={() => doPlan(nextDay(0))}>Sunday</button>
            <button class="btn" onClick={() => doPlan(null)}>Some day</button>
          </div>
          <label class="field">
            <span>Or pick a date</span>
            <input type="date" value={pick} min={today()} onInput={(e) => setPick((e.target as HTMLInputElement).value)} />
          </label>
          <button class="btn primary" disabled={!pick} onClick={() => doPlan(pick)}>Plan for this date</button>
          <p class="small">It goes on your shopping list for {serves} {serves === 1 ? 'person' : 'people'}{r.meatSide && meat > 0 ? `, plus ${r.meatSide.name.toLowerCase()} for ${meat} ${meat === 1 ? 'meat-eater' : 'meat-eaters'}` : ''}.</p>
          {plan && <button class="btn ghost danger" onClick={() => { removePlan(r.id); setPlanning(false); }}>Take it off the plan</button>}
        </Sheet>
      )}
    </div>
  );
}
