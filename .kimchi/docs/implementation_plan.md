# Implementation Plan — Backend API IdeTech

Rencana implementasi lengkap seluruh backend API IdeTech. Cocok digunakan untuk rebuild, refactor, atau pengembangan lanjutan.

---

## 1. Tujuan & Ruang Lingkup

### Tujuan
Membangun backend API lengkap untuk aplikasi pembelajaran interaktif dengan fitur:
- Autentikasi Google OAuth + login demo
- Multi-role & permission-based authorization
- Manajemen kelas, materi, IdeQuest
- Tracking progres siswa
- Bank konten antar guru
- Jurnal refleksi guru dengan upload media
- AI chat assistant
- Laporan orang tua

### Ruang Lingkup
- Semua endpoint di prefix `/api`
- Total: ~47 endpoint
- Output: REST API JSON + session cookie auth

---

## 2. Tech Stack

| Komponen | Teknologi |
|---|---|
| Runtime | Bun 1.3+ |
| Framework | Hono |
| ORM | Drizzle ORM |
| Database | MariaDB (via mysql2) |
| Auth | Session cookie + Google OAuth 2.0 |
| Storage | S3-compatible (Minio/RustFS) |
| AI Proxy | CybraFeriBot API |
| Testing | Bun Test |

### Environment Variable Wajib
```bash
# App
NODE_ENV=development
PORT=2016

# MariaDB (format: mysql://user:password@host:port/database)
DATABASE_URL=mysql://idetech:idetech_secret@localhost:3306/idetech

# Google OAuth (wajib jika ingin login Google, kosongkan untuk demo login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:2016/api/auth/google/callback

# S3/RustFS (opsional, untuk upload foto jurnal)
RUSTFS_ENDPOINT=http://localhost:9000
RUSTFS_REGION=us-east-1
RUSTFS_ACCESS_KEY=minioadmin
RUSTFS_SECRET_KEY=minioadmin
RUSTFS_PUBLIC_BASE_URL=http://localhost:9000/idetech-assets

# AI chat assistant (opsional)
CYBRA_API_URL=https://cybrabot.ferilee.gurumuda.eu.org
```

### Catatan DATABASE_URL
- **Bun local**: `mysql://idetech:idetech_secret@localhost:3306/idetech`
- **Docker Compose**: `docker-compose.yml` meng-override ke `mysql://idetech:idetech_secret@mariadb:3306/idetech`

---

## 3. Struktur Folder

```
src/server/
├── db/
│   ├── client.ts          # mysql2 pool + drizzle
│   ├── init.ts            # wrapper pemanggil migrasi
│   ├── migrate.ts         # runner Drizzle migrations
│   ├── migrations/        # file SQL hasil generate
│   │   ├── 0000_xxxxxx.sql
│   │   └── meta/
│   └── schema.ts          # definisi tabel MariaDB
├── lib/
│   ├── auth.ts            # session, cookie, middleware
│   └── catalog.ts         # role, permission, dashboard catalog
├── routes/
│   ├── api.ts             # route utama
│   ├── api.test.ts        # integration tests
│   └── auth.ts            # route autentikasi
├── seed.ts                # data demo
└── index.ts               # entry point Hono

Root tambahan:
├── docker-compose.yml              # lokal development
├── docker-compose.production.yml   # produksi (GHCR)
├── drizzle.config.ts               # konfigurasi Drizzle Kit
└── .env.example                    # template environment
```

---

## 4. Fase Implementasi

### Fase 1: Foundation & Database
**Tujuan:** Siapkan database, client, dan tabel dasar.

#### Tabel yang Harus Dibuat
1. `users`
2. `oauth_accounts`
3. `roles`
4. `permissions`
5. `user_roles`
6. `role_permissions`
7. `sessions`
8. `parent_students`
9. `classes`
10. `class_students`
11. `materials`
12. `ide_quests`
13. `student_material_progress`
14. `student_quest_progress`
15. `teacher_journals`
16. `bank_requests`
17. `chat_quotas`
18. `activity_logs`
19. `global_announcements`
20. `master_subjects`
21. `master_grades`
22. `system_settings`

#### Deliverable
- `src/server/db/client.ts` — Drizzle client singleton (mysql2)
- `src/server/db/schema.ts` — definisi tabel & relasi (Drizzle mysqlTable)
- `src/server/db/migrate.ts` — runner Drizzle migrations
- `src/server/db/init.ts` — wrapper async ke `runMigrations()`
- `src/server/db/migrations/` — file SQL hasil generate Drizzle Kit
- `drizzle.config.ts` — konfigurasi Drizzle Kit
- `src/server/seed.ts` — data demo

#### Catatan Migrasi dari SQLite (SUDAH DIIMPLEMENTASIKAN)
- ✅ Ganti `sqliteTable` → `mysqlTable`
- ✅ Ganti tipe `integer({ mode: "timestamp" })` → `datetime({ mode: "date", fsp: 3 })`
- ✅ Ganti tipe `integer({ mode: "boolean" })` → `boolean`
- ✅ Ganti tipe `text({ mode: "json" })` → `json`
- ✅ Driver: `drizzle-orm/mysql2` dengan `mysql2/promise`
- ✅ Buat service MariaDB di `docker-compose.yml` dan `docker-compose.production.yml`
- ✅ Perbarui `DATABASE_URL` ke format `mysql://user:pass@host:3306/dbname`

**Generate migrasi:**
```bash
bunx drizzle-kit generate
```

**Verify:**
```bash
bun run build
docker build -t idetechapp:mariadb .
docker compose -f docker-compose.yml up -d
```

---

### Fase 2: Authentication & Session
**Tujuan:** Login, logout, session, middleware auth.

#### Endpoint
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/auth/me` | Data user dari session |
| GET | `/api/auth/google` | Redirect Google OAuth |
| GET | `/api/auth/google/callback` | Callback OAuth |
| POST | `/api/auth/dev/google` | Login demo |
| POST | `/api/auth/switch-role` | Ganti role aktif |
| POST | `/api/auth/logout` | Hapus session |

#### Middleware
- `authRequired` — 401 jika belum login
- `requireRole([roles])` — 403 berdasarkan role
- `requirePermission(permission)` — 403 berdasarkan permission

#### Session Cookie
- Name: `idetech_session`
- HttpOnly, SameSite=Lax, path `/`
- `secure` aktif di production
- Expire: 7 hari

**Verify:**
```bash
curl http://localhost:2016/api/health
curl -c cookies.txt -b cookies.txt http://localhost:2016/api/auth/me
```

---

### Fase 3: Dashboard & Common APIs
**Tujuan:** Endpoint dasar untuk semua role.

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/health` | Tidak | Health check |
| GET | `/api/dashboard` | Ya | Dashboard per role |
| GET | `/api/roles` | Ya | Daftar role |
| GET | `/api/permissions` | Ya | Daftar permission |
| PATCH | `/api/profile` | Ya | Update profil |
| GET | `/api/schools/search` | Ya | Cari sekolah |
| GET | `/api/permissions/matrix` | Ya | Matriks role-permission |

---

### Fase 4: Admin APIs
**Tujuan:** Manajemen user, role, kelas global, konfigurasi.

| Method | Endpoint | Role | Permission | Deskripsi |
|---|---|---|---|---|
| GET | `/api/admin/users` | admin | user.manage | List user |
| PATCH | `/api/admin/users/:id/verify` | admin | user.manage | Verifikasi user |
| DELETE | `/api/admin/users/:id` | admin | user.manage | Hapus user |
| GET | `/api/admin/access` | admin | system.setting | Ringkasan sistem |
| PATCH | `/api/admin/roles/:name/permissions` | admin | system.setting | Update permission role |
| GET | `/api/admin/classes` | admin | class.manage | List kelas |
| POST | `/api/admin/classes` | admin | class.manage | Buat kelas |
| PATCH | `/api/admin/classes/:id` | admin | class.manage | Edit kelas |
| DELETE | `/api/admin/classes/:id` | admin | class.manage | Hapus kelas |
| GET | `/api/admin/bank-queue` | admin | - | Antrian bank |
| PATCH | `/api/admin/bank-queue/:type/:id` | admin | - | Approve/reject bank |
| GET | `/api/admin/activity-logs` | admin | - | Log aktivitas |
| GET | `/api/admin/announcements` | semua | - | Pengumuman |
| POST | `/api/admin/announcements` | admin | - | Buat pengumuman |
| GET | `/api/admin/master-data` | admin | - | Data master |

---

### Fase 5: Teacher APIs
**Tujuan:** Guru mengelola kelas, materi, quest, progres, jurnal, AI, bank.

| Method | Endpoint | Permission | Deskripsi |
|---|---|---|---|
| GET | `/api/teacher/classes` | class.manage | List kelas |
| POST | `/api/teacher/classes` | class.manage | Buat kelas |
| GET | `/api/teacher/materials` | material.create | List materi |
| POST | `/api/teacher/materials` | material.create | Buat materi |
| PATCH | `/api/teacher/materials/:id` | material.create | Edit materi |
| DELETE | `/api/teacher/materials/:id` | material.create | Hapus materi |
| GET | `/api/teacher/idequests` | quest.manage | List quest |
| POST | `/api/teacher/idequests` | quest.manage | Buat quest |
| PATCH | `/api/teacher/idequests/:id` | quest.manage | Edit quest |
| DELETE | `/api/teacher/idequests/:id` | quest.manage | Hapus quest |
| GET | `/api/teacher/student-progress` | report.view | Progres siswa |
| GET | `/api/teacher/journals` | - | List jurnal |
| POST | `/api/teacher/journals` | - | Buat jurnal + upload foto |
| GET | `/api/teacher/chat-quota` | - | Cek kuota chat |
| POST | `/api/teacher/chat-consume` | - | Konsumsi kuota |
| POST | `/api/teacher/chat` | - | Chat AI Cybra |
| GET | `/api/teacher/bank-public` | - | Bank publik |
| POST | `/api/teacher/bank-submit` | - | Submit ke bank |
| POST | `/api/teacher/bank-requests` | - | Request salin |
| GET | `/api/teacher/bank-requests` | - | List request |
| PATCH | `/api/teacher/bank-requests/:id` | - | Approve/reject request |

---

### Fase 6: Student APIs
**Tujuan:** Siswa mengikuti kelas dan menyelesaikan tugas.

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/student/classes` | Kelas yang diikuti |
| POST | `/api/student/classes/join` | Gabung via class code |
| GET | `/api/student/materials` | Materi kelas |
| POST | `/api/student/materials/:id/complete` | Tandai selesai |
| GET | `/api/student/quests` | Quest siswa |
| POST | `/api/student/quests/:id/complete` | Kumpulkan quest |
| GET | `/api/student/achievements` | Badge & poin |
| GET | `/api/student/indicators` | Indikator dashboard |

---

### Fase 7: Parent APIs
**Tujuan:** Orang tua melihat laporan anak.

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/parent/reports` | Laporan anak (data riil dari parent_students + progres) |

---

### Fase 8: Frontend Integration
**Tujuan:** Frontend bisa mengonsumsi API.

- Buat helper `api(path, options)` dengan `credentials: "include"`
- Vite dev proxy `/api/*` ke backend
- Hono `serveStatic({ root: "./dist" })` untuk production

---

### Fase 9: External Integrations

#### Google OAuth
- Daftarkan app di Google Cloud Console
- Authorized redirect URI: `https://domain/api/auth/google/callback`

#### S3/RustFS
- Bucket: `idetech-assets`
- Path: `journals/{userId}-{timestamp}.{ext}`

#### CybraFeriBot
- Endpoint: `POST /api/integration/chat`
- Body: `{ message, history }`

#### School Search
- URL: `https://api-sekolah-indonesia.vercel.app/sekolah/s?sekolah={query}`

---

### Fase 10: Testing & QA

#### Test Otomatis
- `GET /api/health`
- `GET /api/schools/search`
- `GET /api/auth/me` (authorized & unauthorized)
- Admin CRUD classes
- Teacher materials/quests
- Student join & complete

#### Manual Checklist
- [ ] Login demo berhasil
- [ ] Switch role berhasil
- [ ] Logout berhasil
- [ ] Google OAuth berhasil
- [ ] Admin verifikasi user
- [ ] Guru CRUD kelas/materi/quest
- [ ] Siswa join kelas & complete
- [ ] Bank submit → approve → clone
- [ ] Jurnal upload foto
- [ ] Chat AI dengan kuota

#### Security Checklist
- [ ] Demo login off di production
- [ ] Cookie secure di production
- [ ] S3 tidak pakai fallback default
- [ ] Admin endpoint cek role & permission
- [ ] Teacher isolasi data antar guru

---

## 5. Urutan Implementasi dari Nol

1. Foundation & Database
2. Authentication & Session
3. Dashboard & Common APIs
4. Admin APIs
5. Teacher APIs
6. Student APIs
7. Parent APIs
8. Frontend Integration
9. External Integrations
10. Testing & Hardening

---

## 6. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| MariaDB availability | Gunakan Docker healthcheck & connection retry di app startup |
| Migrasi schema | Gunakan Drizzle migrations, bukan raw SQL di init.ts |
| Cross-domain cookie | `secure` + `sameSite=None` |
| Role Google hardcoded | Pindah ke `system_settings` |
| Parent report mock | ✅ Sudah terhubung ke `parent_students` |
| Kuota chat hardcoded | Pindah ke `system_settings` |

---

## 7. Kriteria Selesai

- [x] Semua ~47 endpoint terimplementasi
- [x] Auth & otorisasi berfungsi (termasuk permission check baru)
- [x] Seed data demo berjalan
- [x] Test suite lolos (7 skenario)
- [x] Docker build & run sukses
- [x] Dokumentasi API tersedia
