# Rencana: Integrasi `/docs/material` ke Generator Semester & RPP

## Tujuan
Memanfaatkan 16 file materi di `/docs/material/` (CP + ATP per mapel/fase/semester) sebagai:
1. **Fallback deterministik** saat AI CYBRA gagal/lambat
2. **Konteks prompt AI** agar output lebih akurat sesuai kurikulum
3. **Template opsional** di UI (guru bisa pilih tanpa pakai AI)
4. **Distribusi proporsional** ke jumlah mengajar aktual guru

## Pemetaan Filename → CP_DATA

| File material | Mapel | Fase | CP_DATA value | Tambah ke CP_DATA? |
|---|---|---|---|---|
| `matematika_fase-e.md` | Matematika | E | `mtk` | – (ada) |
| `matematika_fase-f.md` | Matematika | F | `mtk` | – |
| `english_fase-{e,f}.md` | Bahasa Inggris | E, F | `bing` | – |
| `ind_fase-{e,f}.md` | Bahasa Indonesia | E, F | `bindo` | – |
| `paibp_fase-e.md` | PAI & Budi Pekerti | E | `pai` | – (sub-options tetap) |
| `pancasila_fase-e.md` | Pancasila | E | `ppkn` | – |
| `pjok_fase-e.md` | PJOK | E | `pjok` | – |
| `sejarah_fase-e.md` | Sejarah | E | `sejarah` | – |
| `informatika_fase-e.md` | Informatika | E | `informatika` | – |
| `pipas_fase-e.md` | IPAS | E | `ipas` | – |
| `kka_fase-e.md` | KKA (umum, tanpa jurusan) | E | `kka` | – (sub-options KKA tetap generate dari `getKkaCp`) |
| `senbud_fase-e.md` | Seni Budaya (subset Seni) | E | `seni` | Tambah sub-option `Seni Budaya` |
| `ddpk-tkj_fase-e.md` | DDPK TKJ | E | – | **Tambah entry baru** di Fase E |
| `mulok_fase-e.md` | Muatan Lokal (sekolah) | E | – | **Tambah entry baru** di Fase E |

> **Fase F tanpa materi** (PJOK, Sejarah, Informatika, IPAS, Seni, KKA, Pancasila, PAI): fallback ke template generik (perilaku `getSmartFallbackMeetings` saat ini).

## Arsitektur

### Layer 1: Build-time Parser
- **File baru:** `scripts/build-materials.ts`
- **Input:** `docs/material/*.md` (16 file)
- **Output:** `src/server/data/materials.generated.json` (di-`gitignore`)
- **Tipe:** `src/server/data/materials.ts`
- **Format output** (per file → 2 entri: ganjil + genap):
  ```ts
  type MaterialUnit = {
    unit: string;
    pertemuanStart: number;
    pertemuanEnd: number;
    topik: string;
    elemen: string;
  };
  type MaterialDoc = {
    id: string;          // "matematika-e-ganjil"
    mapel: string;       // "mtk"
    mapelLabel: string;
    fase: "E" | "F";
    semester: "ganjil" | "genap";
    totalPertemuan: number;
    units: MaterialUnit[];
    strategiDelta?: string;
  };
  type MaterialsIndex = Record<string, MaterialDoc>; // key = id
  ```
- **Script npm:** `"materials:build": "bun scripts/build-materials.ts"` — dijalankan manual atau pre-build.

### Layer 2: Server Helper
- **File:** `src/server/lib/materials.ts`
- **Fungsi:**
  - `loadMaterials()` → baca JSON, cache di memory
  - `findMaterial(mapel, fase, semester)` → lookup
  - `scaleToActualMeetings(material, actualCount)` → distribusikan unit secara proporsional
  - `formatMaterialAsMarkdown(material)` → render tabel untuk prompt AI
- **Algoritma scaling (proporsional):**
  ```
  // contoh: 6 unit, total 44 pertemuan asli, guru hanya mengajar 30
  // setiap unit = round((originalEnd - originalStart + 1) / 44 * 30)
  // distribusi remainder: tambahkan 1 ke unit pertama hingga habis
  ```

### Layer 3: Update Endpoint Semester Plan
- **File:** `src/server/routes/api.ts`
- **Perubahan:**
  1. **Body** tambah `useMaterial?: boolean` (default false)
  2. **Sebelum AI call**: jika `useMaterial=true`, langsung return `scaleToActualMeetings(...)` (skip AI, hemat kuota)
  3. **Di AI prompt**: jika materi tersedia (regardless of `useMaterial`), sisipkan tabel outline sebagai referensi:
     ```
     Outline materi resmi dari [sumber]:
     | Unit | Pertemuan | Topik | Elemen |
     | Bab 1: Eksponen | 1–4 | Definisi Eksponen... | Bilangan |
     ...
     Gunakan outline ini sebagai panduan utama saat mendistribusikan topik.
     ```
  4. **Fallback** (saat AI timeout/error): ganti `getSmartFallbackMeetings` dengan `scaleToActualMeetings` jika materi ada, else template generik lama.

### Layer 4: Update Endpoint RPP
- **File:** `src/server/routes/api.ts` (`/teacher/rpp/generate-ai`)
- **Perubahan:**
  1. **Body** tambah `mapel`, `fase`, `semester`, `pertemuanKe`
  2. **Lookup materi** untuk dapat unit + topik untuk pertemuan tsb
  3. **Inject ke prompt AI:**
     ```
     Anda akan merancang RPP untuk:
     - Mapel: Matematika, Fase E, Semester Ganjil
     - Pertemuan ke-3 (dalam Bab 1: Eksponen dan Bentuk Akar)
     - Topik ATP: "Definisi Eksponen, Sifat-sifat perkalian..."
     - Elemen: Bilangan
     - Strategi: DELTA (Discover, Explore, Launch, Transform, Assess)
     ...
     ```
  4. **Tanpa materi**: pakai perilaku lama (AI generik)

### Layer 5: UI
- **File:** `src/client/main.tsx` (component `generateSemesterPlan`)
- **Perubahan:**
  1. Tambah radio button sebelum tombol "Generate":
     - ◯ Generate dengan AI (CYBRA) — default
     - ◯ Gunakan template materi lokal (tanpa AI, lebih cepat)
  2. Tambah field kecil: "Semester" (Ganjil/Genap) — auto-detect dari `startDate` (Juli–Des = Ganjil, Jan–Jun = Genap), editable manual
  3. Pass `useMaterial` + `semester` ke API

- Untuk RPP: tambah field "Topik dari materi" (auto-lookup dari pertemuan) atau biarkan guru input manual

### Layer 6: Update CP_DATA
- **File:** `src/client/data/cpData.ts`
- **Tambah 2 entry di Fase E:**
  - `Muatan Lokal` (value: `mulok`)
  - `Dasar-dasar Program Keahlian TKJ` (value: `ddpk-tkj`)
- **Tambah 1 sub-option di Fase E Seni:**
  - `Seni Budaya` (value: `senbud`)
- Tidak mengubah entry existing.

## File yang Berubah / Baru

| File | Aksi | Deskripsi |
|---|---|---|
| `scripts/build-materials.ts` | **Baru** | Parser MD → JSON |
| `src/server/data/materials.ts` | **Baru** | Tipe + loader + helper scaling |
| `src/server/data/materials.generated.json` | **Baru** | Output parser (gitignore) |
| `src/server/lib/materials.ts` | **Baru** | Helper: lookup, scale, format |
| `src/server/routes/api.ts` | Edit | 2 endpoint: semester-plan + rpp/generate-ai |
| `src/client/main.tsx` | Edit | UI radio + semester field |
| `src/client/data/cpData.ts` | Edit | +3 entry (mulok, ddpk-tkj, senbud) |
| `package.json` | Edit | Tambah script `materials:build` |
| `.gitignore` | Edit | Ignore `materials.generated.json` (atau commit?) |
| `docs/material/*.md` | **Tidak diubah** | Sumber data, read-only |

## Urutan Eksekusi

1. **Build parser** — test parse 16 file → JSON valid
2. **Loader + helper** — lookup & scaling function + unit test
3. **Server: semester-plan fallback + prompt injection** — test dengan & tanpa materi
4. **Server: RPP integration** — test inject konteks materi
5. **UI: semester generator** — radio button + semester field
6. **UI: RPP generator** — auto-lookup topik (jika applicable)
7. **CP_DATA update** — tambah 3 entry
8. **Build + smoke test end-to-end**

## Estimasi Effort

- Parser + helper: ~30 menit
- Server integration: ~30 menit  
- UI updates: ~20 menit
- CP_DATA: ~5 menit
- Testing + debugging: ~30 menit

**Total: ~2 jam**

## Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Parser MD fragile (variasinya banyak) | Tulis test untuk tiap format; fallback ke template generik jika parse gagal |
| Proporsional scaling menghasilkan rentang aneh (mis. 1.7) | Selalu `Math.round` + distribusi remainder ke unit pertama |
| Inject materi = prompt jadi sangat panjang | Hanya inject untuk mapel yang dipilih, ringkas tabel (skip catatan DELTA yang panjang) |
| `ddpk-tkj` dan `mulok` di CP_DATA membuat form panjang | Tambahkan di akhir list, dengan label jelas |
| Tanpa test untuk AI prompt baru | Build smoke test lokal; deploy bertahap |
| Generate JSON dari MD tiap kali edit MD harus re-run | Tambah script pre-build; atau commit JSON ke repo (pilih komit agar CI tidak bergantung MD parser) |

## Pertanyaan Terbuka (untuk Anda)

1. **Generated JSON**: commit ke repo (deterministik, no surprise di CI) atau gitignore (selalu fresh, butuh parser di CI)? **Rekomendasi: commit**, agar deploy tidak butuh MD parser.

2. **Apakah RPP perlu lookup otomatis dari materi** atau cukup inject outline saja ke prompt? Saya rekomendasikan inject saja — lebih fleksibel.

3. **Semester auto-detect**: dari `startDate` bulan 7–12 = Ganjil, 1–6 = Genap. Tapi guru bisa override. OK?
