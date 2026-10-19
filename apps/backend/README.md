# TomatKU Backend

Backend FastAPI untuk mendeteksi kondisi daun tomat, menghitung tingkat keparahan, menyimpan gambar ke Supabase Storage, dan mencatat hasil scan ke PostgreSQL.

## Fitur

- Validasi status API dan koneksi database: `GET /health`.
- Deteksi penyakit: `POST /api/detect`.
- Deteksi realtime kamera melalui WebSocket: `/api/detect/realtime/stream`.
- Deteksi video untuk pengujian/regresi: `POST /api/detect/realtime`.
- Histori deteksi: `GET /api/history`.
- Klasifikasi `healthy`, `early_blight`, atau `unknown`, & confidence dan bounding box.
- Perhitungan severity (`ringan`, `sedang`, atau `parah`) dan persentasenya. Untuk klasifikasi `healthy`, severity bernilai `null`.
- Untuk prediksi selain `unknown`, gambar hasil anotasi diunggah ke Supabase Storage dan hasil scan disimpan ke database.

## Tech Stack

- Python: `3.14.5`
- FastAPI: `0.136.3`
- PostgreSQL: `17.11`
- Supabase Storage client: `supabase 2.31.0`

Versi dependency Python [`requirements.txt`](requirements.txt)

## Persiapan

### Setup Environment

```powershell
Set-Location apps/backend
Copy-Item .env.example .env
```
### Setup Database

```powershell
psql -h localhost -p 5432 -U postgres -d postgres -c "CREATE DATABASE tomatku;"
```

Terapkan schema ke database tersebut:

```powershell
psql -h localhost -p 5432 -U postgres -d tomatku -f database/init.sql
```

### Setup Backend

Install dependency Python:

```powershell
python -m pip install -r requirements.txt
```

Setelah konfigurasi `.env` selesai, jalankan backend:

```powershell
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Validasi koneksi database:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Dokumentasi API tersedia di `http://localhost:8000/docs`.


## API Reference

Base URL lokal: `http://localhost:8000`. Dokumentasi interaktif tersedia di `/docs`.

### GET

`GET /health` — status API dan koneksi database.

```json
{
  "status": "<status>",
  "service": "<service-name>",
  "database": "<ok|unavailable>"
}
```

`GET /api/history` — daftar riwayat pemindaian.

```json
{
  "status": "success",
  "data": [
    {
      "scan_id": "<uuid>",
      "detection_id": "<uuid-or-null>",
      "classification": "<class-or-null>",
      "confidence_pct": "<number-or-null>",
      "image_path": "<url-or-null>",
      "severity_level": "<level-or-null>",
      "severity_pct": "<number-or-null>",
      "detected_at": "<timestamp-or-null>"
    }
  ]
}
```

### POST

`POST /api/detect` — kirim tepat satu dari `image_base64` atau `image_path` dalam JSON. Format gambar yang didukung: JPEG dan PNG; batas default 5 MB.

Request:

```json
{
  "image_base64": "data:image/jpeg;base64,<base64-image-data>"
}
```

Response sukses:

```json
{
  "status": "success",
  "data": {
    "prediction": {
      "classification": "early_blight",
      "confidence_pct": "<number>",
      "image_path": "<url>",
      "severity_level": "<ringan|sedang|parah>",
      "severity_pct": "<number>",
      "boxes": [],
      "source": "model"
    },
    "scan_id": "<uuid>",
    "detection_id": "<uuid>"
  }
}
```

`POST /api/detect/realtime` — kirim video sebagai `multipart/form-data` dengan field `video`.

Request:

```bash
curl -X POST http://localhost:8000/api/detect/realtime \
  -F "video=@sample.mp4"
```

Response sukses (struktur ringkas):

```json
{
  "status": "success",
  "data": {
    "prediction": {
      "classification": "<class>",
      "confidence_pct": "<number>",
      "image_path": "<url>",
      "severity_level": "<level|null>",
      "severity_pct": "<number|null>",
      "boxes": [],
      "source": "model"
    },
    "consistency": {
      "matching_frames": "<number>",
      "total_frames": "<number>",
      "consistency_pct": "<number>",
      "window_start_seconds": "<number>",
      "window_end_seconds": "<number>",
      "stable_windows": "<number>"
    },
    "saved": "<boolean>",
    "scan_id": "<uuid>",
    "detection_id": "<uuid>",
    "classification": "<class>",
    "confidence_pct": "<number>",
    "image_path": "<url>",
    "severity_level": "<level|null>",
    "severity_pct": "<number|null>"
  }
}
```

### WebSocket

`/api/detect/realtime/stream` menerima frame JPEG sebagai pesan binary. Server mengirim pesan `ready`, `skipped`, dan `prediction`. `prediction` berisi hasil frame saat itu; ketika hasil stabil tersimpan, `stable_result` berisi bentuk data yang sama seperti response sukses upload video.

```json
{
  "type": "prediction",
  "frames_seen": "<number>",
  "window_frames": "<number>",
  "prediction": {
    "classification": "<class>",
    "confidence_pct": "<number>",
    "boxes": []
  },
  "stable_result": {
    "prediction": {
      "classification": "<class>",
      "confidence_pct": "<number>",
      "image_path": "<url>",
      "severity_level": "<level|null>",
      "severity_pct": "<number|null>",
      "boxes": [],
      "source": "model"
    },
    "consistency": {"matching_frames": "<number>", "total_frames": "<number>"},
    "saved": "<boolean>",
    "scan_id": "<uuid>",
    "detection_id": "<uuid>",
    "classification": "<class>",
    "confidence_pct": "<number>",
    "image_path": "<url>",
    "severity_level": "<level|null>",
    "severity_pct": "<number|null>"
  }
}
```

Sebelum hasil stabil tersimpan, `stable_result` bernilai `null`. Setelah itu nilainya kembali `null` pada pesan frame berikutnya; hasil stabil dikirim sekali.

`unknown` tidak disimpan. Prediksi yang disimpan memerlukan konfigurasi PostgreSQL dan Supabase Storage. Pengaturan ukuran, sampling, ambang kestabilan, dan bentuk error tersedia di [`.env.example`](.env.example) dan kode route.
