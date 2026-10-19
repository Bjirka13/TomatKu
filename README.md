<div align="center">

<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19"/>
<img src="https://img.shields.io/badge/FastAPI-API-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
<img src="https://img.shields.io/badge/Ultralytics-YOLO-111F68?style=for-the-badge" alt="Ultralytics YOLO"/>
<img src="https://img.shields.io/badge/Status-Research%20Prototype-blue?style=for-the-badge" alt="Research prototype"/>

# TomatKu — Tomato Leaf Detection

Deteksi daun sehat dan *Early Blight* melalui foto, video, dan kamera realtime.

</div>

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Model & Training](#model--training)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [API Reference](#api-reference)
- [Technology Stack](#technology-stack)

## Overview

TomatKu adalah aplikasi riset dan web untuk mendeteksi daun tomat sehat atau bergejala *Early Blight*. Proyek ini mencakup eksperimen model dan pipeline pada notebook, inferensi gambar/video di backend, serta antarmuka React untuk upload, kamera realtime, hasil, dan riwayat. Hasil model merupakan indikasi awal dan belum menggantikan validasi lapangan oleh ahli.

## System Architecture

Frontend mengirim foto ke REST API atau frame kamera melalui WebSocket. Backend memvalidasi input, menjalankan inferensi YOLO, memilih hasil yang diterima, dan menghitung severity untuk *Early Blight*. Untuk prediksi selain `unknown`, backend mengunggah gambar beranotasi ke Supabase Storage dan menyimpan hasil ke PostgreSQL; kedua layanan harus dikonfigurasi agar penyimpanan berhasil.

```text
Client · React / browser
          │ HTTP / WebSocket
          ▼
API · FastAPI
          │ decode, validate, infer
          ▼
Inference · YOLO + severity
          │ loads checkpoint
          ▼
Model artifact · best_unknown_v3.pt
```

## Model & Training

Model aplikasi adalah detektor objek Ultralytics YOLO (`best_unknown_v3.pt`), bukan ResNet classifier. Notebook mencatat pembersihan dataset, remapping dua kelas, penghapusan duplikat, lalu training dan evaluasi model. Checkpoint: `apps/backend/artifact/best_unknown_v3.pt`. Backend melakukan inferensi dan post-processing aplikasi; detail pipeline backend/frontend ada di README masing-masing.

## Project Structure

```text
TomatKu/
├── apps/
│   ├── backend/   See apps/backend/README.md
│   └── frontend/  See apps/frontend/README.md
└── README.md
```

Notebook dan checkpoint model berada di `apps/backend/artifact/`.

## Installation & Setup

- Konfigurasi backend ada di [apps/backend/README.md](apps/backend/README.md).
- Instalasi UI ada di [apps/frontend/README.md](apps/frontend/README.md).

## API Reference

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/health` | Status API/database |
| POST | `/api/detect` | Prediksi gambar |
| WebSocket | `/api/detect/realtime/stream` | Kamera realtime |
| POST | `/api/detect/realtime` | Analisis video |
| GET | `/api/history` | Riwayat pemindaian |

Contoh bentuk respons: `{"status":"success","data":{"prediction":{...}}}`. Lihat [backend README](apps/backend/README.md) untuk dokumentasi API dan contoh lengkap.

## Technology Stack

| Layer | Tech |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, Uvicorn |
| Model | Ultralytics YOLO, PyTorch |
| Data | PostgreSQL, Supabase Storage |
| Realtime | WebSocket |
