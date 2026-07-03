import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, pool } from "./db/client";
import { initializeDatabase } from "./db/init";
import {
  classes,
  classStudents,
  ideQuests,
  masterGrades,
  masterSubjects,
  materials,
  parentStudents,
  permissions,
  rolePermissions as rolePermissionsTable,
  roles,
  studentMaterialProgress,
  studentQuestProgress,
  systemSettings,
  userRoles,
  users
} from "./db/schema";
import { permissionCatalog, roleCatalog, rolePermissions } from "./lib/catalog";
import { defaultChatQuotaConfig, defaultGoogleRoleRule } from "./lib/settings";

await initializeDatabase();

const now = new Date();

for (const role of roleCatalog) {
  await db.insert(roles).ignore().values(role);
}

for (const permission of permissionCatalog) {
  await db.insert(permissions).ignore().values(permission);
}

const allRoles = await db.select().from(roles);
const allPermissions = await db.select().from(permissions);

// Reset permission mapping agar selalu sinkron dengan catalog terbaru
await db.delete(rolePermissionsTable);

for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
  const role = allRoles.find((item) => item.name === roleName);
  if (!role) continue;

  for (const permissionName of permissionNames) {
    const permission = allPermissions.find((item) => item.name === permissionName);
    if (!permission) continue;

    await db
      .insert(rolePermissionsTable)
      .ignore()
      .values({
        id: `rp_${nanoid(12)}`,
        roleId: role.id,
        permissionId: permission.id,
        createdAt: now
      });
  }
}

const demoUsers = [
  {
    id: "usr_demo_admin",
    name: "Feri Admin",
    email: "admin@idetech.local",
    avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Feri%20Admin",
    roles: ["admin", "teacher"]
  },
  {
    id: "usr_demo_teacher",
    name: "Bu Rani Guru",
    email: "guru@idetech.local",
    avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Bu%20Rani",
    roles: ["teacher"]
  },
  {
    id: "usr_demo_student",
    name: "Dika Siswa",
    email: "siswa@idetech.local",
    avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Dika",
    roles: ["student"]
  },
  {
    id: "usr_demo_parent",
    name: "Pak Bima Wali",
    email: "ortu@idetech.local",
    avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Pak%20Bima",
    roles: ["parent"]
  }
];

for (const user of demoUsers) {
  await db
    .insert(users)
    .values({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      emailVerified: true,
      fullName: user.name,
      schoolName: "SMK IdeTech Nusantara",
      contactChannel: "wa",
      contactValue: "081234567890",
      profileCompleted: true,
      status: "active",
      createdAt: now,
      updatedAt: now
    })
    .onDuplicateKeyUpdate({
      set: {
        name: user.name,
        avatarUrl: user.avatarUrl,
        fullName: user.name,
        schoolName: "SMK IdeTech Nusantara",
        contactChannel: "wa",
        contactValue: "081234567890",
        profileCompleted: true,
        status: "active",
        updatedAt: now
      }
    });

  const [savedUser] = await db.select().from(users).where(eq(users.email, user.email));
  for (const roleName of user.roles) {
    const role = allRoles.find((item) => item.name === roleName);
    if (!role || !savedUser) continue;

    await db
      .insert(userRoles)
      .ignore()
      .values({
        id: `ur_${nanoid(12)}`,
        userId: savedUser.id,
        roleId: role.id,
        createdAt: now
      });
  }
}

const demoClasses = [
  {
    id: "cls_ipa7",
    teacherUserId: "usr_demo_teacher",
    name: "IPA 7A",
    subject: "Sains",
    grade: "7",
    students: 32,
    progress: 78,
    classCode: "IDT-IPA7A",
    nextSession: "IDT-IPA7A",
    status: "active" as const
  },
  {
    id: "cls_math8",
    teacherUserId: "usr_demo_teacher",
    name: "Matematika 8B",
    subject: "Numerasi",
    grade: "8",
    students: 28,
    progress: 71,
    classCode: "IDT-MTK8B",
    nextSession: "IDT-MTK8B",
    status: "active" as const
  },
  {
    id: "cls_project",
    teacherUserId: "usr_demo_teacher",
    name: "Proyek STEAM",
    subject: "Project Based",
    grade: "10",
    students: 24,
    progress: 84,
    classCode: "IDT-STEAM",
    nextSession: "IDT-STEAM",
    status: "active" as const
  },
  {
    id: "cls_admin_demo",
    teacherUserId: "usr_demo_admin",
    name: "Koordinasi Guru",
    subject: "Administrasi",
    grade: "12",
    students: 12,
    progress: 92,
    classCode: "IDT-ADMIN",
    nextSession: "IDT-ADMIN",
    status: "active" as const
  }
];

for (const item of demoClasses) {
  await db
    .insert(classes)
    .values({
      ...item,
      createdAt: now,
      updatedAt: now
    })
    .onDuplicateKeyUpdate({
      set: {
        name: item.name,
        subject: item.subject,
        grade: item.grade,
        classCode: item.classCode,
        students: item.students,
        progress: item.progress,
        nextSession: item.nextSession,
        status: item.status,
        updatedAt: now
      }
    });
}

const demoClassStudents = [
  { id: "cs_dika_ipa7", classId: "cls_ipa7", studentUserId: "usr_demo_student" },
  { id: "cs_dika_math8", classId: "cls_math8", studentUserId: "usr_demo_student" },
  { id: "cs_dika_project", classId: "cls_project", studentUserId: "usr_demo_student" }
];

for (const item of demoClassStudents) {
  await db
    .insert(classStudents)
    .ignore()
    .values({
      ...item,
      createdAt: now
    });
}

const demoMaterials = [
  {
    id: "mat_energy",
    teacherUserId: "usr_demo_teacher",
    classId: "cls_ipa7",
    title: "Energi di Sekitar Kita",
    type: "lesson" as const,
    description: "Materi interaktif tentang bentuk energi, perubahan energi, dan contoh di rumah.",
    status: "published" as const
  },
  {
    id: "mat_fraction",
    teacherUserId: "usr_demo_teacher",
    classId: "cls_math8",
    title: "Pecahan dalam Masalah Harian",
    type: "quiz" as const,
    description: "Latihan pecahan berbasis situasi sehari-hari dengan umpan balik cepat.",
    status: "published" as const
  }
];

for (const item of demoMaterials) {
  await db
    .insert(materials)
    .values({
      ...item,
      createdAt: now,
      updatedAt: now
    })
    .onDuplicateKeyUpdate({
      set: {
        title: item.title,
        type: item.type,
        description: item.description,
        status: item.status,
        updatedAt: now
      }
    });
}

const demoIdeQuests = [
  {
    id: "iq_energy_mission",
    teacherUserId: "usr_demo_teacher",
    classId: "cls_ipa7",
    materialId: "mat_energy",
    title: "Misi Energi Rumah",
    mission: "Temukan 3 contoh perubahan energi di rumah dan jawab kuis refleksi.",
    points: 120,
    dueDate: "2d 9h",
    status: "published" as const
  },
  {
    id: "iq_fraction_mission",
    teacherUserId: "usr_demo_teacher",
    classId: "cls_math8",
    materialId: "mat_fraction",
    title: "Quest Pecahan Cepat",
    mission: "Selesaikan latihan pecahan dan kumpulkan badge Numerasi.",
    points: 100,
    dueDate: "1d 9h",
    status: "published" as const
  }
];

for (const item of demoIdeQuests) {
  await db
    .insert(ideQuests)
    .values({
      ...item,
      createdAt: now,
      updatedAt: now
    })
    .onDuplicateKeyUpdate({
      set: {
        title: item.title,
        mission: item.mission,
        points: item.points,
        dueDate: item.dueDate,
        status: item.status,
        updatedAt: now
      }
    });
}

await db
  .insert(studentMaterialProgress)
  .values({
    id: "smp_demo_energy",
    studentUserId: "usr_demo_student",
    materialId: "mat_energy",
    progress: 100,
    completedAt: now,
    updatedAt: now
  })
  .onDuplicateKeyUpdate({
    set: {
      progress: 100,
      completedAt: now,
      updatedAt: now
    }
  });

await db
  .insert(studentQuestProgress)
  .values({
    id: "sqp_demo_energy",
    studentUserId: "usr_demo_student",
    questId: "iq_energy_mission",
    progress: 100,
    earnedPoints: 120,
    completedAt: now,
    updatedAt: now
  })
  .onDuplicateKeyUpdate({
    set: {
      progress: 100,
      earnedPoints: 120,
      completedAt: now,
      updatedAt: now
    }
  });

await db
  .insert(parentStudents)
  .values({
    id: "ps_demo_1",
    parentUserId: "usr_demo_parent",
    studentUserId: "usr_demo_student",
    relationship: "Ayah",
    createdAt: now
  })
  .onDuplicateKeyUpdate({
    set: {
      relationship: "Ayah"
    }
  });

const demoMasterSubjects = [
  { id: "ms_mat", name: "Matematika", description: "Ilmu tentang bilangan, bentuk, dan pola." },
  { id: "ms_sci", name: "Sains / IPA", description: "Ilmu pengetahuan alam meliputi fisika, kimia, dan biologi." },
  { id: "ms_bio", name: "Biologi", description: "Studi tentang makhluk hidup dan ekosistem." },
  { id: "ms_phy", name: "Fisika", description: "Studi tentang materi, energi, dan gaya." },
  { id: "ms_che", name: "Kimia", description: "Studi tentang zat, reaksi, dan susunan materi." },
  { id: "ms_eng", name: "Bahasa Inggris", description: "Pembelajaran keterampilan berbahasa Inggris." },
  { id: "ms_ind", name: "Bahasa Indonesia", description: "Pembelajaran keterampilan berbahasa Indonesia." },
  { id: "ms_hist", name: "Sejarah", description: "Studi tentang peristiwa masa lalu dan peradaban." },
  { id: "ms_geo", name: "Geografi", description: "Studi tentang bumi, lingkungan, dan populasi manusia." },
  { id: "ms_soc", name: "Sosiologi", description: "Studi tentang masyarakat dan hubungan sosial." },
  { id: "ms_econ", name: "Ekonomi", description: "Studi tentang produksi, distribusi, dan konsumsi barang." },
  { id: "ms_civ", name: "PPKn", description: "Pendidikan Pancasila dan Kewarganegaraan." },
  { id: "ms_relig", name: "Pendidikan Agama", description: "Pendidikan keagamaan dan akhlak." },
  { id: "ms_art", name: "Seni Budaya", description: "Pembelajaran seni, musik, dan budaya." },
  { id: "ms_pe", name: "PJOK", description: "Pendidikan Jasmani, Olahraga, dan Kesehatan." },
  { id: "ms_tech", name: "Teknologi Informasi", description: "Pembelajaran literasi digital dan pemrograman dasar." },
  { id: "ms_voc", name: "Kejuruan", description: "Mata pelajaran keahlian sesuai kompetensi kejuruan." }
];

for (const item of demoMasterSubjects) {
  await db
    .insert(masterSubjects)
    .values({
      id: item.id,
      name: item.name,
      description: item.description,
      createdAt: now
    })
    .onDuplicateKeyUpdate({
      set: {
        name: item.name,
        description: item.description
      }
    });
}

const demoMasterGrades = [
  { id: "mg_7", name: "Kelas 7", description: "Tingkat pertama SMP/MTs." },
  { id: "mg_8", name: "Kelas 8", description: "Tingkat kedua SMP/MTs." },
  { id: "mg_9", name: "Kelas 9", description: "Tingkat ketiga SMP/MTs." },
  { id: "mg_10", name: "Kelas 10", description: "Tingkat pertama SMA/SMK/MA." },
  { id: "mg_11", name: "Kelas 11", description: "Tingkat kedua SMA/SMK/MA." },
  { id: "mg_12", name: "Kelas 12", description: "Tingkat ketiga SMA/SMK/MA." }
];

for (const item of demoMasterGrades) {
  await db
    .insert(masterGrades)
    .values({
      id: item.id,
      name: item.name,
      description: item.description,
      createdAt: now
    })
    .onDuplicateKeyUpdate({
      set: {
        name: item.name,
        description: item.description
      }
    });
}

await db
  .insert(systemSettings)
  .values({
    key: "google.role_rule",
    value: JSON.stringify(defaultGoogleRoleRule),
    description: "Aturan pemetaan role Google OAuth berdasarkan email dan domain.",
    updatedAt: now
  })
  .onDuplicateKeyUpdate({
    set: {
      value: JSON.stringify(defaultGoogleRoleRule),
      description: "Aturan pemetaan role Google OAuth berdasarkan email dan domain.",
      updatedAt: now
    }
  });

await db
  .insert(systemSettings)
  .values({
    key: "chat.quota_config",
    value: JSON.stringify(defaultChatQuotaConfig),
    description: "Konfigurasi limit dan jendela waktu kuota obrolan AI.",
    updatedAt: now
  })
  .onDuplicateKeyUpdate({
    set: {
      value: JSON.stringify(defaultChatQuotaConfig),
      description: "Konfigurasi limit dan jendela waktu kuota obrolan AI.",
      updatedAt: now
    }
  });

console.log("Database IdeTech siap dipakai.");

// Tutup pool hanya ketika script dijalankan standalone (bun run db:seed),
// bukan ketika di-import oleh src/server/index.ts saat server berjalan.
if (import.meta.main) {
  await pool.end();
}
