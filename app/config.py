from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_csv(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


class Settings:
    def __init__(self) -> None:
        self.app_name = os.getenv("APP_NAME", "cantonese-asr-service")
        self.asr_provider = os.getenv("ASR_PROVIDER", "faster_whisper").strip().lower()
        self.asr_language = os.getenv("ASR_LANGUAGE", "yue").strip().lower()
        self.transcript_script = os.getenv("TRANSCRIPT_SCRIPT", "traditional").strip().lower()
        self.max_upload_mb = int(os.getenv("MAX_UPLOAD_MB", "50"))
        self.whisper_model = os.getenv("WHISPER_MODEL", "small").strip()
        self.whisper_recommended_model = os.getenv("WHISPER_RECOMMENDED_MODEL", self.whisper_model).strip()
        self.whisper_allowed_models = _get_csv(
            "WHISPER_ALLOWED_MODELS",
            "tiny,base,small,medium,large-v3",
        )
        self.whisper_device = os.getenv("WHISPER_DEVICE", "auto").strip().lower()
        self.whisper_compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8").strip().lower()
        self.whisper_beam_size = int(os.getenv("WHISPER_BEAM_SIZE", "5"))
        self.whisper_vad_filter = _get_bool("WHISPER_VAD_FILTER", True)
        self.whisper_initial_prompt = os.getenv(
            "WHISPER_INITIAL_PROMPT",
            "以下是香港社工家访场景的粤语对话，请尽量输出繁体中文，并保留常见药名、身体症状与英文专有名词，例如头晕、脚肿、气喘、降压药、Metformin。",
        ).strip()


@lru_cache
def get_settings() -> Settings:
    return Settings()

