/**
 * Verifica che per ogni domanda in QUIZ_CURATED esista un MP3 raggiungibile
 * con la stessa logica di index.html (`quizSpeakLocalFileIfAvailable`):
 * cartella della voce scelta → (se non è naturale) cartella naturale → radice legacy.
 *
 * Voci: naturale, telecronaca, chiara, profonda — più controllo intro con gli stessi fallback.
 *
 * Uso: node scripts/check-quiz-offline-mp3.mjs
 * Exit 0 = tutti presenti, 1 = manca almeno un file per una voce.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');
const AUDIO_BASE = path.join(ROOT, 'assets', 'quiz-audio');
const VOICES = ['naturale', 'telecronaca', 'chiara', 'profonda'];
const INTRO_FILE = 'quiz-session-intro.mp3';

function slugifyAudioName(txt) {
    const s = String(txt || '')
        .toLowerCase()
        .replace(/['"`]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return s || 'quiz-item';
}

function extractQuizCuratedArrayLiteral(html) {
    const marker = 'const QUIZ_CURATED = ';
    const startMarker = html.indexOf(marker);
    if (startMarker < 0) throw new Error('const QUIZ_CURATED = non trovato in index.html');
    let pos = startMarker + marker.length;
    while (pos < html.length && /\s/.test(html[pos])) pos++;
    if (html[pos] !== '[') throw new Error('Atteso [ dopo QUIZ_CURATED');
    const sliceStart = pos;
    let depth = 1;
    let state = 'code';
    let i = pos + 1;
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
    if (depth !== 0) throw new Error('Parentesi quadre non bilanciate');
    return html.slice(sliceStart, i);
}

function expectedFileNameForRow(row) {
    const ref = slugifyAudioName(row.ref || '');
    const title = slugifyAudioName(row.q || '').slice(0, 36);
    return ref + '--' + title + '.mp3';
}

/** True se l’app troverebbe il file per questa voce (stessi candidati della telecronaca locale). */
function questionMp3Resolved(voice, fileName) {
    const v = String(voice || '').trim().toLowerCase();
    const candidates = [path.join(AUDIO_BASE, v, fileName)];
    if (v !== 'naturale') {
        candidates.push(path.join(AUDIO_BASE, 'naturale', fileName));
    }
    candidates.push(path.join(AUDIO_BASE, fileName));
    return candidates.some((p) => fs.existsSync(p));
}

/** Intro sessione: stessi candidati di quizPlayOfflineSessionIntroThenQuestion. */
function introMp3Resolved(voice) {
    const v = String(voice || '').trim().toLowerCase();
    const candidates = [];
    if (/^(naturale|telecronaca|chiara|profonda)$/.test(v)) {
        candidates.push(path.join(AUDIO_BASE, v, INTRO_FILE));
        if (v !== 'naturale') {
            candidates.push(path.join(AUDIO_BASE, 'naturale', INTRO_FILE));
        }
    }
    candidates.push(path.join(AUDIO_BASE, INTRO_FILE));
    return candidates.some((p) => fs.existsSync(p));
}

function main() {
    const html = fs.readFileSync(INDEX_HTML, 'utf8');
    const literal = extractQuizCuratedArrayLiteral(html);
    const QUIZ_CURATED = eval('(' + literal + ')');
    if (!Array.isArray(QUIZ_CURATED)) throw new Error('QUIZ_CURATED non è un array');

    const expectedNames = QUIZ_CURATED.map((row, idx) => ({
        idx: idx + 1,
        ref: row.ref,
        file: expectedFileNameForRow(row)
    }));

    console.log('Domande in banca:', QUIZ_CURATED.length);
    console.log('Cartella base:', path.relative(ROOT, AUDIO_BASE));
    console.log('');

    let voiceFoldersIncomplete = false;
    const report = {};

    for (const voice of VOICES) {
        const dir = path.join(AUDIO_BASE, voice);
        const missing = [];
        for (const item of expectedNames) {
            if (!questionMp3Resolved(voice, item.file)) {
                missing.push(item.file);
            }
        }
        const introOk = introMp3Resolved(voice);
        report[voice] = {
            dir: path.relative(ROOT, dir),
            ok: missing.length === 0,
            missingQuestions: missing,
            introPresent: introOk
        };
        if (missing.length) voiceFoldersIncomplete = true;

        console.log('Voce «' + voice + '» (risoluzione come in app; cartella primaria:', path.relative(ROOT, dir) + ')');
        console.log(
            '  MP3 domande:',
            missing.length === 0 ? 'tutti risolvibili (' + expectedNames.length + ')' : 'MANCANO ' + missing.length + ' / ' + expectedNames.length
        );
        if (missing.length) {
            missing.slice(0, 12).forEach((f) => console.log('    −', f));
            if (missing.length > 12) console.log('    … e altri', missing.length - 12, 'file');
        }
        console.log(
            '  Intro «' + INTRO_FILE + '»:',
            introOk ? 'OK (voce / naturale / radice)' : 'MANCANTE (opzionale: salta solo il messaggio di benvenuto)'
        );
        console.log('');
    }

    const rootMissing = [];
    for (const item of expectedNames) {
        if (!fs.existsSync(path.join(AUDIO_BASE, item.file))) rootMissing.push(item.file);
    }
    console.log('Radice legacy assets/quiz-audio/*.mp3 (70 file attesi senza sottocartella):');
    console.log(
        rootMissing.length === 0 ? '  Completa.' : '  MANCANO ' + rootMissing.length + ' file (solo necessari se non usi cartelle voce).'
    );
    console.log('');

    if (voiceFoldersIncomplete) {
        console.log('Riepilogo: verifica NON superata — genera o copia gli MP3 (scripts/generate-offline-quiz-audio.mjs).');
        process.exit(1);
    }
    console.log('Riepilogo: per ogni voce Piper tutti gli MP3 domanda sono risolvibili (cartella voce / naturale / radice). Controlla sopra se manca solo l’intro.');
    process.exit(0);
}

main();
