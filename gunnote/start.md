# Menjalankan Aplikasi dengan Docker

## 1. Persiapan

Pastikan Docker terinstall. Lalu buat file `.env` dari template:

```bash
cp .env.example .env
```

Edit `.env` dan isi kredensial Google OAuth:

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_REDIRECT_URI=http://localhost:2016/api/auth/google/callback
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

> Untuk coba-coba lokal, kamu bisa pakai login demo tanpa mengisi Google OAuth.

## 2. Jalankan dengan Docker Compose (Lokal)

Build image lokal terlebih dahulu:

```bash
docker build -t idetechapp:mariadb .
```

File `docker-compose.yml` mengasumsikan network `ferileenet` sudah ada. Buat dulu:

```bash
docker network create ferileenet
```

Jalankan aplikasi + MariaDB:

```bash
docker compose -f docker-compose.yml up -d
```

Aplikasi akan berjalan di: **http://localhost:2016**

Database MariaDB berjalan sebagai service tersendiri di Docker Compose. Data tersimpan di named volume `mariadb_data`, jadi tidak hilang saat container diganti.

Untuk deployment produksi yang pull dari GHCR, gunakan `docker-compose.production.yml`.

## 3. Build dan Jalankan Image Lokal

Kalau ingin build sendiri dari source:

```bash
docker build -t idetechapp:local .
```

Lalu jalankan:

```bash
docker run -d \
  --name idetechapp \
  -p 2016:2016 \
  --env-file .env \
  -e NODE_ENV=production \
  -e PORT=2016 \
  -e DATABASE_URL=mysql://idetech:idetech_secret@host.docker.internal:3306/idetech \
  --restart always \
  idetechapp:local
```

Akses di: **http://localhost:2016**

## 4. Login Demo

Kalau tidak mau setup Google OAuth, gunakan login demo di halaman awal dengan akun:

| Email | Role |
|---|---|
| admin@idetech.local | Admin, Guru |
| guru@idetech.local | Guru |
| siswa@idetech.local | Siswa |
| ortu@idetech.local | Orang Tua |

## Catatan Penting

- Port default adalah **2016**.
- Saat runtime, server otomatis menginisialisasi database dan menjalankan seed data demo.
- Untuk development native (bukan Docker), gunakan `bun install && bun run dev` lalu buka **http://localhost:2016**.
