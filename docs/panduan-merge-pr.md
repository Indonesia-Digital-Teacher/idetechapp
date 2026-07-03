# Panduan Mengelola Pull Request (PR)

Dokumen ini berisi panduan standar untuk melakukan *Review*, *Merge*, hingga membatalkan (*Revert*) Pull Request (PR) di repositori ini. Sangat disarankan untuk selalu menguji PR secara lokal sebelum melakukan *merge* di GitHub.

---

## 1. Cara Review dan Uji Coba PR Secara Lokal

Sebelum menerima PR dari kolaborator, lakukan langkah-langkah berikut:

1. **Tarik (*Pull*) Branch PR ke Lokal**
   Buka terminal di dalam *workspace* VS Code dan jalankan perintah:
   ```bash
   git fetch origin
   git checkout <nama-branch-pr>
   ```
   *(Atau bisa juga langsung menggunakan ID PR jika menggunakan GitHub CLI: `gh pr checkout <id-pr>`)*

2. **Perbarui Dependencies & Environment**
   Jika ada perubahan *library* atau konfigurasi, pastikan untuk memperbaruinya:
   ```bash
   # Install ulang package
   bun install

   # Sesuaikan .env (jika ada perubahan koneksi database, port, dll)
   # Contoh: ubah DATABASE_URL jika migrasi dari SQLite ke MariaDB
   ```

3. **Jalankan Aplikasi dan Testing**
   Pastikan kode baru tidak merusak aplikasi.
   ```bash
   # Jalankan migrasi dan seeding database (jika diperlukan)
   bun run db:seed

   # Jalankan server
   bun run dev
   ```
   Buka browser dan tes fitur-fitur terkait. Jika menemukan *bug* atau *error*, berikan komentar pada PR di GitHub agar kolaborator dapat memperbaikinya.

---

## 2. Cara Menerima (Merge) Pull Request

Jika kode sudah berjalan lancar di komputermu, kamu bisa menerima PR tersebut:

1. Buka halaman Pull Request di GitHub.
2. Klik tombol **Approve** (jika menggunakan fitur Review).
3. Klik tombol **Merge pull request** berwarna hijau.
4. Klik **Confirm merge**.
5. (Opsional) Klik **Delete branch** di GitHub agar repositori tetap rapi.

**Langkah Penting Setelah Merge (Kembali ke Lokal):**
Setelah di-*merge* di GitHub, sinkronkan kembali komputer lokalmu dengan *branch* utama (`main`):

```bash
# Pindah ke branch utama
git checkout main

# Tarik perubahan terbaru
git pull origin main

# Hapus branch PR lokal yang sudah tidak terpakai
git branch -d <nama-branch-pr>
```

---

## 3. Cara Membatalkan (Revert) Pull Request

Jika setelah di-*merge* ternyata ada masalah fatal pada *production* atau kamu ingin membatalkan perubahannya, ikuti cara paling aman berikut ini (tanpa menggunakan *force push* terminal):

1. **Gunakan Fitur Revert di GitHub**
   - Buka kembali halaman Pull Request yang sudah di-*merge* (berstatus *Closed* / ungu).
   - Gulir ke bawah hingga kamu menemukan tombol **Revert** (biasanya berada di dekat informasi *"Pull request successfully merged and closed"*).
   - Klik tombol **Revert**. GitHub akan otomatis membuat sebuah PR baru yang isinya adalah "membatalkan" semua kode dari PR sebelumnya.
   - Klik **Create pull request**, lalu **Merge** PR pembatalan tersebut.

2. **Perbarui Kode di Lokal**
   Tarik perubahan pembatalan tadi ke komputermu:
   ```bash
   git checkout main
   git pull origin main
   ```

3. **Kembalikan Kondisi Database / Environment (Jika Perlu)**
   Jika PR yang dibatalkan menyangkut perubahan database (misal: kembali dari MariaDB ke SQLite), pastikan kamu:
   - Mengembalikan isi `DATABASE_URL` di `.env` seperti semula.
   - Menghentikan/menghapus *container* Docker database yang tidak lagi terpakai.
   - Menghapus folder `node_modules` dan menjalankan `bun install` ulang untuk mengembalikan *driver* sebelumnya.
