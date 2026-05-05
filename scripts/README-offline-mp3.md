# Telecronaca offline (MP3 in `assets/quiz-audio/`)

L’app **riproduce i file così come sono**. Non può togliere la parola «domanda» da un MP3 già registrato.

Per **non** ripetere «domanda» a ogni traccia:

1. Rigenera gli MP3 con testo **senza** «Domanda.» in apertura (solo testo domanda + «Risposta A/B/C…», come in gioco per le domande che non sono milestone 1, 5, 10, 15, 20).

2. Usa lo script Node che chiama il tuo **Piper HTTP** (lo stesso endpoint configurato nell’app):

```bash
cd cartella-del-progetto
set PIPER_URL=https://quiz-piper-tts.onrender.com/tts
node scripts/generate-offline-quiz-audio.mjs
```

Anteprima senza rete:

```bash
node scripts/generate-offline-quiz-audio.mjs --dry-run
```

Verifica che gli MP3 previsti dalla banca esistano (stessi percorsi usati dall’app, inclusi fallback `naturale` e radice):

```bash
node scripts/check-quiz-offline-mp3.mjs
```

Opzioni utili:

- `--voice=naturale` — cartella di destinazione `assets/quiz-audio/naturale/` (default)
- `--endpoint=https://...` — se non usi la variabile `PIPER_URL`

Lo script legge `QUIZ_CURATED` da `index.html`, mescola le opzioni come l’app (**seed deterministico**: ref + testo domanda + risposta corretta — vedi `quizDeterministicShuffle` in `index.html`), costruisce il testo **senza** «Domanda.» e salva un `.mp3` per ogni domanda. Due rigenerazioni producono gli stessi file.

Viene anche creato **`quiz-session-intro.mp3`** nella stessa cartella voce, con il testo di benvenuto riprodotto **prima della prima domanda** in partita (se il file è presente sul server).

**Attenzione:** se modifichi l’algoritmo di shuffle in `index.html` o in questo script, rigenera gli MP3 e aggiorna la banca (`QUIZ_BANK_BUILD_ID` viene incrementato quando serve invalidare la cache).

**Nota:** In partita l’app può ancora aggiungere «Domanda.» nel testo inviato a Gemini/TTS **solo** quando non stai usando il file locale (motore Gemini o fallback). Con Piper **offline solo MP3**, quello che senti è sempre il file — deve essere rigenerato come sopra.
