from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from time import perf_counter
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from app.asr.service import get_asr_provider, get_available_models, resolve_model_name
from app.config import get_settings
from app.schemas import ASRModelCatalogResponse, ASRModelOption, TranscriptSegment, TranscriptionResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()
app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_SUFFIXES = {".wav", ".mp3", ".m4a", ".mp4", ".webm", ".ogg", ".flac"}
CHUNK_SIZE = 1024 * 1024


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "provider": settings.asr_provider,
        "default_model": settings.whisper_model,
        "recommended_model": settings.whisper_recommended_model,
        "language": settings.asr_language,
    }


@app.get("/api/models", response_model=ASRModelCatalogResponse)
def list_models() -> ASRModelCatalogResponse:
    return ASRModelCatalogResponse(
        provider=settings.asr_provider,
        default_model=settings.whisper_model,
        recommended_model=settings.whisper_recommended_model,
        available_models=[ASRModelOption(**item) for item in get_available_models()],
    )


@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Form(default=None),
    model: Optional[str] = Form(default=None),
    return_segments: bool = Form(default=True),
) -> TranscriptionResponse:
    selected_language = (language or settings.asr_language).strip().lower() or settings.asr_language

    try:
        selected_model = resolve_model_name(model)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    temp_file_path = await _save_upload_to_temp(file)
    started_at = perf_counter()

    try:
        provider = get_asr_provider(selected_model)
        result = await run_in_threadpool(provider.transcribe, temp_file_path, selected_language)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("粤语转录失败: %s", exc)
        raise HTTPException(status_code=502, detail="粤语转录失败，请稍后重试或检查音频格式。") from exc
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    if not result.text:
        raise HTTPException(status_code=422, detail="未识别到有效语音内容，请检查录音质量。")

    segments = [
        TranscriptSegment(start=segment.start, end=segment.end, text=segment.text)
        for segment in result.segments
    ]
    audio_duration_seconds = round(segments[-1].end if segments else 0.0, 2)
    processing_seconds = round(perf_counter() - started_at, 2)

    return TranscriptionResponse(
        text=result.text,
        segments=segments if return_segments else [],
        language=result.language,
        requested_language=result.requested_language,
        provider=result.provider,
        model=result.model or selected_model,
        warnings=result.warnings,
        processing_seconds=processing_seconds,
        audio_duration_seconds=audio_duration_seconds,
    )


async def _save_upload_to_temp(upload_file: UploadFile) -> str:
    suffix = Path(upload_file.filename or "audio").suffix.lower()
    content_type = (upload_file.content_type or "").lower()

    if suffix not in ALLOWED_SUFFIXES and not content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="仅支持常见音频格式，如 WAV、MP3、M4A、WebM、OGG、FLAC。")

    temp_path = ""
    total_size = 0
    max_bytes = settings.max_upload_mb * 1024 * 1024

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix or ".tmp") as temp_file:
            temp_path = temp_file.name
            while chunk := await upload_file.read(CHUNK_SIZE):
                total_size += len(chunk)
                if total_size > max_bytes:
                    raise HTTPException(status_code=413, detail=f"文件过大，当前上限为 {settings.max_upload_mb}MB。")
                temp_file.write(chunk)
    except Exception:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise
    finally:
        await upload_file.close()

    if total_size == 0:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=400, detail="上传文件为空。")

    return temp_path

