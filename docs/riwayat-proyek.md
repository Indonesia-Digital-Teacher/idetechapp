# 📝 Riwayat & Log Perkembangan Proyek IdeTech

Dokumen ini mencatat riwayat perkembangan proyek **IdeTech (Indonesia Digital Teacher)** dari commit awal hingga penambahan fitur terbaru. Log ini disusun berdasarkan urutan kronologis terbalik (terbaru di atas) berdasarkan riwayat commit repositori.

---

## 🚀 Rangkuman Pencapaian Terbaru

### Fitur Terbaru (Saat Ini)
1. **Integrasi Materi Resmi ke Generator AI**: Penambahan parser materi kurikulum dari `docs/material/` (BSKAP/ATP) ke dalam generator Program Semester dan AI RPP. Fitur ini menyediakan mode *Template Materi Lokal* (tanpa kuota AI) dan injeksi outline ke prompt AI.
2. **Welcome Greeting Modal**: Sapaan dinamis harian (pagi/siang/sore/malam) berdasarkan role pengguna (Guru, Siswa, Orang Tua) beserta panel admin untuk mengelola quotes motivasi.
3. **Cronjob Backup Database**: Script backup otomatis MariaDB (`mysqldump` + `gzip`) yang diunggah ke Google Drive via `rclone` dan dikirim ke Telegram Bot setiap hari pukul 12:00 WIB.

---

## 📜 Log Detail Perkembangan Proyek (Changelog)

### Phase 6: Fitur Personal & Sistem Pendukung (Terbaru)
* **Integrasi Materi Kurikulum Resmi ke Generator AI**: Parser `scripts/build-materials.ts` membaca 16 file markdown di `docs/material/` menjadi JSON terstruktur. Generator Program Semester mendapat mode *Template Materi Lokal* dan prompt AI diperkaya outline resmi. AI RPP Generator mendapat opsi **Aksen Materi Resmi** berdasarkan mapel/fase/semester/pertemuan.
* **Setup Backup Otomatis & Dokumentasi**: Pembuatan script `backup-db.sh` dan `.env.backup` untuk mencadangkan database MariaDB langsung ke Google Drive dan notifikasi ke grup Telegram, lengkap dengan panduan restore.
* **Welcome Greeting Modal & Manajemen Quotes**: Penambahan pop-up selamat datang harian dengan partikel animasi khusus di dashboard siswa. Ditambahkan pula tab manajemen quotes di halaman admin.
* **Perbaikan API & Visual**: Perbaikan API sekolah, blog post, serta optimasi konfigurasi GHCR (GitHub Container Registry).

### Phase 5: Kolaborasi & AI Integration
* **Integrasi AI RPP ke Bank Ide**: Menghubungkan generator RPP berbasis AI dengan Bank Ide, penambahan tabel database `lesson_plans`, dan perbaikan visual responsif formulir di perangkat mobile.
* **Sistem Pengumpulan Tugas IdeQuest**: Implementasi fitur pengumpulan tugas teks & PDF (integrasi dengan RustFS Object Storage) serta halaman koreksi nilai dan umpan balik oleh Guru.
* **Jurnal Mengajar Guru & Sinkronisasi Real-Time**: Optimasi jurnal guru (fitur draf lokal, auto-save, pratinjau) dan sinkronisasi real-time catatan perkembangan siswa ke dashboard Orang Tua.
* **Peta Siswa & Dashboard Wali Murid**: Integrasi UI peta siswa dengan API kelas, integrasi chat AI native untuk orang tua, dan penyederhanaan tata letak menu admin.

### Phase 4: Pengujian & Keamanan Sistem
* **Security Hardening & Database Config**: Pemindahan konfigurasi Google Auth dari environment file ke tabel database (`system_settings`) serta perbaikan celah keamanan akses.
* **Pengujian Otomatis (Unit Testing)**: Penambahan pengujian alur Google OAuth, siklus hidup kelas, pembuatan materi, dan penugasan IdeQuest oleh guru.
* **Redesign Tampilan Utama**: Redesign layar loading dengan transisi latar belakang responsif (delay minimal 3 detik untuk estetika premium).

### Phase 3: Migrasi Database & Peningkatan UI
* **Migrasi SQLite ke MariaDB**: Mengubah engine database utama dari SQLite (`idetech.sqlite`) ke MariaDB (`image: mariadb:11.4`) untuk performa multi-user di server produksi.
* **Laporan Belajar & Pemantauan**: Penambahan menu laporan belajar siswa, countdown timer ujian, indikator progres belajar, dan widget obrolan AI dengan penanda sisa kuota chat.
* **Visual Premium**: Penambahan efek orb melayang, integrasi KaTeX (untuk rumus matematika), penambahan grading queue, serta notifikasi toast yang lebih interaktif.

### Phase 2: Pengembangan Fitur Inti Pembelajaran
* **Bank Materi & IdeQuest**: Penambahan modul pembuatan materi pelajaran terstruktur dan kuis/penugasan interaktif (IdeQuest).
* **Integrasi RustFS**: Setup penyimpanan berkas media pembelajaran menggunakan RustFS Object Storage (S3 API kompatibel).
* **Riwayat Jurnal Mengajar**: Fitur pencatatan otomatis aktivitas pembelajaran harian guru untuk keperluan administrasi sekolah.

### Phase 1: Inisialisasi & Setup Infrastruktur
* **Initial Commit**: Setup awal aplikasi IdeTech dengan Bun, Hono (server backend), dan React/Vite (frontend).
* **Setup Docker & GHCR**: Integrasi container Docker untuk kemudahan deployment di server VPS serta workflow CI/CD menggunakan GitHub Actions.
* **Integrasi Awal Google OAuth**: Autentikasi aman bagi Guru, Siswa, dan Orang Tua menggunakan akun Google.

---

## 🛠️ Ringkasan Stack Teknologi Proyek

* **Runtime**: Bun
* **Backend Framework**: Hono (Node Server)
* **Frontend Framework**: React (Vite)
* **Database & ORM**: MariaDB / Drizzle ORM
* **Object Storage**: RustFS (S3 API Client)
* **Deployment**: Docker Compose & GitHub Container Registry (GHCR)
* **Backup**: Rclone (Google Drive) & Telegram Bot API
