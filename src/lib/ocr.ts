import { toCanvas } from './photos';

// Reading the words off a picture, ON THE PHONE (Tesseract, free, no account, nothing sent anywhere).
// The reader (~7 MB) comes from this app's own address the first time it is used, then works offline.

type Worker = { recognize: (img: HTMLCanvasElement) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };
export type Progress = (p: { picture: number; of: number; stage: 'loading' | 'reading'; pct: number }) => void;

/** Text read from each picture, in order, one block per picture. */
export async function readPictures(files: Blob[], onProgress: Progress = () => {}): Promise<string[]> {
  const base = `${import.meta.env.BASE_URL}ocr/`;
  let current = 0;
  onProgress({ picture: 1, of: files.length, stage: 'loading', pct: 0 });
  const { createWorker } = await import('tesseract.js');
  const worker = (await createWorker('eng', 1, {
    workerPath: `${base}worker.min.js`,
    corePath: base,
    langPath: base,
    gzip: true,
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      const reading = m.status === 'recognizing text';
      onProgress({ picture: current + 1, of: files.length, stage: reading ? 'reading' : 'loading', pct: Math.round((m.progress || 0) * 100) });
    },
  })) as unknown as Worker;
  try {
    const out: string[] = [];
    for (current = 0; current < files.length; current++) {
      // Big enough to read small print, small enough for a phone's memory.
      const canvas = await toCanvas(files[current], 2400);
      const { data } = await worker.recognize(canvas);
      out.push(data.text);
    }
    return out;
  } finally {
    void worker.terminate();
  }
}
