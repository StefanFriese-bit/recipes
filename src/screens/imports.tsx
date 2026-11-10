import { useEffect, useMemo, useState } from 'preact/hooks';
import { recipeById } from '../data/recipes';
import { parseIngredientLine, parseRecipeText, type Draft } from '../lib/import-parse';
import { readPictures } from '../lib/ocr';
import { deletePhotos, putPhotos, shrink } from '../lib/photos';
import { deleteImported, getState, newImportId, saveImported, today } from '../lib/store';
import type { ImportedRecipe } from '../types';
import { Card, Empty, go, recipeHref, useStore } from '../ui';

/** The Imports tab: recipes you brought in from screenshots, photos or pasted text. */
export function ImportsScreen() {
  const s = useStore();
  const list = [...s.imported].reverse();
  return (
    <div class="page">
      <h1>Imported recipes</h1>
      <p class="small">Recipes from a screenshot (Facebook, Instagram, a website), a photo of a cookbook or magazine, or text you paste. Once in, they work like the others: servings, stock, shopping list, favourites.</p>
      <a class="btn primary big wide-top" href="#/import/new">+ Add a recipe from a picture</a>
      {list.length === 0
        ? <Empty>Nothing imported yet.</Empty>
        : (
          <>
            <p class="small">{list.length} imported {list.length === 1 ? 'recipe' : 'recipes'}. Tap ☆ to add one to your favourites.</p>
            <div class="cards">{list.map((x) => recipeById(x.id)).filter(Boolean).map((r) => <Card r={r!} />)}</div>
          </>
        )}
    </div>
  );
}

type Stage = 'choose' | 'paste' | 'reading' | 'edit';
interface Form { title: string; serves: string; minutes: string; vegetarian: boolean; ingredients: string; steps: string; notes: string }
const toForm = (d: Draft, veg = false): Form => ({
  title: d.title, serves: String(d.serves), minutes: d.minutes ? String(d.minutes) : '', vegetarian: veg,
  ingredients: d.ingredients.join('\n'), steps: d.steps.join('\n'), notes: d.notes,
});
const fromImported = (x: ImportedRecipe): Form => toForm({ title: x.title, serves: x.serves, minutes: x.minutes, ingredients: x.ingredients, steps: x.steps, notes: x.notes ?? '' }, !!x.vegetarian);
const lines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);

/** Add a recipe (from pictures, pasted text or typed in), or change one you imported before. */
export function ImportEditScreen({ id }: { id?: string }) {
  const existing = id ? getState().imported.find((x) => x.id === id) : undefined;
  const [stage, setStage] = useState<Stage>(existing ? 'edit' : 'choose');
  const [form, setForm] = useState<Form>(() => (existing ? fromImported(existing) : toForm({ title: '', serves: getState().defaultServes, ingredients: [], steps: [], notes: '' })));
  const [pictures, setPictures] = useState<Blob[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [readText, setReadText] = useState('');
  const [pasted, setPasted] = useState('');
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const u = pictures.map((p) => URL.createObjectURL(p));
    setUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [pictures]);
  const upd = (x: Partial<Form>) => setForm((f) => ({ ...f, ...x }));
  const understood = useMemo(() => lines(form.ingredients).map((l) => ({ l, ...parseIngredientLine(l) })), [form.ingredients]);

  if (id && !existing) return <Empty>That imported recipe is not on this phone any more. <a href="#/imports">Back to your imports</a></Empty>;

  const read = async (input: HTMLInputElement) => {
    const files = [...(input.files ?? [])];
    input.value = '';
    if (!files.length) return;
    setPictures(files);
    setErr('');
    setStage('reading');
    try {
      const texts = await readPictures(files, (p) => setProgress(p.stage === 'loading'
        ? `Getting the picture reader ready${p.pct ? ` (${p.pct}%)` : ''}…`
        : `Reading picture ${p.picture} of ${p.of}… ${p.pct}%`));
      const text = texts.join('\n\n');
      setReadText(text);
      if (!text.trim()) {
        setErr('No words could be read off that picture. Try a sharper screenshot, or paste the text instead.');
        setStage('choose');
        return;
      }
      setForm(toForm(parseRecipeText(text)));
      setStage('edit');
    } catch (e) {
      setErr(`The picture could not be read${navigator.onLine ? '' : ' (the reader needs the internet the first time)'}: ${(e as Error).message || 'unknown problem'}. You can paste the text instead.`);
      setStage('choose');
    }
  };

  const save = async () => {
    const title = form.title.trim();
    const ingredients = lines(form.ingredients);
    const steps = lines(form.steps);
    if (!title) { setErr('Give it a name first.'); return; }
    if (!ingredients.length && !steps.length) { setErr('Add the ingredients or the method first.'); return; }
    setSaving(true);
    const rid = existing?.id ?? newImportId();
    let photos = existing?.photos ?? 0;
    if (pictures.length) photos = await putPhotos(rid, await Promise.all(pictures.map((p) => shrink(p).catch(() => p))));
    const serves = Math.max(1, Math.min(40, Math.round(Number(form.serves)) || 4));
    const minutes = Math.round(Number(form.minutes)) || 0;
    saveImported({
      id: rid, title: title.slice(0, 120), serves, ...(minutes > 0 ? { minutes } : {}), ...(form.vegetarian ? { vegetarian: true } : {}),
      ingredients, steps, ...(form.notes.trim() ? { notes: form.notes.trim() } : {}), added: existing?.added ?? today(), ...(photos ? { photos } : {}),
    });
    location.replace(recipeHref(rid));
  };

  const remove = async () => {
    if (!existing || !confirm(`Delete "${existing.title}" from your imports? This cannot be undone (unless you have a backup).`)) return;
    deleteImported(existing.id);
    await deletePhotos(existing.id);
    go('#/imports');
  };

  return (
    <div class="page import">
      <button class="btn ghost back" onClick={() => (history.length > 1 ? history.back() : go('#/imports'))}>‹ Back</button>
      <h1>{existing ? 'Change this recipe' : 'Add a recipe'}</h1>
      {err && <p class="msg warn">{err}</p>}

      {stage === 'choose' && (
        <div class="import-choose">
          <label class="btn primary big file">
            Choose screenshots or photos
            <input type="file" accept="image/*" multiple onChange={(e) => read(e.target as HTMLInputElement)} />
          </label>
          <p class="small">From your photo library, or take a photo of a cookbook page. If the recipe runs over two or three screenshots, choose them all, in order.</p>
          <button class="btn big" onClick={() => setStage('paste')}>Paste text instead</button>
          <p class="small">Handy for a Facebook post: press and hold its text, Copy, then paste it here. It is often more exact than a picture.</p>
          <button class="btn ghost" onClick={() => setStage('edit')}>Type it in myself</button>
          <p class="small">Pictures are read on this phone; nothing is sent anywhere. The first time, the phone fetches the picture reader from this app (about 7 MB, needs the internet once).</p>
        </div>
      )}

      {stage === 'paste' && (
        <>
          <label class="field"><span>The recipe's text</span>
            <textarea rows={12} value={pasted} placeholder="Paste the recipe here" onInput={(e) => setPasted((e.target as HTMLTextAreaElement).value)} />
          </label>
          <button class="btn primary big" disabled={!pasted.trim()} onClick={() => { setReadText(pasted); setForm(toForm(parseRecipeText(pasted))); setErr(''); setStage('edit'); }}>Sort it into a recipe</button>
          <button class="btn ghost" onClick={() => setStage('choose')}>Use a picture instead</button>
        </>
      )}

      {stage === 'reading' && (
        <div class="reading" role="status">
          <div class="spinner" aria-hidden="true" />
          <p>{progress || 'Starting…'}</p>
          <p class="small">This can take up to a minute the first time.</p>
        </div>
      )}

      {stage === 'edit' && (
        <>
          {urls.length > 0 && <div class="thumbs">{urls.map((u) => <img src={u} alt="The picture it was read from" />)}</div>}
          {readText && <p class="small">Check it over: the reader is good but not perfect. Fix anything it misread, and delete lines that are not part of the recipe.</p>}
          <label class="field"><span>Name</span>
            <input type="text" value={form.title} onInput={(e) => upd({ title: (e.target as HTMLInputElement).value })} />
          </label>
          <div class="grid2">
            <label class="field"><span>Serves</span>
              <input type="number" inputMode="numeric" min={1} max={40} value={form.serves} onInput={(e) => upd({ serves: (e.target as HTMLInputElement).value })} />
            </label>
            <label class="field"><span>Minutes (if known)</span>
              <input type="number" inputMode="numeric" min={0} value={form.minutes} onInput={(e) => upd({ minutes: (e.target as HTMLInputElement).value })} />
            </label>
          </div>
          <label class="switch"><input type="checkbox" checked={form.vegetarian} onChange={(e) => upd({ vegetarian: (e.target as HTMLInputElement).checked })} /> Vegetarian</label>

          <label class="field"><span>Ingredients: one per line, amount first</span>
            <textarea rows={Math.max(6, Math.min(18, understood.length + 2))} value={form.ingredients} placeholder={'2 onions, chopped\n400 g tin chopped tomatoes\nSalt and pepper'}
              onInput={(e) => upd({ ingredients: (e.target as HTMLTextAreaElement).value })} />
          </label>
          {understood.length > 0 && (
            <details class="understood">
              <summary>How the app understood them ({understood.filter((u) => u.known).length} of {understood.length} it knows)</summary>
              <p class="small">Known ones count against your stock list. New ones go on the shopping list under "Other".</p>
              <ul>{understood.map((u) => (
                <li><span>{u.l}</span> <span class={`tag ${u.known ? 'have-tag' : 'own-tag'}`}>{u.known ? 'known' : 'new'}</span></li>
              ))}</ul>
            </details>
          )}

          <label class="field"><span>Method: one step per line</span>
            <textarea rows={Math.max(6, Math.min(18, lines(form.steps).length * 2 + 2))} value={form.steps} onInput={(e) => upd({ steps: (e.target as HTMLTextAreaElement).value })} />
          </label>
          <label class="field"><span>Notes (where it came from, tips)</span>
            <textarea rows={3} value={form.notes} onInput={(e) => upd({ notes: (e.target as HTMLTextAreaElement).value })} />
          </label>
          {readText && (
            <details class="raw">
              <summary>What the phone read</summary>
              <pre>{readText}</pre>
            </details>
          )}
          <div class="bottom-actions">
            <button class="btn primary big" disabled={saving} onClick={save}>{saving ? 'Saving…' : existing ? 'Save changes' : 'Save to my imports'}</button>
            {existing && <button class="btn ghost danger" onClick={remove}>Delete this recipe</button>}
          </div>
        </>
      )}
    </div>
  );
}
