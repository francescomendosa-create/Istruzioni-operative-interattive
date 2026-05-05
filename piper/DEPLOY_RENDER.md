# Deploy Piper on Render (Free)

1. Push this `piper` folder to a GitHub repository.
2. Open Render and create a **New Blueprint**.
3. Select the repository.
4. Render reads `piper/render.yaml` automatically.
5. Deploy and wait for build completion.
6. Copy service URL, for example:
   - `https://quiz-piper-tts.onrender.com`
7. In the app settings, set:
   - `Motore telecronaca` = `Piper`
   - `URL Piper` = `https://quiz-piper-tts.onrender.com/tts`

Health check:
- `https://quiz-piper-tts.onrender.com/health`

Notes:
- Free plan may sleep when idle; first request can be slower.
- For stable always-on behavior, upgrade plan.
