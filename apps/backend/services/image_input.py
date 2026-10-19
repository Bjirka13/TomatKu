from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass
import math
import os
from pathlib import Path
import tempfile

import cv2
import numpy as np
from config import settings
from models.validation import DetectionInput


REALTIME_FPS = settings.REALTIME_FPS
REALTIME_DURATION_SECONDS = settings.REALTIME_DURATION_SECONDS
REALTIME_MAX_DURATION_SECONDS = settings.REALTIME_MAX_DURATION_SECONDS
REALTIME_FRAME_COUNT = settings.REALTIME_FRAME_COUNT
REALTIME_MIN_CONSISTENT_FRAMES = settings.REALTIME_MIN_CONSISTENT_FRAMES
REALTIME_MIN_DISEASE_FRAMES = settings.REALTIME_MIN_DISEASE_FRAMES
SUPPORTED_VIDEO_EXTENSIONS = settings.SUPPORTED_VIDEO_EXTENSIONS


@dataclass(frozen=True)
class ImageInput:
    data: bytes
    extension: str
    content_type: str


def read_video_frames(video_data: bytes, filename: str) -> list[np.ndarray]:
    """Decode configured realtime RGB samples across the uploaded video."""
    if not video_data:
        raise ValueError("Video data is empty")
    if len(video_data) > settings.MAX_VIDEO_SIZE_BYTES:
        raise ValueError("Video exceeds the maximum allowed size")

    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_VIDEO_EXTENSIONS:
        raise ValueError("Supported video formats are MP4, MOV, AVI, MKV, and WEBM")

    file_descriptor, temp_path = tempfile.mkstemp(suffix=extension)
    try:
        with os.fdopen(file_descriptor, "wb") as temp_file:
            temp_file.write(video_data)

        capture = cv2.VideoCapture(temp_path)
        try:
            if not capture.isOpened():
                raise ValueError("Unable to open uploaded video")

            source_fps = float(capture.get(cv2.CAP_PROP_FPS))
            if not math.isfinite(source_fps) or source_fps < REALTIME_FPS:
                raise ValueError(
                    f"Video must have a frame rate of at least {REALTIME_FPS} FPS"
                )

            source_frame_count = float(capture.get(cv2.CAP_PROP_FRAME_COUNT))
            if not math.isfinite(source_frame_count) or source_frame_count <= 0:
                raise ValueError("Unable to determine uploaded video duration")
            source_duration = source_frame_count / source_fps
            if source_duration < REALTIME_DURATION_SECONDS:
                raise ValueError(
                    f"Video must be at least {REALTIME_DURATION_SECONDS:g} "
                    "seconds long"
                )
            if source_duration > REALTIME_MAX_DURATION_SECONDS:
                raise ValueError(
                    "Video exceeds the maximum realtime duration of "
                    f"{REALTIME_MAX_DURATION_SECONDS:g} seconds"
                )

            sample_count = math.floor(source_duration * REALTIME_FPS + 1e-9)
            if sample_count < REALTIME_FRAME_COUNT:
                raise ValueError(
                    f"Video must be at least {REALTIME_DURATION_SECONDS:g} "
                    "seconds long"
                )

            frames: list[np.ndarray] = []
            sample_frame_indices = {
                round(sample_index * source_fps / REALTIME_FPS): sample_index
                for sample_index in range(sample_count)
            }
            last_sample_frame_index = max(sample_frame_indices)
            sampled_frame_count = 0
            for source_frame_index in range(last_sample_frame_index + 1):
                if source_frame_index in sample_frame_indices:
                    success, frame_bgr = capture.read()
                    if not success or frame_bgr is None:
                        raise ValueError(
                            "Unable to read all sampled video frames"
                        )
                    frames.append(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB))
                    sampled_frame_count += 1
                elif not capture.grab():
                    raise ValueError(
                        f"Video must be at least {REALTIME_DURATION_SECONDS:g} "
                        "seconds long"
                    )

            if sampled_frame_count != sample_count:
                raise ValueError(
                    f"Video sampling failed: expected {sample_count} frames, "
                    f"received {sampled_frame_count}"
                )
            return frames
        finally:
            capture.release()
    finally:
        os.unlink(temp_path)


def read_image_input(payload: DetectionInput) -> ImageInput:
    declared_content_type: str | None = None

    if payload.image_path is not None:
        file_path = Path(payload.image_path)
        if not file_path.is_file():
            raise ValueError(f"Unable to read image from path: {payload.image_path}")
        if file_path.stat().st_size > settings.MAX_IMAGE_SIZE_BYTES:
            raise ValueError("Image exceeds the maximum allowed size")
        image_bytes = file_path.read_bytes()
    elif payload.image_base64 is not None:
        encoded_image = payload.image_base64
        if encoded_image.startswith("data:"):
            try:
                header, encoded_image = encoded_image.split(",", maxsplit=1)
            except ValueError as exc:
                raise ValueError("Invalid base64 data URL") from exc

            header_parts = header[5:].lower().split(";")
            declared_content_type = header_parts[0]
            if declared_content_type not in {"image/jpeg", "image/png"}:
                raise ValueError("Only JPEG and PNG images are supported")
            if "base64" not in header_parts[1:]:
                raise ValueError("Image data URL must use base64 encoding")

        max_encoded_size = 4 * ((settings.MAX_IMAGE_SIZE_BYTES + 2) // 3)
        if len(encoded_image) > max_encoded_size:
            raise ValueError("Image exceeds the maximum allowed size")

        try:
            image_bytes = base64.b64decode(encoded_image, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("Invalid base64 image data") from exc
    else:
        raise ValueError("Either image_path or image_base64 must be provided")

    if not image_bytes:
        raise ValueError("Image data is empty")
    if len(image_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
        raise ValueError("Image exceeds the maximum allowed size")

    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        content_type = "image/png"
        extension = ".png"
    elif image_bytes.startswith(b"\xff\xd8\xff"):
        content_type = "image/jpeg"
        extension = ".jpg"
    else:
        raise ValueError("Only JPEG and PNG images are supported")

    if declared_content_type and declared_content_type != content_type:
        raise ValueError("Image data URL type does not match the image format")

    return ImageInput(
        data=image_bytes,
        extension=extension,
        content_type=content_type,
    )