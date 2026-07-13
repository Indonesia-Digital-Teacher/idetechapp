/**
 * Tipe data untuk materi kurikulum dari /docs/material.
 *
 * File .md di /docs/material/{mapel}_fase-{e|f}.md berisi tabel distribusi
 * materi per semester (Ganjil/Genap). Script `scripts/build-materials.ts`
 * mem-parse file-file tersebut menjadi JSON yang di-load oleh server.
 *
 * Sub-topik: baris-baris tabel yang kolom Unit kosong dianggap sub-topik
 * dari baris parent di atasnya. Tiap MaterialUnit = 1 bab dengan >=1 sub-topik.
 */

export type Fase = "E" | "F";
export type Semester = "ganjil" | "genap";

export interface MaterialSubTopic {
  /** Nomor pertemuan mulai (1-indexed) */
  pertemuanStart: number;
  /** Nomor pertemuan selesai (inklusif) */
  pertemuanEnd: number;
  /** Topik bahasan / aktivitas pembelajaran */
  topik: string;
  /** Tujuan / elemen / deskripsi pembelajaran */
  deskripsi: string;
}

export interface MaterialUnit {
  /** Nama bab/unit, mis. "Bab 1: Eksponen dan Bentuk Akar" */
  unit: string;
  /** Nomor pertemuan mulai (min dari seluruh sub-topik) */
  pertemuanStart: number;
  /** Nomor pertemuan selesai (max dari seluruh sub-topik) */
  pertemuanEnd: number;
  /** Total pertemuan yang dicakup bab ini */
  pertemuanCount: number;
  /** Daftar sub-topik di dalam bab ini (>=1) */
  subTopics: MaterialSubTopic[];
}

export interface MaterialDoc {
  /** ID unik, mis. "mtk-e-ganjil" */
  id: string;
  /** Mapel value yang cocok dengan CP_DATA, mis. "mtk" */
  mapel: string;
  /** Label mapel yang ramah dibaca manusia */
  mapelLabel: string;
  /** Fase E atau F */
  fase: Fase;
  /** Semester ganjil atau genap */
  semester: Semester;
  /** Total pertemuan asli dari tabel (untuk proporsional scaling) */
  totalPertemuan: number;
  /** Daftar bab/unit */
  units: MaterialUnit[];
}

/** Index utama: key = MaterialDoc.id */
export type MaterialsIndex = Record<string, MaterialDoc>;
