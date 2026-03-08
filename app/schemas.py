from __future__ import annotations

from pydantic import BaseModel, Field


class TranscriptSegment(BaseModel):
    start: float = Field(..., description="片段开始时间（秒）")
    end: float = Field(..., description="片段结束时间（秒）")
    text: str = Field(..., description="该时间段的转写文本")


class ASRModelOption(BaseModel):
    name: str = Field(..., description="模型名称")
    description: str = Field(..., description="模型特点")
    recommended: bool = Field(default=False, description="是否为当前推荐模型")


class ASRModelCatalogResponse(BaseModel):
    provider: str = Field(..., description="当前使用的 ASR 提供方")
    default_model: str = Field(..., description="默认模型")
    recommended_model: str = Field(..., description="推荐模型")
    available_models: list[ASRModelOption] = Field(default_factory=list)


class TranscriptionResponse(BaseModel):
    text: str = Field(..., description="完整转写文本")
    segments: list[TranscriptSegment] = Field(default_factory=list)
    language: str = Field(..., description="实际使用或识别语言")
    requested_language: str = Field(..., description="请求识别语言")
    provider: str = Field(..., description="当前使用的 ASR 提供方")
    model: str = Field(..., description="本次转写实际使用的模型")
    warnings: list[str] = Field(default_factory=list, description="本次转写的提示信息")
    processing_seconds: float = Field(..., description="本次请求处理耗时（秒）")
    audio_duration_seconds: float = Field(..., description="音频时长（秒）")

