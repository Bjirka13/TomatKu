from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Any, cast

import cv2
import numpy as np
from pydantic import ValidationError

from database.repository import DetectionRepository
from models.validation import (
    ClassificationType,
    DetectionInput,
    DetectionResult,
    SeverityLevelType,
)
from services.model_service import ModelService
from services.image_input import (
    REALTIME_FRAME_COUNT,
    REALTIME_DURATION_SECONDS,
    REALTIME_FPS,
    REALTIME_MIN_DISEASE_FRAMES,
    REALTIME_MIN_CONSISTENT_FRAMES,
    read_image_input,
    read_video_frames,
)
from services.severity_service import SeverityService
from services.storage_service import StorageService


class UnstableDetectionError(Exception):
    def __init__(
        self,
        matching_frames: int,
        total_frames: int,
        required_frames: int,
        classification: str,
    ) -> None:
        self.matching_frames = matching_frames
        self.total_frames = total_frames
        self.required_frames = required_frames
        self.classification = classification
        super().__init__(
            f"Detection was unstable: the best {REALTIME_DURATION_SECONDS:g}-second "
            f"window had {matching_frames}/{total_frames} {classification} frames; "
            f"at least {self.required_frames} are required"
        )


@dataclass(frozen=True)
class StableWindow:
    classification_priority: int
    matching_frames: int
    representative_area_ratio: float
    representative_index: int
    window_start: int
    window_end: int


class DetectionService:
    def __init__(
        self,
        repository: DetectionRepository | None = None,
        storage_service: StorageService | None = None,
    ) -> None:
        self.repository = repository or DetectionRepository()
        self.model_service = ModelService()
        self.severity_service = SeverityService()
        self.storage_service = storage_service

    # Normalize the classification label and severity level to match the API response model.
    def _normalize_model_output(
        self,
        raw_result: dict[str, Any],
        fallback_classification: str | None = None,
        confidence_pct: float = 0.0,
        boxes: list[dict[str, Any]] | None = None,
    ) -> DetectionResult:
        """Enforce API labels and severity defaults before building the response model."""
        classification = fallback_classification or "unknown"
        severity_level = raw_result.get("severity_level")
        severity_pct = raw_result.get("severity_pct")

        if classification not in {"healthy", "early_blight", "unknown"}:
            classification = "unknown"

        if classification in {"healthy", "unknown"}:
            severity_level = None
            severity_pct = None
        elif severity_level not in {"ringan", "sedang", "parah"}:
            severity_level = "ringan"
            severity_pct = 0.0

        classification_value = cast(ClassificationType, classification)
        severity_value = cast(SeverityLevelType, severity_level)

        try:
            return DetectionResult(
                classification=classification_value,
                confidence_pct=round(float(confidence_pct), 2),
                severity_level=severity_value,
                severity_pct=(
                    None
                    if severity_pct is None
                    else round(float(severity_pct), 2)
                ),
                boxes=boxes or [],
                source="model",
            )
        except ValidationError as exc:
            raise RuntimeError(
                "Detection model returned an invalid prediction"
            ) from exc

    def predict_from_image(self, payload: DetectionInput) -> DetectionResult:
        """Decode either supported input form and use the strongest box for severity."""
        image_input = read_image_input(payload)
        image_array = np.frombuffer(image_input.data, dtype=np.uint8)
        image_bgr = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if image_bgr is None:
            raise ValueError("Unable to decode image data")

        # Validasi kualitas pencahayaan citra (filter)
        gray_image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        brightness_score = float(np.mean(gray_image))
        if brightness_score < 45.0:
            raise ValueError(
                f"Kualitas pencahayaan citra terlalu gelap ({brightness_score:.1f}/255). "
                "Harap cari tempat yang lebih terang sebelum foto dikirim ke AI."
            )

        image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

        return self._predict_from_rgb_frame(image)

    def _predict_from_rgb_frame(self, image: np.ndarray) -> DetectionResult:
        classification, confidence_pct, boxes = self.model_service.predict(image)
        candidate_boxes = (
            [item for item in boxes if item["classification"] == "early_blight"]
            if classification == "early_blight"
            else boxes
        )
        best_box = max(
            candidate_boxes,
            key=lambda item: item["confidence_pct"],
            default=None,
        )
        bounding_box = (
            None
            if best_box is None
            else (
                best_box["x1"],
                best_box["y1"],
                best_box["x2"],
                best_box["y2"],
            )
        )
        raw_result = self.severity_service.analyze(
            image,
            classification,
            bounding_box=bounding_box,
        )
        normalized = self._normalize_model_output(
            raw_result,
            classification,
            confidence_pct,
            boxes,
        )

        return normalized

    @staticmethod
    def _disease_area_ratio(prediction: DetectionResult, frame: np.ndarray) -> float:
        """Return the union area covered by early-blight boxes as a frame ratio."""
        if prediction.classification != "early_blight":
            return 0.0

        frame_height, frame_width = frame.shape[:2]
        if frame_height <= 0 or frame_width <= 0:
            return 0.0

        rectangles: list[tuple[float, float, float, float]] = []
        for box in prediction.boxes:
            if box.get("classification") != "early_blight":
                continue
            x1 = max(0.0, min(float(box["x1"]), float(frame_width)))
            y1 = max(0.0, min(float(box["y1"]), float(frame_height)))
            x2 = max(0.0, min(float(box["x2"]), float(frame_width)))
            y2 = max(0.0, min(float(box["y2"]), float(frame_height)))
            if x2 > x1 and y2 > y1:
                rectangles.append((x1, y1, x2, y2))

        x_coordinates = sorted(
            {coordinate for x1, _, x2, _ in rectangles for coordinate in (x1, x2)}
        )
        union_area = 0.0
        for left, right in zip(x_coordinates, x_coordinates[1:]):
            y_intervals = sorted(
                (y1, y2)
                for x1, y1, x2, y2 in rectangles
                if x1 < right and x2 > left
            )
            covered_height = 0.0
            interval_start: float | None = None
            interval_end: float | None = None
            for start, end in y_intervals:
                if interval_start is None or interval_end is None:
                    interval_start, interval_end = start, end
                elif start <= interval_end:
                    interval_end = max(interval_end, end)
                else:
                    covered_height += interval_end - interval_start
                    interval_start, interval_end = start, end
            if interval_start is not None and interval_end is not None:
                covered_height += interval_end - interval_start
            union_area += (right - left) * covered_height

        return union_area / (frame_width * frame_height)

    @staticmethod
    def _annotate_detection_boxes(
        frame_bgr: np.ndarray,
        prediction: DetectionResult,
    ) -> np.ndarray:
        """Render prediction boxes and labels for visual review of saved frames."""
        annotated_frame = frame_bgr.copy()
        frame_height, frame_width = annotated_frame.shape[:2]
        colors = {
            "early_blight": (0, 0, 255),
            "healthy": (0, 200, 0),
            "unknown": (0, 200, 255),
        }
        thickness = max(1, round(min(frame_width, frame_height) / 300))
        font_scale = max(0.4, min(frame_width, frame_height) / 700)

        for box in prediction.boxes:
            classification = box["classification"]
            color = colors.get(classification, colors["unknown"])
            x1 = max(0, min(int(round(float(box["x1"]))), frame_width - 1))
            y1 = max(0, min(int(round(float(box["y1"]))), frame_height - 1))
            x2 = max(0, min(int(round(float(box["x2"]))), frame_width - 1))
            y2 = max(0, min(int(round(float(box["y2"]))), frame_height - 1))
            if x2 <= x1 or y2 <= y1:
                continue

            cv2.rectangle(
                annotated_frame,
                (x1, y1),
                (x2, y2),
                color,
                thickness,
            )
            label = f"{classification} {float(box['confidence_pct']):.1f}%"
            (label_width, label_height), baseline = cv2.getTextSize(
                label,
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                thickness,
            )
            label_top = max(0, y1 - label_height - baseline - 4)
            cv2.rectangle(
                annotated_frame,
                (x1, label_top),
                (
                    min(frame_width - 1, x1 + label_width + 6),
                    min(frame_height - 1, label_top + label_height + baseline + 4),
                ),
                color,
                cv2.FILLED,
            )
            cv2.putText(
                annotated_frame,
                label,
                (x1 + 3, min(frame_height - 1, label_top + label_height + 1)),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                (255, 255, 255),
                thickness,
                cv2.LINE_AA,
            )

        if (
            prediction.classification == "early_blight"
            and prediction.severity_level is not None
            and prediction.severity_pct is not None
        ):
            severity_label = (
                f"Realtime: {prediction.classification} | "
                f"Severity: {prediction.severity_level} | "
                f"{prediction.severity_pct:.1f}%"
            )
            (label_width, label_height), baseline = cv2.getTextSize(
                severity_label,
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                thickness,
            )
            label_left = 4
            label_top = 4
            label_right = min(frame_width - 1, label_left + label_width + 8)
            label_bottom = min(
                frame_height - 1,
                label_top + label_height + baseline + 8,
            )
            cv2.rectangle(
                annotated_frame,
                (label_left, label_top),
                (label_right, label_bottom),
                colors["early_blight"],
                cv2.FILLED,
            )
            cv2.putText(
                annotated_frame,
                severity_label,
                (label_left + 4, label_top + label_height + 2),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                (255, 255, 255),
                thickness,
                cv2.LINE_AA,
            )

        return annotated_frame

    def _find_stable_windows(
        self,
        frames: list[np.ndarray],
        predictions: list[DetectionResult],
        window_starts: list[int],
    ) -> tuple[list[StableWindow], tuple[int, str]]:
        minimum_frames_by_class = {
            "early_blight": REALTIME_MIN_DISEASE_FRAMES,
            "healthy": REALTIME_MIN_CONSISTENT_FRAMES,
            "unknown": REALTIME_MIN_CONSISTENT_FRAMES,
        }
        class_priority = {
            "early_blight": 2,
            "healthy": 1,
            "unknown": 0,
        }
        stable_windows: list[StableWindow] = []
        best_unstable_match = (0, "unknown")

        for window_start in window_starts:
            window_end = window_start + REALTIME_FRAME_COUNT
            group_counts = Counter(
                item.classification
                for item in predictions[window_start:window_end]
            )
            for classification, matching_frames in group_counts.items():
                unstable_rank = (
                    matching_frames,
                    class_priority[classification],
                )
                current_rank = (
                    best_unstable_match[0],
                    class_priority[best_unstable_match[1]],
                )
                if unstable_rank > current_rank:
                    best_unstable_match = (matching_frames, classification)

                if matching_frames < minimum_frames_by_class[classification]:
                    continue

                matching_indexes = [
                    index
                    for index in range(window_start, window_end)
                    if predictions[index].classification == classification
                ]
                representative_index = max(
                    matching_indexes,
                    key=lambda index: (
                        self._disease_area_ratio(
                            predictions[index],
                            frames[index],
                        ),
                        predictions[index].confidence_pct,
                    ),
                )
                stable_windows.append(
                    StableWindow(
                        classification_priority=class_priority[classification],
                        matching_frames=matching_frames,
                        representative_area_ratio=self._disease_area_ratio(
                            predictions[representative_index],
                            frames[representative_index],
                        ),
                        representative_index=representative_index,
                        window_start=window_start,
                        window_end=window_end,
                    )
                )

        return stable_windows, best_unstable_match

    @staticmethod
    def _select_stable_window(
        stable_windows: list[StableWindow],
        predictions: list[DetectionResult],
    ) -> StableWindow:
        return max(
            stable_windows,
            key=lambda item: (
                item.classification_priority,
                item.matching_frames,
                item.representative_area_ratio,
                predictions[item.representative_index].confidence_pct,
            ),
        )

    def persist_representative_frame(
        self,
        frame: np.ndarray,
        prediction: DetectionResult,
        consistency: dict[str, int | float],
    ) -> dict[str, Any]:
        if prediction.classification == "unknown":
            return {
                "prediction": prediction.model_dump(),
                "consistency": consistency,
                "saved": False,
            }

        frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        frame_bgr = self._annotate_detection_boxes(frame_bgr, prediction)
        encoded_ok, encoded_frame = cv2.imencode(".jpg", frame_bgr)
        if not encoded_ok:
            raise RuntimeError("Unable to encode the representative video frame")

        storage_service = self.storage_service or StorageService()
        uploaded_image = storage_service.upload_image_data(
            encoded_frame.tobytes(),
            extension=".jpg",
            content_type="image/jpeg",
        )
        prediction.image_path = uploaded_image.public_url

        try:
            saved = self.save_prediction(
                prediction,
                image_path=uploaded_image.public_url,
            )
        except Exception:
            storage_service.delete_image(uploaded_image.object_path)
            raise

        return {
            "prediction": prediction.model_dump(),
            "consistency": consistency,
            "saved": True,
            **saved,
        }

    def evaluate_realtime_window(
        self,
        frames: list[np.ndarray],
        predictions: list[DetectionResult],
        *,
        window_start_frame: int = 0,
        total_frames_seen: int | None = None,
    ) -> dict[str, Any] | None:
        """Return the first stable result for one full realtime window."""
        if (
            len(frames) != REALTIME_FRAME_COUNT
            or len(predictions) != REALTIME_FRAME_COUNT
        ):
            raise ValueError(
                f"A realtime window must contain exactly "
                f"{REALTIME_FRAME_COUNT} frames and predictions"
            )

        stable_windows, _ = self._find_stable_windows(
            frames,
            predictions,
            [0],
        )
        if not stable_windows:
            return None

        selected_window = self._select_stable_window(
            stable_windows,
            predictions,
        )
        representative = predictions[selected_window.representative_index]
        total_frames = (
            total_frames_seen
            if total_frames_seen is not None
            else window_start_frame + REALTIME_FRAME_COUNT
        )
        consistency: dict[str, int | float] = {
            "matching_frames": selected_window.matching_frames,
            "total_frames": REALTIME_FRAME_COUNT,
            "consistency_pct": round(
                selected_window.matching_frames / REALTIME_FRAME_COUNT * 100,
                2,
            ),
            "window_start_seconds": round(
                window_start_frame / REALTIME_FPS,
                2,
            ),
            "window_end_seconds": round(
                total_frames / REALTIME_FPS,
                2,
            ),
            "stable_windows": len(stable_windows),
        }
        return self.persist_representative_frame(
            frames[selected_window.representative_index],
            representative,
            consistency,
        )

    def process_video(
        self,
        video_data: bytes,
        filename: str,
    ) -> dict[str, Any]:
        """Prioritize stable disease predictions across two-second video windows."""
        frames: list[np.ndarray] = read_video_frames(video_data, filename)
        predictions: list[DetectionResult] = [
            self._predict_from_rgb_frame(frame)
            for frame in frames
        ]

        window_step = max(1, REALTIME_FRAME_COUNT // 2)
        last_window_start = len(predictions) - REALTIME_FRAME_COUNT
        window_starts = list(range(0, last_window_start + 1, window_step))
        if window_starts[-1] != last_window_start:
            window_starts.append(last_window_start)

        stable_windows, best_unstable_match = self._find_stable_windows(
            frames,
            predictions,
            window_starts,
        )

        if not stable_windows:
            raise UnstableDetectionError(
                best_unstable_match[0],
                REALTIME_FRAME_COUNT,
                {
                    "early_blight": REALTIME_MIN_DISEASE_FRAMES,
                    "healthy": REALTIME_MIN_CONSISTENT_FRAMES,
                    "unknown": REALTIME_MIN_CONSISTENT_FRAMES,
                }[best_unstable_match[1]],
                best_unstable_match[1],
            )

        selected_window = self._select_stable_window(stable_windows, predictions)
        representative_index = selected_window.representative_index
        representative = predictions[representative_index]
        matching_frames = selected_window.matching_frames
        consistency: dict[str, int | float] = {
            "matching_frames": matching_frames,
            "total_frames": REALTIME_FRAME_COUNT,
            "consistency_pct": round(
                matching_frames / REALTIME_FRAME_COUNT * 100,
                2,
            ),
            "window_start_seconds": round(
                selected_window.window_start / REALTIME_FPS,
                2,
            ),
            "window_end_seconds": round(
                selected_window.window_end / REALTIME_FPS,
                2,
            ),
            "stable_windows": len(stable_windows),
        }

        return self.persist_representative_frame(
            frames[representative_index],
            representative,
            consistency,
        )

    def save_prediction(
        self,
        prediction: DetectionResult,
        image_path: str | None = None,
    ) -> dict[str, Any]:
        scan_id = self.repository.create_scan()
        detection_id = self.repository.insert_detection_log(
            scan_id=scan_id,
            classification=prediction.classification,
            confidence_pct=prediction.confidence_pct,
            image_path=image_path,
            severity_level=prediction.severity_level,
            severity_pct=prediction.severity_pct,
        )
        return {
            "scan_id": scan_id,
            "detection_id": detection_id,
            "classification": prediction.classification,
            "confidence_pct": prediction.confidence_pct,
            "image_path": image_path,
            "severity_level": prediction.severity_level,
            "severity_pct": prediction.severity_pct,
        }

    def process_image(self, payload: DetectionInput) -> dict[str, Any]:
        """Annotate and persist the source image with its detection result."""
        image_input = read_image_input(payload)
        image_array = np.frombuffer(image_input.data, dtype=np.uint8)
        image_bgr = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if image_bgr is None:
            raise ValueError("Unable to decode image data")

        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        prediction = self._predict_from_rgb_frame(image_rgb)
        if prediction.classification == "unknown":
            return {
                "prediction": prediction.model_dump(),
                "saved": False,
            }

        annotated_image = self._annotate_detection_boxes(image_bgr, prediction)
        encoded_ok, encoded_image = cv2.imencode(
            image_input.extension,
            annotated_image,
        )
        if not encoded_ok:
            raise RuntimeError("Unable to encode the annotated detection image")

        storage_service = self.storage_service or StorageService()
        uploaded_image = storage_service.upload_image_data(
            encoded_image.tobytes(),
            extension=image_input.extension,
            content_type=image_input.content_type,
        )
        prediction.image_path = uploaded_image.public_url

        try:
            saved = self.save_prediction(prediction, image_path=uploaded_image.public_url)
        except Exception:
            storage_service.delete_image(uploaded_image.object_path)
            raise

        return {"prediction": prediction.model_dump(), **saved}


__all__ = ["DetectionService"]
