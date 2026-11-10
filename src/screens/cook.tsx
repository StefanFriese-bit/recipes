import { useEffect, useRef, useState } from 'preact/hooks';
import { ingredient } from '../data/ingredients';
import { recipeById } from '../data/recipes';
import { lineText } from '../lib/lines';
import { markCooked, servesFor, today } from '../lib/store';
import { clock, splitTimes } from '../lib/timers';
import { scaleLine } from '../lib/units';
import type { Line } from '../types';
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

interface Timer { id: number; label: string; total: number; ends: number; rung?: boolean }

/** Three short beeps (the phone must have been tapped first, which starting the timer did). */
function ring(ctx: AudioContext | null) {
  try { (navigator as any).vibrate?.([300, 150, 300, 150, 300]); } catch { /* no vibration */ }
  if (!ctx) return;
  void ctx.resume();
  for (let i = 0; i < 3; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + i * 0.45;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.start(t); o.stop(t + 0.32);
  }
}

/** The ingredients a step mentions ("Add the garlic, tomato paste…"), salt, pepper and oil left out. */
function linesFor(step: string, lines: Line[]): Line[] {
  const t = ` ${step.toLowerCase().replace(/[^a-zÀ-ɏ ]+/g, ' ')} `;
  return lines.filter((l) => {
    const i = ingredient(l.ing);
    if (i.staple) return false;
    const name = i.name.split(' (')[0].toLowerCase();
    const words = name.split(/\s+/);
    const last = words[words.length - 1].replace(/s$/, '');
    return t.includes(` ${name}`) || (last.length >= 4 && t.includes(` ${last}`));
  });
}

export function CookScreen({ id }: { id: string }) {
  const s = useStore();
  const r = recipeById(id);
  const [i, setI] = useState(0);
  const [showIngs, setShowIngs] = useState(false);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [, tick] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const lock = useWakeLock();
  const running = timers.length > 0;
  useEffect(() => {
    if (!running) return;
    const h = setInterval(() => {
      tick((n) => n + 1);
      setTimers((ts) => {
        let changed = false;
        const next = ts.map((x) => {
          if (!x.rung && Date.now() >= x.ends) { changed = true; ring(audio.current); return { ...x, rung: true }; }
          return x;
        });
        return changed ? next : ts;
      });
    }, 500);
    return () => clearInterval(h);
  }, [running]);
  if (!r) return <Empty>That recipe is not in the app any more.</Empty>;
  const f = servesFor(s, r.id) / r.serves;
  // A vegetarian dish with meat on the side: its own steps come after the dish's, for the planned meat-eaters.
  const meat = r.meatSide ? (s.plans.find((p) => p.id === r.id)?.meat ?? s.meatEaters) : 0;
  const steps = [...r.steps, ...(r.meatSide && meat > 0 ? r.meatSide.steps.map((st) => `Meat on the side (own pan): ${st}`) : [])];
  const last = i >= steps.length - 1;
  const stepLines = i < r.steps.length ? linesFor(steps[i], r.lines).map((l) => scaleLine(l, f)) : [];
  const start = (secs: number, label: string) => {
    try { audio.current ??= new (window.AudioContext || (window as any).webkitAudioContext)(); void audio.current.resume(); } catch { /* silent timer */ }
    setTimers((ts) => [...ts, { id: Date.now(), label, total: secs, ends: Date.now() + secs * 1000 }]);
  };
  return (
    <div class="page cook">
      <div class="cook-head">
        <a class="btn ghost" href={recipeHref(r.id)}>‹ {r.title}</a>
        <span class="small">{lock === 'on' ? 'Screen stays on' : lock === 'unsupported' ? 'This phone may dim the screen' : 'Screen may dim'}</span>
      </div>
      <div class="progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1}>
        <span style={`width:${((i + 1) / steps.length) * 100}%`} />
      </div>

      {timers.length > 0 && (
        <div class="timers">
          {timers.map((t) => {
            const left = (t.ends - Date.now()) / 1000;
            return (
              <button class={`timer ${t.rung ? 'rung' : ''}`} onClick={() => setTimers((ts) => ts.filter((x) => x.id !== t.id))}
                aria-label={t.rung ? `${t.label} timer done, tap to clear` : `${t.label} timer, ${clock(left)} left, tap to stop`}>
                <strong>{t.rung ? 'Done!' : clock(left)}</strong><span>{t.label}</span><span class="x" aria-hidden="true">×</span>
              </button>
            );
          })}
        </div>
      )}

      <button class="btn ings-toggle" onClick={() => setShowIngs(!showIngs)}>{showIngs ? 'Hide ingredients' : `Ingredients (${servesFor(s, r.id)} people)`}</button>
      {showIngs && (
        <ul class="lines compact">
          {r.lines.map((l) => <li>{lineText(scaleLine(l, f))}{l.note ? `, ${l.note}` : ''}</li>)}
          {r.meatSide && meat > 0 && <li class="lines-head">Meat on the side, for {meat}:</li>}
          {r.meatSide && meat > 0 && r.meatSide.lines.map((l) => <li>{lineText(scaleLine(l, meat))}{l.note ? `, ${l.note}` : ''}</li>)}
        </ul>
      )}
      <p class="step-count">Step {i + 1} of {steps.length}</p>
      <p class="step-big">
        {splitTimes(steps[i]).map((p) => (p.seconds
          ? <button class="time-chip" onClick={() => start(p.seconds!, p.text)} aria-label={`Start a ${p.text} timer`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></svg>{p.text}
            </button>
          : p.text))}
      </p>
      {stepLines.length > 0 && (
        <div class="step-ings">
          <span class="small">For this step</span>
          <ul>{stepLines.map((l) => <li>{lineText(l)}</li>)}</ul>
        </div>
      )}
      {splitTimes(steps[i]).some((p) => p.seconds) && timers.length === 0 && <p class="small">Tap a time to start a timer. It keeps running when you move to the next step.</p>}
      <div class="cook-nav">
        <button class="btn big" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
        {last
          ? <button class="btn primary big" onClick={() => { markCooked(r.id, today()); go(recipeHref(r.id)); }}>Done, I cooked it</button>
          : <button class="btn primary big" onClick={() => setI(i + 1)}>Next step</button>}
      </div>
    </div>
  );
}
