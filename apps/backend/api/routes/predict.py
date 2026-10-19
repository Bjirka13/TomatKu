from __future__ import annotations

import asyncio
import logging
import time
from collections import deque
from typing import Any

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket
from fastapi.websockets import WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from config import settings
from models.validation import DetectionInput, DetectionResult
from services.detection_service import DetectionService, UnstableDetectionError

router = APIRouter(prefix="/api", tags=["detection"])
service = DetectionService()
logger = logging.getLogger(__name__)
inference_semaphore = asyncio.Semaphore(1)
MAX_REALTIME_FRAME_PIXELS = 1280 * 720
MAX_REALTIME_FRAME_SIDE = 640
monotonic = time.monotonic


@router.post("/detect")
async def detect_leaf(payload: DetectionInput) -> dict[str, Any]:
    """Translate invalid input to 400 and unexpected inference failures to 500."""
    try:
        result = service.process_image(payload)
        return {"status": "success", "data": result}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Detection failed: {exc}") from exc


@router.post("/detect/realtime")
def detect_video(video: UploadFile = File(...)) -> dict[str, Any]:
    """Analyze a video upload using configured FPS and duration sampling."""
    try:
        video_data = video.file.read(settings.MAX_VIDEO_SIZE_BYTES + 1)
        if len(video_data) > settings.MAX_VIDEO_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Video exceeds the maximum allowed size",
            )
        result = service.process_video(video_data, video.filename or "")
        return {"status": "success", "data": result}
    except UnstableDetectionError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "unstable_detection",
                "message": str(exc),
                "matching_frames": exc.matching_frames,
                "total_frames": exc.total_frames,
                "required_frames": exc.required_frames,
                "classification": exc.classification,
            },
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.websocket("/detect/realtime/stream")
async def detect_camera_stream(websocket: WebSocket) -> None:
    """Receive bounded JPEG frames and return once a stable result is found."""
    await websocket.accept()
    await websocket.send_json({
        "type": "ready",
        "frame_rate": settings.REALTIME_FPS,
        "window_frames": settings.REALTIME_FRAME_COUNT,
    })

    recent_frames: deque[np.ndarray] = deque(
        maxlen=settings.REALTIME_FRAME_COUNT,
    )
    recent_predictions: deque[DetectionResult] = deque(
        maxlen=settings.REALTIME_FRAME_COUNT,
    )
    last_accepted_at: float | None = None
    frames_seen = 0
    stable_result: dict[str, Any] | None = None
    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                raise WebSocketDisconnect(
                    code=message["code"],
                    reason=message.get("reason", ""),
                )
            frame_data = message.get("bytes")
            if not isinstance(frame_data, bytes):
                await websocket.close(
                    code=1003,
                    reason="Frame must be sent as a binary JPEG message",
                )
                return
            if len(frame_data) > settings.MAX_IMAGE_SIZE_BYTES:
                await websocket.close(
                    code=1009,
                    reason="Frame exceeds the maximum allowed size",
                )
                return

            now = monotonic()
            if (
                last_accepted_at is not None
                and now - last_accepted_at < 1 / settings.REALTIME_FPS
            ):
                await websocket.send_json({
                    "type": "skipped",
                    "reason": "rate_limit",
                })
                continue

            if not frame_data.startswith(b"\xff\xd8\xff"):
                await websocket.close(
                    code=1003,
                    reason="Frame must be encoded as JPEG",
                )
                return

            image_bgr = cv2.imdecode(
                np.frombuffer(frame_data, dtype=np.uint8),
                cv2.IMREAD_COLOR,
            )
            if image_bgr is None:
                await websocket.close(
                    code=1003,
                    reason="Frame must contain a valid JPEG image",
                )
                return
            if image_bgr.shape[0] * image_bgr.shape[1] > MAX_REALTIME_FRAME_PIXELS:
                await websocket.close(
                    code=1009,
                    reason="Frame dimensions exceed the maximum allowed resolution",
                )
                return
            frame_side = max(image_bgr.shape[:2])
            if frame_side > MAX_REALTIME_FRAME_SIDE:
                scale = MAX_REALTIME_FRAME_SIDE / frame_side
                image_bgr = cv2.resize(
                    image_bgr,
                    (
                        max(1, round(image_bgr.shape[1] * scale)),
                        max(1, round(image_bgr.shape[0] * scale)),
                    ),
                    interpolation=cv2.INTER_AREA,
                )

            last_accepted_at = now
            frame_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
            async with inference_semaphore:
                prediction = await run_in_threadpool(
                    service._predict_from_rgb_frame,
                    frame_rgb,
                )

            frames_seen += 1
            recent_frames.append(frame_rgb)
            recent_predictions.append(prediction)
            new_stable_result: dict[str, Any] | None = None
            if stable_result is None and len(recent_frames) == settings.REALTIME_FRAME_COUNT:
                evaluated_result = await run_in_threadpool(
                    service.evaluate_realtime_window,
                    list(recent_frames),
                    list(recent_predictions),
                    window_start_frame=frames_seen - settings.REALTIME_FRAME_COUNT,
                    total_frames_seen=frames_seen,
                )
                if evaluated_result is not None and evaluated_result["saved"]:
                    stable_result = evaluated_result
                    new_stable_result = stable_result

            await websocket.send_json({
                "type": "prediction",
                "frames_seen": frames_seen,
                "window_frames": settings.REALTIME_FRAME_COUNT,
                "frames_ready": len(recent_frames),
                "frame_width": frame_rgb.shape[1],
                "frame_height": frame_rgb.shape[0],
                "prediction": prediction.model_dump(),
                "stable_result": new_stable_result,
            })
    except WebSocketDisconnect:
        logger.info("Realtime camera stream disconnected after %s frames", frames_seen)
