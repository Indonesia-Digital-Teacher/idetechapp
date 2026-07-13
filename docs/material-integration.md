# Integrasi Materi Resmi ke Generator AI

Dokumen ini menjelaskan fitur integrasi materi kurikulum resmi (BSKAP/ATP) dari folder `docs/material/` ke generator **Program Semester** dan **AI RPP Generator**.

## Tujuan

Menjadikan output generator AI lebih sesuai dengan kurikulum resmi, sekaligus menyediakan mode **Template Materi Lokal** yang tidak mengonsumsi kuota AI CYBRA.

## Struktur Data

Materi disimpan sebagai file Markdown di `docs/material/{mapel}_fase-{e|f}.md`. Tiap file memiliki:

- Bagian **Semester Ganjil** dengan tabel distribusi materi.
- Bagian **Semester Genap** dengan tabel distribusi materi.
- Catatan strategi DELTA / Pembelajaran Mendalam (opsional).

Tabel memiliki 4 kolom:

| Kolom | Keterangan |
|-------|------------|
| Unit / Bab | Nama bab atau unit (bisa memiliki sub-baris kosong untuk sub-topik) |
| Pertemuan | Rentang pertemuan, contoh: `1 – 4` |
| Topik Bahasan | Aktivitas atau materi ajar |
| Elemen / Tujuan | Elemen kurikulum atau tujuan pembelajaran |

## Build Data

Untuk mengubah file Markdown menjadi JSON yang digunakan server, jalankan:

```bash
bun run materials:build
```

Perintah ini menulis ke `src/server/data/materials.generated.json`. File JSON ini **harus di-commit** agar deploy tidak bergantung pada parser.

Setelah ada perubahan di `docs/material/`, ulangi perintah di atas dan commit hasilnya.

## Cakupan Mapel

Saat ini tersedia 16 file materi untuk Fase E dan sebagian Fase F:

### Fase E

| File | Mapel | CP_DATA value |
|------|-------|---------------|
| `matematika_fase-e.md` | Matematika | `mtk` |
| `ind_fase-e.md` | Bahasa Indonesia | `bindo` |
| `english_fase-e.md` | Bahasa Inggris | `bing` |
| `paibp_fase-e.md` | PAI & Budi Pekerti | `pai` |
| `pancasila_fase-e.md` | Pendidikan Pancasila | `ppkn` |
| `pjok_fase-e.md` | PJOK | `pjok` |
| `sejarah_fase-e.md` | Sejarah | `sejarah` |
| `informatika_fase-e.md` | Informatika | `informatika` |
| `pipas_fase-e.md` | IPAS | `ipas` |
| `kka_fase-e.md` | KKA | `kka` |
| `senbud_fase-e.md` | Seni Budaya | `senbud` (sub-pilihan Seni) |
| `ddpk-tkj_fase-e.md` | DDPK TKJ | `ddpk-tkj` |
| `mulok_fase-e.md` | Muatan Lokal | `mulok` |

### Fase F

| File | Mapel | CP_DATA value |
|------|-------|---------------|
| `matematika_fase-f.md` | Matematika | `mtk` |
| `ind_fase-f.md` | Bahasa Indonesia | `bindo` |
| `english_fase-f.md` | Bahasa Inggris | `bing` |

Mapel Fase F lainnya tetap menggunakan template generik bawaan sistem.

## Alur Kerja

### 1. Generator Program Semester

Endpoint: `POST /api/teacher/todos/semester-plan`

Body request sekarang menerima field tambahan:

```json
{
  "mapel": "mtk",
  "fase": "E",
  "semester": "ganjil",
  "useMaterial": true
}
```

- `semester` bersifat opsional; jika `"auto"` atau tidak dikirim, sistem mendeteksi dari tanggal mulai (Jul–Des = Ganjil, Jan–Jun = Genap).
- `useMaterial: true` → server langsung mengembalikan hasil dari `scaleToActualMeetings()` tanpa memanggil AI.
- `useMaterial: false` atau tidak diisi → server memanggil AI CYBRA. Jika materi tersedia, outline materi resmi disisipkan ke prompt AI.
- Jika AI gagal (timeout/error), fallback otomatis ke material jika tersedia.

### 2. AI RPP Generator

Endpoint: `POST /api/teacher/generate-ai`

Body request menerima field tambahan:

```json
{
  "mapel": "mtk",
  "fase": "E",
  "semester": "ganjil",
  "pertemuanKe": 3
}
```

Jika semua field diisi dan materi ditemukan, sistem akan:

1. Mencari unit/bab yang mencakup pertemuan ke-N.
2. Menyisipkan konten materi resmi (unit, sub-topik, tujuan/elemen) ke dalam prompt AI.
3. AI kemudian menyusun RPP yang lebih sesuai dengan kurikulum.

## Algoritma Scaling Proporsional

Jika guru mengajar lebih sedikit/more pertemuan daripada total pertemuan asli di tabel materi, sistem melakukan scaling:

1. Hitung alokasi tiap bab: `round((jumlahPertemuanBab / totalAsli) * jumlahMengajarAktual)`.
2. Distribusikan sisa/alokasi kurang ke bab-bab awal.
3. Di dalam tiap bab, alokasikan lagi ke sub-topik secara proporsional.

Hasilnya tetap mempertahankan urutan bab dan proporsi relatif materi resmi.

## File Terkait

| File | Fungsi |
|------|--------|
| `scripts/build-materials.ts` | Parser Markdown → JSON |
| `src/server/data/materials.ts` | Tipe data TypeScript |
| `src/server/data/materials.generated.json` | Output JSON (di-commit) |
| `src/server/lib/materials.ts` | Helper lookup, scaling, format prompt |
| `src/server/routes/api.ts` | Integrasi endpoint semester-plan dan generate-ai |
| `src/client/main.tsx` | UI Program Semester (radio AI/Template, dropdown semester) |
| `src/client/components/TeacherRPPGenerator.tsx` | UI RPP (panel Aksen Materi Resmi) |
| `src/client/data/cpData.ts` | Pilihan mapel, termasuk `mulok`, `ddpk-tkj`, `senbud` |
