# IdeTech

IdeTech adalah aplikasi pembelajaran interaktif berbasis web dengan autentikasi Google OAuth, session berbasis cookie, multi-role, dan permission. Aplikasi ini menyediakan dashboard berbeda untuk Admin, Guru, Siswa, dan Orang Tua sesuai alur pada `app_summary.md`.

## Stack

- Bun
- Hono untuk backend
- Drizzle ORM dengan SQLite
- React + Vite untuk frontend
- Tailwind CSS dengan gaya komponen shadcn/ui
- Lucide React untuk ikon

## Menjalankan Aplikasi

Instal dependency:

```bash
bun install
```

Siapkan database dan data demo:

```bash
bun run db:seed
```

Jalankan mode development:

```bash
bun run dev
```

Buka aplikasi di:

```txt
http://localhost:2016
```

Pada mode development, Vite berjalan di port `2016` dan mem-proxy request `/api` ke backend Hono di port `2017`.

## Menjalankan Mode Produksi

Build frontend:

```bash
bun run build
```

Jalankan server:

```bash
bun run start
```

Aplikasi produksi berjalan di:

```txt
http://localhost:2016
```

Jika ingin mengganti port:

```bash
PORT=3000 bun run start
```

## Deployment Docker dan GHCR

Image produksi dipublikasikan ke:

```txt
ghcr.io/ferilee/idetechapp:latest
```

Workflow publikasi dijalankan manual dari GitHub melalui menu **Actions**, pilih
**Publish GHCR image**, lalu klik **Run workflow**. Workflow menggunakan
`GITHUB_TOKEN` bawaan GitHub Actions dan tidak memerlukan personal access token.

Siapkan network Docker satu kali pada server:

```bash
docker network create ferileenet
```

Salin konfigurasi environment berdasarkan `.env.example`, lalu isi kredensial
Google OAuth produksi. `GOOGLE_REDIRECT_URI` harus sama persis dengan Authorized
redirect URI yang didaftarkan di Google Cloud Console.

Jalankan deployment menggunakan Compose produksi:

```bash
docker login ghcr.io
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

Login GHCR hanya diperlukan jika package masih berstatus private. Alternatifnya,
ubah visibility package `idetechapp` menjadi public melalui pengaturan package
di GitHub agar server dapat melakukan pull tanpa kredensial registry.

Database MariaDB berjalan sebagai service tersendiri di Docker Compose. Data
disimpan pada named volume `mariadb_data`, sehingga tetap tersedia ketika
container diganti. Pastikan environment variable `DATABASE_URL` mengarah ke
service MariaDB, misalnya:

```txt
mysql://idetech:idetech_secret@mariadb:3306/idetech
```

## Login

### Login Demo

Untuk mencoba aplikasi tanpa Google Cloud, gunakan pilihan login demo di halaman awal.

Akun demo yang tersedia:

| Email | Role |
| --- | --- |
| `admin@idetech.local` | Admin, Guru |
| `guru@idetech.local` | Guru |
| `siswa@idetech.local` | Siswa |
| `ortu@idetech.local` | Orang Tua |

User `admin@idetech.local` memiliki lebih dari satu role, sehingga fitur switch role dapat langsung dicoba.

### Google OAuth

Isi environment variable berikut sebelum menjalankan server:

```bash
GOOGLE_CLIENT_ID=isi-client-id
GOOGLE_CLIENT_SECRET=isi-client-secret
bun run dev
```

Redirect URI yang perlu didaftarkan di Google Cloud:

```txt
http://localhost:2016/api/auth/google/callback
```

Untuk mode development, request `/api/auth/google/callback` akan diproxy dari Vite ke backend Hono.

Jika user Google belum ada di database, sistem akan membuat user baru dengan:

- role default: `student`
- status: `pending`

Admin dapat memverifikasi user melalui endpoint admin.

## API

Semua endpoint backend berada di prefix `/api`.

Endpoint utama:

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/api/health` | Cek status API |
| `GET` | `/api/auth/google` | Mulai login Google OAuth |
| `GET` | `/api/auth/google/callback` | Callback Google OAuth |
| `POST` | `/api/auth/dev/google` | Login demo |
| `GET` | `/api/auth/me` | Ambil session user aktif |
| `POST` | `/api/auth/switch-role` | Mengganti role aktif |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/dashboard` | Dashboard sesuai role aktif |
| `GET` | `/api/admin/users` | Daftar user untuk Admin |
| `PATCH` | `/api/admin/users/:id/verify` | Verifikasi status dan role user |
| `GET` | `/api/teacher/classes` | Data kelas Guru/Admin |
| `GET` | `/api/student/quests` | Data IdeQuest Siswa |
| `GET` | `/api/parent/reports` | Laporan anak untuk Orang Tua |
| `GET` | `/api/permissions/matrix` | Matriks role dan permission |

## Struktur Database

Database SQLite dibuat otomatis di file:

```txt
mysql://idetech:idetech_secret@localhost:3306/idetech
```

Tabel yang tersedia:

- `users`
- `oauth_accounts`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `sessions`
- `parent_students`

Drizzle schema berada di:

```txt
src/server/db/schema.ts
```

## Role dan Permission

Role bawaan:

- `admin`
- `teacher`
- `student`
- `parent`

Permission bawaan:

- `user.manage`
- `class.manage`
- `material.create`
- `quest.manage`
- `quest.play`
- `report.view`
- `radar.view`
- `bank.manage`
- `system.setting`

Middleware backend mengecek session, role aktif, dan permission sebelum memberikan akses ke route tertentu.
