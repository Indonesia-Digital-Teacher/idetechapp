# Alur Kerja (Workflow) Sistem Aplikasi IdeTech

Dokumen ini menjelaskan alur kerja (workflow) utama dari aplikasi IdeTech. Alur ini mencakup proses dari sudut pandang pengguna (User Flow) berdasarkan masing-masing peran (Multi-Role) serta alur teknis (Data Flow) antara Client, Server, dan integrasi AI.

---

## 1. Alur Autentikasi dan Otorisasi (Authentication Flow)

IdeTech menggunakan **Google OAuth** untuk mempermudah akses dan menjaga keamanan.

1. **Akses Aplikasi**: Pengguna membuka aplikasi klien (React/Vite).
2. **Login SSO**: Pengguna menekan tombol "Masuk dengan Google".
3. **Validasi OAuth**: Klien menerima token/profil dari Google dan mengirimkannya ke Backend (Hono API).
4. **Pengecekan Database**: 
   - Backend memverifikasi profil melalui Drizzle ORM ke Database (MySQL).
   - Jika pengguna belum terdaftar, akun baru dibuat dengan peran *default* (biasanya `pending` atau `student`).
   - Jika pengguna sudah terdaftar, sistem mengambil sesi beserta daftar *role* (peran) pengguna.
5. **Redirection (Pengalihan)**:
   - Sistem mengarahkan pengguna ke *dashboard* yang sesuai dengan peran aktif mereka (Admin, Guru, Siswa, atau Orang Tua).
   - Jika pengguna memiliki multi-role (misalnya Guru dan Admin), mereka dapat menggunakan fitur **Switch Role**.

---

## 2. Alur Kerja Guru (Teacher Workflow)

Guru merupakan pusat pengelolaan konten pembelajaran (RPP, Materi, Kuis) dan pemantauan siswa.

### A. Manajemen RPP dan Bank Ide
1. **Pembuatan RPP**: Guru dapat menggunakan fitur **AI RPP Generator** dari *Teacher Dashboard* untuk menyusun Rencana Pelaksanaan Pembelajaran secara otomatis.
2. **Review & Draft**: Hasil dari AI masuk ke mode *Draft*. Guru memvalidasi dan melakukan perubahan/penyesuaian manual.
3. **Publikasi ke Bank Ide**: Setelah RPP dianggap final, guru mempublikasikannya ke dalam ekosistem **Bank Ide**.
4. **Berbagi**: Guru lain dapat mencari, melihat, dan menyalin (*copy*) RPP tersebut untuk kelas mereka sendiri dari Bank Ide.

### B. Pengelolaan Jurnal Guru (Teacher Journaling)
1. **Mencatat Jurnal**: Guru mencatat observasi harian atau evaluasi siswa ke dalam antarmuka jurnal.
2. **Sistem Draft Lokal**: Jurnal tersimpan secara lokal dan menampilkan modal *pre-submission review* untuk memastikan akurasi sebelum dikirim.
3. **Sinkronisasi Otomatis**: Setelah di-submit, catatan tersebut secara *real-time* langsung disinkronkan ke *Parent Dashboard* tanpa memerlukan penyegaran (refresh) halaman.

### C. Pembuatan Pembelajaran (IdeStudio & IdeQuest)
1. Guru membuat materi pelajaran secara interaktif melalui **IdeStudio**.
2. Guru merangkai materi tersebut ke dalam sebuah alur petualangan (*gamification*) melalui fitur **IdeQuest**.
3. Guru dapat memantau aktivitas siswa yang mengerjakan misi tersebut melalui **Radar Pintar**.

---

## 3. Alur Kerja Siswa (Student Workflow)

Siswa menikmati pengalaman belajar berbasis *gamification* melalui antarmuka khusus.

1. **Mobile-Optimized Dashboard**: Siswa masuk ke *Student Dashboard* (biasanya diakses via perangkat seluler).
2. **Heads-Up Display (HUD)**: Dashboard menampilkan indikator *Nyawa (HP)* dan *Coins* yang terhubung dan diperbarui secara *real-time* langsung dari server backend.
3. **Mengikuti Misi (IdeQuest)**:
   - Siswa menavigasi peta petualangan IdeQuest.
   - Siswa mengerjakan kuis, menyelesaikan materi, atau mengumpulkan tugas.
4. **Pembaruan Status**: Setiap aksi yang diselesaikan akan mengirim *request* ke server API yang kemudian:
   - Menambahkan progres belajar.
   - Memperbarui poin (Coins) dan lencana (*badge*).
   - Menyimpan *state* terbaru ke database agar HUD siswa otomatis berubah.

---

## 4. Alur Kerja Orang Tua (Parent Workflow)

Orang tua berfungsi sebagai pemantau kegiatan dan perkembangan siswa.

1. **Memilih Anak**: Saat masuk ke dashboard Orang Tua, mereka memilih profil anak yang terhubung.
2. **Menerima Laporan**: 
   - Orang tua menerima *update* catatan harian dari **Jurnal Guru** secara instan dan tanpa *refresh*.
   - Sistem menampilkan analitik perkembangan progres belajar anak yang disesuaikan dari hasil IdeQuest.

---

## 5. Alur Data Teknis (Technical Architecture Flow)

IdeTech mengadopsi arsitektur terpisah (*decoupled*) dalam satu Monorepo:

- **Frontend (Client)**: 
  - Dibangun menggunakan **React**, **Vite**, dan **Tailwind CSS**.
  - Mengelola *state* pengguna dan melakukan render antarmuka (*UI*) secara responsif berdasarkan izin spesifik (*permission-based routing*).
- **Backend (Server)**:
  - Dibangun di atas **Bun** runtime menggunakan framework **Hono**.
  - Menyediakan perlindungan *endpoint* API (memvalidasi *role* dan sesi) untuk menghindari akses data secara ilegal.
- **Database (Persistence)**:
  - Menggunakan **Drizzle ORM** yang terkoneksi dengan **MySQL** (*strict foreign key*).
  - Skema diatur sedemikian rupa untuk memisahkan tabel `users`, `roles`, `permissions`, `lesson_plans` (RPP), dsb.
- **AI Agent Integration**:
  - Menggunakan arsitektur agen (contohnya `Dianyssa` atau `Builder.io Agent-Native framework`) untuk menjalankan fungsi spesifik seperti *RPP Generator* dan Asisten Cerdas.
  - Alur: Klien meminta *Generate RPP* ➔ API Server mengirim konteks ke AI Agent ➔ Agent memproses dan mengirim balasan secara *streaming* / asinkron ➔ Data disimpan ke *draft* MySQL.

---
**Dokumen ini merupakan standar panduan (flow) tingkat tinggi dari sistem IdeTech dan dapat diperbarui seiring dengan perkembangan fitur.**
