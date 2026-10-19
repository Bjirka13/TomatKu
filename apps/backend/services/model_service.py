from __future__ import annotations

from typing import Any

import cv2
import numpy as np
from config import settings


class ModelService:
    def __init__(self) -> None:
        self.model = self._load_model()

    @staticmethod
    def _load_model() -> Any:
        """Import the inference package only when loading the configured model."""
        from importlib import import_module

        yolo_class = import_module("ultralytics").YOLO
        model_path = settings.resolve_path(settings.MODEL_PATH)

        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")

        return yolo_class(str(model_path))

    @staticmethod
    def filter_confident_boxes(
        boxes: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        confidence_thresholds = {
            "early_blight": settings.EARLY_BLIGHT_CONFIDENCE_THRESHOLD * 100,
            "healthy": settings.HEALTHY_CONFIDENCE_THRESHOLD * 100,
        }
        return [
            {
                **box,
                "confidence_pct": round(box["confidence_pct"], 2),
            }
            for box in boxes
            if box["classification"] in confidence_thresholds
            and box["confidence_pct"] >= confidence_thresholds[box["classification"]]
        ]

    @staticmethod
    def select_prediction(
        boxes: list[dict[str, Any]],
    ) -> tuple[str, float, list[dict[str, Any]]]:
        if not boxes:
            return "unknown", 0.0, []

        def box_priority(item: dict[str, Any]) -> tuple[int, float]:
            is_disease = 1 if item["classification"] == "early_blight" else 0
            return (is_disease, item["confidence_pct"])

        best_box = max(boxes, key=box_priority)
        return (
            str(best_box["classification"]),
            float(best_box["confidence_pct"]),
            boxes,
        )

    def predict(self, image: np.ndarray) -> tuple[str, float, list[dict[str, Any]]]:
        """Normalize model labels and return all boxes plus the strongest prediction."""
        import torch

        results = self.model.predict(
            source=cv2.cvtColor(image, cv2.COLOR_RGB2BGR),
            imgsz=640,
            conf=settings.MODEL_INFERENCE_CONFIDENCE_THRESHOLD,
            iou=0.5,
            verbose=False,
            device=0 if torch.cuda.is_available() else "cpu",
        )
        boxes: list[dict[str, Any]] = []

        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                class_id = int(box.cls[0])
                confidence_pct = float(box.conf[0]) * 100
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                model_class = str(self.model.names[class_id])
                normalized_class = model_class.strip().lower().replace(" ", "_")
                classification = {
                    "0": "early_blight",
                    "1": "healthy",
                    "early_blight": "early_blight",
                    "earlyblight": "early_blight",
                    "healthy": "healthy",
                }.get(normalized_class, "unknown")

                boxes.append({
                    "x1": round(float(x1), 2),
                    "y1": round(float(y1), 2),
                    "x2": round(float(x2), 2),
                    "y2": round(float(y2), 2),
                    "classification": classification,
                    "confidence_pct": confidence_pct,
                })

        return self.select_prediction(self.filter_confident_boxes(boxes))


__all__ = ["ModelService"]
