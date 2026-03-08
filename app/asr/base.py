from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ASRSegment:
    start: float
    end: float
    text: str


@dataclass
class ASRResult:
    text: str
    segments: list[ASRSegment] = field(default_factory=list)
    language: str = "zh"
    requested_language: str = "yue"
    provider: str = "unknown"
    model: str = ""
    warnings: list[str] = field(default_factory=list)


class ASRProvider(ABC):
    name = "unknown"

    @abstractmethod
    def transcribe(self, file_path: str, language: str) -> ASRResult:
        raise NotImplementedError

