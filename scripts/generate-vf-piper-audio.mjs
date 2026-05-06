/**
 * Genera gli MP3 offline per la modalità «Vero o falso» (25 affermazioni × voci Piper).
 * Testo letto: «Vero o falso. » + statement (allineato a quizBuildVfNarrationText in index.html).
 * File per voce: assets/quiz-audio/{voce}/vf-XXX.mp3 (copia anche in quiz-audio-q/{voce}/).
 *
 * Uso:
 *   set PIPER_URL=https://tuoserver/tts
 *   node scripts/generate-vf-piper-audio.mjs
 *
 * Opzioni:
 *   --dry-run              solo elenco, nessuna rete
 *   --voice=naturale       solo una cartella voce (default: tutte e 4)
 *   --endpoint=URL         sovrascrive PIPER_URL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');
const OUT_QA = path.join(ROOT, 'assets', 'quiz-audio');
const OUT_Q = path.join(ROOT, 'assets', 'quiz-audio-q');
const VOICES = ['naturale', 'telecronaca', 'chiara', 'profonda'];

function extractQuizVfBankLiteral(html) {
    const marker = 'const QUIZ_VF_BANK = ';
    const startMarker = html.indexOf(marker);
    if (startMarker < 0) throw new Error('const QUIZ_VF_BANK = non trovato in index.html');
    let pos = startMarker + marker.length;
    while (pos < html.length && /\s/.test(html[pos])) pos++;
    if (html[pos] !== '[') throw new Error('Atteso [ dopo QUIZ_VF_BANK');
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
    if (depth !== 0) throw new Error('Parentesi quadre non bilanciate in QUIZ_VF_BANK');
    return html.slice(pos, i);
}

function parseArgs() {
    const out = { dryRun: false, voiceAll: true, singleVoice: '', endpoint: process.env.PIPER_URL || '' };
    for (const a of process.argv.slice(2)) {
        if (a === '--dry-run') out.dryRun = true;
        else if (a.startsWith('--voice=')) {
            out.voiceAll = false;
            out.singleVoice = a.slice('--voice='.length).trim() || 'naturale';
        } else if (a.startsWith('--endpoint=')) out.endpoint = a.slice('--endpoint='.length).trim();
    }
    return out;
}

async function fetchPiperMp3(endpoint, text, voice) {
    let res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voice || 'naturale' })
    });
    if (!res.ok) {
        const sep = endpoint.indexOf('?') >= 0 ? '&' : '?';
        const u = endpoint + sep + 'text=' + encodeURIComponent(text) + '&voice=' + encodeURIComponent(voice || 'naturale');
        res = await fetch(u, { method: 'GET' });
    }
    if (!res.ok) throw new Error('Piper HTTP ' + res.status);
    return Buffer.from(await res.arrayBuffer());
}

function vfNarration(item) {
    return 'Vero o falso. ' + String((item && item.statement) || '');
}

async function main() {
    const args = parseArgs();
    const html = fs.readFileSync(INDEX_HTML, 'utf8');
    const literal = extractQuizVfBankLiteral(html);
    const QUIZ_VF_BANK = eval('(' + literal + ')');
    if (!Array.isArray(QUIZ_VF_BANK)) throw new Error('QUIZ_VF_BANK non è un array');

    const voices = args.voiceAll ? VOICES : [args.singleVoice];
    const endpoint = args.endpoint || process.env.PIPER_URL || '';

    if (!args.dryRun && !String(endpoint).trim()) {
        console.error('Imposta PIPER_URL o --endpoint=https://.../tts');
        process.exit(1);
    }

    let ok = 0;
    let fail = 0;

    for (const voiceFolder of voices) {
        const outDirQa = path.join(OUT_QA, voiceFolder);
        const outDirQ = path.join(OUT_Q, voiceFolder);
        if (!args.dryRun) {
            fs.mkdirSync(outDirQa, { recursive: true });
            fs.mkdirSync(outDirQ, { recursive: true });
        }

        for (let idx = 0; idx < QUIZ_VF_BANK.length; idx++) {
            const item = QUIZ_VF_BANK[idx];
            const ref = String((item && item.ref) || '').trim();
            if (!ref) {
                console.error('ERR item', idx, 'ref mancante');
                fail++;
                continue;
            }
            const text = vfNarration(item);
            const fileName = ref + '.mp3';
            const outPathQa = path.join(outDirQa, fileName);
            const outPathQ = path.join(outDirQ, fileName);

            if (args.dryRun) {
                console.log('—', voiceFolder, fileName);
                console.log(' ', text.slice(0, 140) + (text.length > 140 ? '…' : ''));
                ok++;
                continue;
            }

            try {
                const buf = await fetchPiperMp3(endpoint, text, voiceFolder);
                fs.writeFileSync(outPathQa, buf);
                fs.writeFileSync(outPathQ, buf);
                console.log('OK', voiceFolder, fileName, '(' + buf.length + ' byte)');
                ok++;
                await new Promise((r) => setTimeout(r, 350));
            } catch (e) {
                console.error('ERR', voiceFolder, fileName, e && e.message ? e.message : e);
                fail++;
            }
        }
    }

    console.log('\nFatto:', ok, 'operazioni', fail ? ', errori: ' + fail : '');
    if (args.dryRun) console.log('(dry-run: nessun file scritto)');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
