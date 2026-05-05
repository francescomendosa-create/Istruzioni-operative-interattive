$root = "C:\Users\franc\Downloads\chck lis funzionante"
$script = Join-Path $root "scripts\sync_quiz_audio.py"

# One-shot sync: generate only missing files
py $script --tts-url "https://quiz-piper-tts.onrender.com/tts" --voice "naturale"

# To keep it automatic while editing questions, run:
# py $script --watch --interval 8 --tts-url "https://quiz-piper-tts.onrender.com/tts" --voice "naturale"
