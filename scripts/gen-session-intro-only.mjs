/**
 * Genera solo assets/quiz-audio/<voce>/quiz-session-intro.mp3 via Piper HTTP.
 * Testo allineato a scripts/generate-offline-quiz-audio.mjs (QUIZ_SESSION_INTRO_TEXT).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_BASE = path.join(ROOT, 'assets', 'quiz-audio');
const FILE = 'quiz-session-intro.mp3';
const TEXT =
  'Salve e benvenuti al quiz di istruzioni operative interattive. Iniziamo.';

const VOICES = ['naturale', 'chiara', 'profonda', 'telecronaca'];

async function fetchPiperMp3(endpoint, text, voice) {
  let res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: voice || 'naturale' })
  });
  if (!res.ok) {
    const sep = endpoint.indexOf('?') >= 0 ? '&' : '?';
    const u =
      endpoint +
      sep +
      'text=' +
      encodeURIComponent(text) +
      '&voice=' +
      encodeURIComponent(voice || 'naturale');
    res = await fetch(u, { method: 'GET' });
  }
  if (!res.ok) throw new Error('Piper HTTP ' + res.status);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const endpoint =
    process.argv.find((a) => a.startsWith('--endpoint='))?.slice('--endpoint='.length) ||
    process.env.PIPER_URL ||
    'https://quiz-piper-tts.onrender.com/tts';
  if (!String(endpoint).trim()) {
    console.error('Imposta PIPER_URL o --endpoint=');
    process.exit(1);
  }

  for (const voice of VOICES) {
    const dir = path.join(OUT_BASE, voice);
    fs.mkdirSync(dir, { recursive: true });
    const outPath = path.join(dir, FILE);
    try {
      const buf = await fetchPiperMp3(endpoint, TEXT, voice);
      fs.writeFileSync(outPath, buf);
      console.log('OK', voice, buf.length, 'bytes');
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.error('ERR', voice, e && e.message ? e.message : e);
      process.exitCode = 1;
    }
  }
}

main();
