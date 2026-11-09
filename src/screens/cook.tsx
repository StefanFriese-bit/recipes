import { useEffect, useState } from 'preact/hooks';
import { recipeById } from '../data/recipes';
import { lineText } from '../lib/lines';
import { markCooked, servesFor, today } from '../lib/store';
import { scaleLine } from '../lib/units';
import { Empty, go, recipeHref, useStore } from '../ui';

type Lock = { release: () => Promise<void> };

/** Keeps the screen on while cooking (Screen Wake Lock). Says so when the phone does not allow it. */
function useWakeLock(): 'on' | 'off' | 'unsupported' {
  const [st, set] = useState<'on' | 'off' | 'unsupported'>('wakeLock' in navigator ? 'off' : 'unsupported');
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: Lock | null = null;
    let gone = false;
    const take = async () => {
      try {
        lock = await (navigator as any).wakeLock.request('screen');
        if (gone) { void lock?.release(); return; }
        set('on');
        (lock as any).addEventListener?.('release', () => { if (!gone) set('off'); });
      } catch { set('off'); }
    };
    const vis = () => { if (document.visibilityState === 'visible') void take(); };
    void take();
    document.addEventListener('visibilitychange', vis);
    return () => { gone = true; document.removeEventListener('visibilitychange', vis); void lock?.release(); };
  }, []);
  return st;
}

export function CookScreen({ id }: { id: string }) {
  const s = useStore();
  const r = recipeById(id);
  const [i, setI] = useState(0);
  const [showIngs, setShowIngs] = useState(false);
  const lock = useWakeLock();
  if (!r) return <Empty>That recipe is not in the app any more.</Empty>;
  const f = servesFor(s, r.id) / r.serves;
  const last = i === r.steps.length - 1;
  return (
    <div class="page cook">
      <div class="cook-head">
        <a class="btn ghost" href={recipeHref(r.id)}>‹ {r.title}</a>
        <span class="small">{lock === 'on' ? 'Screen stays on' : lock === 'unsupported' ? 'This phone may dim the screen' : 'Screen may dim'}</span>
      </div>
      <button class="btn ings-toggle" onClick={() => setShowIngs(!showIngs)}>{showIngs ? 'Hide ingredients' : `Ingredients (${servesFor(s, r.id)} people)`}</button>
      {showIngs && (
        <ul class="lines compact">
          {r.lines.map((l) => <li>{lineText(scaleLine(l, f))}{l.note ? `, ${l.note}` : ''}</li>)}
        </ul>
      )}
      <p class="step-count">Step {i + 1} of {r.steps.length}</p>
      <p class="step-big">{r.steps[i]}</p>
      <div class="cook-nav">
        <button class="btn big" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
        {last
          ? <button class="btn primary big" onClick={() => { markCooked(r.id, today()); go(recipeHref(r.id)); }}>Done, I cooked it</button>
          : <button class="btn primary big" onClick={() => setI(i + 1)}>Next step</button>}
      </div>
    </div>
  );
}
