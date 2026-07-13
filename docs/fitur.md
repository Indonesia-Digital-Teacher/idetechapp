# Daftar Fitur Aplikasi IdeTech

Dokumen ini merangkum seluruh fitur utama yang tersedia di dalam aplikasi **IdeTech**, sebuah platform manajemen pembelajaran modern yang menggabungkan kemudahan administrasi berbasis AI, pembelajaran berbasis *gamification*, dan pelaporan *real-time*.

Fitur-fitur ini dikelompokkan berdasarkan modul dan peran pengguna (Multi-Role System).

---

## 1. Modul Inti & Autentikasi

*   **Google OAuth (Single Sign-On)**: Akses masuk (login) yang cepat dan aman menggunakan akun Google tanpa perlu mendaftar dengan kata sandi baru.
*   **Sistem Multi-Role**: Satu akun dapat memiliki berbagai peran (contoh: Guru sekaligus Admin, atau Guru sekaligus Orang Tua) dengan fitur **Switch Role** yang mulus di dalam aplikasi.
*   **Permission-Based Routing**: Sistem keamanan yang memastikan pengguna hanya bisa mengakses halaman dan data yang diizinkan sesuai perannya.
*   **Blog Publik IdeTech**: Portal artikel dan informasi seputar pendidikan maupun pembaruan sistem. Saat ini hak tulis (pengelolaan) eksklusif dipegang oleh Admin, dengan rencana perluasan partisipasi untuk Guru dan Siswa di masa mendatang.

---

## 2. Modul Guru (Teacher Dashboard)

Pusat kendali bagi pendidik untuk menyusun, mengelola, dan memantau pembelajaran.

### Manajemen Kelas & Administrasi
*   **Kelola Kelas**: Fitur untuk membuat kelas, menentukan mata pelajaran, dan menghasilkan kode kelas (Class Code).
*   **Undang Siswa**: Siswa dapat bergabung secara mandiri menggunakan kode kelas yang dibagikan.

### Sistem Manajemen RPP & AI
*   **AI RPP Generator**: Asisten cerdas berbasis AI yang mampu menyusun *draft* Rencana Pelaksanaan Pembelajaran (RPP) dalam hitungan detik berdasarkan topik dan sasaran yang diinput oleh guru. Sekarang dapat diperkaya dengan **konten materi resmi (BSKAP/ATP)** sesuai mapel, fase, semester, dan nomor pertemuan yang dipilih.
*   **AI Program Semester Generator**: Asisten AI yang menyusun rancangan pembagian materi per pertemuan selama satu semester berdasarkan Capaian Pembelajaran (CP), hari mengajar, dan rentang tanggal. Mendukung dua mode:
    *   *AI CYBRA*: generate dengan AI, dengan prompt yang diperkaya outline materi resmi.
    *   *Template Materi Lokal*: langsung mengacu pada distribusi materi resmi dari `/docs/material` tanpa mengonsumsi kuota AI, dengan **scaling proporsional** ke jumlah mengajar aktual guru.
*   **Bank Ide (Bank RPP)**: Ekosistem perpustakaan RPP komunitas. Guru dapat mempublikasikan RPP miliknya, serta mencari, melihat, dan menyalin (menduplikasi) RPP buatan guru lain ke dalam koleksi pribadi mereka.
*   **Actionable RPP**: Mengubah RPP langsung menjadi penugasan/aksi di kelas tertentu.

### Pembuatan Konten Pembelajaran
*   **IdeStudio**: Kanvas interaktif (editor cerdas) bagi guru untuk menyusun materi pelajaran (mendukung *Markdown*, gambar, video *embed*, dan formula matematika/KaTeX).
*   **IdeQuest**: Pembuat alur pembelajaran berbasis *gamification*. Guru dapat membuat "Peta Petualangan" yang berisi titik-titik pos materi dan kuis/misi untuk diselesaikan oleh siswa.

### Evaluasi & Komunikasi
*   **Radar Pintar**: Dashboard analitik kelas untuk memantau siapa saja siswa yang telah menyelesaikan materi, siapa yang kesulitan (berdasarkan metrik kesehatan/HP siswa), dan ringkasan statistik kelas.
*   **Jurnal Guru (Teacher Journaling)**: Fitur catatan evaluasi/observasi siswa harian yang dilengkapi dengan sistem *Auto-Draft*, *Pre-submission Review Modal* (pratinjau sebelum dikirim), dan fitur **sinkronisasi *real-time*** ke *Dashboard Orang Tua*.

---

## 3. Modul Siswa (Student Dashboard)

Antarmuka pembelajaran berbasis permainan (*game-like interface*) yang dirancang secara spesifik dan optimal untuk perangkat seluler (*mobile-optimized*).

### Gamification & Heads-Up Display (HUD)
*   **Live HUD**: Menampilkan status indikator permainan di bagian atas layar yang diperbarui secara langsung (*real-time sync* ke server).
*   **Health Points (HP / Nyawa)**: Sistem penalti atau evaluasi. Menjawab kuis dengan salah akan mengurangi nyawa siswa.
*   **Coins (Koin)**: Sistem poin *reward* yang didapatkan setiap kali siswa menyelesaikan membaca materi atau berhasil melewati rintangan kuis.
*   **Lencana (Badges)**: Sistem pencapaian (*achievement*) yang dipajang di profil siswa sebagai penghargaan atas penyelesaian misi-misi sulit.

### Interaksi Belajar
*   **Misi IdeQuest**: Peta petualangan visual tempat siswa menjelajahi pos-pos materi dan menaklukkan tantangan tugas/kuis secara berurutan.
*   **Leaderboard (Papan Peringkat)**: *(Tergantung konfigurasi sekolah)* Menampilkan peringkat koin tertinggi di kelas untuk memacu kompetisi positif.

---

## 4. Modul Orang Tua (Parent Dashboard)

Portal transparansi khusus bagi orang tua atau wali untuk terlibat secara aktif dalam pemantauan perkembangan anak tanpa harus menunggu pembagian rapor.

*   **Pemantauan Multi-Anak**: Memungkinkan orang tua dengan lebih dari satu anak (yang menggunakan sistem IdeTech) untuk berpindah profil anak dengan mudah dari satu akun.
*   **Live Laporan Jurnal**: Catatan observasi, apresiasi, atau peringatan dari guru akan muncul detik itu juga secara *real-time* tanpa perlu me-*refresh* halaman.
*   **Statistik Belajar (Quest Tracker)**: Menampilkan data analitik mengenai performa anak di dalam *IdeQuest*, seperti tingkat penyelesaian materi (*completion rate*), jumlah *Coins* dan *Badges* yang diraih, serta status *HP* anak yang dapat mengindikasikan tingkat kesulitan belajar yang sedang mereka hadapi.

---

## 5. Modul Admin (System Administration)

Dashboard khusus pengelola sistem/IT sekolah.

*   **Manajemen Pengguna (User Management)**: Mengelola akun seluruh pengguna yang masuk melalui OAuth, melihat profil, dan menghapus akun jika perlu.
*   **Manajemen Peran (Role Assignment)**: Menyetujui, mengubah, atau mencabut peran (Guru/Admin/Siswa) dari pengguna tertentu.
*   **Pengaturan Sistem**: Mengonfigurasi parameter sistem global (konfigurasi integrasi AI, kalender akademik, dll).
*   **Manajemen Blog**: Menulis, mengedit, dan memublikasikan artikel informatif pada halaman Blog IdeTech.

---
*Dokumen ini bersifat dinamis dan akan terus diperbarui seiring dengan perilisan pembaruan (update) fitur-fitur IdeTech di masa mendatang.*
