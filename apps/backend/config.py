from __future__ import annotations

import math
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"


def _load_env_file() -> None:
    """Load .env defaults without overriding values already set by the process."""
    if not ENV_FILE.exists():
        return

    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


_load_env_file()


def _positive_int_env(name: str, default: str) -> int:
    value = int(os.getenv(name, default))
    if value <= 0:
        raise ValueError(f"{name} must be greater than zero")
    return value


def _positive_float_env(name: str, default: str) -> float:
    value = float(os.getenv(name, default))
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{name} must be a finite number greater than zero")
    return value


def _confidence_threshold_env(name: str, default: str) -> float:
    value = float(os.getenv(name, default))
    if not math.isfinite(value) or not 0 <= value <= 1:
        raise ValueError(f"{name} must be a finite number between zero and one")
    return value


class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "")
    HOST: str = os.getenv("HOST", "")
    PORT: int = int(os.getenv("PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "")

    DB_HOST: str = os.getenv("DB_HOST", "")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "")
    DB_USER: str = os.getenv("DB_USER", "")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SUPABASE_DATABASE_URL: str = os.getenv("SUPABASE_DATABASE_URL", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "tomatku-images")
    MAX_IMAGE_SIZE_BYTES: int = int(
        os.getenv("MAX_IMAGE_SIZE_BYTES", "").strip() or "5000000"
    )
    MAX_VIDEO_SIZE_BYTES: int = int(
        os.getenv("MAX_VIDEO_SIZE_BYTES", "").strip() or "20000000"
    )
    REALTIME_FPS: int = _positive_int_env("REALTIME_FPS", "8")
    REALTIME_DURATION_SECONDS: float = _positive_float_env(
        "REALTIME_DURATION_SECONDS",
        "2",
    )
    REALTIME_MAX_DURATION_SECONDS: float = _positive_float_env(
        "REALTIME_MAX_DURATION_SECONDS",
        "30",
    )
    REALTIME_FRAME_COUNT: int = round(
        REALTIME_FPS * REALTIME_DURATION_SECONDS
    )
    REALTIME_MIN_CONSISTENT_FRAMES: int = _positive_int_env(
        "REALTIME_MIN_CONSISTENT_FRAMES",
        "14",
    )
    REALTIME_MIN_DISEASE_FRAMES: int = _positive_int_env(
        "REALTIME_MIN_DISEASE_FRAMES",
        "10",
    )
    MODEL_INFERENCE_CONFIDENCE_THRESHOLD: float = _confidence_threshold_env(
        "MODEL_INFERENCE_CONFIDENCE_THRESHOLD",
        "0.15",
    )
    EARLY_BLIGHT_CONFIDENCE_THRESHOLD: float = _confidence_threshold_env(
        "EARLY_BLIGHT_CONFIDENCE_THRESHOLD",
        "0.25",
    )
    HEALTHY_CONFIDENCE_THRESHOLD: float = _confidence_threshold_env(
        "HEALTHY_CONFIDENCE_THRESHOLD",
        "0.45",
    )
    SUPPORTED_VIDEO_EXTENSIONS: frozenset[str] = frozenset(
        extension.strip().lower()
        if extension.strip().startswith(".")
        else f".{extension.strip().lower()}"
        for extension in os.getenv(
            "SUPPORTED_VIDEO_EXTENSIONS",
            ".avi,.mkv,.mov,.mp4,.webm",
        ).split(",")
        if extension.strip()
    )

    if REALTIME_FRAME_COUNT <= 0:
        raise ValueError(
            "REALTIME_FPS multiplied by REALTIME_DURATION_SECONDS must be "
            "at least one frame"
        )
    if REALTIME_MIN_CONSISTENT_FRAMES > REALTIME_FRAME_COUNT:
        raise ValueError(
            "REALTIME_MIN_CONSISTENT_FRAMES cannot exceed the number of "
            "sampled realtime frames"
        )
    if REALTIME_MIN_DISEASE_FRAMES > REALTIME_FRAME_COUNT:
        raise ValueError(
            "REALTIME_MIN_DISEASE_FRAMES cannot exceed the number of "
            "sampled realtime frames"
        )
    if REALTIME_MAX_DURATION_SECONDS < REALTIME_DURATION_SECONDS:
        raise ValueError(
            "REALTIME_MAX_DURATION_SECONDS cannot be shorter than "
            "REALTIME_DURATION_SECONDS"
        )
    if not SUPPORTED_VIDEO_EXTENSIONS:
        raise ValueError("SUPPORTED_VIDEO_EXTENSIONS must contain at least one format")
    if MODEL_INFERENCE_CONFIDENCE_THRESHOLD > min(
        EARLY_BLIGHT_CONFIDENCE_THRESHOLD,
        HEALTHY_CONFIDENCE_THRESHOLD,
    ):
        raise ValueError(
            "MODEL_INFERENCE_CONFIDENCE_THRESHOLD cannot exceed either "
            "class-specific confidence threshold"
        )
    MODEL_PATH: Path = Path(os.getenv("MODEL_PATH", "artifact/best_unknown_v3.pt"))
    PIPELINE_PATH: Path = Path(
        os.getenv("PIPELINE_PATH", "artifact/external_pipeline.py")
    )

    def resolve_path(self, path: Path) -> Path:
        """Resolve relative asset paths from the repository root, not the cwd."""
        if path.is_absolute():
            return path
        return BASE_DIR / path

    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    ALLOWED_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]


settings = Settings()

__all__ = ["settings", "Settings"]
