# Audit Lengkap Backend API — IdeTech

Dokumen ini memetakan seluruh endpoint backend yang dibutuhkan aplikasi IdeTech, model autentikasi/otorisasi, dependensi eksternal, dan skema database.

---

## 1. Ringkasan Arsitektur Backend

| Aspek | Implementasi |
|---|---|
| Runtime | Bun |
| Framework | Hono |
| ORM | Drizzle ORM |
| Database | MariaDB (via mysql2) |
| Autentikasi | Session cookie + Google OAuth 2.0 + login demo |
| Otorisasi | Role-based + Permission-based |
| File storage | S3-compatible (RustFS/Minio) |
| AI chat proxy | CybraFeriBot |

Semua API backend diprefix dengan `/api`. Frontend (React + Vite) di mode dev mem-proxy `/api/*` ke backend Hono.

---

## 2. Autentikasi & Otorisasi

### Model Session
- Cookie name: `idetech_session`
- HttpOnly, SameSite=Lax, path `/`
- `secure=true` hanya di `NODE_ENV=production`
- Masa berlaku: **7 hari**
- Token disimpan di tabel `sessions`, dicek expire tiap request

### Middleware
| Middleware | Fungsi |
|---|---|
| `authRequired` | Pastikan user punya session valid |
| `requireRole([...])` | Batasi akses berdasarkan `activeRole` |
| `requirePermission("...")` | Batasi akses berdasarkan permission role aktif |

### Role & Permission Bawaan

**Role:** `admin`, `teacher`, `student`, `parent`

**Permission:**
- `user.manage`
- `class.manage`
- `material.create`
- `quest.manage`
- `quest.play`
- `report.view`
- `radar.view`
- `bank.manage`
- `system.setting`

**Mapping role → permission (hardcoded di `src/server/lib/catalog.ts`):**

| Role | Permission |
|---|---|
| admin | Semua permission |
| teacher | `class.manage`, `material.create`, `quest.manage`, `report.view`, `radar.view`, `bank.manage` |
| student | `quest.play`, `report.view`, `radar.view` |
| parent | `report.view`, `radar.view` |

---

## 3. Inventori Endpoint Backend

### 3.1 Health & Metadata

| Method | Endpoint | Auth | Role | Permission | Deskripsi |
|---|---|---|---|---|---|
| GET | `/api/health` | Tidak | - | - | Cek status API |

### 3.2 Autentikasi (`/api/auth/*`)

| Method | Endpoint | Auth | Role | Permission | Deskripsi |
|---|---|---|---|---|---|
| GET | `/api/auth/me` | Ya | - | - | Ambil data user dari session aktif |
| GET | `/api/auth/google` | Tidak | - | - | Redirect ke Google OAuth login |
| GET | `/api/auth/google/callback` | Tidak | - | - | Callback OAuth Google, buat session |
| POST | `/api/auth/dev/google` | Tidak | - | - | Login demo berdasarkan email |
| POST | `/api/auth/switch-role` | Ya | - | - | Ganti role aktif user |
| POST | `/api/auth/logout` | Opsional | - | - | Hapus session dan cookie |

### 3.3 Dashboard & Umum

| Method | Endpoint | Auth | Role | Permission | Deskripsi |
|---|---|---|---|---|---|
| GET | `/api/dashboard` | Ya | - | - | Ambil dashboard sesuai role aktif |
| GET | `/api/roles` | Ya | - | - | Daftar role + catalog |
| GET | `/api/permissions` | Ya | - | - | Daftar permission + catalog |
| PATCH | `/api/profile` | Ya | - | - | Lengkapi/update profil user |
| GET | `/api/schools/search?q=...` | Ya | - | - | Cari nama sekolah via API eksternal |
| GET | `/api/permissions/matrix` | Ya | - | - | Matriks role-permission |

### 3.4 Admin (`/api/admin/*`)

| Method | Endpoint | Auth | Role | Permission | Deskripsi |
|---|---|---|---|---|---|
| GET | `/api/admin/users` | Ya | admin | `user.manage` | Daftar seluruh user + role |
| PATCH | `/api/admin/users/:id/verify` | Ya | admin | `user.manage` | Verifikasi status & role user |
| DELETE | `/api/admin/users/:id` | Ya | admin | `user.manage` | Hapus user |
| GET | `/api/admin/access` | Ya | admin | `system.setting` | Ringkasan akses & statistik sistem |
| PATCH | `/api/admin/roles/:name/permissions` | Ya | admin | `system.setting` | Update permission suatu role |
| GET | `/api/admin/classes` | Ya | admin | `class.manage` | Daftar kelas global |
| POST | `/api/admin/classes` | Ya | admin | `class.manage` | Buat kelas baru |
| PATCH | `/api/admin/classes/:id` | Ya | admin | `class.manage` | Edit kelas |
| DELETE | `/api/admin/classes/:id` | Ya | admin | `class.manage` | Hapus kelas |
| GET | `/api/admin/bank-queue` | Ya | admin | - | Antrian pengajuan Bank Materi/IdeQuest |
| PATCH | `/api/admin/bank-queue/:type/:id` | Ya | admin | - | Approve/reject pengajuan bank |
| GET | `/api/admin/activity-logs` | Ya | admin | - | Log aktivitas user |
| GET | `/api/admin/announcements` | Ya | semua | - | Daftar pengumuman global |
| POST | `/api/admin/announcements` | Ya | admin | - | Buat pengumuman global |
| GET | `/api/admin/master-data` | Ya | admin | - | Data master mapel, kelas, pengaturan |

### 3.5 Guru (`/api/teacher/*`)

| Method | Endpoint | Auth | Role | Permission | Deskripsi |
|---|---|---|---|---|---|
| GET | `/api/teacher/classes` | Ya | teacher/admin | `class.manage` | Daftar kelas guru |
| POST | `/api/teacher/classes` | Ya | teacher/admin | `class.manage` | Buat kelas baru |
| GET | `/api/teacher/materials` | Ya | teacher/admin | `material.create` | Daftar materi guru |
| POST | `/api/teacher/materials` | Ya | teacher/admin | `material.create` | Buat materi |
| PATCH | `/api/teacher/materials/:id` | Ya | teacher/admin | `material.create` | Edit materi |
| DELETE | `/api/teacher/materials/:id` | Ya | teacher/admin | `material.create` | Hapus materi |
| GET | `/api/teacher/idequests` | Ya | teacher/admin | `quest.manage` | Daftar IdeQuest guru |
| POST | `/api/teacher/idequests` | Ya | teacher/admin | `quest.manage` | Buat IdeQuest |
| PATCH | `/api/teacher/idequests/:id` | Ya | teacher/admin | `quest.manage` | Edit IdeQuest |
| DELETE | `/api/teacher/idequests/:id` | Ya | teacher/admin | `quest.manage` | Hapus IdeQuest |
| GET | `/api/teacher/student-progress` | Ya | teacher/admin | `report.view` | Progres siswa per kelas guru |
| GET | `/api/teacher/journals` | Ya | teacher/admin | - | Daftar jurnal refleksi guru |
| POST | `/api/teacher/journals` | Ya | teacher/admin | - | Buat jurnal + upload foto ke S3 |
| GET | `/api/teacher/chat-quota` | Ya | teacher/admin | - | Cek sisa kuota chat AI |
| POST | `/api/teacher/chat-consume` | Ya | teacher/admin | - | Konsumsi kuota chat |
| POST | `/api/teacher/chat` | Ya | teacher/admin | - | Kirim pesan ke AI CybraFeriBot |
| GET | `/api/teacher/bank-public` | Ya | teacher/admin | - | Daftar materi/IdeQuest publik di bank |
| POST | `/api/teacher/bank-submit` | Ya | teacher/admin | - | Ajukan materi/IdeQuest ke bank |
| POST | `/api/teacher/bank-requests` | Ya | teacher/admin | - | Minta salin item bank ke kelas sendiri |
| GET | `/api/teacher/bank-requests` | Ya | teacher/admin | - | Daftar permintaan bank masuk & keluar |
| PATCH | `/api/teacher/bank-requests/:id` | Ya | teacher/admin | - | Approve/reject permintaan bank |

### 3.6 Siswa (`/api/student/*`)

| Method | Endpoint | Auth | Role | Permission | Deskripsi |
|---|---|---|---|---|---|
| GET | `/api/student/classes` | Ya | student | - | Daftar kelas yang diikuti |
| POST | `/api/student/classes/join` | Ya | student | - | Gabung kelas via class code |
| GET | `/api/student/materials` | Ya | student | - | Daftar materi kelas siswa |
| POST | `/api/student/materials/:id/complete` | Ya | student | - | Tandai materi selesai |
| GET | `/api/student/quests` | Ya | student | `quest.play` | Daftar IdeQuest siswa |
| POST | `/api/student/quests/:id/complete` | Ya | student | `quest.play` | Kumpulkan IdeQuest |
| GET | `/api/student/achievements` | Ya | student | - | Badge & poin siswa |
| GET | `/api/student/indicators` | Ya | student | - | Indikator dashboard siswa (radar, tugas, poin) |

### 3.7 Orang Tua (`/api/parent/*`)

| Method | Endpoint | Auth | Role | Permission | Deskripsi |
|---|---|---|---|---|---|
| GET | `/api/parent/reports` | Ya | parent | `report.view` | Laporan perkembangan anak (data riil dari `parent_students` + progres) |

---

## 4. Dependensi API Eksternal

| Layanan | URL | Digunakan di | Keterangan |
|---|---|---|---|
| Google OAuth | `https://accounts.google.com/o/oauth2/v2/auth` | `/api/auth/google` | Login Google |
| Google Token | `https://oauth2.googleapis.com/token` | `/api/auth/google/callback` | Tukar code jadi token |
| Google Userinfo | `https://openidconnect.googleapis.com/v1/userinfo` | `/api/auth/google/callback` | Ambil profil Google |
| API Sekolah Indonesia | `https://api-sekolah-indonesia.vercel.app/sekolah/s` | `/api/schools/search` | Pencarian nama sekolah |
| CybraFeriBot | `https://cybrabot.ferilee.gurumuda.eu.org/api/integration/chat` | `/api/teacher/chat` | AI chat assistant guru |
| S3/RustFS | `RUSTFS_ENDPOINT` / `S3_ENDPOINT` | `/api/teacher/journals` | Upload foto jurnal |

---

## 5. Skema Database (Tabel)

| Tabel | Fungsi Utama |
|---|---|
| `users` | Data pengguna |
| `oauth_accounts` | Kredensial OAuth Google |
| `roles` | Role bawaan (admin, teacher, student, parent) |
| `permissions` | Permission bawaan |
| `user_roles` | Mapping user-role |
| `role_permissions` | Mapping role-permission |
| `sessions` | Session cookie aktif |
| `parent_students` | Relasi orang tua-anak (belum banyak digunakan) |
| `classes` | Kelas pembelajaran |
| `class_students` | Relasi siswa-kelas |
| `materials` | Materi pembelajaran |
| `ide_quests` | Tugas/misi IdeQuest |
| `student_material_progress` | Progres materi siswa |
| `student_quest_progress` | Progres quest siswa |
| `teacher_journals` | Jurnal refleksi guru |
| `bank_requests` | Permintaan salin item bank |
| `chat_quotas` | Kuota chat AI per guru |
| `activity_logs` | Log aktivitas |
| `global_announcements` | Pengumuman global |
| `master_subjects` | Master mata pelajaran |
| `master_grades` | Master jenjang kelas |
| `system_settings` | Pengaturan sistem (key-value) |

---

## 6. Catatan Keamanan & Observasi

1. **Authorization pada beberapa endpoint kurang ketat**
   - `/api/teacher/journals`, `/api/teacher/chat-quota`, `/api/teacher/chat-consume`, `/api/teacher/chat`, `/api/teacher/bank-*`, `/api/admin/announcements`, `/api/admin/master-data`, `/api/admin/bank-queue`, `/api/admin/activity-logs` tidak memeriksa `requirePermission(...)` meski permission relevan tersedia di catalog.

2. **Parent report sudah terhubung ke data riil**
   - `/api/parent/reports` sekarang mengambil data dari tabel `parent_students`, menghitung progres dari `student_material_progress` dan `student_quest_progress`, serta menampilkan catatan guru terbaru.

3. **Bank request approval meng-clone item**
   - Saat approve, item di-clone ke kelas requester. Perlu memastikan hanya owner yang bisa approve (sudah dicek `ownerUserId === user.id`).

4. **Google OAuth role resolution hardcoded**
   - Email `the.real.ferilee@gmail.com` otomatis jadi admin+teacher.
   - Domain guru hardcoded (`@guru.smk.belajar.id`, dll.).
   - Sisanya default `student`.

5. **S3/RustFS credentials fallback ke default Minio**
   - Jika env tidak diisi, fallback ke `minioadmin`/`minioadmin` dan `http://global-storage:9000`.

6. **Demo login tanpa password**
   - `/api/auth/dev/google` langsung login berdasarkan email tanpa verifikasi kredensial. Pastikan tidak aktif di production.

---

## 7. Rekomendasi

- **Tambahkan `requirePermission`** pada endpoint bank, journal, chat, dan admin yang masih hanya `requireRole`.
- **Hubungkan parent report** ke data riil `parent_students` + progress siswa.
- **Nonaktifkan `/api/auth/dev/google`** di production via env flag.
- **Ganti fallback S3 credentials** dengan error 500 jika env tidak diisi.
- **Tambahkan rate limiting** pada endpoint publik seperti `/api/schools/search` dan `/api/auth/google`.

---

## Catatan Migrasi ke MariaDB

Saat ini codebase sudah dimigrasikan dari SQLite ke MariaDB:

- Schema menggunakan `mysqlTable` dari `drizzle-orm/mysql-core`
- Client menggunakan `mysql2/promise`
- Inisialisasi tabel menggunakan Drizzle migrations (`src/server/db/migrations`)
- Docker Compose menyertakan service `mariadb` dengan volume persisten `mariadb_data`
- Environment variable `DATABASE_URL` menggunakan format `mysql://user:pass@host:3306/dbname`

*Audit dibuat berdasarkan source code di `src/server/routes/api.ts`, `src/server/routes/auth.ts`, `src/server/db/schema.ts`, dan `src/client/main.tsx`.*
