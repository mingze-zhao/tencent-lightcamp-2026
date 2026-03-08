from __future__ import annotations

import logging

from faster_whisper import WhisperModel
from opencc import OpenCC

from app.asr.base import ASRProvider, ASRResult, ASRSegment

logger = logging.getLogger(__name__)


class FasterWhisperProvider(ASRProvider):
    name = "faster_whisper"

    def __init__(
        self,
        model_size: str,
        device: str,
        compute_type: str,
        transcript_script: str,
        beam_size: int,
        vad_filter: bool,
        initial_prompt: str,
    ) -> None:
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.beam_size = beam_size
        self.vad_filter = vad_filter
        self.initial_prompt = initial_prompt
        self._model = WhisperModel(model_size, device=device, compute_type=compute_type)
        self._converter = OpenCC("s2t") if transcript_script == "traditional" else None

    def transcribe(self, file_path: str, language: str) -> ASRResult:
        resolved_language, raw_segments, warnings = self._transcribe_with_fallback(file_path, language)
        segments, transcript_lines = self._collect_segments(raw_segments)

        if not transcript_lines and language == "yue" and resolved_language != "zh":
            logger.warning("language=yue 转写结果为空，回退到 zh 重新识别")
            warnings.append("yue 转写结果为空，已自动回退为 zh 重新识别。")
            segments, info = self._run_transcribe(file_path, "zh")
            resolved_language = info.language or "zh"
            segments, transcript_lines = self._collect_segments(segments)

        return ASRResult(
            text="\n".join(transcript_lines).strip(),
            segments=segments,
            language=resolved_language,
            requested_language=language,
            provider=self.name,
            model=self.model_size,
            warnings=warnings,
        )


    def _transcribe_with_fallback(self, file_path: str, language: str) -> tuple[str, list, list[str]]:
        warnings: list[str] = []
        try:
            segments, info = self._run_transcribe(file_path, language)
            return (info.language or language), segments, warnings
        except Exception as exc:
            if language != "yue":
                raise

            logger.warning("language=yue 转写失败，回退到 zh: %s", exc)
            warnings.append("当前模型不直接支持 yue，已自动回退为 zh 进行识别。")
            segments, info = self._run_transcribe(file_path, "zh")
            return (info.language or "zh"), segments, warnings

    def _run_transcribe(self, file_path: str, language: str) -> tuple[list, object]:
        segments, info = self._model.transcribe(
            file_path,
            task="transcribe",
            language=language,
            beam_size=self.beam_size,
            temperature=0.0,
            vad_filter=self.vad_filter,
            condition_on_previous_text=True,
            initial_prompt=self.initial_prompt,
        )
        return list(segments), info

    def _normalize_text(self, text: str) -> str:
        normalized = text.strip()
        if not normalized:
            return ""

        if self._converter is not None:
            normalized = self._converter.convert(normalized)

        return " ".join(normalized.split())

