from __future__ import annotations

from functools import lru_cache
from typing import Optional

from app.asr.base import ASRProvider
from app.asr.providers.faster_whisper_provider import FasterWhisperProvider
from app.config import get_settings

MODEL_DESCRIPTIONS = {
    "tiny": "最快，适合本地冒烟测试与联调。",
    "base": "比 tiny 更稳，适合轻量 Demo。",
    "small": "速度与准确率较均衡，推荐作为 CPU Demo 默认模型。",
    "medium": "准确率更高，但耗时更长。",
    "large-v3": "本地质量优先选项，建议在更强算力环境使用。",
}


def get_available_models() -> list[dict[str, object]]:
    settings = get_settings()
    return [
        {
            "name": model,
            "description": MODEL_DESCRIPTIONS.get(model, "可用模型。"),
            "recommended": model == settings.whisper_recommended_model,
        }
        for model in settings.whisper_allowed_models
    ]


def resolve_model_name(model_name: Optional[str]) -> str:
    settings = get_settings()
    selected_model = (model_name or settings.whisper_model).strip()
    if not selected_model:
        selected_model = settings.whisper_model

    if selected_model not in settings.whisper_allowed_models:
        supported = ", ".join(settings.whisper_allowed_models)
        raise ValueError(f"不支持的模型: {selected_model}。当前可选模型: {supported}")

    return selected_model


@lru_cache(maxsize=8)
def get_asr_provider(model_name: Optional[str] = None) -> ASRProvider:
    settings = get_settings()
    selected_model = resolve_model_name(model_name)

    if settings.asr_provider == "faster_whisper":
        return FasterWhisperProvider(
            model_size=selected_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
            transcript_script=settings.transcript_script,
            beam_size=settings.whisper_beam_size,
            vad_filter=settings.whisper_vad_filter,
            initial_prompt=settings.whisper_initial_prompt,
        )

    raise ValueError(f"Unsupported ASR_PROVIDER: {settings.asr_provider}")

