Oke kalau tujuannya kontribusi, ini langkah-langkah dari posisi kamu sekarang:

1. Cek status git lokal kamu dulu

cd /path/ke/idetechapp
git status
git log --oneline -5
git remote -v

Ini buat lihat: branch apa, ada commit lokal apa aja, dan remote saat ini ngacunya ke mana.

2. Fork repo asli

• Buka https://github.com/Indonesia-Digital-Teacher/idetechapp
• Klik Fork (kanan atas)
• Nanti muncul fork di akun GitHub kamu: https://github.com/USERNAME_KAMU/idetechapp

3. Set remote fork ke lokal kamu

git remote rename origin upstream
git remote add origin https://github.com/USERNAME_KAMU/idetechapp.git

• upstream = repo asli (Indonesia-Digital-Teacher/idetechapp)
• origin = fork kamu

Cek: git remote -v — harus ada dua.

4. Push editan kamu ke fork

git push origin main

Atau kalau kamu di branch lain: git push origin NAMA_BRANCH_KAMU

5. Bikin Pull Request

• Buka fork kamu di GitHub
• Klik Contribute > Open Pull Request
• Target: Indonesia-Digital-Teacher/idetechapp:main ← USERNAME_KAMU/idetechapp:main
• Tulis deskripsi: apa yang kamu ubah, kenapa, screenshot kalo ada
• Kirim PR

Hal penting sebelum PR:

• Cek dulu apakah repo asli punya CONTRIBUTING.md atau aturan kontribusi
• Kalau ada perubahan yang signifikan (terutama di auth/security), tulis jelas di deskripsi PR
• Jangan kirim semua file sekaligus — lebih baik PR per topik (misal: "fix security issues", "add migration to MariaDB", dll)

Ini situasi klasik fork jadi stale (ketinggalan) — karena repo asli udah maju sementara fork kamu masih di versi lama. Tenang, gampang kok.

Yang harus kamu lakukan: Sync fork kamu

1. Pastiin udah set remote upstream (dari langkah sebelumnya)

git remote -v

Harus ada:

origin    https://github.com/USERNAME_KAMU/idetechapp.git
upstream  https://github.com/Indonesia-Digital-Teacher/idetechapp.git

Kalau belum, jalankan:

git remote add upstream https://github.com/Indonesia-Digital-Teacher/idetechapp.git

2. Tarik perubahan terbaru dari repo asli

git fetch upstream

3. Gabungin perubahan upstream ke branch kamu

Ada dua cara:

Opsi A: Merge (paling aman, riwayat jelas)

git checkout main
git merge upstream/main

Kalo ada konflik, selesaikan dulu → git add . → git commit

Opsi B: Rebase (riwayat lebih rapi, tapi butuh hati-hati)

git checkout main
git rebase upstream/main

4. Push hasil sync ke fork GitHub kamu

git push origin main

5. Lanjut bikin PR

Nanti PR kamu ke repo asli otomatis ngeliat update terbaru dari upstream, jadi minim konflik di sisi reviewer.

Tips tambahan:

• Kalau kamu udah bikin PR dan repo asli berubah setelahnya — kamu tinggal sync ulang (langkah 2-4), terus push ke branch yang sama. PR otomatis ke-update.
• Kalau konflik muncul pas merge/rebase — itu normal. Kamu tinggal buka file yang konflik, cari bagian <<<<<<<, =======, >>>>>>>, edit sesuai kebutuhan, lalu git add + commit.

Saran: Lakuin sync fork setiap mau mulai ngerjain ulang, biar kerjaan kamu selalu di atas basis terbaru. Kurang lebih kayak "pull dulu sebelum push" — kebiasaan standar kolaborasi GitHub 👍
