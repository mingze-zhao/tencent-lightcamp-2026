import json
import os
from pathlib import Path

os.environ["ASR_LANGUAGE"] = "yue"
os.environ["WHISPER_MODEL"] = "small"
os.environ["WHISPER_RECOMMENDED_MODEL"] = "small"

from fastapi.testclient import TestClient

from app.main import app

workspace = Path(__file__).resolve().parent
audio_path = workspace / "tmp_cantonese_test.wav"
out_path = workspace / "tmp_verify_asr_result.json"

client = TestClient(app)
results = {}

results["health"] = {
    "status_code": client.get("/health").status_code,
    "body": client.get("/health").json(),
}
results["models"] = {
    "status_code": client.get("/api/models").status_code,
    "body": client.get("/api/models").json(),
}

with audio_path.open("rb") as audio_file:
    response = client.post(
        "/api/transcribe",
        data={"model": "tiny"},
        files={"file": (audio_path.name, audio_file, "audio/wav")},
    )
results["transcribe_tiny"] = {"status_code": response.status_code, "body": response.json()}

with audio_path.open("rb") as audio_file:
    response = client.post(
        "/api/transcribe",
        files={"file": (audio_path.name, audio_file, "audio/wav")},
    )
results["transcribe_default"] = {"status_code": response.status_code, "body": response.json()}

response = client.post(
    "/api/transcribe",
    data={"model": "not-exists"},
    files={"file": ("demo.wav", b"RIFF", "audio/wav")},
)
results["transcribe_bad_model"] = {"status_code": response.status_code, "body": response.json()}

out_path.write_text(json.dumps(results, ensure_ascii=False), encoding="utf-8")
