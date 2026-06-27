## Konsep Autentikasi IdeTech

IdeTech menggunakan **Google OAuth** sebagai pintu masuk utama. Pengguna cukup login menggunakan akun Google, lalu sistem akan mengecek apakah email tersebut sudah terdaftar di database IdeTech.

Setelah login berhasil, sistem menentukan peran pengguna, misalnya:

* **Admin**
* **Guru**
* **Siswa**
* **Orang Tua**

Dengan model ini, satu akun Google bisa memiliki satu atau beberapa peran sesuai kebutuhan. Misalnya, seorang guru juga bisa menjadi admin, atau orang tua juga bisa memiliki akses sebagai wali siswa.

Konsep ini mendukung rancangan awal IdeTech yang menggunakan antarmuka berbasis peran: guru, siswa, dan orang tua memiliki pengalaman penggunaan yang berbeda sesuai kebutuhan masing-masing. 

---

## Alur Login dengan Google OAuth

### 1. Pengguna Membuka Aplikasi

Pengguna masuk ke halaman utama IdeTech.

Tombol utama yang ditampilkan:

**“Masuk dengan Google”**

Tidak ada proses membuat password manual. Ini membuat pengalaman login lebih sederhana, rapi, dan aman.

---

### 2. Login Menggunakan Akun Google

Pengguna diarahkan ke halaman autentikasi Google.

Setelah pengguna menyetujui akses dasar, aplikasi menerima data seperti:

* Google ID
* nama pengguna
* email
* foto profil
* status verifikasi email

Data ini kemudian dikirim ke backend Hono untuk diproses.

---

### 3. Backend Mengecek Data User

Backend akan mengecek email atau Google ID pengguna di database.

Kemungkinan alurnya:

**Jika user sudah ada:**

Sistem mengambil data profil dan role dari database.

**Jika user belum ada:**

Sistem membuat akun baru dengan status awal, misalnya:

* role default: `student`
* status: `pending`
* atau diarahkan ke halaman pemilihan peran

Untuk aplikasi sekolah, lebih aman jika user baru diberi status **pending** sampai admin memverifikasi perannya.

---

### 4. Sistem Membuat Session / Token

Setelah user valid, backend membuat session atau token autentikasi.

Token/session ini menyimpan informasi penting seperti:

* `userId`
* `email`
* `activeRole`
* daftar role
* status akun

Contoh payload sederhana:

```json
{
  "userId": "usr_001",
  "email": "feri@example.com",
  "roles": ["teacher", "admin"],
  "activeRole": "teacher"
}
```

---

### 5. Pengguna Masuk ke Dashboard Sesuai Role

Setelah login, sistem mengarahkan pengguna ke dashboard sesuai peran aktif.

| Role      | Dashboard                                   |
| --------- | ------------------------------------------- |
| Admin     | Dashboard pengelolaan sistem                |
| Guru      | Dashboard kelas, materi, kuis, dan analitik |
| Siswa     | Dashboard IdeQuest, tugas, poin, dan badge  |
| Orang Tua | Dashboard perkembangan anak                 |

Jika pengguna memiliki lebih dari satu role, sistem menampilkan fitur **switch role**.

Contoh:

> Pak Feri login sebagai Guru, tetapi karena juga Admin, ia bisa berpindah ke mode Admin melalui menu profil.

---

## Konsep Multi-Role di IdeTech

Multi-role berarti satu pengguna dapat memiliki lebih dari satu peran dalam sistem.

Contoh skenario:

### 1. Guru Biasa

```txt
Role: teacher
Akses:
- Membuat materi
- Membuat kelas
- Membuat kuis
- Melihat progres siswa
```

### 2. Siswa

```txt
Role: student
Akses:
- Mengikuti IdeQuest
- Mengerjakan kuis
- Mengumpulkan tugas
- Melihat poin dan badge
```

### 3. Orang Tua

```txt
Role: parent
Akses:
- Melihat progres anak
- Melihat laporan belajar
- Melihat catatan guru
```

### 4. Guru Sekaligus Admin

```txt
Role: teacher, admin
Akses:
- Semua fitur guru
- Mengelola user
- Mengelola kelas global
- Mengatur konfigurasi aplikasi
```

---

## Struktur Role dan Permission

Agar lebih fleksibel, IdeTech sebaiknya tidak hanya menyimpan role, tetapi juga permission.

### Role

Role adalah jabatan pengguna di aplikasi.

Contoh:

```txt
admin
teacher
student
parent
```

### Permission

Permission adalah izin aksi yang lebih spesifik.

Contoh:

```txt
user.manage
class.create
material.create
quest.play
report.view
system.setting
```

Dengan begitu, sistem bisa lebih lentur. Izin bisa diatur seperti panel listrik kecil: tiap saklar menentukan fitur mana yang menyala untuk role tertentu. ⚙️

---

## Contoh Hak Akses Tiap Role

| Fitur               | Admin | Guru |          Siswa | Orang Tua |
| ------------------- | ----: | ---: | -------------: | --------: |
| Kelola user         |     ✅ |    ❌ |              ❌ |         ❌ |
| Kelola kelas        |     ✅ |    ✅ |              ❌ |         ❌ |
| Buat materi         |     ✅ |    ✅ |              ❌ |         ❌ |
| Buat IdeQuest       |     ✅ |    ✅ |              ❌ |         ❌ |
| Ikut IdeQuest       |     ❌ |    ❌ |              ✅ |         ❌ |
| Kerjakan kuis       |     ❌ |    ❌ |              ✅ |         ❌ |
| Lihat progres siswa |     ✅ |    ✅ | ✅ diri sendiri |    ✅ anak |
| Lihat Radar Pintar  |     ✅ |    ✅ |       terbatas |  terbatas |
| Kelola Bank Ide     |     ✅ |    ✅ |              ❌ |         ❌ |

---

## Rancangan Database untuk Auth dan Multi-Role

Beberapa tabel tambahan yang perlu disiapkan:

```txt
users
oauth_accounts
roles
permissions
user_roles
role_permissions
sessions
parent_students
```

### 1. `users`

Menyimpan data utama pengguna.

```txt
id
name
email
avatar_url
email_verified
status
created_at
updated_at
```

### 2. `oauth_accounts`

Menyimpan data akun OAuth dari Google.

```txt
id
user_id
provider
provider_account_id
access_token
refresh_token
expires_at
created_at
updated_at
```

Contoh provider:

```txt
google
```

### 3. `roles`

Menyimpan daftar role.

```txt
id
name
label
description
```

Contoh isi:

```txt
admin
teacher
student
parent
```

### 4. `permissions`

Menyimpan daftar izin aksi.

```txt
id
name
description
```

Contoh:

```txt
material.create
quest.manage
report.view
user.manage
```

### 5. `user_roles`

Relasi antara user dan role.

```txt
id
user_id
role_id
created_at
```

Satu user bisa memiliki banyak role.

### 6. `role_permissions`

Relasi antara role dan permission.

```txt
id
role_id
permission_id
created_at
```

### 7. `sessions`

Menyimpan sesi login pengguna.

```txt
id
user_id
session_token
active_role
expires_at
created_at
```

### 8. `parent_students`

Menghubungkan orang tua dengan siswa.

```txt
id
parent_user_id
student_user_id
relationship
created_at
```

---

## Alur Penggunaan Setelah Login

### Untuk Admin

1. Login dengan Google.
2. Masuk ke dashboard admin.
3. Melihat daftar user baru.
4. Memverifikasi role pengguna.
5. Mengatur guru, siswa, orang tua, dan kelas.
6. Mengelola permission jika dibutuhkan.

### Untuk Guru

1. Login dengan Google.
2. Sistem membaca role `teacher`.
3. Guru masuk ke dashboard guru.
4. Guru membuat kelas.
5. Guru membuat materi di IdeStudio.
6. Guru membuat jalur belajar di IdeQuest.
7. Guru memantau siswa melalui Radar Pintar.

### Untuk Siswa

1. Login dengan Google.
2. Sistem membaca role `student`.
3. Siswa masuk ke dashboard siswa.
4. Siswa melihat peta IdeQuest.
5. Siswa mengerjakan misi, kuis, dan tugas.
6. Sistem memberi poin, badge, dan progres belajar.

### Untuk Orang Tua

1. Login dengan Google.
2. Sistem membaca role `parent`.
3. Orang tua masuk ke dashboard orang tua.
4. Orang tua memilih anak yang terhubung.
5. Sistem menampilkan laporan perkembangan belajar anak.

---

## Middleware Role-Based Access

Di backend Hono, perlu ada middleware untuk mengecek:

1. Apakah user sudah login.
2. Apakah session/token valid.
3. Apakah user memiliki role yang sesuai.
4. Apakah user memiliki permission untuk mengakses fitur tertentu.

Contoh konsep proteksi route:

```txt
/admin/users
hanya untuk role: admin

/teacher/classes
hanya untuk role: teacher, admin

/student/quests
hanya untuk role: student

/parent/reports
hanya untuk role: parent
```

---

## Revisi Ringkasan Singkat IdeTech

**IdeTech** adalah aplikasi pembelajaran interaktif berbasis web yang menggunakan **Google OAuth** untuk autentikasi dan sistem **multi-role** untuk mengatur akses pengguna. Setelah login dengan akun Google, pengguna akan diarahkan ke dashboard sesuai perannya: Admin, Guru, Siswa, atau Orang Tua.

Guru dapat membuat materi interaktif melalui **IdeStudio**, menyusun pembelajaran berbasis gamifikasi melalui **IdeQuest**, mengelola kolaborasi siswa lewat **Co-Lab**, berbagi materi melalui **Bank Ide**, dan memantau perkembangan belajar melalui **Radar Pintar**. Siswa dapat belajar melalui peta petualangan, mengerjakan kuis, mendapatkan poin, badge, dan melihat progres belajar. Orang tua dapat memantau perkembangan anak, sedangkan admin mengelola pengguna, role, kelas, dan konfigurasi sistem.

Dengan stack **Bun, Hono, Tailwind CSS, shadcn/ui, Drizzle ORM, SQLite, RustFS, dan Docker**, IdeTech menjadi platform pembelajaran modern yang ringan, fleksibel, dan siap dikembangkan untuk kebutuhan sekolah maupun komunitas pendidikan.
