/**
 * Rigenera gli MP3 della telecronaca offline (Piper HTTP) con testo SENZA «Domanda.» in apertura,
 * allineato a quizBuildQuestionNarrationText quando non è milestone (stesso contenuto per ogni file).
 *
 * Uso (da cartella progetto):
 *   set PIPER_URL=https://tuo-server/tts
 *   node scripts/generate-offline-quiz-audio.mjs
 *
 * Opzioni:
 *   --dry-run          solo elenco file e anteprima testo, nessuna chiamata di rete
 *   --voice=naturale   sottocartella sotto assets/quiz-audio (default naturale)
 *   --endpoint=URL     sovrascrive PIPER_URL
 *
 * Ordine Risposta A/B/C: stesso algoritmo di index.html (`quizDeterministicShuffle` / seed da ref+q+ok).
 *
 * Richiede Node 18+ (fetch nativo).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');
const OUT_BASE = path.join(ROOT, 'assets', 'quiz-audio');

/** Deve coincidere con QUIZ_LOCAL_INTRO_FILENAME + flusso `quizPlayOfflineSessionIntroThenQuestion` in index.html */
const QUIZ_SESSION_INTRO_FILE = 'quiz-session-intro.mp3';
const QUIZ_SESSION_INTRO_TEXT =
    'Salve, cominciamo subito con la prima domanda.';

function slugifyAudioName(txt) {
    const s = String(txt || '')
        .toLowerCase()
        .replace(/['"`]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return s || 'quiz-item';
}

/** Hash stabile per seed RNG (stesso output tra esecuzioni). */
function hashStringSeed(s) {
    let h = 2166136261 >>> 0;
    const str = String(s || '');
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
}

/** Mulberry32 — stesso seed ⇒ stessa sequenza (stile bryc). */
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        let t = (a += 0x6d2b79f5) | 0;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Fisher–Yates con RNG deterministico. */
function deterministicShuffle(arr, seed) {
    const rand = mulberry32(seed);
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function makeQuestion(row) {
    const seed = hashStringSeed(row.ref + '\n' + row.q + '\n' + row.ok);
    const opts = deterministicShuffle(
        [
            { text: row.ok, ok: true },
            { text: row.w1, ok: false },
            { text: row.w2, ok: false }
        ],
        seed
    );
    return {
        level: row.l,
        points: 1,
        ref: row.ref,
        q: row.q,
        options: opts,
        correctIndex: opts.findIndex((o) => o.ok)
    };
}

/** Testo lettura offline: MAI con «Domanda.» — così gli MP3 non ripetono la parola ogni domanda. */
function buildOfflineNarrationText(q) {
    const parts = [String((q && q.q) || '')];
    if (q && Array.isArray(q.options)) {
        q.options.forEach(function (opt, idx) {
            const letter = idx < 26 ? String.fromCharCode(65 + idx) : String(idx + 1);
            parts.push('Risposta ' + letter + '. ' + String((opt && opt.text) || ''));
        });
    }
    return parts.join(' ');
}

function extractQuizCuratedArrayLiteral(html) {
    const marker = 'const QUIZ_CURATED = ';
    const startMarker = html.indexOf(marker);
    if (startMarker < 0) throw new Error('const QUIZ_CURATED = non trovato in index.html');
    let pos = startMarker + marker.length;
    while (pos < html.length && /\s/.test(html[pos])) pos++;
    if (html[pos] !== '[') throw new Error('Atteso [ dopo QUIZ_CURATED');
    const sliceStart = pos;
    let depth = 0;
    let state = 'code';
    let i = pos;
    depth = 1;
    i++;
    while (i < html.length && depth > 0) {
        const c = html[i];
        if (state === 'code') {
            if (c === "'") {
                state = 'sq';
                i++;
                continue;
            }
            if (c === '"') {
                state = 'dq';
                i++;
                continue;
            }
            if (c === '[') depth++;
            else if (c === ']') depth--;
            i++;
            continue;
        }
        if (state === 'sq') {
            if (c === '\\') {
                i += 2;
                continue;
            }
            if (c === "'") state = 'code';
            i++;
            continue;
        }
        if (state === 'dq') {
            if (c === '\\') {
                i += 2;
                continue;
            }
            if (c === '"') state = 'code';
            i++;
            continue;
        }
    }
    if (depth !== 0) throw new Error('Parentesi quadre non bilanciate nell’estrazione QUIZ_CURATED');
    return html.slice(sliceStart, i);
}

function parseArgs() {
    const out = { dryRun: false, voice: 'naturale', endpoint: process.env.PIPER_URL || '' };
    for (const a of process.argv.slice(2)) {
        if (a === '--dry-run') out.dryRun = true;
        else if (a.startsWith('--voice=')) out.voice = a.slice('--voice='.length).trim() || 'naturale';
        else if (a.startsWith('--endpoint=')) out.endpoint = a.slice('--endpoint='.length).trim();
    }
    return out;
}

async function fetchPiperMp3(endpoint, text, voice) {
    const url = new URL(endpoint);
    const body = JSON.stringify({ text, voice: voice || 'naturale' });
    let res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
    });
    if (!res.ok) {
        const sep = endpoint.indexOf('?') >= 0 ? '&' : '?';
        const u = endpoint + sep + 'text=' + encodeURIComponent(text) + '&voice=' + encodeURIComponent(voice || 'naturale');
        res = await fetch(u, { method: 'GET' });
    }
    if (!res.ok) throw new Error('Piper HTTP ' + res.status);
    return Buffer.from(await res.arrayBuffer());
}

async function main() {
    const args = parseArgs();
    const html = fs.readFileSync(INDEX_HTML, 'utf8');
    const literal = extractQuizCuratedArrayLiteral(html);
    const QUIZ_CURATED = eval('(' + literal + ')');
    if (!Array.isArray(QUIZ_CURATED)) throw new Error('QUIZ_CURATED non è un array');

    const voiceFolder = args.voice;
    const outDir = path.join(OUT_BASE, voiceFolder);
    if (!args.dryRun) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const endpoint = args.endpoint || process.env.PIPER_URL || '';
    if (!args.dryRun && !String(endpoint).trim()) {
        console.error('Imposta PIPER_URL o --endpoint=https://.../tts');
        process.exit(1);
    }

    let ok = 0;
    let fail = 0;

    const introPath = path.join(outDir, QUIZ_SESSION_INTRO_FILE);
    if (args.dryRun) {
        console.log('—', QUIZ_SESSION_INTRO_FILE);
        console.log(' ', QUIZ_SESSION_INTRO_TEXT);
        ok++;
    } else {
        try {
            const buf = await fetchPiperMp3(endpoint, QUIZ_SESSION_INTRO_TEXT, voiceFolder);
            fs.writeFileSync(introPath, buf);
            console.log('OK', QUIZ_SESSION_INTRO_FILE, '(' + buf.length + ' byte)');
            ok++;
            await new Promise((r) => setTimeout(r, 350));
        } catch (e) {
            console.error('ERR', QUIZ_SESSION_INTRO_FILE, e && e.message ? e.message : e);
            fail++;
        }
    }

    for (let idx = 0; idx < QUIZ_CURATED.length; idx++) {
        const row = QUIZ_CURATED[idx];
        const q = makeQuestion(row);
        const text = buildOfflineNarrationText(q);
        const ref = slugifyAudioName(q.ref || '');
        const title = slugifyAudioName(q.q || '').slice(0, 36);
        const fileName = ref + '--' + title + '.mp3';
        const outPath = path.join(outDir, fileName);

        if (args.dryRun) {
            console.log('—', fileName);
            console.log(' ', text.slice(0, 160) + (text.length > 160 ? '…' : ''));
            ok++;
            continue;
        }

        try {
            const buf = await fetchPiperMp3(endpoint, text, voiceFolder);
            fs.writeFileSync(outPath, buf);
            console.log('OK', fileName, '(' + buf.length + ' byte)');
            ok++;
            await new Promise((r) => setTimeout(r, 350));
        } catch (e) {
            console.error('ERR', fileName, e && e.message ? e.message : e);
            fail++;
        }
    }

    console.log('\nFatto:', ok, 'file', fail ? ', errori: ' + fail : '');
    if (args.dryRun) {
        console.log('(dry-run: nessun file scritto)');
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
