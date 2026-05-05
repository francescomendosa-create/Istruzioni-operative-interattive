import os
import subprocess
import tempfile
from flask import Flask, request, send_file, jsonify

APP = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "it_IT-paola-medium.onnx")


def synthesize_to_wav(text: str) -> str:
    fd, wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    cmd = [
        "py",
        "-m",
        "piper",
        "-m",
        MODEL_PATH,
        "-f",
        wav_path,
    ]
    proc = subprocess.run(
        cmd,
        input=text.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", errors="ignore") or "piper_failed")
    return wav_path


@APP.get("/health")
def health():
    return jsonify({"ok": True, "model": os.path.basename(MODEL_PATH)})


@APP.get("/tts")
def tts_get():
    text = (request.args.get("text") or "").strip()
    if not text:
        return jsonify({"error": "missing_text"}), 400
    try:
        wav_path = synthesize_to_wav(text)
        return send_file(wav_path, mimetype="audio/wav")
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@APP.post("/tts")
def tts_post():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text") or "").strip()
    if not text:
        return jsonify({"error": "missing_text"}), 400
    try:
        wav_path = synthesize_to_wav(text)
        return send_file(wav_path, mimetype="audio/wav")
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    APP.run(host="0.0.0.0", port=5000)
