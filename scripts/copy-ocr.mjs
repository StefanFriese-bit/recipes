// Copies the on-phone text reader (Tesseract) into public/ocr so the app serves it from its own address:
// no outside website is asked at run time, and once fetched it works offline. Runs before every dev/build.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkg = (name) => dirname(require.resolve(`${name}/package.json`));
const out = join(root, 'public', 'ocr');
mkdirSync(out, { recursive: true });

const files = [
  [join(pkg('tesseract.js'), 'dist', 'worker.min.js'), 'worker.min.js'],
  // The phone picks one of these by what its processor can do (LSTM engine only = the accurate one).
  ...['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']
    .map((f) => [join(pkg('tesseract.js-core'), f), f]),
  // English, "best_int": accurate and only ~3 MB.
  [join(pkg('@tesseract.js-data/eng'), '4.0.0_best_int', 'eng.traineddata.gz'), 'eng.traineddata.gz'],
];
for (const [from, to] of files) copyFileSync(from, join(out, to));
console.log(`copy-ocr: ${files.length} files into public/ocr`);
