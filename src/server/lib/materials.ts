/**
 * Helper untuk menggunakan data materi dari /docs/material.
 *
 * Load JSON terstruktur (dihasilkan oleh scripts/build-materials.ts) dan
 * menyediakan:
 * - Lookup by mapel + fase + semester
 * - Proporsional scaling ke jumlah mengajar aktual
 * - Formatting tabel untuk disisipkan ke prompt AI
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Fase,
  MaterialDoc,
  MaterialSubTopic,
  MaterialUnit,
  MaterialsIndex,
  Semester
} from "../data/materials";

let cache: MaterialsIndex | null = null;

/** Load index dari JSON hasil build. Cache di memory setelah panggilan pertama. */
export function loadMaterials(): MaterialsIndex {
  if (cache) return cache;
  const path = join(process.cwd(), "src/server/data/materials.generated.json");
  const raw = readFileSync(path, "utf-8");
  cache = JSON.parse(raw) as MaterialsIndex;
  return cache;
}

/** Lookup materi berdasarkan mapel + fase + semester. Return null jika tidak ada. */
export function findMaterial(mapel: string, fase: Fase, semester: Semester): MaterialDoc | null {
  const id = `${mapel}-${fase.toLowerCase()}-${semester}`;
  return loadMaterials()[id] ?? null;
}

/** Cek apakah ada materi untuk kombinasi mapel/fase/semester tertentu. */
export function hasMaterial(mapel: string, fase: Fase, semester: Semester): boolean {
  return findMaterial(mapel, fase, semester) !== null;
}

export interface ScaledMeeting {
  /** Nomor pertemuan (1-indexed) */
  meetingNumber: number;
  /** Judul singkat, mis. "Pertemuan 1: Definisi Eksponen..." */
  title: string;
  /** Deskripsi/aktivitas pembelajaran */
  description: string;
  /** Nama unit/bab, mis. "Bab 1: Eksponen dan Bentuk Akar" */
  unit: string;
  /** Elemen (jika dapat diekstrak dari deskripsi sub-topik) */
  elemen: string;
  /** Sub-topik spesifik dalam unit */
  subTopic: string;
  /** Prioritas default "medium" */
  priority: "low" | "medium" | "high";
  /** Kategori: "teaching" | "rpp" | "grading" */
  category: "teaching" | "rpp" | "grading";
  /** ISO date string (YYYY-MM-DD) jika user menyediakan tanggal */
  dueDate?: string;
  /** classId opsional */
  classId?: string | null;
}

/**
 * Distribusikan unit secara proporsional ke jumlah mengajar aktual.
 *
 * Algoritma:
 * 1. Untuk tiap unit, alokasi = round((unit.pertemuanCount / totalAsli) * actualCount)
 * 2. Distribusikan selisih (actualCount - sum(alokasi)) ke unit-unit awal (1 pertemuan ekstra)
 * 3. Untuk tiap sub-topik dalam unit, bagi alokasi unit secara proporsional lagi
 *
 * @param material - Hasil findMaterial()
 * @param actualCount - Jumlah mengajar aktual (mis. 16 untuk 1 semester 16-pertemuan)
 * @param options - classId opsional
 * @returns Array of ScaledMeeting sepanjang actualCount
 */
export function scaleToActualMeetings(
  material: MaterialDoc,
  actualCount: number,
  options?: { classId?: string | null; dueDates?: string[] }
): ScaledMeeting[] {
  const totalOriginal = material.totalPertemuan;
  if (totalOriginal === 0 || actualCount === 0) return [];

  // Step 1: alokasi per unit (proporsional)
  const allocations = material.units.map(u => ({
    unit: u,
    allocated: Math.round((u.pertemuanCount / totalOriginal) * actualCount)
  }));

  // Step 2: distribusi remainder ke unit awal
  const sumAllocated = allocations.reduce((s, a) => s + a.allocated, 0);
  let remainder = actualCount - sumAllocated;
  let idx = 0;
  while (remainder !== 0 && allocations.length > 0) {
    const target = allocations[idx % allocations.length];
    if (remainder > 0) {
      target.allocated += 1;
      remainder -= 1;
    } else if (target.allocated > 0) {
      target.allocated -= 1;
      remainder += 1;
    }
    idx += 1;
    // Safety: jangan loop terus kalau remainder tak bisa diselesaikan
    if (idx > allocations.length * 4) break;
  }

  // Step 3: generate meetings
  const meetings: ScaledMeeting[] = [];
  let meetingIdx = 0;

  for (const { unit, allocated } of allocations) {
    if (allocated === 0) continue;

    // Di dalam unit, distribusikan lagi ke sub-topik secara proporsional
    const subAllocs = unit.subTopics.map(st => ({
      sub: st,
      allocated: Math.max(
        1, // minimal 1 pertemuan per sub-topik yang muncul
        Math.round((st.pertemuanEnd - st.pertemuanStart + 1) / unit.pertemuanCount * allocated)
      )
    }));
    let subSum = subAllocs.reduce((s, a) => s + a.allocated, 0);
    let subRemainder = allocated - subSum;
    let sIdx = 0;
    while (subRemainder !== 0 && subAllocs.length > 0) {
      const t = subAllocs[sIdx % subAllocs.length];
      if (subRemainder > 0) {
        t.allocated += 1;
        subRemainder -= 1;
      } else if (t.allocated > 1) {
        t.allocated -= 1;
        subRemainder += 1;
      }
      sIdx += 1;
      if (sIdx > subAllocs.length * 4) break;
    }

    // Kalau unit cuma 1 sub-topik, pakai deskripsi sub-topik langsung
    // Kalau multi, gabungkan deskripsi semua sub-topik dengan proporsi alokasi
    for (const { sub, allocated: subCount } of subAllocs) {
      if (subCount === 0) continue;
      // Tentukan category berdasarkan keywords di unit name
      const unitLower = unit.unit.toLowerCase();
      const category: ScaledMeeting["category"] = unitLower.includes("review") || unitLower.includes("asesmen") || unitLower.includes("sumatif") || unitLower.includes("sas") || unitLower.includes("sts") || unitLower.includes("pts") || unitLower.includes("pas")
        ? (unitLower.includes("pts") || unitLower.includes("sumatif") || unitLower.includes("sas") || unitLower.includes("pas") ? "grading" : "rpp")
        : "teaching";

      for (let k = 0; k < subCount; k++) {
        meetingIdx += 1;
        meetings.push({
          meetingNumber: meetingIdx,
          title: `Pertemuan ${meetingIdx}: ${sub.topik}`,
          description: sub.deskripsi,
          unit: unit.unit,
          elemen: extractElemen(sub.deskripsi),
          subTopic: sub.topik,
          priority: "medium",
          category,
          classId: options?.classId ?? null,
          dueDate: options?.dueDates?.[meetingIdx - 1]
        });
      }
    }
  }

  // Trim or extend ke actualCount (safety)
  return meetings.slice(0, actualCount);
}

/** Extract elemen (Bilangan, Aljabar, Geometri, dll.) dari teks deskripsi */
const ELEMEN_KEYWORDS = [
  "Bilangan",
  "Aljabar dan Fungsi",
  "Aljabar & Fungsi",
  "Geometri",
  "Analisis Data dan Peluang",
  "Analisis Data & Peluang",
  "Pengukuran",
  "Statistika",
  "Peluang",
  "Trigonometri",
  "Kalkulus"
];
function extractElemen(text: string): string {
  for (const k of ELEMEN_KEYWORDS) {
    if (text.includes(k)) return k;
  }
  return "";
}

/** Format ringkasan materi sebagai tabel markdown untuk disisipkan ke prompt AI */
export function formatMaterialAsMarkdownTable(material: MaterialDoc): string {
  const lines: string[] = [];
  lines.push(`| Unit / Bab | Pertemuan | Topik | Elemen / Tujuan |`);
  lines.push(`| --- | --- | --- | --- |`);
  for (const unit of material.units) {
    for (const sub of unit.subTopics) {
      lines.push(`| ${unit.unit} | ${sub.pertemuanStart}–${sub.pertemuanEnd} | ${sub.topik} | ${sub.deskripsi} |`);
    }
  }
  return lines.join("\n");
}
