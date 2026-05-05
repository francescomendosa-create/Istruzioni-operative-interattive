import os
import re
import tempfile
import urllib.request
import wave
from flask import Flask, request, send_file, jsonify
from piper import PiperVoice, SynthesisConfig

APP = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.environ.get("PIPER_MODEL_PATH", os.path.join(MODELS_DIR, "it_IT-paola-medium.onnx"))
MODEL_JSON_PATH = MODEL_PATH + ".json"
MODEL_URL = os.environ.get(
    "PIPER_MODEL_URL",
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium/it_IT-paola-medium.onnx?download=true",
)
MODEL_JSON_URL = os.environ.get(
    "PIPER_MODEL_JSON_URL",
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium/it_IT-paola-medium.onnx.json?download=true",
)
VOICE = None
VOICE_PRESETS = {
    "naturale": SynthesisConfig(length_scale=1.05, noise_scale=0.62, noise_w_scale=0.72),
    "telecronaca": SynthesisConfig(length_scale=0.98, noise_scale=0.60, noise_w_scale=0.68),
    "chiara": SynthesisConfig(length_scale=1.18, noise_scale=0.56, noise_w_scale=0.66),
    "profonda": SynthesisConfig(length_scale=1.10, noise_scale=0.70, noise_w_scale=0.80),
}


def normalize_text_for_italian_tts(text: str) -> str:
    if not text:
        return ""
    out = str(text)
    # Normalize common symbols/acronyms that degrade pronunciation.
    replacements = {
        "H2S": "acca due esse",
        "CO2": "ci o due",
        "COD": "ci o di",
        "MBBR": "emme bi bi erre",
        "m3": "metri cubi",
        "%": " per cento ",
        "&": " e ",
        "/": " oppure ",
    }
    for src, dst in replacements.items():
        out = out.replace(src, dst)
    # Space numbers/units and clean punctuation for smoother phrasing.
    out = re.sub(r"(\d+)([A-Za-z])", r"\1 \2", out)
    out = re.sub(r"\s+", " ", out).strip()
    return out


def ensure_model_files():
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    if not os.path.exists(MODEL_PATH):
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    if not os.path.exists(MODEL_JSON_PATH):
        urllib.request.urlretrieve(MODEL_JSON_URL, MODEL_JSON_PATH)


def get_voice():
    global VOICE
    if VOICE is None:
        ensure_model_files()
        VOICE = PiperVoice.load(MODEL_PATH)
    return VOICE


def synthesize_to_wav(text: str, voice_preset: str = "naturale") -> str:
    fd, wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    clean_text = normalize_text_for_italian_tts(text)
    syn_config = VOICE_PRESETS.get(voice_preset, VOICE_PRESETS["naturale"])
    voice = get_voice()
    with wave.open(wav_path, "wb") as wav_file:
        voice.synthesize_wav(
            clean_text,
            wav_file,
            syn_config=syn_config,
            set_wav_format=True,
            include_alignments=False,
        )
    return wav_path


@APP.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    return response


@APP.get("/health")
def health():
    return jsonify({"ok": True, "model": os.path.basename(MODEL_PATH), "loaded": VOICE is not None})


@APP.route("/tts", methods=["OPTIONS"])
def tts_options():
    return ("", 204)


@APP.get("/tts")
def tts_get():
    text = (request.args.get("text") or "").strip()
    voice = (request.args.get("voice") or "naturale").strip().lower()
    if not text:
        return jsonify({"error": "missing_text"}), 400
    try:
        wav_path = synthesize_to_wav(text, voice)
        return send_file(wav_path, mimetype="audio/wav")
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@APP.post("/tts")
def tts_post():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text") or "").strip()
    voice = str(payload.get("voice") or "naturale").strip().lower()
    if not text:
        return jsonify({"error": "missing_text"}), 400
    try:
        wav_path = synthesize_to_wav(text, voice)
        return send_file(wav_path, mimetype="audio/wav")
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    APP.run(host="0.0.0.0", port=port)
