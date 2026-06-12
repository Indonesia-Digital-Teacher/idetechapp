# Panduan Autentikasi Google OAuth IdeTech

Dokumen ini menjelaskan cara mengaktifkan login Google OAuth untuk IdeTech. Backend sudah menyediakan endpoint OAuth di bawah `/api/auth`.

## Alur Singkat

1. User menekan tombol `Masuk dengan Google` di landing page.
2. Browser diarahkan ke `/api/auth/google`.
3. Backend Hono membuat URL otorisasi Google dengan scope `openid email profile`.
4. Google mengembalikan user ke `/api/auth/google/callback`.
5. Backend menukar `code` menjadi access token, mengambil profil Google, lalu menyimpan atau memperbarui user di database melalui Drizzle ORM.
6. Backend membuat session dan menyimpan cookie `idetech_session`.
7. Frontend membaca `/api/auth/me`, lalu menampilkan dashboard sesuai `activeRole`.

## Prasyarat

- Akun Google.
- Project Google Cloud.
- Aplikasi IdeTech berjalan di port `2016`.
- Database sudah disiapkan dan diisi data awal.

## Membuat OAuth Client di Google Cloud

1. Buka Google Cloud Console.
2. Buat project baru atau gunakan project yang sudah ada.
3. Masuk ke menu `APIs & Services` -> `OAuth consent screen`.
4. Pilih tipe aplikasi sesuai kebutuhan, lalu isi nama aplikasi, email support, dan developer contact.
5. Masuk ke `APIs & Services` -> `Credentials`.
6. Klik `Create Credentials` -> `OAuth client ID`.
7. Pilih `Web application`.
8. Tambahkan Authorized JavaScript origins:

```txt
http://localhost:2016
```

9. Tambahkan Authorized redirect URIs:

```txt
http://localhost:2016/api/auth/google/callback
```

Untuk production, tambahkan origin dan redirect URI domain production:

```txt
https://domain-anda.com
https://domain-anda.com/api/auth/google/callback
```

10. Simpan `Client ID` dan `Client Secret`.

## Konfigurasi Environment

Buat file `.env` di root project:

```env
GOOGLE_CLIENT_ID=isi_dengan_client_id_google
GOOGLE_CLIENT_SECRET=isi_dengan_client_secret_google
GOOGLE_REDIRECT_URI=http://localhost:2016/api/auth/google/callback
DATABASE_URL=idetech.sqlite
PORT=2016
```

Catatan:

- Jika `GOOGLE_REDIRECT_URI` diisi, backend akan memakai nilai itu sebagai callback Google.
- Jika `GOOGLE_REDIRECT_URI` kosong, backend membentuk redirect URI otomatis dari host request saat ini.
- Jika aplikasi dibuka dari `http://localhost:2016`, callback yang dipakai adalah `http://localhost:2016/api/auth/google/callback`.
- Jika `GOOGLE_CLIENT_ID` belum diisi, tombol Google akan masuk ke mode demo-required.

## Menjalankan Aplikasi

Install dependency:

```bash
bun install
```

Isi data awal:

```bash
bun run db:seed
```

Jalankan mode production lokal di port `2016`:

```bash
bun run build
PORT=2016 bun run start
```

Buka aplikasi:

```txt
http://localhost:2016
```

## Endpoint Auth

| Endpoint | Method | Fungsi |
| --- | --- | --- |
| `/api/auth/google` | GET | Memulai login Google OAuth |
| `/api/auth/google/callback` | GET | Callback dari Google |
| `/api/auth/me` | GET | Mengambil user aktif dari session |
| `/api/auth/switch-role` | POST | Mengganti role aktif user multi-role |
| `/api/auth/logout` | POST | Keluar dan menghapus session |
| `/api/auth/dev/google` | POST | Login demo lokal berdasarkan email seed |

## Data yang Disimpan

Setelah login berhasil, backend menyimpan data berikut:

- User: nama, email, avatar, status verifikasi email.
- OAuth account: provider `google`, Google ID, access token, refresh token jika tersedia, dan expiry.
- Session: token session, user ID, role aktif, dan waktu kedaluwarsa.

Role default untuk user baru mengikuti logic di backend. Untuk aplikasi sekolah, user baru sebaiknya tetap diverifikasi admin sebelum mendapat akses penuh.

## Aturan Role Otomatis dari Email Google

Saat user login dengan Google, backend menentukan role berdasarkan email:

| Email Google | Role |
| --- | --- |
| `the.real.ferilee@gmail.com` | `admin` |
| Domain `@guru.smk.belajar.id` | `teacher` |
| Domain `@guru.sma.belajar.id` | `teacher` |
| Domain `@guru.smp.belajar.id` | `teacher` |
| Email lain | `student` |

Aturan ini diterapkan setiap kali user login Google. Jika user tersebut sudah pernah login sebelumnya, role-nya akan disinkronkan ulang mengikuti aturan di atas.

## Checklist Pengujian

1. Jalankan aplikasi di `http://localhost:2016`.
2. Klik `Masuk dengan Google`.
3. Pilih akun Google.
4. Pastikan kembali ke aplikasi tanpa error.
5. Pastikan dashboard sesuai role tampil.
6. Cek endpoint `/api/auth/me` mengembalikan data user aktif.
7. Coba logout, lalu pastikan session tidak lagi aktif.

## Troubleshooting

### `redirect_uri_mismatch`

Redirect URI di Google Cloud tidak sama dengan URI yang dikirim backend. Pastikan ada:

```txt
http://localhost:2016/api/auth/google/callback
```

### `missing-google-env`

`GOOGLE_CLIENT_ID` atau `GOOGLE_CLIENT_SECRET` belum tersedia di environment.

### `google-token-failed`

Biasanya terjadi karena client secret salah, redirect URI berbeda, atau authorization code sudah kedaluwarsa.

### Cookie session tidak tersimpan

Pastikan membuka aplikasi dari origin yang sama dengan backend. Untuk production, gunakan HTTPS karena cookie diset `secure` saat `NODE_ENV=production`.

### User masuk sebagai role yang tidak sesuai

Periksa tabel `user_roles`, `roles`, dan session `active_role`. Untuk demo lokal, jalankan ulang:

```bash
bun run db:seed
```

## Catatan Keamanan

- Jangan commit `.env` atau `GOOGLE_CLIENT_SECRET`.
- Gunakan HTTPS di production.
- Batasi redirect URI hanya ke domain aplikasi.
- Rotasi client secret jika pernah bocor.
- Tetapkan status user baru sebagai `pending` jika sekolah perlu verifikasi admin.
