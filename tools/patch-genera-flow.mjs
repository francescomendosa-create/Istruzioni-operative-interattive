/**
 * One-shot patch: replace gestioneGeneraBuildFromDb block with flow helpers + router.
 * Run from repo root: node tools/patch-genera-flow.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'index.html');

const NEW_BLOCK = `async function gestioneGeneraAsyncBuildOneGenericUnified(pick, na, numWrong, distractors, extraStateMcq, hasGeminiKey) {
    if (pick.kind === 'mcq') {
        return gestioneMcqBuildSlotFromArticulatedItem(pick.item, na, extraStateMcq, 'genericMcq');
    }
    var row = pick.row;
    var qStem = gestioneStripHtml(row.q || '').substring(0, 420);
    var acts = (row.actions || []).map(function (a) {
        return gestioneStripHtml(a.c || '');
    }).filter(function (x) {
        return x.length > 2;
    });
    var correct =
        acts.length > 0
            ? acts[Math.floor(Math.random() * acts.length)]
            : 'Verificare priorità operative legate a «' + gestioneStripHtml(row.tag || 'controllo').substring(0, 60) + '»';

    var stemDisp = String(qStem || '').trim();
    if (!stemDisp) stemDisp = gestioneStripHtml(row.tag || '') || '—';

    var fullQ =
        '«' +
        stemDisp +
        '»\n\nQuale intervento è più coerente con la scheda operativa e con le azioni previste?';

    var tagLine = gestioneStripHtml(row.tag || '').substring(0, 280);
    var actsPreview = acts.join(' | ').substring(0, 1600);

    var builtOffline = gestioneGeneraBuildAnswersLocal(correct, numWrong, distractors, acts, null, stemDisp);
    var built = builtOffline;

    if (numWrong > 0) {
        var cacheKey = gestioneMcqGeminiCacheMakeKey(stemDisp, correct, numWrong, tagLine);
        var cachedEnt = gestioneMcqGeminiCacheGetEntry(cacheKey);
        var correctDisplay = correct;
        if (cachedEnt && gestioneMcqCacheEntryIsArticulated(cachedEnt, numWrong)) {
            correctDisplay = String(cachedEnt.correctArt).trim();
            built = gestioneGeneraBuildAnswersLocal(
                correctDisplay,
                numWrong,
                distractors,
                acts,
                cachedEnt.wrong.slice(0, numWrong),
                stemDisp
            );
        } else if (hasGeminiKey && gestioneCanReachGemini()) {
            try {
                var gemPack = await gestioneGeminiFetchArticulatedMcq(
                    fullQ,
                    correct,
                    tagLine,
                    actsPreview,
                    numWrong
                );
                gestioneMcqGeminiCacheSetFull(cacheKey, gemPack.wrong, gemPack.correct);
                correctDisplay =
                    gemPack.correct && String(gemPack.correct).trim().length >= 8
                        ? String(gemPack.correct).trim()
                        : correct;
                built = gestioneGeneraBuildAnswersLocal(
                    correctDisplay,
                    numWrong,
                    distractors,
                    acts,
                    gemPack.wrong,
                    stemDisp
                );
            } catch (eG) {
                built = builtOffline;
            }
        }
    }

    return {
        q: fullQ,
        answers: built.answers,
        correctIndex: built.correctIndex
    };
}

async function gestioneGeneraBuildFromDbGenericOnly() {
    var prevSaved = gestioneDomandeLoad();
    var cfg = gestioneConfigLoad();
    var nTotal = cfg.numQuestions;
    var na = cfg.numAnswers;
    var numWrong = Math.max(0, na - 1);
    var letters = ['A', 'B', 'C', 'D', 'E'];
    var out = [];
    var pool = gestioneCollectGlobalActionPool();
    var cfRows = typeof db !== 'undefined' && db.cf && db.cf.length ? db.cf.slice() : [];
    var staticGenericMcq =
        typeof GESTIONE_GENERIC_MCQ_BANK !== 'undefined' && Array.isArray(GESTIONE_GENERIC_MCQ_BANK)
            ? GESTIONE_GENERIC_MCQ_BANK
            : [];
    var unified = [];
    cfRows.forEach(function (row) {
        unified.push({ kind: 'cf', row: row });
    });
    staticGenericMcq.forEach(function (item) {
        unified.push({ kind: 'mcq', item: item });
    });
    var hasGeminiKey = numWrong > 0 && !!quizResolveAiConfig().textKey;

    if (!unified.length) {
        for (var z = 0; z < nTotal; z++) {
            var sl = gestioneDomandeEmptySlot();
            sl.q =
                'Definire la domanda ' +
                (z + 1) +
                ' (nessuna fonte disponibile: Controlli in scheda e banco domande generiche offline).';
            var ansPl = [];
            for (var ze = 0; ze < na; ze++) {
                ansPl.push('Opzione ' + letters[ze] + ' — da completare');
            }
            sl.answers = ansPl;
            sl.correctIndex = 0;
            out.push(sl);
        }
        return gestioneMergeSavedSlotsIntoGenerated(prevSaved, out);
    }
    var order = gestioneShuffle(unified.map(function (_, idx) {
        return idx;
    }));
    var distractors = gestioneShuffle(pool.slice());
    var extraStateMcq = gestioneMcqExtraStateCreate();

    for (var n = 0; n < nTotal; n++) {
        var pick = unified[order[n % unified.length]];
        out.push(
            await gestioneGeneraAsyncBuildOneGenericUnified(
                pick,
                na,
                numWrong,
                distractors,
                extraStateMcq,
                hasGeminiKey
            )
        );
    }
    return gestioneMergeSavedSlotsIntoGenerated(prevSaved, out);
}

async function gestioneGeneraBuildMixedCarAndGeneric() {
    var prevSaved = gestioneDomandeLoad();
    var cfg = gestioneConfigLoad();
    var nTotal = cfg.numQuestions;
    var na = cfg.numAnswers;
    var numWrong = Math.max(0, na - 1);
    var letters = ['A', 'B', 'C', 'D', 'E'];
    var out = [];

    var pool = gestioneCollectGlobalActionPool();
    var cfRows = typeof db !== 'undefined' && db.cf && db.cf.length ? db.cf.slice() : [];
    var staticGenericMcq =
        typeof GESTIONE_GENERIC_MCQ_BANK !== 'undefined' && Array.isArray(GESTIONE_GENERIC_MCQ_BANK)
            ? GESTIONE_GENERIC_MCQ_BANK
            : [];
    var unified = [];
    cfRows.forEach(function (row) {
        unified.push({ kind: 'cf', row: row });
    });
    staticGenericMcq.forEach(function (item) {
        unified.push({ kind: 'mcq', item: item });
    });

    var carBank =
        typeof GESTIONE_CAR_MCQ_BANK !== 'undefined' && Array.isArray(GESTIONE_CAR_MCQ_BANK)
            ? GESTIONE_CAR_MCQ_BANK
            : [];

    var canG = unified.length > 0;
    var canC = carBank.length > 0;

    if (!canG && !canC) {
        for (var ez = 0; ez < nTotal; ez++) {
            var sle = gestioneDomandeEmptySlot();
            sle.q =
                'Definire la domanda ' +
                (ez + 1) +
                ' (nessuna fonte: scheda, banco generiche e banco Rischi associati non disponibili).';
            var ansPle = [];
            for (var ze2 = 0; ze2 < na; ze2++) {
                ansPle.push('Opzione ' + letters[ze2] + ' — da completare');
            }
            sle.answers = ansPle;
            sle.correctIndex = 0;
            out.push(sle);
        }
        return gestioneMergeSavedSlotsIntoGenerated(prevSaved, out);
    }

    var order = gestioneShuffle(unified.map(function (_, idx) {
        return idx;
    }));
    var carOrder = gestioneShuffle(carBank.map(function (_, idx) {
        return idx;
    }));
    var distractors = gestioneShuffle(pool.slice());
    var extraStateMcq = gestioneMcqExtraStateCreate();
    var extraCar = gestioneMcqExtraStateCreate();
    var hasGeminiKey = numWrong > 0 && !!quizResolveAiConfig().textKey;

    var gPos = 0;
    var cPos = 0;

    for (var slot = 0; slot < nTotal; slot++) {
        var useCar;
        if (canG && canC) useCar = Math.random() < 0.5;
        else if (!canG && canC) useCar = true;
        else useCar = false;

        if (useCar && canC) {
            var cit = carBank[carOrder[cPos % carOrder.length]];
            cPos++;
            out.push(gestioneMcqBuildSlotFromArticulatedItem(cit, na, extraCar, 'car'));
            continue;
        }
        if (canG) {
            var pick = unified[order[gPos % unified.length]];
            gPos++;
            out.push(
                await gestioneGeneraAsyncBuildOneGenericUnified(
                    pick,
                    na,
                    numWrong,
                    distractors,
                    extraStateMcq,
                    hasGeminiKey
                )
            );
            continue;
        }
        if (canC) {
            var cit2 = carBank[carOrder[cPos % carOrder.length]];
            cPos++;
            out.push(gestioneMcqBuildSlotFromArticulatedItem(cit2, na, extraCar, 'car'));
            continue;
        }
        var slF = gestioneDomandeEmptySlot();
        slF.q = 'Domanda ' + (slot + 1) + ' — fonte non disponibile.';
        var ansPlf = [];
        for (var zf = 0; zf < na; zf++) ansPlf.push('Opzione ' + letters[zf] + ' — da completare');
        slF.answers = ansPlf;
        slF.correctIndex = 0;
        out.push(slF);
    }
    return gestioneMergeSavedSlotsIntoGenerated(prevSaved, out);
}

async function gestioneGeneraBuildFromDb() {
    var fl = gestioneConfigLoad();
    var wantG = !!fl.flowGeneriche;
    var wantC = !!fl.flowCar;
    if (!wantG && !wantC) wantG = true;

    if (wantC && !wantG) {
        return gestioneGeneraBuildFromCarBank();
    }
    if (wantG && !wantC) {
        return gestioneGeneraBuildFromDbGenericOnly();
    }
    return gestioneGeneraBuildMixedCarAndGeneric();
}
`;

let s = fs.readFileSync(indexPath, 'utf8');
const marker = 'async function gestioneGeneraBuildFromDb() {';
const start = s.indexOf(marker);
if (start < 0) throw new Error('marker start not found');
const endMarker = 'function gestioneGeneraBusySetLines';
const end = s.indexOf(endMarker, start);
if (end < 0) throw new Error('marker end not found');

const before = s.slice(0, start);
const after = s.slice(end);
const out = before + NEW_BLOCK + '\n' + after;
fs.writeFileSync(indexPath, out, 'utf8');
console.log('Patched', indexPath, 'bytes', out.length);
