import type { RoleName } from "../db/schema";

export const roleCatalog = [
  { id: "role_admin", name: "admin", label: "Admin", description: "Mengelola sistem, user, role, kelas global, dan konfigurasi." },
  { id: "role_teacher", name: "teacher", label: "Guru", description: "Membuat kelas, materi, IdeQuest, dan melihat progres siswa." },
  { id: "role_student", name: "student", label: "Siswa", description: "Mengikuti IdeQuest, kuis, tugas, poin, badge, dan progres diri." },
  { id: "role_parent", name: "parent", label: "Orang Tua", description: "Memantau progres anak, laporan belajar, dan catatan guru." }
] as const;

export const permissionCatalog = [
  { id: "perm_user_manage", name: "user.manage", description: "Mengelola user dan verifikasi role." },
  { id: "perm_class_manage", name: "class.manage", description: "Mengelola kelas pembelajaran." },
  { id: "perm_material_create", name: "material.create", description: "Membuat materi di IdeStudio." },
  { id: "perm_quest_manage", name: "quest.manage", description: "Membuat dan mengatur IdeQuest." },
  { id: "perm_quest_play", name: "quest.play", description: "Mengikuti misi dan kuis IdeQuest." },
  { id: "perm_report_view", name: "report.view", description: "Melihat laporan perkembangan belajar." },
  { id: "perm_radar_view", name: "radar.view", description: "Melihat Radar Pintar." },
  { id: "perm_bank_manage", name: "bank.manage", description: "Mengelola Bank Ide." },
  { id: "perm_system_setting", name: "system.setting", description: "Mengatur konfigurasi aplikasi." },
  { id: "perm_journal_manage", name: "journal.manage", description: "Mengelola jurnal refleksi guru." },
  { id: "perm_chat_use", name: "chat.use", description: "Menggunakan obrolan AI guru." }
] as const;

export const rolePermissions: Record<RoleName, string[]> = {
  admin: [
    "user.manage",
    "class.manage",
    "material.create",
    "quest.manage",
    "report.view",
    "radar.view",
    "bank.manage",
    "system.setting",
    "journal.manage",
    "chat.use"
  ],
  teacher: ["class.manage", "material.create", "quest.manage", "report.view", "radar.view", "bank.manage", "journal.manage", "chat.use"],
  student: ["quest.play", "report.view", "radar.view"],
  parent: ["report.view", "radar.view"]
};

export const dashboardCatalog = {
  admin: {
    title: "Dashboard Admin",
    description: "Kelola pengguna, role, kelas global, dan konfigurasi aplikasi IdeTech.",
    metrics: [
      { label: "User pending", value: "8", hint: "Menunggu verifikasi role" },
      { label: "Kelas aktif", value: "24", hint: "Lintas jenjang sekolah" },
      { label: "Permission", value: "11", hint: "Siap dipetakan ke role" }
    ],
    actions: ["Verifikasi user baru", "Atur role dan permission", "Pantau konfigurasi sistem"],
    modules: ["Manajemen User", "Role & Permission", "Kelas Global", "Konfigurasi"]
  },
  teacher: {
    title: "Dashboard Guru",
    description: "Buat materi, susun IdeQuest, kelola kelas, dan pantau siswa melalui Radar Pintar.",
    metrics: [
      { label: "Kelas saya", value: "5", hint: "3 aktif hari ini" },
      { label: "Materi IdeStudio", value: "18", hint: "6 siap dibagikan" },
      { label: "Rata-rata progres", value: "76%", hint: "Naik 9% pekan ini" }
    ],
    actions: ["Buat kelas", "Susun IdeQuest", "Buka Radar Pintar"],
    modules: ["IdeStudio", "IdeQuest Builder", "Co-Lab", "Bank Ide", "Radar Pintar"]
  },
  student: {
    title: "Dashboard Siswa",
    description: "Ikuti peta petualangan IdeQuest, kerjakan kuis, kumpulkan tugas, dan raih badge.",
    metrics: [
      { label: "Poin", value: "1.240", hint: "Target pekan ini 1.500" },
      { label: "Badge", value: "12", hint: "2 badge hampir terbuka" },
      { label: "Misi selesai", value: "31", hint: "4 misi berjalan" }
    ],
    actions: ["Lanjutkan IdeQuest", "Kerjakan kuis", "Lihat progres belajar"],
    modules: ["Peta IdeQuest", "Kuis", "Tugas", "Poin & Badge", "Progres Saya"]
  },
  parent: {
    title: "Dashboard Orang Tua",
    description: "Pilih anak yang terhubung untuk melihat laporan belajar, progres, dan catatan guru.",
    metrics: [
      { label: "Anak terhubung", value: "2", hint: "Data dari parent_students" },
      { label: "Kehadiran", value: "96%", hint: "30 hari terakhir" },
      { label: "Catatan guru", value: "5", hint: "Butuh ditinjau" }
    ],
    actions: ["Pilih anak", "Lihat laporan", "Baca catatan guru"],
    modules: ["Laporan Anak", "Radar Pintar", "Catatan Guru", "Riwayat Tugas"]
  }
} satisfies Record<RoleName, unknown>;

export const studentQuestCatalog = [
  {
    id: "quest_energy",
    title: "Energi di Sekitar Kita",
    points: 320,
    progress: 65,
    dueSoon: true
  },
  {
    id: "quest_math",
    title: "Misi Pecahan",
    points: 220,
    progress: 40,
    dueSoon: false
  },
  {
    id: "quest_story",
    title: "Cerita Digital",
    points: 180,
    progress: 90,
    dueSoon: true
  }
] as const;
