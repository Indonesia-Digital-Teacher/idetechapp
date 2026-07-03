# Dokumentasi Perkembangan Coding — IdeTech

Dokumen ini mencatat status implementasi backend API IdeTech berdasarkan `implementation_plan.md`. Terakhir diperbarui: **3 Juli 2026**.

---

## Status Global

| Aspek | Status |
|---|---|
| Total endpoint backend | ~47 endpoint |
| Database | MariaDB (migrasi dari SQLite selesai) |
| Build | ✅ Sukses |
| Test otomatis | ✅ 30 pass, 0 fail |
| Container Docker | ✅ Healthy |
| Commit terakhir | `1e89d9b` — feat: enforce permissions and real parent reports + docs |

---

## ✅ Sudah Diimplementasi

### 1. Foundation & Database
- [x] Schema 22 tabel MariaDB (`mysqlTable`)
- [x] Drizzle client dengan `mysql2/promise`
- [x] Drizzle migrations (`src/server/db/migrations/`)
- [x] Seed data demo
- [x] Docker Compose lokal + produksi
- [x] `.env.example` dengan format MariaDB

### 2. Autentikasi & Session
- [x] Google OAuth login + callback
- [x] Login demo (`/api/auth/dev/google`)
- [x] Session cookie (HttpOnly, SameSite=Lax, 7 hari)
- [x] `authRequired`, `requireRole`, `requirePermission` middleware
- [x] Switch role + logout

### 3. Dashboard & Common APIs
- [x] `/api/health`
- [x] `/api/dashboard`
- [x] `/api/roles`
- [x] `/api/permissions`
- [x] `/api/profile`
- [x] `/api/schools/search`
- [x] `/api/permissions/matrix`

### 4. Admin APIs
- [x] `/api/admin/users` CRUD + verifikasi
- [x] `/api/admin/access`
- [x] `/api/admin/roles/:name/permissions`
- [x] `/api/admin/classes` CRUD
- [x] `/api/admin/bank-queue` approve/reject
- [x] `/api/admin/activity-logs` (endpoint tersedia)
- [x] `/api/admin/announcements` GET/POST
- [x] `/api/admin/master-data` (endpoint tersedia)

### 5. Teacher APIs
- [x] `/api/teacher/classes` CRUD
- [x] `/api/teacher/materials` CRUD
- [x] `/api/teacher/idequests` CRUD
- [x] `/api/teacher/student-progress`
- [x] `/api/teacher/journals` GET/POST + upload foto ke S3
- [x] `/api/teacher/chat-quota`, `/api/teacher/chat-consume`, `/api/teacher/chat`
- [x] `/api/teacher/bank-*` (submit, public, requests)

### 6. Student APIs
- [x] `/api/student/classes` + join
- [x] `/api/student/materials` + complete
- [x] `/api/student/quests` + complete
- [x] `/api/student/achievements`
- [x] `/api/student/indicators`

### 7. Parent APIs
- [x] `/api/parent/reports` — sudah terhubung ke data riil

### 8. Frontend Integration
- [x] API helper dengan `credentials: "include"`
- [x] Vite dev proxy `/api/*`
- [x] Hono `serveStatic` production

### 9. External Integrations
- [x] Google OAuth
- [x] S3/RustFS-compatible storage
- [x] CybraFeriBot AI chat
- [x] API Sekolah Indonesia

---

## ⚠️ Sudah Ada Endpoint/Tabel Tapi Fungsionalnya Belum Lengkap

| Item | Status | Keterangan |
|---|---|---|
| `/api/admin/activity-logs` | ✅ | Endpoint mengembalikan data `activity_logs`; penulisan log sudah ditambahkan di aksi penting. |

---

## ❌ Belum Diimplementasi

### Security Hardening
- [x] Menonaktifkan `/api/auth/dev/google` di production (env flag `DEMO_LOGIN_ENABLED`)
- [x] Menghapus fallback S3 default (`minioadmin`/`minioadmin`)

### Konfigurasi Dinamis
- [x] Memindahkan Google role mapping dari hardcoded ke `system_settings`
- [x] Memindahkan chat quota (limit & window) dari hardcoded ke `system_settings`
- [x] Retry connection ke MariaDB saat startup

### API Endpoint
- [x] CRUD `system_settings`

### API Endpoint yang Belum Ada
- [x] CRUD relasi `parent_students` (link/unlink anak ke orang tua)
- [x] CRUD `master_subjects` dan `master_grades`
- [x] CRUD `system_settings`
- [x] Endpoint untuk menulis activity logs

### Test Otomatis
- [ ] Test Google OAuth flow
- [ ] Test upload foto jurnal ke S3
- [ ] Test chat AI dengan quota
- [ ] Test bank submit → approve → clone
- [ ] Test parent reports dengan data riil
- [ ] Test admin CRUD classes/materials/quests
- [ ] Test student join class & complete

---

## Catatan Teknis

### Perubahan Penting Terakhir
1. **Google role mapping** sekarang dikonfigurasi lewat `system_settings` (`google.role_rule`) dengan fallback default.
2. **CRUD system_settings** tersedia di `/api/admin/settings`.
3. **Fallback S3 default** dihapus; upload foto jurnal gagal dengan 500 jika konfigurasi tidak lengkap.
4. **Demo login** dinonaktifkan di production kecuali `DEMO_LOGIN_ENABLED=true`.
5. **Retry connection MariaDB** ditambahkan saat startup dengan exponential backoff.
6. **Seed script** sekarang mengisi `master_subjects`, `master_grades`, dan default `google.role_rule`.

### Yang Perlu Diperhatikan
- `cookies.txt` ditambahkan ke `.gitignore` (file sementara saat testing).
- Pool DB ditutup di `seed.ts` hanya ketika dijalankan standalone.

---

## Prioritas Selanjutnya (Rekomendasi)

### Tinggi (Security & Stabilitas)
1. Nonaktifkan demo login di production.
2. Hapus fallback S3 default.
3. Tambahkan retry connection MariaDB saat startup.

### Menengah (Fitur Lengkap)
4. Isi seed data `master_subjects` dan `master_grades`.
5. Implementasikan CRUD `system_settings`.
6. Implementasikan CRUD `parent_students`.

### Rendah (Enhancement)
7. Tambahkan penulisan activity logs di aksi penting.
8. Pindahkan Google role mapping dan chat quota ke `system_settings`.
9. Perluas test otomatis.

---

## Verifikasi Terakhir

```bash
bun run build      # ✅ sukses
bun test           # ✅ 7 pass, 0 fail
docker compose -f docker-compose.yml up -d   # ✅ healthy
curl http://localhost:2016/api/health        # ✅ {"status":"ok"}
```

*Dokumen ini akan diperbarui seiring perkembangan implementasi.*
