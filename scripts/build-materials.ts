/**
 * scripts/build-materials.ts
 *
 * Parse file markdown di docs/material/*.md menjadi JSON terstruktur.
 * Hasilnya ditulis ke src/server/data/materials.generated.json dan dicommit.
 *
 * Jalankan: bun scripts/build-materials.ts
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type {
  MaterialDoc,
  MaterialSubTopic,
  MaterialUnit,
  MaterialsIndex
} from "../src/server/data/materials";

const MATERIALS_DIR = "docs/material";
const OUTPUT_FILE = "src/server/data/materials.generated.json";

/** Peta mapel key (dari nama file) ke nilai & label di CP_DATA */
const MAPEL_MAP: Record<string, { value: string; label: string }> = {
  matematika: { value: "mtk", label: "Matematika" },
  english: { value: "bing", label: "Bahasa Inggris" },
  ind: { value: "bindo", label: "Bahasa Indonesia" },
  paibp: { value: "pai", label: "Pendidikan Agama Islam dan Budi Pekerti" },
  pancasila: { value: "ppkn", label: "Pendidikan Pancasila" },
  pjok: { value: "pjok", label: "PJOK" },
  sejarah: { value: "sejarah", label: "Sejarah" },
  informatika: { value: "informatika", label: "Informatika" },
  pipas: { value: "ipas", label: "IPAS" },
  kka: { value: "kka", label: "Koding dan Kecerdasan Artifisial" },
  senbud: { value: "senbud", label: "Seni Budaya" },
  "ddpk-tkj": { value: "ddpk-tkj", label: "Dasar-dasar Program Keahlian TKJ" },
  mulok: { value: "mulok", label: "Muatan Lokal" }
};

/** Parse rentang pertemuan seperti "1 – 4", "1-4", "1 - 4", atau angka tunggal */
function parsePertemuanRange(text: string): { start: number; end: number } | null {
  const cleaned = text.trim();
  const match = cleaned.match(/(\d+)\s*[-–—]\s*(\d+)/);
  if (match) {
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    if (start <= end) return { start, end };
    return null;
  }
  const single = parseInt(cleaned, 10);
  if (!isNaN(single) && single > 0) return { start: single, end: single };
  return null;
}

/** Hapus markdown formatting (**bold**, *italic*) dari sel tabel */
function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .trim();
}

/** Cek apakah baris adalah separator tabel markdown (semua cell hanya strip/dash) */
function isSeparatorRow(cells: string[]): boolean {
  return cells.every(c => /^:?-+:?$/.test(c.trim()));
}

/** Parse tabel mulai dari baris setelah header "Semester Ganjil/Genap" */
function parseTable(lines: string[], startIdx: number): string[][] {
  const rows: string[][] = [];
  let i = startIdx;
  // Lompati ke baris pertama yang dimulai dengan |
  while (i < lines.length && !lines[i].trim().startsWith("|")) {
    i++;
  }
  // Kumpulkan semua baris tabel
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    const line = lines[i].trim();
    if (line.endsWith("|")) {
      const cells = line.split("|").slice(1, -1).map(stripMarkdown);
      rows.push(cells);
    }
    i++;
  }
  return rows;
}

/** Parse satu baris tabel menjadi MaterialUnit, atau null jika invalid */
function parseRow(row: string[]): MaterialUnit | null {
  if (row.length < 4) return null;
  const range = parsePertemuanRange(row[1]);
  if (!range) return null;
  return {
    unit: row[0],
    pertemuanStart: range.start,
    pertemuanEnd: range.end,
    topik: row[2],
    deskripsi: row[3]
  };
}

/** Parse satu file material — mengembalikan 1 atau 2 MaterialDoc (ganjil/genap) */
function parseMaterialFile(filename: string, content: string): MaterialDoc[] {
  const faseMatch = filename.match(/_fase-([ef])\.md$/i);
  if (!faseMatch) {
    console.warn(`⚠ Skip ${filename}: tidak ada fase di nama file`);
    return [];
  }
  const fase = faseMatch[1].toUpperCase() as "E" | "F";

  const mapelKey = filename.replace(/_fase-[ef]\.md$/i, "");
  const mapelInfo = MAPEL_MAP[mapelKey];
  if (!mapelInfo) {
    console.warn(`⚠ Skip ${filename}: mapel "${mapelKey}" tidak dikenal`);
    return [];
  }

  const lines = content.split("\n");
  const result: MaterialDoc[] = [];

  for (const semester of ["ganjil", "genap"] as const) {
    // Cari baris heading Markdown "### Semester Ganjil/Genap" — bukan teks di paragraf biasa.
    // Heading selalu didahului "###" (dengan/tanpa **bold**) dan berada sebelum tabel.
    const marker = lines.findIndex(l => /^#{2,4}\s+.*Semester\s+(Ganjil|Genap)\b/i.test(l));
    if (marker < 0) {
      console.warn(`⚠ ${filename}: tidak ada heading "Semester ${semester}"`);
      continue;
    }

    const rawRows = parseTable(lines, marker);
    if (rawRows.length < 3) {
      console.warn(`⚠ ${filename}: tabel ${semester} terlalu pendek (${rawRows.length} baris)`);
      continue;
    }

    // rawRows: [0]=header, [1]=separator, [2+]=data
    // Buang separator, lalu skip header dengan slice(1)
    const dataRows = rawRows.filter((_, idx) => idx !== 1);
    const parsedRows = dataRows.slice(1).map(parseRow).filter((u): u is MaterialSubTopic & { unit: string } => u !== null);

    // Kelompokkan baris berdasarkan unit: baris dengan unit kosong = sub-topik dari unit di atasnya
    const units: MaterialUnit[] = [];
    let current: MaterialUnit | null = null;

    for (const row of parsedRows) {
      if (row.unit) {
        // Baris baru dengan nama unit — simpan unit sebelumnya (jika ada)
        if (current) units.push(current);
        current = {
          unit: row.unit,
          pertemuanStart: row.pertemuanStart,
          pertemuanEnd: row.pertemuanEnd,
          pertemuanCount: row.pertemuanEnd - row.pertemuanStart + 1,
          subTopics: [
            {
              pertemuanStart: row.pertemuanStart,
              pertemuanEnd: row.pertemuanEnd,
              topik: row.topik,
              deskripsi: row.deskripsi
            }
          ]
        };
      } else if (current) {
        // Sub-topik dari unit saat ini
        const sub: MaterialSubTopic = {
          pertemuanStart: row.pertemuanStart,
          pertemuanEnd: row.pertemuanEnd,
          topik: row.topik,
          deskripsi: row.deskripsi
        };
        current.subTopics.push(sub);
        current.pertemuanEnd = Math.max(current.pertemuanEnd, row.pertemuanEnd);
        current.pertemuanStart = Math.min(current.pertemuanStart, row.pertemuanStart);
        current.pertemuanCount += row.pertemuanEnd - row.pertemuanStart + 1;
      }
    }
    // Simpan unit terakhir
    if (current) units.push(current);

    if (units.length === 0) {
      console.warn(`⚠ ${filename}: tidak ada unit valid di ${semester}`);
      continue;
    }

    const totalPertemuan = units.reduce((sum, u) => sum + u.pertemuanCount, 0);

    result.push({
      id: `${mapelInfo.value}-${fase.toLowerCase()}-${semester}`,
      mapel: mapelInfo.value,
      mapelLabel: mapelInfo.label,
      fase,
      semester,
      totalPertemuan,
      units
    });
  }

  return result;
}

// ─── Main ──────────────────────────────────────────────────────────────────

const files = readdirSync(MATERIALS_DIR)
  .filter(f => f.endsWith(".md"))
  .sort();

const allMaterials: MaterialsIndex = {};
let totalBab = 0;
let totalSubTopics = 0;
let totalErrors = 0;

for (const file of files) {
  const content = readFileSync(join(MATERIALS_DIR, file), "utf-8");
  const docs = parseMaterialFile(file, content);
  if (docs.length === 0) {
    totalErrors++;
    continue;
  }
  for (const doc of docs) {
    allMaterials[doc.id] = doc;
    totalBab += doc.units.length;
    for (const u of doc.units) totalSubTopics += u.subTopics.length;
    console.log(
      `✓ ${doc.id}: ${doc.units.length} bab, ${doc.units.reduce((s, u) => s + u.subTopics.length, 0)} sub-topik, ${doc.totalPertemuan} pertemuan`
    );
  }
}

writeFileSync(OUTPUT_FILE, JSON.stringify(allMaterials, null, 2) + "\n");
console.log(`\nDone. ${Object.keys(allMaterials).length} dokumen, ${totalBab} bab, ${totalSubTopics} sub-topik total.`);
if (totalErrors > 0) {
  console.log(`⚠ ${totalErrors} file gagal diproses.`);
  process.exit(1);
}
