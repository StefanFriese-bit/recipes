// The pictures an imported recipe was read from, kept on the phone (IndexedDB: too big for the main store).
// Everything here fails soft: without IndexedDB the recipe still saves, just without its pictures.

const DB = 'recipes-photos';
const STORE = 'photos';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const r = run(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); res(r ? r.result : undefined); };
    t.onerror = () => { db.close(); rej(t.error); };
  });
}

const key = (id: string, n: number) => `${id}#${n}`;
// Kept as plain bytes + type, not as a Blob: Safari in a private window refuses to store Blobs.
interface Kept { type: string; data: ArrayBuffer }
const keep = async (b: Blob): Promise<Kept> => ({ type: b.type || 'image/jpeg', data: await b.arrayBuffer() });
const unkeep = (k: Kept | Blob | undefined): Blob | undefined => (!k ? undefined : k instanceof Blob ? k : new Blob([k.data], { type: k.type }));

/** Keeps up to 6 pictures for a recipe (replacing any it had). Returns how many were kept. */
export async function putPhotos(id: string, blobs: Blob[]): Promise<number> {
  try {
    await deletePhotos(id);
    const list = await Promise.all(blobs.slice(0, 6).map(keep));
    await tx('readwrite', (s) => { list.forEach((b, n) => s.put(b, key(id, n))); });
    return list.length;
  } catch { return 0; }
}
export async function getPhotos(id: string, count: number): Promise<Blob[]> {
  try {
    const out: Blob[] = [];
    for (let n = 0; n < count; n++) {
      const b = unkeep(await tx<Kept>('readonly', (s) => s.get(key(id, n))));
      if (b) out.push(b);
    }
    return out;
  } catch { return []; }
}
export async function deletePhotos(id: string): Promise<void> {
  try { await tx('readwrite', (s) => { s.delete(IDBKeyRange.bound(`${id}#`, `${id}#￿`)); }); } catch { /* nothing kept */ }
}

const toDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
/** Every kept picture, for the backup file: { "imp-…#0": "data:image/jpeg;base64,…" }. */
export async function allPhotos(): Promise<Record<string, string>> {
  try {
    const db = await open();
    const out: Record<string, string> = {};
    const entries = await new Promise<[string, Blob][]>((res, rej) => {
      const got: [string, Blob][] = [];
      const t = db.transaction(STORE, 'readonly');
      const c = t.objectStore(STORE).openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { const b = unkeep(cur.value); if (b) got.push([String(cur.key), b]); cur.continue(); } };
      t.oncomplete = () => { db.close(); res(got); };
      t.onerror = () => { db.close(); rej(t.error); };
    });
    for (const [k, b] of entries) out[k] = await toDataUrl(b);
    return out;
  } catch { return {}; }
}
/** Puts pictures back from a backup file (replacing all kept ones). */
export async function restorePhotos(photos: Record<string, string>): Promise<void> {
  try {
    const blobs = await Promise.all(Object.entries(photos).filter(([k, v]) => /^imp-[^#]+#\d$/.test(k) && v.startsWith('data:image/'))
      .map(async ([k, v]) => [k, await keep(await (await fetch(v)).blob())] as const));
    await tx('readwrite', (s) => { s.clear(); for (const [k, b] of blobs) s.put(b, k); });
  } catch { /* the recipes still restore */ }
}

/** A picture made smaller for keeping (about 150 KB for a phone screenshot). */
export async function shrink(file: Blob, longSide = 1400, quality = 0.72): Promise<Blob> {
  const canvas = await toCanvas(file, longSide);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', quality));
}
/** A picture drawn onto a canvas no bigger than `longSide` (photos straight off the camera are huge). */
export async function toCanvas(file: Blob, longSide: number): Promise<HTMLCanvasElement> {
  const bmp = await loadImage(file);
  const scale = Math.min(1, longSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}
async function loadImage(file: Blob): Promise<HTMLImageElement | ImageBitmap> {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file); } catch { /* older Safari: fall through */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
