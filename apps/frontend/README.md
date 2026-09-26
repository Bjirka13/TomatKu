# TomatKU - Tomato Leaf Disease Detection Web App (Frontend)

**TomatKU** adalah aplikasi web modern berbasis React dan Tailwind CSS yang dirancang untuk membantu petani dan penghobi tanaman dalam mengenali kondisi kesehatan daun tanaman tomat secara cepat dan praktis. Aplikasi ini berfokus pada pengenalan daun tomat sehat serta deteksi dini penyakit **Bercak Kering (*Early Blight / Alternaria solani*)** melalui kamera maupun unggah foto.

---

## Fitur Utama

1. **Splash Screen & Onboarding Interaktif**
   - Halaman pembuka (*Landing*) dengan animasi logo TomatKU.
   - Dialog konfirmasi edukasi (*PageOne*) sebelum memulai pemindaian.

2. **Katalog Edukasi Daun (*Home Page*)**
   - Panduan visual interaktif (*carousel*) untuk mengenali perbedaan karakteristik:
     - **Daun Sehat**: Ciri visual warna hijau segar, helaian kokoh, serta pertanda nutrisi tercukupi.
     - **Early Blight**: Gejala bercak cokelat konsentris akibat jamur *Alternaria solani* dan dampaknya terhadap tanaman.
   - Desain tata letak kartu dinamis yang mengembang ke bawah tanpa mengganggu posisi judul atas.

3. **Pemindai Kamera Pintar (*Camera Page*)**
   - **Live Viewfinder**: Akses langsung ke kamera perangkat dengan reticle pemandu fokus dan efek animasi laser scan.
   - **Switch Camera**: Kemudahan berpindah antara kamera depan dan kamera belakang.
   - **Alternatif Unggah Galeri**: Fitur upload foto langsung dari penyimpanan jika akses kamera tidak diizinkan atau tidak tersedia.
   - **Mode Preview & Verifikasi**: Tinjau ulang foto sebelum diproses untuk analisis.
   - **Navigasi Kembali Cerdas (*Previous Page Tracking*)**: Jika perizinan kamera ditolak atau memilih *"Nanti Saja"*, sistem otomatis mengembalikan pengguna ke halaman yang dibuka sebelumnya (Summary, History, atau Home), tidak selalu dipaksa ke halaman Home.

4. **Dashboard Statistik Deteksi (*Summary Page*)**
   - **Banner Riwayat**: Tombol pintas (*"See the history?"*) untuk langsung menuju halaman riwayat pemindaian.
   - **Rekomendasi Penanganan Early Blight (*Dropdown Accordion*)**:
     - Panduan kuratif dan preventif interaktif berbasis kartu (*accordion list*) yang dapat dibuka-tutup (*expand/collapse*):
       1. **Sanitasi & Pembersihan**: Petunjuk pemangkasan daun berbercak konsentris, pemusnahan sisa tanaman sakit, serta sterilisasi alat potong.
       2. **Pengendalian Kelembapan & Pola Siram**: Penerapan irigasi akar, jadwal siram pagi hari, serta pemasangan mulsa penahan pantulan spora.
       3. **Pengaturan Sirkulasi Udara**: Penataan jarak tanam antar kanopi dan pembuangan tunas air tidak produktif untuk menekan kelembapan mikro.
       4. **Perlindungan & Pengobatan (Fungisida)**: Rekomendasi tindakan perlindungan dan panduan aplikasi pengobatan.
     - Ikon indikator dinamis yang beralih antara panah bawah (**↓**) saat tertutup dan panah atas (**↑**) saat terbuka.
   - **Filter Periode Cepat & Tombol Kalender Riwayat**:
     - Pilihan filter cepat: *Hari ini*, *Minggu ini*, dan *Bulan ini*.
     - **Pintasan Kalender**: Tombol kalender oranye di samping filter periode untuk langsung membuka riwayat pemindaian per tanggal.
   - **Kartu Total Deteksi**: Ringkasan total pemindaian daun dengan ilustrasi daun bersinar dan kaca pembesar.
   - **Donut Chart Distribusi Hasil Klasifikasi**: Visualisasi rasio persentase daun (*Healthy*, *Early Blight*, *Unknown*) dengan label dan transisi animasi yang halus.
   - **Speedometer Gauge Distribusi Keparahan**: Indikator tingkat keparahan tanaman dari level **PARAH** hingga **NORMAL** dengan jarum speedometer presisi.

5. **Halaman Riwayat Pemindaian (*History Page*)**
   - Diakses langsung dari halaman Summary melalui banner *"See the history?"* atau navigasi langsung dengan tombol kembali (`←`).
   - **Modal Kalender Interaktif (*In-App Calendar Modal*)**:
     - Membuka dialog kalender *bottom-sheet* modern saat menekan tombol **"Pilih Hari"** maupun teks tanggal aktif.
     - Tampilan bulan dan tahun berbahasa Indonesia dengan kontrol panah navigasi bulan (`<` dan `>`).
     - Grid tanggal lengkap dengan *highlight* oranye khas TomatKU untuk tanggal terpilih serta penanda khusus untuk hari ini.
     - Tombol pintas (*Presets*): **Hari Ini**, **Kemarin**, dan **7 Hari Lalu** untuk navigasi kilat.
   - **Proteksi Tanggal Masa Depan (*Disable Future Dates*)**:
     - Tanggal-tanggal setelah hari ini otomatis **dinonaktifkan (*disabled*)**, bergaya redup (*muted/grayed out*), dan tidak dapat dipilih karena belum ada pemindaian yang terjadi di masa mendatang.
     - Tombol panah hari berikutnya (`>`) pada navigasi harian utama otomatis terkunci saat pengguna berada di tanggal hari ini.
     - Tombol navigasi bulan berikutnya (`>`) pada modal kalender dikunci jika sudah berada di bulan berjalan.
   - **Navigasi Harian Cepat**: Tombol panah sebelumnya (`<`) dan berikutnya (`>`) untuk berpindah hari demi hari secara mulus.
   - **Data Dummy Deterministik & Realistis**:
     - Setiap tanggal memiliki angka statistik unik dan konsisten yang dihitung secara matematis melalui `dummyData.ts`.
     - Data mencakup: angka **Total Deteksi**, proporsi grafik **Donut Chart** (*Healthy*, *Early Blight*, *Unknown*), serta rotasi jarum **Speedometer Tingkat Keparahan** (*PARAH* hingga *NORMAL*).
     - Format tanggal menggunakan standar Indonesia: `DD/MM/YY` (misal: `22/09/26`).

6. **Bilah Navigasi Bawah Terkunci (*Fixed Bottom Navigation*)**
   - Komponen navigasi bawah (**Home**, **Camera**, **Summary**) dibuat *fixed* dan selalu terlihat di posisi bawah layar.
   - Konten halaman dapat di-scroll dengan lancar ke atas maupun ke bawah tanpa membuat bilah navigasi ikut berpindah atau tertutup.

---

## Teknologi yang Digunakan

* **Framework & Library:**
  * [React 19](https://react.dev/)
  * [TypeScript](https://www.typescriptlang.org/)
  * [Vite 8](https://vite.dev/)
* **Styling & Desain:**
  * [Tailwind CSS v4](https://tailwindcss.com/)
  * Font Poppins & Plus Jakarta Sans
* **Kamera:**
  * [react-webcam](https://www.npmjs.com/package/react-webcam)
* **Code Quality & Linter:**
  * [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)

---

## Memulai Proyek (Getting Started)

### Prasyarat
Pastikan Anda telah menginstal:
* [Node.js](https://nodejs.org/) (versi 18 ke atas disarankan)
* Paket manajer `npm`

### Instalasi & Menjalankan

1. **Clone repositori:**
   ```bash
   git clone https://github.com/ayunisay/tomatku-fe.git
   cd tomatku-fe
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan server pengembangan (Dev Server):**
   ```bash
   npm run dev
   ```
   Buka browser dan akses alamat yang ditampilkan di terminal (default: `http://localhost:5173`).

4. **Build untuk Produksi:**
   ```bash
   npm run build
   ```

5. **Menjalankan Linter:**
   ```bash
   npm run lint
   ```

---

## Struktur Direktori

```text
tomatku-fe/
├── public/              # File statis publik
├── src/
│   ├── assets/          # Aset gambar daun sehat, bercak daun, & ikon
│   ├── utils/
│   │   └── dummyData.ts # Generator statistik dinamis & kalkulator tanggal
│   ├── App.tsx          # Navigasi utama, state root, & previousPage tracking
│   ├── camera.tsx       # Halaman deteksi kamera & upload foto
│   ├── history.tsx      # Halaman riwayat deteksi harian
│   ├── index.tsx        # Halaman Home (Katalog edukasi kondisi daun)
│   ├── landing.tsx      # Halaman splash screen pembuka
│   ├── pageone.tsx      # Halaman konfirmasi / info edukasi
│   ├── summary.tsx      # Halaman ringkasan statistik & dashboard deteksi
│   ├── index.css        # Konfigurasi Tailwind CSS v4 & custom animasi
│   └── main.tsx         # Entry point React
├── package.json
└── README.md
```

---

## Lisensi

Proyek ini dikembangkan untuk kebutuhan pemantauan dan edukasi kesehatan tanaman tomat. Silahkan digunakan dan dikembangkan sesuai kebutuhan.
