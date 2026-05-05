# Quiz Audio Offline

Put offline narration files in this folder to enable instant local telecronaca.

Format:
- MP3 files
- Filename pattern:
  - `<ref-slug>--<question-slug>.mp3`

Examples:
- `mbbr-principi--cos-e-in-sintesi-un-processo-mbbr-moving.mp3`
- `chimico-fisico-pac--che-ruolo-ha-tipicamente-un-coagulante.mp3`

Behavior in app:
- If local file exists, quiz plays it immediately (offline/local).
- If not found, app falls back to configured engine (Piper/Gemini).

Tip:
- Keep file names lowercase with `-` separators only.

Auto-generate/update audio when questions change:

1) One-shot generation of missing files:
- `py scripts/sync_quiz_audio.py --tts-url "https://quiz-piper-tts.onrender.com/tts" --voice "naturale"`

2) Continuous auto-sync while editing `index.html`:
- `py scripts/sync_quiz_audio.py --watch --interval 8 --tts-url "https://quiz-piper-tts.onrender.com/tts" --voice "naturale"`
