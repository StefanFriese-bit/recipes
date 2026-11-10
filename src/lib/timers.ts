// Times named in a cooking step ("simmer 30–35 minutes", "for an hour") become tap-to-start timers.

export interface Part { text: string; seconds?: number }

const TIME = /\b(an?|one|half an?|\d+(?:[.,]\d+)?)(?:\s*(?:–|-|to)\s*\d+(?:[.,]\d+)?)?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;

function secondsOf(n: string, unit: string): number {
  const w = n.toLowerCase();
  const qty = w.startsWith('half') ? 0.5 : w === 'a' || w === 'an' || w === 'one' ? 1 : Number(w.replace(',', '.'));
  const u = unit.toLowerCase();
  const per = u.startsWith('h') ? 3600 : u.startsWith('m') ? 60 : 1;
  return Math.round(qty * per);
}

/** A step split into plain text and timer pieces. A range ("30–35 minutes") starts at its first figure: check then. */
export function splitTimes(step: string): Part[] {
  const out: Part[] = [];
  let at = 0;
  for (const m of step.matchAll(TIME)) {
    const secs = secondsOf(m[1], m[2]);
    if (!secs || secs > 12 * 3600) continue;
    if (m.index! > at) out.push({ text: step.slice(at, m.index) });
    out.push({ text: m[0], seconds: secs });
    at = m.index! + m[0].length;
  }
  if (at < step.length) out.push({ text: step.slice(at) });
  return out;
}

export function clock(secs: number): string {
  const s = Math.max(0, Math.ceil(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
