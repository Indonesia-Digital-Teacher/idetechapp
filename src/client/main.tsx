import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  Boxes,
  ArrowRight,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  GraduationCap,
  Heart,
  House,
  LayoutDashboard,
  LogOut,
  Lock,
  Map,
  MoreHorizontal,
  Pencil,
  Puzzle,
  Rocket,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserCog,
  UserRound,
  Users,
  X,
  Smile,
  Frown,
  Meh,
  Plus,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ChevronLeft,
  Info,
  Heading,
  Bold,
  Italic,
  Underline,
  Link,
  AlignCenter,
  List,
  ListOrdered,
  AlignJustify
} from "lucide-react";
import { Button, Card, SecondaryButton, Select, StatusPill } from "./components/ui";
import "./styles.css";

type RoleName = "admin" | "teacher" | "student" | "parent";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  fullName: string | null;
  schoolName: string | null;
  contactChannel: "wa" | "telegram" | null;
  contactValue: string | null;
  profileCompleted: boolean;
  status: "active" | "pending" | "suspended";
  roles: RoleName[];
  activeRole: RoleName;
  permissions: string[];
};

type Dashboard = {
  title: string;
  description: string;
  metrics: { label: string; value: string; hint: string }[];
  actions: string[];
  modules: string[];
};

type DashboardResponse = {
  user: AuthUser;
  dashboard: Dashboard;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  roles: { name: string; label: string }[];
};

type AdminAccess = {
  roles: { id: string; name: RoleName; label: string; description: string; permissions: string[] }[];
  permissions: { id: string; name: string; description: string }[];
  system: {
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    suspendedUsers: number;
    totalRoles: number;
    totalPermissions: number;
    database: string;
    authProvider: string;
    apiBase: string;
  };
};

type AdminClass = TeacherClass & {
  teacherName: string;
  teacherEmail: string;
};

type AdminView = "home" | "users" | "classes" | "access" | "system";

type SchoolOption = {
  name: string;
  city?: string;
  province?: string;
};

type TeacherClass = {
  id: string;
  classCode: string | null;
  teacherUserId: string;
  name: string;
  subject: string;
  grade: string;
  students: number;
  progress: number;
  nextSession: string;
  status: "active" | "draft" | "archived";
  createdAt?: string;
  updatedAt?: string;
};

type TeacherClassSummary = {
  totalClasses: number;
  totalStudents: number;
  averageProgress: number;
};

type TeacherMaterial = {
  id: string;
  teacherUserId: string;
  classId: string;
  title: string;
  type: "lesson" | "video" | "document" | "quiz";
  description: string;
  content?: string;
  options?: unknown;
  status: "draft" | "published";
};

type TeacherIdeQuest = {
  id: string;
  teacherUserId: string;
  classId: string;
  materialId: string | null;
  title: string;
  mission: string;
  points: number;
  dueDate: string;
  status: "draft" | "published" | "archived";
};

type StudentMaterial = TeacherMaterial & {
  progress: number;
  completedAt: string | null;
};

type StudentQuest = {
  id: string;
  title: string;
  points: number;
  progress: number;
  earnedPoints?: number;
  completedAt?: string | null;
  dueDate: string;
  mission: string;
  classId: string;
  materialId: string | null;
};

type StudentAchievement = {
  id: string;
  title: string;
  description: string;
  value: number;
  unlocked: boolean;
};

type StudentClass = TeacherClass;

const roleLabels: Record<RoleName, string> = {
  admin: "Admin",
  teacher: "Guru",
  student: "Siswa",
  parent: "Orang Tua"
};

const roleIcons: Record<RoleName, typeof ShieldCheck> = {
  admin: ShieldCheck,
  teacher: GraduationCap,
  student: Sparkles,
  parent: Users
};

const demoUsers = [
  { label: "Feri Admin", email: "admin@idetech.local", role: "Admin + Guru" },
  { label: "Bu Rani", email: "guru@idetech.local", role: "Guru" },
  { label: "Dika", email: "siswa@idetech.local", role: "Siswa" },
  { label: "Pak Bima", email: "ortu@idetech.local", role: "Orang Tua" }
];

const landingServices = [
  {
    title: "IdeStudio",
    subtitle: "Rancang materi interaktif dan visual yang rapi untuk kelas.",
    cta: "Buka Studio",
    accent: "cyan"
  },
  {
    title: "IdeQuest",
    subtitle: "Susun jalur belajar, kuis, dan misi gamifikasi yang terukur.",
    cta: "Buat Quest",
    accent: "purple"
  },
  {
    title: "Radar Pintar",
    subtitle: "Pantau progres siswa, risiko belajar, dan intervensi tepat waktu.",
    cta: "Lihat Radar",
    accent: "blue"
  },
  {
    title: "Bank Ide",
    subtitle: "Bagikan materi, template, dan referensi antar guru secara aman.",
    cta: "Kelola Bank",
    accent: "rose"
  }
] as const;

const landingTestimonials = [
  {
    name: "Fajar Pratama",
    role: "Guru IPA",
    quote: "Alur kerja guru jadi lebih rapi. Materi, misi, dan laporan berada di satu tempat."
  },
  {
    name: "Alya Salsabila",
    role: "Wali Kelas",
    quote: "Struktur multi-role membuat administrasi sekolah tetap fleksibel dan mudah dipantau."
  }
] as const;

const mobileNavItems = [
  { id: "studio", label: "Studio", icon: BookOpen },
  { id: "rank", label: "Piala", icon: Trophy },
  { id: "map", label: "Map", icon: Map },
  { id: "quest", label: "Quest", icon: Puzzle },
  { id: "profile", label: "Profil", icon: UserRound }
] as const;

type MobileNavId = (typeof mobileNavItems)[number]["id"];

const teacherMobileNavItems = [
  { id: "map", label: "Beranda", icon: House },
  { id: "quest", label: "Kelas", icon: GraduationCap },
  { id: "studio", label: "Studio", icon: BookOpen },
  { id: "rank", label: "Radar", icon: Gauge },
  { id: "profile", label: "Profil", icon: UserRound }
] as const;

type GameMenuContent = {
  title: string;
  subtitle: string;
  badge: string;
  progress: string;
  button: string;
  rewards: string[];
};

type RoleFeature = {
  name: string;
  permission?: string;
  access: "full" | "limited" | "self" | "child";
  description: string;
  cta: string;
};

type StudentIndicator = {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  connected: boolean;
};

type StudentIndicatorResponse = {
  left: StudentIndicator[];
  right: StudentIndicator[];
  nav: Record<MobileNavId, boolean>;
  meta: {
    chapter: string;
    chapterProgress: string;
    levelButton: string;
    progressPercent: number;
    summary: string;
  };
};

const roleFeatures: Record<RoleName, RoleFeature[]> = {
  admin: [
    { name: "Kelola user", permission: "user.manage", access: "full", description: "Verifikasi user baru dan atur role pengguna.", cta: "Verifikasi user" },
    { name: "Kelola kelas", permission: "class.manage", access: "full", description: "Mengatur kelas global dan struktur sekolah.", cta: "Kelola kelas" },
    { name: "Buat materi", permission: "material.create", access: "full", description: "Membuat materi melalui IdeStudio.", cta: "Buat materi" },
    { name: "Buat IdeQuest", permission: "quest.manage", access: "full", description: "Menyusun jalur belajar gamifikasi.", cta: "Buat IdeQuest" },
    { name: "Lihat progres siswa", permission: "report.view", access: "full", description: "Melihat laporan semua siswa dan kelas.", cta: "Lihat progres" },
    { name: "Lihat Radar Pintar", permission: "radar.view", access: "full", description: "Pantau insight belajar lintas kelas.", cta: "Buka Radar" },
    { name: "Kelola Bank Ide", permission: "bank.manage", access: "full", description: "Kurasi dan bagikan materi di Bank Ide.", cta: "Kelola Bank" }
  ],
  teacher: [
    { name: "Peringatan Dini", permission: "radar.view", access: "full", description: "Pantau siswa yang butuh intervensi segera hari ini.", cta: "Lihat peringatan" },
    { name: "Grading Queue", permission: "quest.manage", access: "full", description: "Periksa dan nilai tugas siswa yang menunggu antrean.", cta: "Mulai koreksi" },
    { name: "Jurnal Mengajar", permission: "class.manage", access: "full", description: "Tulis catatan personal atau kejadian penting di kelas hari ini.", cta: "Tulis jurnal" },
    { name: "Kelola kelas", permission: "class.manage", access: "full", description: "Membuat kelas dan mengatur daftar siswa.", cta: "Kelola kelas" },
    { name: "Buat materi", permission: "material.create", access: "full", description: "Membuat materi interaktif di IdeStudio.", cta: "Buat materi" },
    { name: "Buat IdeQuest", permission: "quest.manage", access: "full", description: "Membuat misi, kuis, dan tugas belajar.", cta: "Buat IdeQuest" },
    { name: "Lihat progres siswa", permission: "report.view", access: "full", description: "Melihat progres siswa di kelasnya.", cta: "Lihat progres" },
    { name: "Lihat Radar Pintar", permission: "radar.view", access: "full", description: "Menganalisis performa dan risiko belajar.", cta: "Buka Radar" },
    { name: "Kelola Bank Ide", permission: "bank.manage", access: "full", description: "Menyimpan dan membagikan materi ajar.", cta: "Kelola Bank" }
  ],
  student: [
    { name: "Ikut IdeQuest", permission: "quest.play", access: "full", description: "Mengikuti jalur misi IdeQuest yang tersedia.", cta: "Masuk Quest" },
    { name: "Kerjakan kuis", permission: "quest.play", access: "full", description: "Mengerjakan kuis dan tantangan aktif.", cta: "Kerjakan kuis" },
    { name: "Lihat progres siswa", permission: "report.view", access: "self", description: "Melihat progres belajar diri sendiri.", cta: "Progres saya" },
    { name: "Lihat Radar Pintar", permission: "radar.view", access: "limited", description: "Insight belajar tampil terbatas untuk siswa.", cta: "Lihat ringkasan" }
  ],
  parent: [
    { name: "Lihat progres siswa", permission: "report.view", access: "child", description: "Melihat progres anak yang terhubung.", cta: "Progres anak" },
    { name: "Lihat Radar Pintar", permission: "radar.view", access: "limited", description: "Radar Pintar tampil sebagai ringkasan orang tua.", cta: "Ringkasan Radar" }
  ]
};

const roleMenuLabels: Record<RoleName, Record<MobileNavId, string>> = {
  admin: {
    studio: "User",
    rank: "Role",
    map: "Sistem",
    quest: "Kelas",
    profile: "Admin"
  },
  teacher: {
    studio: "Studio",
    rank: "Radar",
    map: "Beranda",
    quest: "Kelas",
    profile: "Guru"
  },
  student: {
    studio: "Tugas",
    rank: "Piala",
    map: "Map",
    quest: "Quest",
    profile: "Profil"
  },
  parent: {
    studio: "Anak",
    rank: "Laporan",
    map: "Progres",
    quest: "Catatan",
    profile: "Wali"
  }
};

const roleMenuContent: Record<RoleName, Record<MobileNavId, GameMenuContent>> = {
  admin: {
    studio: {
      title: "Manajemen User",
      subtitle: "Verifikasi user baru, tetapkan role, dan pantau status akun sekolah.",
      badge: "User",
      progress: "8/32",
      button: "Verifikasi",
      rewards: ["Pending", "Role aktif", "Audit"]
    },
    rank: {
      title: "Role & Permission",
      subtitle: "Atur izin sistem seperti user.manage, class.manage, dan system.setting.",
      badge: "Access",
      progress: "9/9",
      button: "Atur Izin",
      rewards: ["Admin", "Guru", "Matrix"]
    },
    map: {
      title: "Pusat Sistem",
      subtitle: "Ringkasan kesehatan aplikasi, konfigurasi, dan kelas global.",
      badge: "System",
      progress: "24/30",
      button: "Cek Sistem",
      rewards: ["Config", "Kelas", "Session"]
    },
    quest: {
      title: "Kelas Global",
      subtitle: "Kelola kelas lintas guru dan struktur pembelajaran sekolah.",
      badge: "Kelas",
      progress: "24/40",
      button: "Kelola Kelas",
      rewards: ["Jenjang", "Guru", "Siswa"]
    },
    profile: {
      title: "Profil Admin",
      subtitle: "Akses admin aktif dengan kontrol penuh atas sistem IdeTech.",
      badge: "Admin",
      progress: "8/8",
      button: "Mode Admin",
      rewards: ["Session", "OAuth", "Setting"]
    }
  },
  teacher: {
    studio: {
      title: "IdeStudio Guru",
      subtitle: "Rancang materi interaktif, kuis cepat, dan aktivitas kelas.",
      badge: "Materi",
      progress: "18/40",
      button: "Buka Studio",
      rewards: ["Template", "Bank Ide", "Publikasi"]
    },
    rank: {
      title: "Radar Pintar",
      subtitle: "Pantau progres, risiko belajar, dan siswa yang butuh intervensi.",
      badge: "Radar",
      progress: "76%",
      button: "Buka Radar",
      rewards: ["Progres", "Catatan", "Intervensi"]
    },
    map: {
      title: "Beranda Guru",
      subtitle: "Ringkasan kelas, materi, quest, dan progres siswa hari ini.",
      badge: "Overview",
      progress: "24/40",
      button: "Lihat Ringkasan",
      rewards: ["Kelas aktif", "Materi", "Radar"]
    },
    quest: {
      title: "Kelas Saya",
      subtitle: "Pusat kontrol kelas aktif, daftar siswa, dan agenda belajar.",
      badge: "5 Kelas",
      progress: "3/5",
      button: "Kelola Kelas",
      rewards: ["IPA 7A", "Math 8B", "STEAM"]
    },
    profile: {
      title: "Profil Guru",
      subtitle: "Role guru aktif dengan akses mengajar, membuat materi, dan melihat laporan siswa.",
      badge: "Guru",
      progress: "6/6",
      button: "Mode Guru",
      rewards: ["Kelas", "Materi", "Laporan"]
    }
  },
  student: {
    studio: {
      title: "Tugas Saya",
      subtitle: "Daftar tugas yang harus dikumpulkan dan progres pengerjaan pribadi.",
      badge: "Tugas",
      progress: "6/9",
      button: "Kerjakan",
      rewards: ["Deadline", "Upload", "Nilai"]
    },
    rank: {
      title: "Piala Belajar",
      subtitle: "Lihat badge, poin, dan pencapaian dari misi belajar yang selesai.",
      badge: "Badge",
      progress: "12/20",
      button: "Lihat Badge",
      rewards: ["Poin", "Badge", "Streak"]
    },
    map: {
      title: "Peta IdeQuest",
      subtitle: "Jalur belajar utama dengan level, chapter, dan misi aktif untuk siswa.",
      badge: "Chapter 4",
      progress: "29/40",
      button: "Level 101",
      rewards: ["Misi harian", "Quest aktif", "Bonus koin"]
    },
    quest: {
      title: "Quest Center",
      subtitle: "Kerjakan misi, kuis, dan tantangan belajar yang sedang berjalan.",
      badge: "Quest",
      progress: "4/7",
      button: "Mulai Quest",
      rewards: ["Kuis", "Misi", "Reward"]
    },
    profile: {
      title: "Profil Siswa",
      subtitle: "Lihat role siswa, progres diri, badge, dan izin belajar yang tersedia.",
      badge: "Siswa",
      progress: "3/3",
      button: "Cek Profil",
      rewards: ["Poin", "Badge", "Progres"]
    }
  },
  parent: {
    studio: {
      title: "Anak Terhubung",
      subtitle: "Pilih anak untuk melihat perkembangan belajar dan aktivitas terbaru.",
      badge: "Anak",
      progress: "2/2",
      button: "Pilih Anak",
      rewards: ["Dika", "Naya", "Wali"]
    },
    rank: {
      title: "Laporan Belajar",
      subtitle: "Ringkasan nilai, kehadiran, dan kebiasaan belajar anak.",
      badge: "Report",
      progress: "96%",
      button: "Lihat Laporan",
      rewards: ["Nilai", "Hadir", "Konsisten"]
    },
    map: {
      title: "Progres Anak",
      subtitle: "Pantau peta progres IdeQuest anak tanpa akses mengerjakan misi.",
      badge: "Progres",
      progress: "74/100",
      button: "Pantau",
      rewards: ["Quest", "Tugas", "Badge"]
    },
    quest: {
      title: "Catatan Guru",
      subtitle: "Baca catatan guru dan tindak lanjut belajar di rumah.",
      badge: "Catatan",
      progress: "5/8",
      button: "Baca",
      rewards: ["Saran", "Perhatian", "Apresiasi"]
    },
    profile: {
      title: "Profil Wali",
      subtitle: "Role orang tua aktif untuk memantau anak dan laporan belajar.",
      badge: "Wali",
      progress: "2/2",
      button: "Mode Wali",
      rewards: ["Session", "Anak", "Laporan"]
    }
  }
};

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminAccess, setAdminAccess] = useState<AdminAccess | null>(null);
  const [adminClasses, setAdminClasses] = useState<AdminClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMobileMenu, setActiveMobileMenu] = useState<MobileNavId>("map");

  async function loadSession() {
    setLoading(true);
    setError(null);
    const me = await api<{ user: AuthUser | null }>("/api/auth/me");
    if (!me.user) {
      setUser(null);
      setDashboard(null);
      setLoading(false);
      return;
    }

    await loadDashboard();
    setLoading(false);
  }

  async function loadDashboard() {
    const payload = await api<DashboardResponse>("/api/dashboard");
    setUser(payload.user);
    setDashboard(payload.dashboard);

    if (payload.user.activeRole === "admin") {
      const [usersResponse, accessResponse, classResponse] = await Promise.all([
        api<{ users: AdminUser[] }>("/api/admin/users"),
        api<AdminAccess>("/api/admin/access"),
        api<{ classes: AdminClass[] }>("/api/admin/classes")
      ]);
      setAdminUsers(usersResponse.users);
      setAdminAccess(accessResponse);
      setAdminClasses(classResponse.classes);
    } else {
      setAdminUsers([]);
      setAdminAccess(null);
      setAdminClasses([]);
    }
  }

  useEffect(() => {
    loadSession().catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  async function loginDemo(email: string) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/dev/google", { method: "POST", body: JSON.stringify({ email }) });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login demo gagal.");
    } finally {
      setBusy(false);
    }
  }

  async function switchRole(role: RoleName) {
    setBusy(true);
    setError(null);
    try {
      const response = await api<{ user: AuthUser }>("/api/auth/switch-role", {
        method: "POST",
        body: JSON.stringify({ role })
      });
      setUser(response.user);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengganti role.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    setDashboard(null);
    setAdminUsers([]);
    setAdminAccess(null);
    setAdminClasses([]);
    setBusy(false);
  }

  async function saveProfile(payload: {
    fullName: string;
    schoolName: string;
    contactChannel: "wa" | "telegram";
    contactValue: string;
  }) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setBusy(false);
    }
  }

  async function updateAdminUser(id: string, payload: { status?: string; roles?: RoleName[] }) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/users/${id}/verify`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui user.");
    } finally {
      setBusy(false);
    }
  }

  async function updateRolePermissions(role: RoleName, permissions: string[]) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/roles/${role}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissions })
      });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui permission.");
    } finally {
      setBusy(false);
    }
  }

  async function createAdminClass(payload: { teacherUserId?: string; name: string; subject: string; grade: string; students: number; status: TeacherClass["status"] }) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/classes", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat kelas.");
    } finally {
      setBusy(false);
    }
  }

  async function updateAdminClass(id: string, payload: Partial<Pick<TeacherClass, "name" | "subject" | "grade" | "students" | "progress" | "status">> & { teacherUserId?: string }) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/classes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui kelas.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAdminClass(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/classes/${id}`, { method: "DELETE" });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus kelas.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <FullScreenState text="Memuat IdeTech..." />;
  }

  if (!user || !dashboard) {
    return <LoginScreen busy={busy} error={error} onDemoLogin={loginDemo} />;
  }

  if (!user.profileCompleted) {
    return <ProfileSetupScreen user={user} busy={busy} error={error} onSave={saveProfile} onLogout={logout} />;
  }

  if (user.activeRole === "student") {
    return (
      <StudentCompactDashboard
        user={user}
        dashboard={dashboard}
        busy={busy}
        activeMenu={activeMobileMenu}
        onChangeMenu={setActiveMobileMenu}
        onLogout={logout}
      />
    );
  }

  return (
    <ProfessionalDashboard
      user={user}
      dashboard={dashboard}
      adminUsers={adminUsers}
      adminAccess={adminAccess}
      adminClasses={adminClasses}
      activeMenu={activeMobileMenu}
      busy={busy}
      error={error}
      onChangeMenu={setActiveMobileMenu}
      onLogout={logout}
      onSwitchRole={switchRole}
      onUpdateAdminUser={updateAdminUser}
      onUpdateRolePermissions={updateRolePermissions}
      onCreateAdminClass={createAdminClass}
      onUpdateAdminClass={updateAdminClass}
      onDeleteAdminClass={deleteAdminClass}
    />
  );
}

function ProfileSetupScreen({
  user,
  busy,
  error,
  onSave,
  onLogout
}: {
  user: AuthUser;
  busy: boolean;
  error: string | null;
  onSave: (payload: { fullName: string; schoolName: string; contactChannel: "wa" | "telegram"; contactValue: string }) => void;
  onLogout: () => void;
}) {
  const [fullName, setFullName] = useState(user.fullName ?? user.name ?? "");
  const [schoolName, setSchoolName] = useState(user.schoolName ?? "");
  const [contactChannel, setContactChannel] = useState<"wa" | "telegram">(user.contactChannel ?? "wa");
  const [contactValue, setContactValue] = useState(user.contactValue ?? "");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolBusy, setSchoolBusy] = useState(false);

  useEffect(() => {
    if (schoolName.trim().length < 2) {
      setSchools([]);
      return;
    }

    const timer = window.setTimeout(() => {
      setSchoolBusy(true);
      api<{ schools: SchoolOption[] }>(`/api/schools/search?q=${encodeURIComponent(schoolName)}`)
        .then((payload) => setSchools(payload.schools))
        .catch(() => setSchools([]))
        .finally(() => setSchoolBusy(false));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [schoolName]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ fullName, schoolName, contactChannel, contactValue });
  }

  return (
    <main className="profile-setup-shell">
      <section className="profile-setup-card">
        <div className="profile-setup-brand">
          <IdeTechLogo className="profile-setup-logo" />
          <div>
            <p>IdeTech</p>
            <span>Lengkapi profil untuk mulai memakai dashboard.</span>
          </div>
        </div>

        <div className="profile-setup-header">
          <h1>Profil pengguna</h1>
          <p>Data ini dipakai untuk mencocokkan sekolah, kelas, dan komunikasi belajar.</p>
        </div>

        {error ? <ErrorBanner message={error} /> : null}

        <form className="profile-setup-form" onSubmit={submit}>
          <label>
            <span>Nama Lengkap</span>
            <input value={fullName} placeholder="Nama sesuai identitas sekolah" onChange={(event) => setFullName(event.target.value)} />
          </label>

          <label>
            <span>Nama Sekolah</span>
            <input
              value={schoolName}
              placeholder="Cari nama sekolah se-Indonesia"
              list="school-options"
              onChange={(event) => setSchoolName(event.target.value)}
            />
            <datalist id="school-options">
              {schools.map((school) => (
                <option key={`${school.name}-${school.city}-${school.province}`} value={school.name}>
                  {[school.city, school.province].filter(Boolean).join(", ")}
                </option>
              ))}
            </datalist>
            <small>{schoolBusy ? "Mencari sekolah..." : "Ketik minimal 2 huruf untuk mencari dari API sekolah Indonesia."}</small>
          </label>

          <div className="profile-contact-grid">
            <label>
              <span>Kontak</span>
              <Select value={contactChannel} onChange={(event) => setContactChannel(event.target.value as "wa" | "telegram")}>
                <option value="wa">WhatsApp</option>
                <option value="telegram">Telegram</option>
              </Select>
            </label>
            <label>
              <span>{contactChannel === "wa" ? "Nomor HP / WA" : "Username Telegram"}</span>
              <input
                value={contactValue}
                placeholder={contactChannel === "wa" ? "08xxxxxxxxxx" : "@username"}
                onChange={(event) => setContactValue(event.target.value)}
              />
            </label>
          </div>

          <div className="profile-setup-actions">
            <button className="profile-setup-submit" type="submit" disabled={busy}>
              {busy ? "Menyimpan..." : "Simpan profil"}
            </button>
            <button className="profile-setup-logout" type="button" disabled={busy} onClick={onLogout}>
              Keluar
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function StudentCompactDashboard({
  user,
  dashboard,
  busy,
  activeMenu,
  onChangeMenu,
  onLogout
}: {
  user: AuthUser;
  dashboard: Dashboard;
  busy: boolean;
  activeMenu: MobileNavId;
  onChangeMenu: (id: MobileNavId) => void;
  onLogout: () => void;
}) {
  const [openPanel, setOpenPanel] = useState<MobileNavId | null>(null);
  const content = roleMenuContent.student[openPanel && openPanel !== "profile" ? openPanel : activeMenu];
  const [indicators, setIndicators] = useState<StudentIndicatorResponse | null>(null);
  const [studentMaterials, setStudentMaterials] = useState<StudentMaterial[]>([]);
  const [studentQuests, setStudentQuests] = useState<StudentQuest[]>([]);
  const [studentAchievements, setStudentAchievements] = useState<StudentAchievement[]>([]);
  const [studentClasses, setStudentClasses] = useState<StudentClass[]>([]);
  const [studentMeta, setStudentMeta] = useState<{ completedMaterials: number; completedQuests: number; totalPoints: number } | null>(null);
  const [studentPanelBusy, setStudentPanelBusy] = useState(false);
  const [studentPanelError, setStudentPanelError] = useState("");

  const loadIndicators = async () => {
    const response = await fetch("/api/student/indicators", { credentials: "include" });
    if (!response.ok) throw new Error("Gagal memuat indikator siswa.");
    return (await response.json()) as StudentIndicatorResponse;
  };

  const refreshIndicators = () => {
    fetch("/api/student/indicators", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Gagal memuat indikator siswa.");
        return (await response.json()) as StudentIndicatorResponse;
      })
      .then((data) => {
        setIndicators(data);
      })
      .catch(() => {
        setIndicators(null);
      });
  };

  const loadStudentPanelData = async () => {
    if (!openPanel || openPanel === "profile") return;

    setStudentPanelBusy(true);
    setStudentPanelError("");

    try {
      const [classPayload, materialPayload, questPayload, achievementPayload] = await Promise.all([
        api<{ classes: StudentClass[] }>("/api/student/classes"),
        api<{ materials: StudentMaterial[] }>("/api/student/materials"),
        api<{ quests: StudentQuest[] }>("/api/student/quests"),
        api<{ achievements: StudentAchievement[]; meta: { completedMaterials: number; completedQuests: number; totalPoints: number } }>("/api/student/achievements")
      ]);

      setStudentClasses(classPayload.classes);
      setStudentMaterials(materialPayload.materials);
      setStudentQuests(questPayload.quests);
      setStudentAchievements(achievementPayload.achievements);
      setStudentMeta(achievementPayload.meta);
    } catch (err) {
      setStudentPanelError(err instanceof Error ? err.message : "Gagal memuat data siswa.");
    } finally {
      setStudentPanelBusy(false);
    }
  };

  useEffect(() => {
    let alive = true;
    loadIndicators()
      .then((data) => {
        if (alive) setIndicators(data);
      })
      .catch(() => {
        if (alive) setIndicators(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    void loadStudentPanelData();
  }, [openPanel]);

  const features = roleFeatures.student;
  const leftItems: StudentIndicator[] =
    indicators?.left ?? [
      { id: "map", title: features[0].name, subtitle: "9h 37m", badge: "+2", connected: true },
      { id: "quest", title: features[1].name, subtitle: "2d 9h", connected: true },
      { id: "rank", title: features[2].name, subtitle: "1d 9h", badge: "20", connected: true }
    ];
  const rightItems: StudentIndicator[] =
    indicators?.right ?? [
      { id: "tasks", title: "Tugas aktif", subtitle: "10d 9h", badge: "3", connected: true },
      { id: "coins", title: "Poin penuh", subtitle: "Full", badge: "100", connected: true },
      { id: "radar", title: "Radar", subtitle: "Terbatas", badge: "!", connected: false }
    ];
  const handleChangeMenu = (id: MobileNavId) => {
    setOpenPanel(id);
    if (id !== "profile") onChangeMenu(id);
  };
  const handleOpenChapter = () => {
    setOpenPanel("map");
    onChangeMenu("map");
  };
  const handleOpenLevel = () => {
    setOpenPanel("quest");
    onChangeMenu("quest");
  };
  const completeMaterial = async (materialId: string) => {
    setStudentPanelBusy(true);
    setStudentPanelError("");
    try {
      await api(`/api/student/materials/${materialId}/complete`, { method: "POST" });
      await loadStudentPanelData();
      refreshIndicators();
    } catch (err) {
      setStudentPanelError(err instanceof Error ? err.message : "Gagal menyelesaikan materi.");
    } finally {
      setStudentPanelBusy(false);
    }
  };
  const completeQuest = async (questId: string) => {
    setStudentPanelBusy(true);
    setStudentPanelError("");
    try {
      await api(`/api/student/quests/${questId}/complete`, { method: "POST" });
      await loadStudentPanelData();
      refreshIndicators();
    } catch (err) {
      setStudentPanelError(err instanceof Error ? err.message : "Gagal mengumpulkan IdeQuest.");
    } finally {
      setStudentPanelBusy(false);
    }
  };
  const joinStudentClass = async (classCode: string) => {
    setStudentPanelBusy(true);
    setStudentPanelError("");
    try {
      await api("/api/student/classes/join", {
        method: "POST",
        body: JSON.stringify({ classCode })
      });
      await loadStudentPanelData();
      refreshIndicators();
    } catch (err) {
      setStudentPanelError(err instanceof Error ? err.message : "Gagal masuk kelas.");
    } finally {
      setStudentPanelBusy(false);
    }
  };

  return (
    <main className="student-compact-shell h-[100dvh] overflow-hidden">
      <section className="student-compact-stage mx-auto flex h-full w-full max-w-[520px] flex-col px-4 pb-3 pt-4 md:max-w-none">
        <header className="student-compact-hud">
          <img
            className="student-compact-avatar"
            src={user.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
            alt={user.name}
          />
          <div className="game-hud-pill">
            <Heart className="h-5 w-5 text-red-500" />
            <span>29:39</span>
          </div>
          <div className="game-hud-pill">
            <CircleDollarSign className="h-5 w-5 text-yellow-500" />
            <span>4778</span>
          </div>
          <button className="game-settings-button" disabled={busy} type="button" aria-label="Pengaturan">
            <Settings className="h-5 w-5" />
          </button>
          <button className="student-exit-button" disabled={busy} type="button" onClick={onLogout} aria-label="Keluar">
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <div className="student-compact-progress">
          <Star className="student-compact-progress__gem" />
          <div className="game-progress-track">
            <div className="game-progress-fill" style={{ width: `${indicators?.meta.progressPercent ?? 0}%` }} />
            <span>{indicators?.meta.chapterProgress ?? content.progress}</span>
          </div>
          <div className="game-coin-stack">100</div>
        </div>

        <section className="student-compact-map" aria-label={dashboard.title}>
          <StudentDesktopQuickAccess active={openPanel ?? activeMenu} notifications={indicators?.nav} onChange={handleChangeMenu} />

          <div className="student-compact-side is-left">
            {leftItems.map((item) => (
              <StudentMapIcon key={item.id} item={{ ...item, icon: studentMapIcon(item.id) }} />
            ))}
          </div>

          <div className="student-compact-center">
            <div className="flex flex-col items-center justify-center pt-8">
              <img 
                src="/karaktergame3d.webp" 
                alt="Karakter Utama" 
                className="w-56 h-56 object-contain drop-shadow-2xl animate-bounce"
                style={{ animationDuration: '3s' }}
              />
              <div className="game-island__gate mt-[-20px] relative z-10">
                <span>{content.badge}</span>
              </div>
            </div>
          </div>

          <div className="student-compact-side is-right">
            {rightItems.map((item) => (
              <StudentMapIcon key={item.id} item={{ ...item, icon: studentMapIcon(item.id) }} />
            ))}
          </div>

          <StudentDailyMissionPanel />
        </section>

        <section className="student-compact-actions">
          <button className="game-chapter-panel game-chapter-panel--button" type="button" onClick={handleOpenChapter}>
            <span>{indicators?.meta.chapter ?? content.badge}</span>
            <strong>{indicators?.meta.chapterProgress ?? content.progress}</strong>
          </button>
          <button className="game-level-button" type="button" onClick={handleOpenLevel}>
            {indicators?.meta.levelButton ?? content.button}
          </button>
        </section>
      </section>

      {openPanel === "profile" ? <StudentProfileModal user={user} indicators={indicators} onClose={() => setOpenPanel(null)} /> : null}
      {openPanel && openPanel !== "profile" ? (
        <StudentContentModal
          active={openPanel}
          classes={studentClasses}
          materials={studentMaterials}
          quests={studentQuests}
          achievements={studentAchievements}
          meta={studentMeta}
          busy={studentPanelBusy}
          error={studentPanelError}
          onClose={() => setOpenPanel(null)}
          onCompleteMaterial={completeMaterial}
          onCompleteQuest={completeQuest}
          onJoinClass={joinStudentClass}
        />
      ) : null}

      <MobileGameNav active={openPanel ?? activeMenu} role="student" notifications={indicators?.nav} onChange={handleChangeMenu} />
    </main>
  );
}

function StudentDailyMissionPanel() {
  const missions = [
    { label: "Kerjakan 1 kuis", progress: "0/1", reward: "+20" },
    { label: "Selesaikan quest", progress: "1/2", reward: "+35" },
    { label: "Klaim badge baru", progress: "0/1", reward: "+50" }
  ];

  return (
    <aside className="student-daily-panel" aria-label="Misi harian siswa">
      <div className="student-daily-panel__header">
        <span className="student-daily-panel__icon">
          <Target className="h-6 w-6" strokeWidth={2.8} />
        </span>
        <div>
          <p>Misi Harian</p>
          <small>Reward aktif</small>
        </div>
      </div>

      <div className="student-daily-panel__progress">
        <span>2/4</span>
        <div>
          <i />
        </div>
      </div>

      <div className="student-daily-panel__list">
        {missions.map((mission) => (
          <div key={mission.label} className="student-daily-mission">
            <div>
              <strong>{mission.label}</strong>
              <span>{mission.progress}</span>
            </div>
            <em>{mission.reward}</em>
          </div>
        ))}
      </div>

      <button className="student-daily-panel__button" type="button">
        Mulai
      </button>
    </aside>
  );
}

function StudentDesktopQuickAccess({
  active,
  notifications,
  onChange
}: {
  active: MobileNavId;
  notifications?: Partial<Record<MobileNavId, boolean>>;
  onChange: (id: MobileNavId) => void;
}) {
  return (
    <nav className="student-desktop-quick-access" aria-label="Akses cepat siswa">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;

        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "student-quick-card is-active" : "student-quick-card"}
            onClick={() => onChange(item.id)}
          >
            <span className="student-quick-card__icon">
              <Icon className="h-6 w-6" strokeWidth={2.8} />
              {notifications?.[item.id] ? <span className="student-quick-card__notify" aria-hidden="true" /> : null}
            </span>
            <span className="student-quick-card__text">
              <span>{roleMenuLabels.student[item.id]}</span>
              <small>{roleMenuContent.student[item.id].badge}</small>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function StudentMapIcon({
  item
}: {
  item: StudentIndicator & { icon: typeof Sparkles };
}) {
  const Icon = item.icon;

  return (
    <button
      className={item.connected ? "student-map-icon" : "student-map-icon is-disconnected"}
      type="button"
      aria-label={item.title}
    >
      <span className="student-map-icon__orb">
        <Icon className="student-map-icon__glyph" strokeWidth={2.8} />
        {item.badge ? <span className={item.badge === "!" ? "student-map-icon__badge is-alert" : "student-map-icon__badge"}>{item.badge}</span> : null}
      </span>
      <span className="student-map-icon__plate">{item.subtitle}</span>
    </button>
  );
}

function StudentProfileModal({
  user,
  indicators,
  onClose
}: {
  user: AuthUser;
  indicators: StudentIndicatorResponse | null;
  onClose: () => void;
}) {
  const level = indicators?.meta.levelButton.replace(/[^0-9]/g, "") || "101";
  const progressValue = indicators?.meta.chapterProgress.split("/")[0] || "29";
  const chapterValue = indicators?.meta.chapter.replace(/[^0-9]/g, "") || "4";
  const collections = user.permissions.filter((permission) => permission.includes("quest") || permission.includes("report")).length;
  const stats = [
    { label: "First Try Wins", value: progressValue, icon: Target },
    { label: "Helps Made", value: "0", icon: Heart },
    { label: "Helps Received", value: "1", icon: ScrollText },
    { label: "Areas Completed", value: chapterValue, icon: Star },
    { label: "Collections Completed", value: String(collections), icon: BadgeCheck },
    { label: "Sets Completed", value: String(user.roles.length), icon: Trophy }
  ];

  return (
    <div className="student-profile-modal" role="dialog" aria-modal="true" aria-labelledby="student-profile-title">
      <div className="student-profile-modal__backdrop" onClick={onClose} />
      <section className="student-profile-modal__panel">
        <header className="student-profile-modal__titlebar">
          <h2 id="student-profile-title">Profile</h2>
          <button type="button" className="student-profile-modal__close" onClick={onClose} aria-label="Tutup profil">
            <X className="h-8 w-8" strokeWidth={4} />
          </button>
        </header>

        <div className="student-profile-card">
          <div className="student-profile-card__photo-wrap">
            <img
              className="student-profile-card__photo"
              src={user.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
              alt={user.name}
            />
            <span className="student-profile-card__edit">
              <Settings className="h-4 w-4" strokeWidth={3} />
            </span>
          </div>

          <div className="student-profile-card__identity">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <small>{new Date().toLocaleDateString("id-ID", { month: "2-digit", year: "numeric" })}</small>
          </div>

          <div className="student-profile-card__level">
            <span>Level</span>
            <strong>{level}</strong>
          </div>
        </div>

        <section className="student-profile-stats">
          <div className="student-profile-stats__ribbon">General Stats</div>
          <div className="student-profile-stats__grid">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div key={stat.label} className="student-profile-stat">
                  <Icon className="student-profile-stat__icon" strokeWidth={2.8} />
                  <strong>{stat.label}</strong>
                  <span>{stat.value}</span>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}

function StudentContentModal({
  active,
  classes,
  materials,
  quests,
  achievements,
  meta,
  busy,
  error,
  onClose,
  onCompleteMaterial,
  onCompleteQuest,
  onJoinClass
}: {
  active: Exclude<MobileNavId, "profile">;
  classes: StudentClass[];
  materials: StudentMaterial[];
  quests: StudentQuest[];
  achievements: StudentAchievement[];
  meta: { completedMaterials: number; completedQuests: number; totalPoints: number } | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onCompleteMaterial: (materialId: string) => void;
  onCompleteQuest: (questId: string) => void;
  onJoinClass: (classCode: string) => void;
}) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [classCode, setClassCode] = useState("");
  const [showClasses, setShowClasses] = useState(false);
  const title = roleMenuLabels.student[active];
  const summary = {
    studio: "Materi dari guru yang bisa dipelajari siswa.",
    rank: "Piala dan badge dari materi serta IdeQuest yang sudah selesai.",
    map: "Jalur belajar yang menghubungkan materi guru ke IdeQuest.",
    quest: "Misi IdeQuest dari guru yang bisa dikumpulkan siswa."
  }[active];
  const taskSlots = Array.from({ length: 9 }, (_, index) => materials[index] ?? null);
  const completedTasks = taskSlots.filter((material) => material && material.progress >= 100).length;
  const selectedTask = selectedTaskId ? materials.find((material) => material.id === selectedTaskId) ?? null : null;

  useEffect(() => {
    setSelectedTaskId(null);
  }, [active]);

  function submitClassCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classCode.trim()) return;
    onJoinClass(classCode);
    setClassCode("");
  }

  return (
    <div className={`student-profile-modal student-content-modal ${active === "studio" ? "is-centered" : ""}`} role="dialog" aria-modal="true" aria-labelledby="student-content-title">
      <div className="student-profile-modal__backdrop" onClick={onClose} />
      <section className={active === "studio" ? "student-profile-modal__panel student-content-modal__panel is-task-panel" : "student-profile-modal__panel student-content-modal__panel"}>
        {active !== "studio" ? (
          <header className="student-profile-modal__titlebar student-content-modal__titlebar">
            <div>
              <h2 id="student-content-title">{title}</h2>
              <p>{summary}</p>
            </div>
            <button type="button" className="student-profile-modal__close" onClick={onClose} aria-label={`Tutup ${title}`}>
              <X className="h-8 w-8" strokeWidth={4} />
            </button>
          </header>
        ) : null}

        {error ? <div className="student-content-error">{error}</div> : null}

        {active === "studio" ? (
          <section className="student-task-set">
            <div className="student-task-set__banner">
              <strong id="student-content-title">Tugas</strong>
              <button type="button" className="student-task-set__close" onClick={onClose} aria-label="Tutup Tugas">
                <X className="h-8 w-8" strokeWidth={4} />
              </button>
            </div>

            <div className="student-task-set__meter">
              <span className="student-task-set__deck">
                <BookOpen className="h-8 w-8" strokeWidth={2.8} />
              </span>
              <div className="student-task-set__track">
                <i style={{ width: `${(completedTasks / 9) * 100}%` }} />
                <strong>
                  {completedTasks}/9
                </strong>
              </div>
              <span className="student-task-set__coin">{materials.reduce((total, item) => total + (item.progress >= 100 ? 50 : 0), 0)}</span>
            </div>

            <div className="student-task-card-grid">
              {taskSlots.map((material, index) => {
                const isUnavailable = !material;
                const isDone = Boolean(material && material.progress >= 100);
                const Icon = material?.type === "quiz" ? Puzzle : material?.type === "video" ? Rocket : material?.type === "document" ? ScrollText : BookOpen;

                return (
                  <button
                    key={material?.id ?? `empty-task-${index}`}
                    type="button"
                    className={[
                      "student-task-card",
                      isDone ? "is-done" : "",
                      isUnavailable ? "is-unavailable" : "",
                      material && selectedTaskId === material.id ? "is-selected" : ""
                    ].filter(Boolean).join(" ")}
                    disabled={isUnavailable}
                    onClick={() => {
                      if (material) setSelectedTaskId(material.id);
                    }}
                  >
                    <span className="student-task-card__star">
                      <Star className="h-6 w-6" fill="currentColor" strokeWidth={2.4} />
                    </span>
                    <span className="student-task-card__bonus">+{isDone ? 1 : 0}</span>
                    <span className="student-task-card__art">
                      <Icon className="h-14 w-14" strokeWidth={2.8} />
                    </span>
                    <span className="student-task-card__label">{material?.title ?? "Belum Tersedia"}</span>
                    <span className="student-task-card__status">{material ? (isDone ? "Done" : `${material.progress}%`) : "Locked"}</span>
                  </button>
                );
              })}
            </div>

          </section>
        ) : null}

        {active === "quest" ? (
          <div className="student-task-card-grid">
            {quests.length ? null : <p className="student-content-empty text-slate-100 col-span-3 text-center">Belum ada IdeQuest aktif.</p>}
            {quests.map((quest) => {
              const relatedMaterial = materials.find((material) => material.id === quest.materialId);
              const materialDone = !quest.materialId || (relatedMaterial?.progress ?? 0) >= 100;
              const isDone = quest.progress >= 100;
              const isUnavailable = !materialDone;

              return (
                <button
                  key={quest.id}
                  type="button"
                  className={[
                    "student-task-card is-quest-card",
                    isDone ? "is-done" : "",
                    isUnavailable ? "is-unavailable" : "",
                    selectedTaskId === quest.id ? "is-selected" : ""
                  ].filter(Boolean).join(" ")}
                  disabled={isUnavailable}
                  onClick={() => setSelectedTaskId(quest.id)}
                >
                  <span className="student-task-card__star">
                    <Star className="h-6 w-6" fill="currentColor" strokeWidth={2.4} />
                  </span>
                  <span className="student-task-card__bonus">+{quest.points}</span>
                  <span className="student-task-card__art">
                    <Puzzle className="h-14 w-14" strokeWidth={2.8} />
                  </span>
                  <span className="student-task-card__label">{quest.title}</span>
                  <span className="student-task-card__status">{isDone ? "Selesai" : isUnavailable ? "Terkunci" : "Terbuka"}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {active === "rank" ? (
          <div className="student-achievement-wrap">
            <div className="student-achievement-summary">
              <strong>{meta?.totalPoints ?? 0}</strong>
              <span>Total Poin</span>
              <strong>{meta?.completedQuests ?? 0}</strong>
              <span>Quest Selesai</span>
              <strong>{meta?.completedMaterials ?? 0}</strong>
              <span>Materi Selesai</span>
            </div>
            <div className="student-badges-grid">
              {achievements.length ? null : <p className="student-content-empty">Belum ada pencapaian yang bisa diraih.</p>}
              {achievements.map((achievement, idx) => {
                const colors = ['is-gold', 'is-purple', 'is-green', 'is-blue'];
                const colorClass = colors[idx % 4];
                return (
                  <article key={achievement.id} className="student-badge-item">
                    <div className="student-badge-shield-wrap">
                      <div className={`student-badge-shield ${colorClass} ${achievement.unlocked ? 'is-unlocked' : 'is-locked'}`} title={achievement.description}>
                        <div className="student-badge-shield__inner">
                          <Star className="h-6 w-6" strokeWidth={3} fill="currentColor" />
                        </div>
                      </div>
                    </div>
                    <strong>{achievement.title}</strong>
                    <span>{achievement.description}</span>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}

        {active === "map" ? (
          <div className="student-class-join-wrap">
            <form className="student-class-join" onSubmit={submitClassCode}>
              <div className="flex justify-between items-start w-full">
                <div>
                  <strong>Masuk kelas</strong>
                  <span>Masukkan ClassID dari guru untuk membuka materi dan IdeQuest kelas.</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowClasses(!showClasses)}
                  className="text-[11px] bg-[#ffd320] hover:bg-[#ffdf55] text-[#7d2f0f] px-3 py-1.5 rounded-full font-black ml-2 shrink-0 border-b-[3px] border-[#d69818] transition-colors"
                  style={{ textShadow: "none", boxShadow: "0 2px 4px rgba(125, 47, 15, 0.15)" }}
                >
                  {showClasses ? "Sembunyikan" : `Kelas (${classes.length})`}
                </button>
              </div>
              <div className="student-class-join__control">
                <input
                  value={classCode}
                  placeholder="IDT-ABC123"
                  onChange={(event) => setClassCode(event.target.value.toUpperCase())}
                />
                <button type="submit" disabled={busy || !classCode.trim()}>
                  Gabung
                </button>
              </div>

              {showClasses && (
                <div className="student-class-list mt-2 pt-4 border-t-2 border-[#e6b12a] w-full">
                  {classes.length ? null : <p className="text-[#7d2f0f] text-sm font-bold text-center">Belum tergabung di kelas.</p>}
                  {classes.map((kelas) => (
                    <article key={kelas.id} className="student-class-card">
                      <span>{kelas.classCode ?? kelas.nextSession}</span>
                      <strong>{kelas.name}</strong>
                      <small>{kelas.subject} - Kelas {kelas.grade} · {kelas.students} siswa</small>
                    </article>
                  ))}
                </div>
              )}
            </form>

            <div className="student-map-path-saga">
              {[...materials, ...quests].length ? null : <p className="student-content-empty">Materi dan IdeQuest akan muncul setelah kamu masuk kelas.</p>}
              
              <div className="saga-path-container">
                {(() => {
                  const pathNodes: { type: 'material'|'quest', data: any, id: string, title: string, progress: number }[] = [];
                  materials.forEach(m => {
                    pathNodes.push({ type: 'material', data: m, id: m.id, title: m.title, progress: m.progress });
                    quests.filter(q => q.materialId === m.id).forEach(q => {
                      pathNodes.push({ type: 'quest', data: q, id: q.id, title: q.title, progress: q.progress });
                    });
                  });
                  quests.filter(q => !q.materialId).forEach(q => {
                    pathNodes.push({ type: 'quest', data: q, id: q.id, title: q.title, progress: q.progress });
                  });

                  return pathNodes.map((node, i) => {
                    const isCompleted = node.progress >= 100;
                    const prevCompleted = i === 0 || pathNodes[i-1].progress >= 100;
                    const isLocked = !isCompleted && !prevCompleted;
                    const statusClass = isCompleted ? 'is-completed' : isLocked ? 'is-locked' : 'is-active';
                    
                    const positions = ['pos-center', 'pos-right', 'pos-center', 'pos-left'];
                    const alignClass = positions[i % 4];

                    return (
                      <div key={node.id} className={`saga-node-wrapper ${alignClass}`}>
                        <button 
                          className={`saga-node-btn ${statusClass}`}
                          onClick={() => {
                            if (!isLocked && node.type === 'material') {
                                setSelectedTaskId(node.id);
                            }
                          }}
                          aria-label={node.title}
                        >
                           <div className="saga-node-btn__inner">
                             {isLocked ? <Lock className="w-6 h-6" /> : (node.type === 'quest' ? <Puzzle className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />)}
                           </div>
                        </button>
                        <div className="saga-node-label">
                          <small>{node.type === 'material' ? 'Materi' : 'Quest'}</small>
                          <span>{node.title}</span>
                        </div>
                      </div>
                    )
                  });
                })()}
              </div>
            </div>
          </div>
        ) : null}

        {busy ? <div className="student-content-loading">Memproses...</div> : null}
      </section>

      {selectedTask ? (
        <div className="student-task-detail-modal" role="dialog" aria-modal="true" aria-label={`Detail tugas ${selectedTask.title}`}>
          <div className="student-task-detail-modal__backdrop" onClick={() => setSelectedTaskId(null)} />
          <article className="student-task-detail">
            <button className="student-task-detail__close" type="button" onClick={() => setSelectedTaskId(null)} aria-label="Tutup detail tugas">
              <X className="h-5 w-5" strokeWidth={4} />
            </button>
            <small>{(selectedTask as any).type || 'IdeQuest'}</small>
            <h3>{selectedTask.title}</h3>
            <p>{(selectedTask as any).description || (selectedTask as any).mission}</p>
            
            { (selectedTask as any).content && (
              <div className="mt-4 mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-hidden shadow-inner">
                {(selectedTask as any).type === 'lesson' && (
                  <div className="prose prose-sm prose-blue max-w-none text-slate-700 overflow-y-auto max-h-[300px] pr-2">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>{(selectedTask as any).content}</ReactMarkdown>
                  </div>
                )}
                {(selectedTask as any).type === 'video' && (
                  <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative shadow-md">
                    <iframe 
                      src={(selectedTask as any).content.includes("watch?v=") ? (selectedTask as any).content.replace("watch?v=", "embed/") : (selectedTask as any).content}
                      title="Video Viewer"
                      className="absolute inset-0 w-full h-full border-0"
                      allowFullScreen
                    />
                  </div>
                )}
                {(selectedTask as any).type === 'document' && (
                  <div className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-lg">
                    <ScrollText className="h-10 w-10 text-slate-400 mb-2" />
                    <p className="text-slate-600 text-sm mb-4 font-medium text-center">Dokumen PDF siap dibaca oleh siswa.</p>
                    <a href={(selectedTask as any).content} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors shadow-sm shadow-blue-500/20">
                      Buka Dokumen
                    </a>
                  </div>
                )}
                {(selectedTask as any).type === 'quiz' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Puzzle className="h-12 w-12 text-yellow-500 mb-4 drop-shadow-sm" />
                    <p className="text-slate-800 font-bold text-lg mb-2">Kuis Interaktif</p>
                    <button className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-black tracking-wide rounded-xl transition-colors shadow-md shadow-yellow-500/20">Mulai Kerjakan Kuis</button>
                  </div>
                )}
              </div>
            )}

            <div className="student-content-progress">
              <span>{selectedTask.progress}%</span>
              <i style={{ width: `${selectedTask.progress}%` }} />
            </div>
            <button 
              type="button" 
              disabled={busy || selectedTask.progress >= 100} 
              onClick={() => {
                if ('mission' in selectedTask) {
                  onCompleteQuest(selectedTask.id);
                } else {
                  onCompleteMaterial(selectedTask.id);
                }
              }}
            >
              {selectedTask.progress >= 100 
                ? "Tugas Selesai" 
                : ('mission' in selectedTask 
                  ? "Kumpulkan Quest" 
                  : ((selectedTask as any).type === "lesson" ? "Saya Sudah Membaca Materi Ini" : "Buka dan Kerjakan"))}
            </button>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function ProfessionalDashboard({
  user,
  dashboard,
  adminUsers,
  adminAccess,
  adminClasses,
  activeMenu,
  busy,
  error,
  onChangeMenu,
  onLogout,
  onSwitchRole,
  onUpdateAdminUser,
  onUpdateRolePermissions,
  onCreateAdminClass,
  onUpdateAdminClass,
  onDeleteAdminClass
}: {
  user: AuthUser;
  dashboard: Dashboard;
  adminUsers: AdminUser[];
  adminAccess: AdminAccess | null;
  adminClasses: AdminClass[];
  activeMenu: MobileNavId;
  busy: boolean;
  error: string | null;
  onChangeMenu: (id: MobileNavId) => void;
  onLogout: () => void;
  onSwitchRole: (role: RoleName) => void;
  onUpdateAdminUser: (id: string, payload: { status?: string; roles?: RoleName[] }) => void;
  onUpdateRolePermissions: (role: RoleName, permissions: string[]) => void;
  onCreateAdminClass: (payload: { teacherUserId?: string; name: string; subject: string; grade: string; students: number; status: TeacherClass["status"] }) => void;
  onUpdateAdminClass: (id: string, payload: Partial<Pick<TeacherClass, "name" | "subject" | "grade" | "students" | "progress" | "status">> & { teacherUserId?: string }) => void;
  onDeleteAdminClass: (id: string) => void;
}) {
  const [adminView, setAdminView] = useState<AdminView>("home");
  const features = roleFeatures[user.activeRole];
  const isTeacher = user.activeRole === "teacher";
  const activeLabel = roleMenuLabels[user.activeRole][activeMenu];
  const shellClass = isTeacher ? "teacher-futuristic-shell professional-shell min-h-screen pb-28 md:pb-0" : "professional-shell min-h-screen";
  const topbarClass = isTeacher ? "teacher-futuristic-topbar professional-topbar" : "professional-topbar";
  const heroClass = isTeacher ? "teacher-futuristic-hero professional-hero" : "professional-hero";
  const metricsClass = isTeacher ? "teacher-futuristic-metrics professional-metrics" : "professional-metrics";
  const gridClass = isTeacher ? "teacher-futuristic-grid professional-grid" : "professional-grid";
  const cardClass = isTeacher ? "teacher-futuristic-card professional-card" : "professional-card";
  const featureRowClass = isTeacher ? "teacher-futuristic-feature-row professional-feature-row" : "professional-feature-row";
  const actionRowClass = isTeacher ? "teacher-futuristic-action-row professional-action-row" : "professional-action-row";
  const summaryItemClass = isTeacher ? "teacher-futuristic-summary__item professional-summary__item" : "professional-summary__item";
  const adminActions: { label: string; view: AdminView; description: string; icon: typeof ShieldCheck }[] = [
    { label: "Verifikasi user baru", view: "users", description: "Aktifkan user dan atur role.", icon: UserCog },
    { label: "Kelola kelas global", view: "classes", description: "CRUD semua kelas yang dibuat guru.", icon: GraduationCap },
    { label: "Atur role dan permission", view: "access", description: "Kelola izin tiap role.", icon: ShieldCheck },
    { label: "Pantau konfigurasi sistem", view: "system", description: "Lihat ringkasan konfigurasi.", icon: Settings }
  ];

  if (isTeacher) {
    return (
      <TeacherSpaceDashboard
        user={user}
        dashboard={dashboard}
        activeMenu={activeMenu}
        busy={busy}
        error={error}
        onChangeMenu={onChangeMenu}
        onLogout={onLogout}
        onSwitchRole={onSwitchRole}
      />
    );
  }

  return (
    <main className={shellClass}>
      <header className={topbarClass}>
        <div className="professional-topbar__brand">
          <IdeTechLogo className="professional-topbar__logo" />
          <div>
            <p className="professional-topbar__title">IdeTech</p>
            <p className="professional-topbar__subtitle">Dashboard profesional untuk {roleLabels[user.activeRole]}</p>
          </div>
        </div>
        <div className="professional-topbar__actions">
          {user.roles.length > 1 ? (
            <Select
              className="professional-select"
              value={user.activeRole}
              disabled={busy}
              aria-label="Pilih role aktif"
              onChange={(event) => onSwitchRole(event.target.value as RoleName)}
            >
              {user.roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </Select>
          ) : null}
          <button className="professional-logout" type="button" disabled={busy} onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 pb-24 md:pb-6 sm:px-6 lg:px-8">
        {error ? <ErrorBanner message={error} /> : null}
        <section className={heroClass}>
          <div>
            <p className="professional-eyebrow">{roleLabels[user.activeRole]}</p>
            <h1 className="professional-hero__title">{dashboard.title}</h1>
            <p className="professional-hero__copy">{dashboard.description}</p>
          </div>
          <div className="professional-hero__stack">
            <div className="professional-role-chip">{user.status}</div>
            {isTeacher ? <div className="professional-active-chip">{activeLabel}</div> : null}
          </div>
        </section>

        <section
          className={metricsClass}
          style={user.activeRole === "admin" ? { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" } : undefined}
        >
          {dashboard.metrics.map((metric, index) => {
            const isAdmin = user.activeRole === "admin";
            const adminColors = [
              "bg-rose-50 border-rose-200",
              "bg-emerald-50 border-emerald-200",
              "bg-violet-50 border-violet-200"
            ];
            const colorClass = isAdmin ? adminColors[index % adminColors.length] : "";
            
            return (
              <Card key={metric.label} className={`${cardClass} ${isAdmin ? "p-3 md:p-5" : "p-5"} ${colorClass}`}>
                <p className={`professional-card__label ${isAdmin ? "text-[11px] leading-tight md:text-xs" : ""}`}>{metric.label}</p>
                <p className={`professional-card__value ${isAdmin ? "text-lg md:text-2xl" : ""}`}>{metric.value}</p>
                <p className={`professional-card__hint ${isAdmin ? "text-[10px] leading-tight md:text-xs" : ""}`}>{metric.hint}</p>
              </Card>
            );
          })}
        </section>

        {user.activeRole === "admin" && adminView !== "home" ? (
          <AdminSubPage
            view={adminView}
            users={adminUsers}
            access={adminAccess}
            classes={adminClasses}
            busy={busy}
            onBack={() => setAdminView("home")}
            onUpdateUser={onUpdateAdminUser}
            onUpdateRolePermissions={onUpdateRolePermissions}
            onCreateClass={onCreateAdminClass}
            onUpdateClass={onUpdateAdminClass}
            onDeleteClass={onDeleteAdminClass}
          />
        ) : (
          <>
            <section className={gridClass}>
              <Card className={`${cardClass} p-5`}>
                <div className="professional-card__header">
                  <h2 className="professional-card__title">Fitur utama</h2>
                  <span className="professional-card__pill">{features.length} fitur</span>
                </div>
                <div className="professional-feature-list">
                  {features.map((feature) => (
                    <div key={feature.name} className={featureRowClass}>
                      <div>
                        <p className="professional-feature-row__title">{feature.name}</p>
                        <p className="professional-feature-row__desc">{feature.description}</p>
                      </div>
                      <FeatureAccessBadge access={feature.access} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className={`${cardClass} p-5 ${user.activeRole === "admin" ? "hidden md:block" : ""}`}>
                <div className="professional-card__header">
                  <h2 className="professional-card__title">Aksi cepat</h2>
                </div>
                <div className="professional-action-list">
                  {(user.activeRole === "admin" ? adminActions : dashboard.actions.map((action) => ({ label: action, view: "home" as AdminView, description: "", icon: ChevronRight }))).map((action) => {
                    const Icon = action.icon;
                    return (
                      <button key={action.label} type="button" className={`${actionRowClass} professional-action-button`} onClick={() => user.activeRole === "admin" && setAdminView(action.view)}>
                        <span className="professional-action-button__icon">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <strong>{action.label}</strong>
                          {action.description ? <small>{action.description}</small> : null}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              </Card>
            </section>

            {user.activeRole !== "admin" ? (
              <Card className={`${cardClass} p-5`}>
                <div className="professional-card__header">
                  <h2 className="professional-card__title">Ringkasan role</h2>
                </div>
                <div className="professional-summary">
                  {dashboard.modules.map((module) => (
                    <div key={module} className={summaryItemClass}>
                      <span>{module}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </>
        )}
      </div>

      {isTeacher ? <TeacherBottomNav active={activeMenu} onChange={onChangeMenu} /> : null}
      {user.activeRole === "admin" ? <AdminBottomNav activeView={adminView} onViewChange={setAdminView} actions={adminActions} /> : null}
    </main>
  );
}

function AdminBottomNav({
  activeView,
  onViewChange,
  actions
}: {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  actions: { label: string; view: AdminView; description: string; icon: any }[];
}) {
  const shortNames: Record<string, string> = {
    users: "User",
    classes: "Kelas",
    access: "Akses",
    system: "Sistem"
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md pb-2 pt-2 shadow-[0_-4px_24px_rgba(15,23,42,0.04)]">
      <button 
        className={`flex flex-col items-center gap-1 p-2 flex-1 ${activeView === "home" ? "text-blue-600" : "text-slate-500"}`}
        onClick={() => onViewChange("home")}
      >
        <House className="h-5 w-5" />
        <span className="text-[10px] font-bold">Beranda</span>
      </button>
      {actions.map((action) => {
        const Icon = action.icon;
        const isActive = activeView === action.view;
        return (
          <button
            key={action.view}
            className={`flex flex-col items-center gap-1 p-2 flex-1 ${isActive ? "text-blue-600" : "text-slate-500"}`}
            onClick={() => onViewChange(action.view)}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-bold">{shortNames[action.view] || action.label.split(" ")[0]}</span>
          </button>
        );
      })}
    </nav>
  );
}

function TeacherSpaceDashboard({
  user,
  dashboard,
  activeMenu,
  busy,
  error,
  onChangeMenu,
  onLogout,
  onSwitchRole
}: {
  user: AuthUser;
  dashboard: Dashboard;
  activeMenu: MobileNavId;
  busy: boolean;
  error: string | null;
  onChangeMenu: (id: MobileNavId) => void;
  onLogout: () => void;
  onSwitchRole: (role: RoleName) => void;
}) {
  const content = roleMenuContent.teacher[activeMenu];
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [classSummary, setClassSummary] = useState<TeacherClassSummary | null>(null);
  const [activeClassFilter, setActiveClassFilter] = useState<string>("all");
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [classForm, setClassForm] = useState({
    name: "",
    subject: "",
    grade: "7",
    students: "24"
  });
  const [classBusy, setClassBusy] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<TeacherMaterial[]>([]);
  const [ideQuestRows, setIdeQuestRows] = useState<TeacherIdeQuest[]>([]);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [studioBusy, setStudioBusy] = useState(false);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState({
    classId: "",
    title: "",
    type: "lesson" as TeacherMaterial["type"],
    description: "",
    content: ""
  });
  const [questForm, setQuestForm] = useState({
    classId: "",
    materialId: "",
    title: "",
    mission: "",
    points: "100",
    dueDate: ""
  });
  const featureGroups: Record<MobileNavId, RoleFeature[]> = {
    map: roleFeatures.teacher,
    quest: roleFeatures.teacher.filter((feature) => feature.name.includes("kelas") || feature.name.includes("progres")),
    studio: roleFeatures.teacher.filter((feature) => feature.name.includes("materi") || feature.name.includes("IdeQuest") || feature.name.includes("Bank")),
    rank: roleFeatures.teacher.filter((feature) => feature.name.includes("Radar") || feature.name.includes("progres")),
    profile: roleFeatures.teacher
  };
  const exploreCards = featureGroups[activeMenu].slice(0, 2);
  const listItems = featureGroups[activeMenu].slice(2, 5);

  async function loadTeacherClasses() {
    const payload = await api<{ classes: TeacherClass[]; summary: TeacherClassSummary }>("/api/teacher/classes");
    setTeacherClasses(payload.classes);
    setClassSummary(payload.summary);
  }

  async function loadTeacherStudio() {
    const [classPayload, materialPayload, questPayload] = await Promise.all([
      api<{ classes: TeacherClass[]; summary: TeacherClassSummary }>("/api/teacher/classes"),
      api<{ materials: TeacherMaterial[] }>("/api/teacher/materials"),
      api<{ quests: TeacherIdeQuest[] }>("/api/teacher/idequests")
    ]);
    setTeacherClasses(classPayload.classes);
    setClassSummary(classPayload.summary);
    setMaterials(materialPayload.materials);
    setIdeQuestRows(questPayload.quests);

    const firstClassId = classPayload.classes[0]?.id ?? "";
    setMaterialForm((current) => ({ ...current, classId: current.classId || firstClassId }));
    setQuestForm((current) => ({ ...current, classId: current.classId || firstClassId }));
  }

  useEffect(() => {
    if (activeMenu !== "quest") return;

    loadTeacherClasses().catch((err: Error) => {
      setClassError(err.message);
    });
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== "studio") return;

    loadTeacherStudio().catch((err: Error) => {
      setStudioError(err.message);
    });
  }, [activeMenu]);

  async function createTeacherClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClassBusy(true);
    setClassError(null);

    try {
      await api<{ class: TeacherClass }>("/api/teacher/classes", {
        method: "POST",
        body: JSON.stringify({
          name: classForm.name,
          subject: classForm.subject,
          grade: classForm.grade,
          students: Number(classForm.students)
        })
      });
      setClassForm({ name: "", subject: "", grade: "7", students: "24" });
      await loadTeacherClasses();
    } catch (err) {
      setClassError(err instanceof Error ? err.message : "Gagal menambah kelas.");
    } finally {
      setClassBusy(false);
    }
  }

  async function createMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStudioBusy(true);
    setStudioError(null);

    try {
      if (editingMaterialId) {
        await api<{ material: TeacherMaterial }>(`/api/teacher/materials/${editingMaterialId}`, {
          method: "PATCH",
          body: JSON.stringify(materialForm)
        });
        setEditingMaterialId(null);
      } else {
        await api<{ material: TeacherMaterial }>("/api/teacher/materials", {
          method: "POST",
          body: JSON.stringify(materialForm)
        });
      }
      setMaterialForm((current) => ({ ...current, title: "", description: "" }));
      await loadTeacherStudio();
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Gagal menyimpan materi.");
    } finally {
      setStudioBusy(false);
    }
  }

  async function createIdeQuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStudioBusy(true);
    setStudioError(null);

    try {
      const payload = {
        ...questForm,
        materialId: questForm.materialId || undefined,
        points: Number(questForm.points)
      };

      if (editingQuestId) {
        await api<{ quest: TeacherIdeQuest }>(`/api/teacher/idequests/${editingQuestId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setEditingQuestId(null);
      } else {
        await api<{ quest: TeacherIdeQuest }>("/api/teacher/idequests", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setQuestForm((current) => ({ ...current, materialId: "", title: "", mission: "", points: "100", dueDate: "" }));
      await loadTeacherStudio();
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Gagal menyimpan IdeQuest.");
    } finally {
      setStudioBusy(false);
    }
  }

  function startEditMaterial(material: TeacherMaterial) {
    setEditingMaterialId(material.id);
    setMaterialForm({
      classId: material.classId,
      title: material.title,
      type: material.type,
      description: material.description,
      content: material.content ?? ""
    });
  }

  function cancelEditMaterial() {
    setEditingMaterialId(null);
    setMaterialForm({ classId: "", title: "", type: "lesson", description: "", content: "" });
  }

  function startEditQuest(quest: TeacherIdeQuest) {
    setEditingQuestId(quest.id);
    setQuestForm({
      classId: quest.classId,
      materialId: quest.materialId ?? "",
      title: quest.title,
      mission: quest.mission,
      points: String(quest.points),
      dueDate: quest.dueDate
    });
  }

  function cancelEditQuest() {
    setEditingQuestId(null);
    setQuestForm({ classId: "", materialId: "", title: "", mission: "", points: "100", dueDate: "" });
  }

  function openTeacherFeature(featureName: string) {
    if (featureName.includes("Jurnal") || featureName.includes("jurnal")) {
      setActiveFeature("jurnal");
      return;
    }

    if (featureName.includes("kelas")) {
      onChangeMenu("quest");
      return;
    }

    if (featureName.includes("materi") || featureName.includes("IdeQuest") || featureName.includes("Bank")) {
      onChangeMenu("studio");
      return;
    }

    if (featureName.includes("progres") || featureName.includes("Radar")) {
      onChangeMenu("rank");
      return;
    }

    onChangeMenu("map");
  }

  return (
    <main className="teacher-space-shell min-h-screen relative">
      <div className="teacher-space-backdrop" />
      <section className="teacher-space-board">
        {error ? <ErrorBanner message={error} /> : null}

        <article className="teacher-space-phone is-primary">
          <header className="teacher-space-phone__top">
            <button className="teacher-space-icon-button" type="button" aria-label="Kembali">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <h1 className="teacher-space-logo-title">
              <IdeTechLogo className="teacher-space-logo" />
              IdeTech
            </h1>
            <button className="teacher-space-menu-button" type="button" aria-label="Menu guru">
              <Boxes className="h-5 w-5" />
            </button>
          </header>

          <div className="teacher-planet-stage">
            <div className="teacher-planet-card">
              <div className="teacher-planet" />
            </div>
            <p className="teacher-planet-caption">{roleMenuLabels.teacher[activeMenu]}</p>
            <div className="teacher-orbit-row" aria-hidden="true">
              <span className="teacher-mini-planet is-a" />
              <span className="teacher-mini-planet is-b" />
              <span className="teacher-mini-planet is-c" />
              <span className="teacher-mini-planet is-d" />
            </div>
          </div>

          <section className="teacher-space-info">
            <div className="teacher-space-info__heading">
              <div>
                <h2>{activeMenu === "map" ? `Selamat datang, ${user.name}` : content.title}</h2>
                <p>{content.subtitle}</p>
              </div>
              {activeMenu === "profile" ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-transparent">
                  <BadgeCheck className="h-8 w-8 text-blue-500" />
                </div>
              ) : (
                <button type="button" onClick={() => onChangeMenu(activeMenu === "map" ? "profile" : activeMenu)}>
                  {activeMenu === "map" ? "Profil" : "More"}
                </button>
              )}
            </div>
            <div className="teacher-distance-pill">
              <span>
                {activeMenu === "map" ? <House className="h-5 w-5" /> :
                 activeMenu === "quest" ? <Users className="h-5 w-5" /> :
                 activeMenu === "studio" ? <BookOpen className="h-5 w-5" /> :
                 activeMenu === "rank" ? <Target className="h-5 w-5" /> :
                 <UserRound className="h-5 w-5" />}
              </span>
              {activeMenu === "studio" ? (
                <div className="flex items-center gap-6">
                  <div>
                    <small>Materi</small>
                    <strong>{materials.length}</strong>
                  </div>
                  <div className="h-8 w-px bg-blue-900/10"></div>
                  <div>
                    <small>IdeQuest</small>
                    <strong>{ideQuestRows.length}</strong>
                  </div>
                </div>
              ) : (
                <div>
                  <small>{activeMenu === "map" ? "Kelas Dibuat" : activeMenu === "quest" ? `${teacherClasses.length} Kelas` : content.badge}</small>
                  <strong>{activeMenu === "map" ? teacherClasses.length : activeMenu === "quest" ? `${classSummary?.totalStudents ?? 0} Siswa` : activeMenu === "profile" ? (user.fullName || user.name) : content.progress}</strong>
                </div>
              )}
              <div className="flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-blue-900/20" />
              </div>
            </div>
          </section>
        </article>

        <article className="teacher-space-phone is-explore">
          <header className="teacher-space-explore-head">
            <div>
              <h2>Let&apos;s Explore</h2>
              <p>{dashboard.title}</p>
            </div>
            <div className="teacher-space-avatar">
              {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} /> : <span>{user.name.slice(0, 2).toUpperCase()}</span>}
            </div>
          </header>

          {activeMenu !== "profile" && activeFeature !== "jurnal" ? (
            <div className="flex items-center mt-6 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-xl mb-6 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20">
              <div className="pl-4 pr-2 text-slate-400">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <select
                value={activeClassFilter}
                onChange={(e) => setActiveClassFilter(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 py-3 pr-4 text-sm font-bold text-slate-700 outline-none appearance-none"
              >
                <option value="all">Semua Kelas Aktif</option>
                {teacherClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name} ({cls.subject})</option>
                ))}
              </select>
              <div className="pr-4 pointer-events-none text-slate-400">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </div>
            </div>
          ) : null}

          {activeFeature !== "jurnal" && (
            <nav className="teacher-space-tabs" aria-label="Navigasi guru">
              {teacherMobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "teacher-space-tab is-active" : "teacher-space-tab"}
                    onClick={() => onChangeMenu(item.id)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {activeFeature === "jurnal" ? (
            <TeacherJournalView onClose={() => { setActiveFeature(null); onChangeMenu("map"); }} />
          ) : activeMenu === "studio" ? (
            <TeacherStudioManager
              classes={teacherClasses}
              materials={activeClassFilter === "all" ? materials : materials.filter(m => m.classId === activeClassFilter)}
              quests={activeClassFilter === "all" ? ideQuestRows : ideQuestRows.filter(q => q.classId === activeClassFilter)}
              materialForm={materialForm}
              questForm={questForm}
              busy={studioBusy}
              error={studioError}
              editingMaterialId={editingMaterialId}
              editingQuestId={editingQuestId}
              onMaterialFormChange={setMaterialForm}
              onQuestFormChange={setQuestForm}
              onCreateMaterial={createMaterial}
              onCreateQuest={createIdeQuest}
              onEditMaterial={startEditMaterial}
              onEditQuest={startEditQuest}
              onCancelEditMaterial={cancelEditMaterial}
              onCancelEditQuest={cancelEditQuest}
            />
          ) : activeMenu === "quest" ? (
            <TeacherClassManager
              classes={activeClassFilter === "all" ? teacherClasses : teacherClasses.filter(c => c.id === activeClassFilter)}
              summary={classSummary}
              form={classForm}
              busy={classBusy}
              error={classError}
              onFormChange={setClassForm}
              onCreate={createTeacherClass}
            />
          ) : activeMenu === "profile" ? (
            <TeacherProfileView user={user} />
          ) : (
            <>
              <section className="teacher-space-card-grid">
                {exploreCards.map((feature, index) => (
                  <button
                    key={feature.name}
                    className={index === 0 ? "teacher-space-planet-card is-warm" : "teacher-space-planet-card is-green"}
                    type="button"
                    onClick={() => openTeacherFeature(feature.name)}
                  >
                    <span className="teacher-feature-orb" />
                    <strong>{feature.name}</strong>
                    <small>{feature.cta}</small>
                    <ChevronRight className="teacher-feature-arrow h-5 w-5" />
                  </button>
                ))}
              </section>

              <section className="teacher-space-list">
                {(listItems.length ? listItems : roleFeatures.teacher.slice(0, 3)).map((feature, index) => {
                  const Icon = index === 0 ? Gauge : index === 1 ? BookOpen : Target;

                  return (
                    <button key={feature.name} className="teacher-space-list-card" type="button" onClick={() => openTeacherFeature(feature.name)}>
                      <span>
                        <Icon className="h-6 w-6" />
                      </span>
                      <div>
                        <strong>{feature.name}</strong>
                        <small>{feature.description}</small>
                      </div>
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  );
                })}
              </section>
            </>
          )}

          <footer className="teacher-space-footer">
            {user.roles.length > 1 ? (
              <Select
                className="teacher-space-select"
                value={user.activeRole}
                disabled={busy}
                aria-label="Pilih role aktif"
                onChange={(event) => onSwitchRole(event.target.value as RoleName)}
              >
                {user.roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="teacher-space-role">{roleLabels[user.activeRole]}</span>
            )}
            <button className="teacher-space-logout" type="button" disabled={busy} onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </footer>
        </article>
      </section>

      <TeacherBottomNav active={activeMenu} onChange={onChangeMenu} />
    </main>
  );
}

function TeacherStudioManager({
  classes,
  materials,
  quests,
  materialForm,
  questForm,
  busy,
  error,
  editingMaterialId,
  editingQuestId,
  onMaterialFormChange,
  onQuestFormChange,
  onCreateMaterial,
  onCreateQuest,
  onEditMaterial,
  onEditQuest,
  onCancelEditMaterial,
  onCancelEditQuest
}: {
  classes: TeacherClass[];
  materials: TeacherMaterial[];
  quests: TeacherIdeQuest[];
  materialForm: { classId: string; title: string; type: TeacherMaterial["type"]; description: string; content: string };
  questForm: { classId: string; materialId: string; title: string; mission: string; points: string; dueDate: string };
  busy: boolean;
  error: string | null;
  editingMaterialId?: string | null;
  editingQuestId?: string | null;
  onMaterialFormChange: React.Dispatch<React.SetStateAction<{ classId: string; title: string; type: TeacherMaterial["type"]; description: string; content: string }>>;
  onQuestFormChange: React.Dispatch<React.SetStateAction<{ classId: string; materialId: string; title: string; mission: string; points: string; dueDate: string }>>;
  onCreateMaterial: (event: React.FormEvent<HTMLFormElement>) => void;
  onCreateQuest: (event: React.FormEvent<HTMLFormElement>) => void;
  onEditMaterial?: (material: TeacherMaterial) => void;
  onEditQuest?: (quest: TeacherIdeQuest) => void;
  onCancelEditMaterial?: () => void;
  onCancelEditQuest?: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<"material" | "quest">("material");
  const [showMarkdownGuide, setShowMarkdownGuide] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = materialForm.content || "";
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    
    const newText = before + prefix + selected + suffix + after;
    onMaterialFormChange((current) => ({ ...current, content: newText }));
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 0);
  };
  const selectedClassMaterials = materials.filter((material) => material.classId === questForm.classId);

  let quizData: { soal: string; jawaban: string[] }[] = [];
  if (materialForm.type === "quiz") {
    try {
      quizData = JSON.parse(materialForm.content || "[]");
      if (!Array.isArray(quizData)) quizData = [];
    } catch {
      quizData = [];
    }
  }

  const updateQuizData = (newData: { soal: string; jawaban: string[] }[]) => {
    onMaterialFormChange((current) => ({ ...current, content: JSON.stringify(newData) }));
  };

  const [showBankModal, setShowBankModal] = React.useState(false);
  const [showRequestsModal, setShowRequestsModal] = React.useState(false);
  const [bankTab, setBankTab] = React.useState<"material" | "quest">("material");
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  
  const [bankItems, setBankItems] = React.useState<{ materials: any[]; quests: any[] }>({ materials: [], quests: [] });
  const [bankRequests, setBankRequests] = React.useState<{ incoming: any[]; outgoing: any[] }>({ incoming: [], outgoing: [] });
  const [requestTargetClass, setRequestTargetClass] = React.useState<Record<string, string>>({});
  
  const loadBankPublic = async () => {
    try {
      const data = await api<{ materials: any[]; quests: any[] }>("/api/teacher/bank-public");
      setBankItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBankRequests = async () => {
    try {
      const data = await api<{ incoming: any[]; outgoing: any[] }>("/api/teacher/bank-requests");
      setBankRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    if (showBankModal) loadBankPublic();
  }, [showBankModal]);

  React.useEffect(() => {
    if (showRequestsModal) loadBankRequests();
  }, [showRequestsModal]);

  const sendBankRequest = async (type: "material" | "quest", id: string) => {
    const classId = requestTargetClass[id];
    if (!classId) return alert("Pilih kelas tujuan terlebih dahulu.");
    try {
      await api("/api/teacher/bank-requests", {
        method: "POST",
        body: JSON.stringify({ itemType: type, itemId: id, targetClassId: classId })
      });
      showToast("Permohonan berhasil dikirim ke pembuat.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memohon.");
    }
  };

  const processBankRequest = async (id: string, status: "approved" | "rejected") => {
    try {
      await api(`/api/teacher/bank-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      showToast(status === "approved" ? "Permohonan disetujui." : "Permohonan ditolak.");
      loadBankRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memproses permohonan.");
    }
  };

  const pendingIncomingRequests = bankRequests.incoming.filter(r => r.status === 'pending').length;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <section className="teacher-studio-manager">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Studio Pembuatan</h2>
        <div className="flex gap-2">
          <button 
            type="button" 
            onClick={() => setShowRequestsModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 border border-slate-200 font-bold rounded-lg shadow-sm hover:shadow text-sm transition-all hover:border-blue-300 relative"
          >
            <Bell className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Permintaan</span>
            {pendingIncomingRequests > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-white"></span>
            )}
          </button>
          <button 
            type="button" 
            onClick={() => setShowBankModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-sm hover:shadow text-sm transition-all hover:scale-105"
          >
            <BookOpen className="h-4 w-4" />
            Bank IdeTech
          </button>
        </div>
      </div>

      <div className="flex bg-slate-100 rounded-lg p-1 mb-4 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("material")}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === "material" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Buat Materi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("quest")}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === "quest" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Buat IdeQuest
        </button>
      </div>

      {activeTab === "material" && (
        <form className="teacher-studio-form" onSubmit={onCreateMaterial}>
        <div className="teacher-studio-form__header">
          <BookOpen className="h-6 w-6" />
          <div>
            <h3>Buat Materi</h3>
            <p>Materi langsung terhubung ke siswa di kelas yang dipilih.</p>
          </div>
        </div>
        <label>
          <span>Kelas tujuan</span>
          <select
            value={materialForm.classId}
            onChange={(event) => onMaterialFormChange((current) => ({ ...current, classId: event.target.value }))}
          >
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <div className="teacher-studio-form__grid">
          <label>
            <span>Judul materi</span>
            <input
              value={materialForm.title}
              placeholder="Energi di Sekitar Kita"
              onChange={(event) => onMaterialFormChange((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label>
            <span>Tipe</span>
            <select
              value={materialForm.type}
              onChange={(event) => onMaterialFormChange((current) => ({ ...current, type: event.target.value as TeacherMaterial["type"] }))}
            >
              <option value="lesson">Lesson</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="quiz">Quiz</option>
            </select>
          </label>
        </div>
        <label>
          <span>Deskripsi Singkat</span>
          <textarea
            value={materialForm.description}
            placeholder="Ringkasan materi untuk siswa..."
            onChange={(event) => onMaterialFormChange((current) => ({ ...current, description: event.target.value }))}
          />
        </label>
        
        {materialForm.type === 'lesson' && (
          <label>
            <span className="flex items-center gap-2 mb-2">
              Isi Lesson (Teks/Markdown)
              <button
                type="button"
                onClick={() => setShowMarkdownGuide(true)}
                className="text-blue-500/70 hover:text-blue-500 transition-colors focus:outline-none rounded-full p-0.5 hover:bg-blue-50"
                aria-label="Petunjuk penulisan Markdown"
                title="Petunjuk penulisan Markdown"
              >
                <Info className="h-4 w-4" />
              </button>
            </span>
            <div className="flex flex-wrap gap-1 mb-2 bg-slate-100 p-1.5 rounded-md border border-slate-200">
              <button type="button" onClick={() => insertMarkdown("### ", "")} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors" title="Heading"><Heading className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertMarkdown("**", "**")} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors" title="Tebal"><Bold className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertMarkdown("*", "*")} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors" title="Miring"><Italic className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertMarkdown("<u>", "</u>")} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors" title="Garis Bawah"><Underline className="w-4 h-4" /></button>
              <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
              <button type="button" onClick={() => insertMarkdown("[", "](https://)")} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors" title="Hyperlink"><Link className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertMarkdown("![Deskripsi](", ")")} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors" title="Gambar"><ImageIcon className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertMarkdown("<div align=\"center\">\n", "\n</div>")} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors" title="Rata Tengah"><AlignCenter className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertMarkdown("<div align=\"justify\">\n", "\n</div>")} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors" title="Rata Kanan Kiri"><AlignJustify className="w-4 h-4" /></button>
              <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
              <button type="button" onClick={() => insertMarkdown("- ", "")} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors" title="Bullets"><List className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertMarkdown("1. ", "")} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors" title="Numbering"><ListOrdered className="w-4 h-4" /></button>
            </div>
            <textarea
              ref={textareaRef}
              rows={6}
              value={materialForm.content}
              placeholder="Ketik materi lesson Anda secara mendetail di sini..."
              onChange={(event) => onMaterialFormChange((current) => ({ ...current, content: event.target.value }))}
            />
          </label>
        )}
        
        {materialForm.type === 'video' && (
          <label>
            <span>URL Video (YouTube / Embed)</span>
            <input
              type="text"
              value={materialForm.content}
              placeholder="Contoh: https://youtube.com/watch?v=..."
              onChange={(event) => onMaterialFormChange((current) => ({ ...current, content: event.target.value }))}
            />
          </label>
        )}
        
        {materialForm.type === 'document' && (
          <label>
            <span>URL Dokumen (PDF)</span>
            <input
              type="text"
              value={materialForm.content}
              placeholder="Contoh: https://idetech.app/assets/materi.pdf"
              onChange={(event) => onMaterialFormChange((current) => ({ ...current, content: event.target.value }))}
            />
          </label>
        )}
        
        {materialForm.type === 'quiz' && (
          <div className="flex flex-col gap-3">
            <span className="font-semibold text-slate-700 text-sm">Daftar Pertanyaan Kuis</span>
            {quizData.map((q, i) => (
              <div key={i} className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-500 uppercase tracking-wider">Soal {i + 1}</span>
                  <button type="button" onClick={() => updateQuizData(quizData.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 transition-colors p-1 bg-white rounded shadow-sm border border-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ketik pertanyaan soal di sini..."
                  value={q.soal}
                  onChange={(e) => {
                    const newQ = [...quizData];
                    newQ[i].soal = e.target.value;
                    updateQuizData(newQ);
                  }}
                  className="w-full text-sm border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2 px-3 bg-white"
                />
                <input
                  type="text"
                  placeholder="Kunci jawaban (pisahkan dengan koma jika > 1)"
                  value={q.jawaban.join(", ")}
                  onChange={(e) => {
                    const newQ = [...quizData];
                    newQ[i].jawaban = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                    updateQuizData(newQ);
                  }}
                  className="w-full text-sm border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2 px-3 bg-white"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateQuizData([...quizData, { soal: "", jawaban: [] }])}
              className="flex items-center justify-center gap-2 w-full py-3 mt-1 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm font-bold shadow-sm"
            >
              <Plus className="h-5 w-5" /> Tambah Soal Kuis
            </button>
          </div>
        )}

        {error && activeTab === "material" ? <p className="teacher-class-error mb-4">{error}</p> : null}
        <div className="flex gap-2">
          {editingMaterialId && onCancelEditMaterial ? (
            <button type="button" onClick={onCancelEditMaterial} className="bg-slate-200 text-slate-700 hover:bg-slate-300">Batal</button>
          ) : null}
          <button className="flex-1" type="submit" disabled={busy || classes.length === 0}>{busy ? "Menyimpan..." : editingMaterialId ? "Update Materi" : "Publikasikan Materi"}</button>
        </div>
      </form>
      )}

      {activeTab === "quest" && (
      <form className="teacher-studio-form" onSubmit={onCreateQuest}>
        <div className="teacher-studio-form__header">
          <Puzzle className="h-6 w-6" />
          <div>
            <h3>Buat IdeQuest</h3>
            <p>Quest akan muncul untuk siswa yang terdaftar di kelas tujuan.</p>
          </div>
        </div>
        <div className="teacher-studio-form__grid">
          <label>
            <span>Kelas tujuan</span>
            <select
              value={questForm.classId}
              onChange={(event) => onQuestFormChange((current) => ({ ...current, classId: event.target.value, materialId: "" }))}
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Materi terkait</span>
            <select
              value={questForm.materialId}
              onChange={(event) => onQuestFormChange((current) => ({ ...current, materialId: event.target.value }))}
            >
              <option value="">Tanpa materi</option>
              {selectedClassMaterials.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>Judul IdeQuest</span>
          <input
            value={questForm.title}
            placeholder="Misi Energi Rumah"
            onChange={(event) => onQuestFormChange((current) => ({ ...current, title: event.target.value }))}
          />
        </label>
        <label>
          <span>Misi siswa</span>
          <textarea
            value={questForm.mission}
            placeholder="Instruksi misi untuk siswa..."
            onChange={(event) => onQuestFormChange((current) => ({ ...current, mission: event.target.value }))}
          />
        </label>
        <div className="teacher-studio-form__grid">
          <label>
            <span>Poin</span>
            <input
              min="0"
              type="number"
              value={questForm.points}
              onChange={(event) => onQuestFormChange((current) => ({ ...current, points: event.target.value }))}
            />
          </label>
          <label>
            <span>Deadline</span>
            <input
              type="datetime-local"
              value={questForm.dueDate}
              onChange={(event) => onQuestFormChange((current) => ({ ...current, dueDate: event.target.value }))}
            />
          </label>
        </div>
        {error && activeTab === "quest" ? <p className="teacher-class-error">{error}</p> : null}
        <div className="flex gap-2">
          {editingQuestId && onCancelEditQuest ? (
            <button type="button" onClick={onCancelEditQuest} className="bg-slate-200 text-slate-700 hover:bg-slate-300">Batal</button>
          ) : null}
          <button className="flex-1" type="submit" disabled={busy || classes.length === 0}>{busy ? "Menyimpan..." : editingQuestId ? "Update IdeQuest" : "Publikasikan IdeQuest"}</button>
        </div>
      </form>
      )}

      <div className="teacher-studio-board">
        <div>
          <h3>Materi Terbit</h3>
          {materials.slice(0, 4).map((item) => (
            <article key={item.id} className="flex justify-between items-center group relative p-3 bg-white rounded-lg border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
              <div className="flex flex-col">
                <strong>{item.title}</strong>
                <span className="text-xs text-slate-500">{item.type} - {classes.find((kelas) => kelas.id === item.classId)?.name ?? "Kelas"}</span>
              </div>
              <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={async () => {
                  try {
                    await api("/api/teacher/bank-submit", { method: "POST", body: JSON.stringify({ type: "material", id: item.id }) });
                    showToast("Materi ini akan ditinjau oleh tim IdeTech sebelum masuk ke Bank Materi.");
                  } catch (err) {
                    alert(err instanceof Error ? err.message : "Gagal mengirim ke bank.");
                  }
                }} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Kirim ke Bank Materi">
                  <Upload className="h-4 w-4" />
                </button>
                {onEditMaterial && (
                  <button type="button" onClick={() => onEditMaterial(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Materi">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        <div>
          <h3>IdeQuest Terbit</h3>
          {quests.slice(0, 4).map((item) => (
            <article key={item.id} className="flex justify-between items-center group relative p-3 bg-white rounded-lg border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
              <div className="flex flex-col">
                <strong>{item.title}</strong>
                <span className="text-xs text-slate-500">{item.points} poin - {item.dueDate}</span>
              </div>
              <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={async () => {
                  try {
                    await api("/api/teacher/bank-submit", { method: "POST", body: JSON.stringify({ type: "quest", id: item.id }) });
                    showToast("IdeQuest ini akan ditinjau oleh tim IdeTech sebelum masuk ke Bank IdeQuest.");
                  } catch (err) {
                    alert(err instanceof Error ? err.message : "Gagal mengirim ke bank.");
                  }
                }} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Kirim ke Bank IdeQuest">
                  <Upload className="h-4 w-4" />
                </button>
                {onEditQuest && (
                  <button type="button" onClick={() => onEditQuest(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit IdeQuest">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {showMarkdownGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Panduan Markdown
              </h3>
              <button type="button" onClick={() => setShowMarkdownGuide(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-slate-600 text-sm space-y-4">
              <p>Anda dapat menggunakan sintaks Markdown untuk mengatur format teks materi secara cepat:</p>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs sm:text-sm">
                <div><strong>**Tebal**</strong></div>
                <div><span className="font-bold">Tebal</span></div>
                
                <div><em>*Miring*</em></div>
                <div><span className="italic">Miring</span></div>
                
                <div># Heading 1</div>
                <div className="text-lg font-bold">Heading 1</div>
                
                <div>## Heading 2</div>
                <div className="text-base font-bold">Heading 2</div>
                
                <div>- Item 1<br/>- Item 2</div>
                <ul className="list-disc pl-4 m-0"><li>Item 1</li><li>Item 2</li></ul>
                
                <div>[Teks](https://...)</div>
                <div className="text-blue-500 underline">Teks Tautan</div>
                
                <div>![Gambar](url)</div>
                <div className="text-slate-500 flex items-center gap-1"><ImageIcon className="h-3 w-3"/> Gambar</div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="button" onClick={() => setShowMarkdownGuide(false)}>Tutup Panduan</Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showBankModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                Bank IdeTech
              </h3>
              <button type="button" onClick={() => setShowBankModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex border-b border-slate-100 bg-white">
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${bankTab === 'material' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                onClick={() => setBankTab('material')}
              >
                Bank Materi
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${bankTab === 'quest' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                onClick={() => setBankTab('quest')}
              >
                Bank IdeQuest
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
              {bankTab === 'material' ? (
                bankItems.materials.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 bg-white rounded-xl border border-slate-100 shadow-sm">Belum ada materi di bank.</div>
                ) : (
                  bankItems.materials.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div>
                        <h4 className="font-bold text-slate-800">{item.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">Oleh: {item.teacherName} • Tipe: {item.type}</p>
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{item.description}</p>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <select 
                          className="text-xs border border-slate-200 rounded p-1.5 w-full bg-slate-50 focus:border-blue-400 focus:outline-none"
                          value={requestTargetClass[item.id] || ""}
                          onChange={(e) => setRequestTargetClass(prev => ({...prev, [item.id]: e.target.value}))}
                        >
                          <option value="">-- Pilih Kelas Tujuan --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <Button type="button" onClick={() => sendBankRequest("material", item.id)} className="w-full text-xs py-1.5">Minta Izin Penggunaan</Button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                bankItems.quests.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 bg-white rounded-xl border border-slate-100 shadow-sm">Belum ada IdeQuest di bank.</div>
                ) : (
                  bankItems.quests.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div>
                        <h4 className="font-bold text-slate-800">{item.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">Oleh: {item.teacherName} • Poin: {item.points}</p>
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{item.mission}</p>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <select 
                          className="text-xs border border-slate-200 rounded p-1.5 w-full bg-slate-50 focus:border-blue-400 focus:outline-none"
                          value={requestTargetClass[item.id] || ""}
                          onChange={(e) => setRequestTargetClass(prev => ({...prev, [item.id]: e.target.value}))}
                        >
                          <option value="">-- Pilih Kelas Tujuan --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <Button type="button" onClick={() => sendBankRequest("quest", item.id)} className="w-full text-xs py-1.5">Minta Izin Penggunaan</Button>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
              <button type="button" onClick={() => setShowBankModal(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors">
                Tutup Bank
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                Permintaan Bank IdeTech
              </h3>
              <button type="button" onClick={() => setShowRequestsModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
              <div>
                <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
                  Permintaan Masuk
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{bankRequests.incoming.length}</span>
                </h4>
                {bankRequests.incoming.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Belum ada permintaan masuk dari guru lain.</p>
                ) : (
                  <div className="space-y-3">
                    {bankRequests.incoming.map(req => (
                      <div key={req.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-semibold text-slate-800">{req.requesterName}</span> meminta izin untuk menggunakan <span className="font-semibold text-blue-600">{req.itemTitle}</span> ({req.itemType})
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mb-3">Tujuan: Kelas ID {req.targetClassId} • Dikirim: {new Date(req.createdAt).toLocaleDateString()}</div>
                        {req.status === 'pending' && (
                          <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100">
                            <Button type="button" onClick={() => processBankRequest(req.id, "approved")} className="px-3 py-1.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 border-none shadow-none"><CheckCircle2 className="w-3.5 h-3.5 mr-1 inline"/> Izinkan</Button>
                            <Button type="button" onClick={() => processBankRequest(req.id, "rejected")} className="px-3 py-1.5 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border-none shadow-none"><X className="w-3.5 h-3.5 mr-1 inline"/> Tolak</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
                  Permintaan Keluar
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{bankRequests.outgoing.length}</span>
                </h4>
                {bankRequests.outgoing.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Anda belum pernah meminta izin materi guru lain.</p>
                ) : (
                  <div className="space-y-3">
                    {bankRequests.outgoing.map(req => (
                      <div key={req.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            Anda meminta izin kepada <span className="font-semibold text-slate-800">{req.ownerName}</span> untuk menggunakan <span className="font-semibold text-blue-600">{req.itemTitle}</span> ({req.itemType})
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Tujuan: Kelas ID {req.targetClassId} • Dikirim: {new Date(req.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
              <button type="button" onClick={() => setShowRequestsModal(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-800 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-3 text-sm font-medium border border-slate-700">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            {toastMessage}
          </div>
        </div>
      )}
    </section>
  );
}

function TeacherClassManager({
  classes,
  summary,
  form,
  busy,
  error,
  onFormChange,
  onCreate
}: {
  classes: TeacherClass[];
  summary: TeacherClassSummary | null;
  form: { name: string; subject: string; grade: string; students: string };
  busy: boolean;
  error: string | null;
  onFormChange: React.Dispatch<React.SetStateAction<{ name: string; subject: string; grade: string; students: string }>>;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="teacher-class-manager">
      <div className="teacher-class-summary">
        <div>
          <span>Kelas</span>
          <strong>{summary?.totalClasses ?? classes.length}</strong>
        </div>
        <div>
          <span>Siswa</span>
          <strong>{summary?.totalStudents ?? classes.reduce((total, item) => total + item.students, 0)}</strong>
        </div>
        <div>
          <span>Progres</span>
          <strong>{summary?.averageProgress ?? 0}%</strong>
        </div>
      </div>

      <form className="teacher-class-form" onSubmit={onCreate}>
        <div className="teacher-class-form__grid">
          <label>
            <span>Nama kelas</span>
            <input
              value={form.name}
              placeholder="IPA 7A"
              onChange={(event) => onFormChange((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label>
            <span>Mapel</span>
            <input
              value={form.subject}
              placeholder="Sains"
              onChange={(event) => onFormChange((current) => ({ ...current, subject: event.target.value }))}
            />
          </label>
          <label>
            <span>Jenjang</span>
            <Select
              value={form.grade}
              onChange={(event) => onFormChange((current) => ({ ...current, grade: event.target.value }))}
            >
              {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((grade) => (
                <option key={grade} value={grade}>
                  Kelas {grade}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>Jumlah siswa</span>
            <input
              min="0"
              type="number"
              value={form.students}
              onChange={(event) => onFormChange((current) => ({ ...current, students: event.target.value }))}
            />
          </label>
        </div>
        <div className="teacher-class-auto-id">
          <span>ClassID</span>
          <strong>Otomatis dibuat saat kelas disimpan</strong>
          <small>ClassID dipakai siswa untuk masuk ke kelas yang sesuai.</small>
        </div>
        {error ? <p className="teacher-class-error">{error}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? "Menyimpan..." : "Tambah Kelas"}
        </button>
      </form>

      <div className="teacher-class-list">
        {classes.map((item) => (
          <article key={item.id} className="teacher-class-card">
            <div>
              <strong>{item.name}</strong>
              <span>{item.subject} - {item.grade}</span>
              <small>ClassID: {item.classCode ?? item.nextSession}</small>
            </div>
            <div className="teacher-class-card__meta">
              <span>{item.students} siswa</span>
              <b>{item.progress}%</b>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TeacherDesktopSidebar({
  active,
  onChange
}: {
  active: MobileNavId;
  onChange: (id: MobileNavId) => void;
}) {
  return (
    <aside className="teacher-desktop-sidebar">
      <div className="teacher-sidebar-profile">
        <div className="teacher-sidebar-profile__avatar">GR</div>
        <div>
          <p>Mode Guru</p>
          <span>IdeTech Classroom</span>
        </div>
      </div>
      <nav className="teacher-sidebar-nav" aria-label="Navigasi dashboard guru">
        {teacherMobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "teacher-sidebar-nav__item is-active" : "teacher-sidebar-nav__item"}
              onClick={() => onChange(item.id)}
            >
              <span className="teacher-sidebar-nav__icon">
                <Icon className="h-5 w-5" />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function TeacherDesktopContent({
  active,
  dashboard,
  features,
  cardClass,
  featureRowClass,
  actionRowClass,
  summaryItemClass
}: {
  active: MobileNavId;
  dashboard: Dashboard;
  features: RoleFeature[];
  cardClass: string;
  featureRowClass: string;
  actionRowClass: string;
  summaryItemClass: string;
}) {
  const content = roleMenuContent.teacher[active];
  const featureGroups: Record<MobileNavId, RoleFeature[]> = {
    map: features,
    quest: features.filter((feature) => feature.name.includes("kelas") || feature.name.includes("progres")),
    studio: features.filter((feature) => feature.name.includes("materi") || feature.name.includes("IdeQuest") || feature.name.includes("Bank")),
    rank: features.filter((feature) => feature.name.includes("Radar") || feature.name.includes("progres")),
    profile: features
  };
  const actions: Record<MobileNavId, string[]> = {
    map: dashboard.actions,
    quest: ["Buat kelas baru", "Kelola roster siswa", "Atur agenda kelas"],
    studio: ["Buat materi interaktif", "Susun IdeQuest", "Publikasikan ke Bank Ide"],
    rank: ["Buka Radar Pintar", "Tinjau siswa berisiko", "Catat intervensi"],
    profile: ["Lihat profil guru", "Periksa permission", "Kelola sesi aktif"]
  };
  const stats = [
    { label: content.badge, value: content.progress, hint: content.button },
    { label: "Fokus", value: String(featureGroups[active].length), hint: "fitur terkait" },
    { label: "Aksi", value: String(actions[active].length), hint: "aksi cepat tersedia" }
  ];

  return (
    <>
      <section className="teacher-desktop-metrics teacher-futuristic-metrics professional-metrics">
        {stats.map((metric) => (
          <Card key={metric.label} className={`${cardClass} p-5`}>
            <p className="professional-card__label">{metric.label}</p>
            <p className="professional-card__value">{metric.value}</p>
            <p className="professional-card__hint">{metric.hint}</p>
          </Card>
        ))}
      </section>

      <section className="teacher-desktop-content-grid">
        <Card className={`${cardClass} p-5`}>
          <div className="professional-card__header">
            <h2 className="professional-card__title">Konten {roleMenuLabels.teacher[active]}</h2>
            <span className="professional-card__pill">{featureGroups[active].length} fitur</span>
          </div>
          <div className="professional-feature-list">
            {featureGroups[active].map((feature) => (
              <div key={feature.name} className={featureRowClass}>
                <div>
                  <p className="professional-feature-row__title">{feature.name}</p>
                  <p className="professional-feature-row__desc">{feature.description}</p>
                </div>
                <FeatureAccessBadge access={feature.access} />
              </div>
            ))}
          </div>
        </Card>

        <Card className={`${cardClass} p-5`}>
          <div className="professional-card__header">
            <h2 className="professional-card__title">Aksi cepat</h2>
          </div>
          <div className="professional-action-list">
            {actions[active].map((action) => (
              <div key={action} className={actionRowClass}>
                <span>{action}</span>
                <ChevronRight className="h-4 w-4 text-white/70" />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className={`${cardClass} p-5`}>
        <div className="professional-card__header">
          <h2 className="professional-card__title">Ringkasan {roleMenuLabels.teacher[active]}</h2>
        </div>
        <div className="professional-summary">
          {content.rewards.map((reward) => (
            <div key={reward} className={summaryItemClass}>
              <span>{reward}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function TeacherBottomNav({
  active,
  onChange
}: {
  active: MobileNavId;
  onChange: (id: MobileNavId) => void;
}) {
  return (
    <nav className="teacher-bottom-nav md:hidden" aria-label="Navigasi guru">
      <div className="teacher-bottom-nav__shell">
        {teacherMobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const center = item.id === "studio";

          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              className={
                center
                  ? isActive
                    ? "teacher-bottom-nav__item is-center is-active"
                    : "teacher-bottom-nav__item is-center"
                  : isActive
                    ? "teacher-bottom-nav__item is-active"
                    : "teacher-bottom-nav__item"
              }
              onClick={() => onChange(item.id)}
            >
              <span className={center ? "teacher-bottom-nav__icon-wrap is-center" : "teacher-bottom-nav__icon-wrap"}>
                <Icon className={center ? "teacher-bottom-nav__icon is-center" : "teacher-bottom-nav__icon"} />
              </span>
              <span className={center ? "teacher-bottom-nav__label is-center" : "teacher-bottom-nav__label"}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function LoginScreen({
  busy,
  error,
  onDemoLogin
}: {
  busy: boolean;
  error: string | null;
  onDemoLogin: (email: string) => void;
}) {
  return (
    <main className="landing-shell min-h-screen">
      <div className="landing-bg" aria-hidden="true" />
      <div className="landing-shell__glow" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-7 sm:px-6 lg:px-8">
        <header className="landing-nav">
          <div className="landing-brand">
            <IdeTechLogo className="landing-brand__logo" />
            <p className="landing-brand__name">IdeTech</p>
          </div>

          <nav className="landing-links" aria-label="Navigasi utama">
            <a href="#home">Home</a>
            <a href="#usecases">Usecases</a>
            <a href="#roles">Roles</a>
            <a href="#demo">Demo</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="landing-nav__cta">
            <a href="/api/auth/google" className="landing-start-button">
              Login
            </a>
          </div>
        </header>

        <section className="landing-hero" id="home">
          <div className="landing-hero__copy">
            <div className="landing-chip">
              <Sparkles className="h-4 w-4" />
              Platform belajar interaktif untuk sekolah modern
            </div>
            <h1 className="landing-title">
              Learn with
              <br />
              ease.
            </h1>
            <p className="landing-description">
              IdeTech membantu guru membuat materi, siswa menjalankan IdeQuest, orang tua memantau progres,
              dan admin menjaga sistem tetap rapi.
            </p>
            <div className="landing-actions">
              <a href="/api/auth/google">
                <Button className="landing-primary-button" disabled={busy}>
                  <BadgeCheck className="h-4 w-4" />
                  Masuk dengan Google
                </Button>
              </a>
              <button className="landing-secondary-button" type="button" onClick={() => onDemoLogin("guru@idetech.local")} disabled={busy}>
                Lihat demo guru
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {error ? <ErrorBanner message={error} /> : null}
          </div>
        </section>

        <section className="landing-demo-panel" id="demo">
          <div className="landing-demo-panel__header">
            <p className="landing-demo-panel__eyebrow">Demo role</p>
            <LayoutDashboard className="h-5 w-5 text-slate-700" />
          </div>
          <div className="landing-demo-grid">
            {demoUsers.map((demo) => (
              <button
                key={demo.email}
                className="landing-demo-card"
                disabled={busy}
                onClick={() => onDemoLogin(demo.email)}
              >
                <div>
                  <span className="landing-demo-card__label">{demo.label}</span>
                  <span className="landing-demo-card__email">{demo.email}</span>
                </div>
                <span className="landing-demo-card__role">{demo.role}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function TopBar({
  user,
  busy,
  onLogout,
  onSwitchRole
}: {
  user: AuthUser;
  busy: boolean;
  onLogout: () => void;
  onSwitchRole: (role: RoleName) => void;
}) {
  return (
    <header className="game-topbar">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <IdeTechLogo className="game-avatar-frame" />
          <div>
            <p className="game-hud-title text-xl font-black">IdeTech</p>
            <p className="text-xs font-bold text-white/85">API aktif di /api, session berbasis cookie</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <div className="game-hud-pill">
              <Heart className="h-5 w-5 text-red-500" />
              <span>29:39</span>
            </div>
            <div className="game-hud-pill">
              <CircleDollarSign className="h-5 w-5 text-yellow-500" />
              <span>4778</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img
              className="game-user-photo h-11 w-11 object-cover"
              src={user.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
              alt={user.name}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{user.name}</p>
              <p className="truncate text-xs font-bold text-white/80">{user.email}</p>
            </div>
          </div>
          {user.roles.length > 1 ? (
            <Select
              className="game-select"
              value={user.activeRole}
              disabled={busy}
              aria-label="Pilih role aktif"
              onChange={(event) => onSwitchRole(event.target.value as RoleName)}
            >
              {user.roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </Select>
          ) : (
            <StatusPill tone="good">{roleLabels[user.activeRole]}</StatusPill>
          )}
          <SecondaryButton className="game-icon-button" disabled={busy} onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Keluar
          </SecondaryButton>
          <SecondaryButton className="game-settings-button" disabled={busy} aria-label="Pengaturan">
            <Settings className="h-5 w-5" />
          </SecondaryButton>
        </div>
      </div>
    </header>
  );
}

function DesktopGameTabs({
  active,
  role,
  onChange
}: {
  active: MobileNavId;
  role: RoleName;
  onChange: (id: MobileNavId) => void;
}) {
  return (
    <nav className="hidden grid-cols-5 gap-3 md:grid" aria-label="Navigasi konten">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;

        return (
          <button
            key={item.id}
            className={isActive ? "game-tab is-active" : "game-tab"}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(item.id)}
          >
            <Icon className="h-5 w-5" />
            {roleMenuLabels[role][item.id]}
          </button>
        );
      })}
    </nav>
  );
}

function MobileGameNav({
  active,
  role,
  notifications,
  onChange
}: {
  active: MobileNavId;
  role: RoleName;
  notifications?: Partial<Record<MobileNavId, boolean>>;
  onChange: (id: MobileNavId) => void;
}) {
  return (
    <nav className="game-mobile-nav md:hidden" aria-label="Navigasi mobile">
      <div className="game-mobile-nav__sky" />
      <div className="game-mobile-nav__bar">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "game-mobile-nav__item is-active" : "game-mobile-nav__item"}
              onClick={() => onChange(item.id)}
            >
              <span className="game-mobile-nav__icon-shell">
                <Icon className="game-mobile-nav__icon" strokeWidth={2.8} />
                {notifications?.[item.id] ? <span className="game-mobile-nav__notify" aria-hidden="true" /> : null}
              </span>
              <span className="game-mobile-nav__label">{roleMenuLabels[role][item.id]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function DashboardHeader({ dashboard, user, activeMenu }: { dashboard: Dashboard; user: AuthUser; activeMenu: MobileNavId }) {
  const Icon = roleIcons[user.activeRole];
  const content = roleMenuContent[user.activeRole][activeMenu];
  return (
    <section className="game-hero grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex gap-4">
        <div className="game-role-token flex h-14 w-14 shrink-0 items-center justify-center text-white">
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="game-panel-title text-2xl font-black tracking-normal">{content.title}</h1>
            <StatusPill tone={user.status === "active" ? "good" : "warn"}>{user.status}</StatusPill>
          </div>
          <p className="max-w-3xl text-sm font-bold leading-6 text-amber-950/75">
            {content.subtitle} {dashboard.description}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {user.roles.map((role) => (
          <StatusPill key={role}>{roleLabels[role]}</StatusPill>
        ))}
      </div>
    </section>
  );
}

function MetricGrid({ dashboard }: { dashboard: Dashboard }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {dashboard.metrics.map((metric) => (
        <Card key={metric.label} className="game-panel p-5">
          <p className="text-sm font-black text-amber-950/70">{metric.label}</p>
          <p className="game-score mt-2 text-3xl font-black tracking-normal">{metric.value}</p>
          <p className="mt-2 text-sm font-bold text-amber-950/65">{metric.hint}</p>
        </Card>
      ))}
    </section>
  );
}

function Workspace({
  dashboard,
  user,
  adminUsers,
  activeMenu
}: {
  dashboard: Dashboard;
  user: AuthUser;
  adminUsers: AdminUser[];
  activeMenu: MobileNavId;
}) {
  const permissionGroups = useMemo(() => user.permissions.slice().sort(), [user.permissions]);
  const features = roleFeatures[user.activeRole];
  const isStudent = user.activeRole === "student";

  return (
    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <GameMenuContent active={activeMenu} user={user} adminUsers={adminUsers} />

      <Card className="game-panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Boxes className="h-5 w-5 text-yellow-300 drop-shadow" />
          <h2 className="game-panel-title text-lg font-black">Modul aktif</h2>
        </div>
        {isStudent ? (
          <StudentIconGrid
            items={features.map((feature, index) => ({
              title: feature.name,
              subtitle: studentFeatureTimer(index),
              badge: feature.access === "limited" ? "!" : index === 0 ? "+2" : undefined,
              icon: studentFeatureIcon(index)
            }))}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.name} className="game-mini-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black">{feature.name}</p>
                  <FeatureAccessBadge access={feature.access} />
                </div>
                <p className="mt-2 text-xs font-bold leading-5 text-amber-950/65">{feature.description}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="game-panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Gauge className="h-5 w-5 text-yellow-300 drop-shadow" />
          <h2 className="game-panel-title text-lg font-black">Aksi dan permission</h2>
        </div>
        {isStudent ? (
          <StudentIconGrid
            items={features.map((feature, index) => ({
              title: feature.cta,
              subtitle: feature.permission ?? "aktif",
              badge: feature.access === "self" ? "20" : feature.access === "limited" ? "!" : undefined,
              icon: studentActionIcon(index)
            }))}
            compact
          />
        ) : (
          <div className="mb-5 grid gap-3">
            {features.map((feature) => (
              <div key={feature.cta} className="game-list-button flex items-center justify-between px-4 py-3">
                <span>
                  <span className="block text-sm font-black">{feature.cta}</span>
                  {feature.permission ? <span className="block text-xs font-bold text-amber-950/60">{feature.permission}</span> : null}
                </span>
                <ChevronRight className="h-4 w-4 text-amber-950/70" />
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {permissionGroups.map((permission) => (
            <StatusPill key={permission}>{permission}</StatusPill>
          ))}
        </div>
      </Card>

      {user.activeRole === "admin" ? <AdminUserTable users={adminUsers} /> : <RoleSpecificPanel role={user.activeRole} />}
    </section>
  );
}

function StudentIconGrid({
  items,
  compact = false
}: {
  items: { title: string; subtitle: string; badge?: string; icon: typeof Sparkles }[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "student-icon-grid is-compact" : "student-icon-grid"}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button key={`${item.title}-${index}`} className="student-desktop-icon" type="button">
            <span className="student-desktop-icon__orb">
              <Icon className="student-desktop-icon__glyph" strokeWidth={2.8} />
              {item.badge ? <span className={item.badge === "!" ? "student-desktop-icon__badge is-alert" : "student-desktop-icon__badge"}>{item.badge}</span> : null}
            </span>
            <span className="student-desktop-icon__timer">{item.subtitle}</span>
            <span className="student-desktop-icon__label">{item.title}</span>
          </button>
        );
      })}
    </div>
  );
}

function studentFeatureIcon(index: number) {
  return [Map, Puzzle, Gauge, Star][index] ?? Sparkles;
}

function studentMapIcon(id: string) {
  const iconMap: Record<string, typeof Sparkles> = {
    map: Map,
    quest: Puzzle,
    rank: Trophy,
    tasks: ScrollText,
    coins: CircleDollarSign,
    radar: Gauge
  };

  return iconMap[id] ?? Sparkles;
}

function studentActionIcon(index: number) {
  return [Target, ScrollText, Trophy, Sparkles][index] ?? Puzzle;
}

function studentFeatureTimer(index: number) {
  return ["9h 37m", "2d 9h", "1d 9h", "Terbatas"][index] ?? "Aktif";
}

function FeatureAccessBadge({ access }: { access: RoleFeature["access"] }) {
  const label = {
    full: "Penuh",
    limited: "Terbatas",
    self: "Diri sendiri",
    child: "Anak"
  }[access];

  return (
    <span className={access === "full" ? "feature-access-badge is-full" : "feature-access-badge"}>
      {label}
    </span>
  );
}

function GameMenuContent({
  active,
  user,
  adminUsers
}: {
  active: MobileNavId;
  user: AuthUser;
  adminUsers: AdminUser[];
}) {
  const content = roleMenuContent[user.activeRole][active];

  return (
    <Card className="game-map-card p-5 lg:col-span-2">
      <div className="game-map-card__water" />
      <div className="relative grid gap-5 lg:grid-cols-[1fr_240px] lg:items-center">
        <div>
          <div className="game-progress-panel mb-4">
            <div className="flex items-center gap-3">
              <Star className="h-9 w-9 text-fuchsia-300 drop-shadow" />
              <div className="game-progress-track">
                <div className="game-progress-fill" />
                <span>{content.progress}</span>
              </div>
              <div className="game-coin-stack">100</div>
            </div>
          </div>

          <div className="game-island">
            <div className="game-island__rock" />
            <div className="game-island__gate">
              <span>{content.badge}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr]">
            <div className="game-chapter-panel">
              <span>{content.badge}</span>
              <strong>{content.progress}</strong>
            </div>
            <button className="game-level-button" type="button">
              {content.button}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {content.rewards.map((reward, index) => (
            <div key={reward} className="game-reward-badge">
              <span className="game-reward-badge__icon">{index + 1}</span>
              <span>{reward}</span>
            </div>
          ))}
          {active === "profile" ? (
            <div className="game-reward-badge">
              <span className="game-reward-badge__icon">{user.roles.length}</span>
              <span>{roleLabels[user.activeRole]}</span>
            </div>
          ) : null}
          {active === "studio" && user.activeRole === "admin" ? (
            <div className="game-reward-badge">
              <span className="game-reward-badge__icon">{adminUsers.length}</span>
              <span>User</span>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function AdminUserTable({ users, clean = false }: { users: AdminUser[]; clean?: boolean }) {
  return (
    <Card className={clean ? "professional-card p-5 lg:col-span-2" : "game-panel p-5 lg:col-span-2"}>
      <div className="mb-4 flex items-center gap-2">
        <UserCog className={clean ? "h-5 w-5 text-slate-500" : "h-5 w-5 text-yellow-300 drop-shadow"} />
        <h2 className={clean ? "professional-card__title text-lg" : "game-panel-title text-lg font-black"}>Verifikasi user</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className={clean ? "professional-table-head" : "game-table-head"}>
            <tr className="border-b text-left">
              <th className="py-3 pr-4 font-semibold">Nama</th>
              <th className="py-3 pr-4 font-semibold">Email</th>
              <th className="py-3 pr-4 font-semibold">Status</th>
              <th className="py-3 pr-4 font-semibold">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className={clean ? "py-3 pr-4 font-semibold text-slate-900" : "py-3 pr-4 font-semibold"}>{item.name}</td>
                <td className={clean ? "py-3 pr-4 text-slate-600" : "py-3 pr-4 font-bold text-amber-950/65"}>{item.email}</td>
                <td className="py-3 pr-4">
                  <StatusPill tone={item.status === "active" ? "good" : "warn"}>{item.status}</StatusPill>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-2">
                    {item.roles.map((role) => (
                      <StatusPill key={role.name}>{role.label}</StatusPill>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AdminControlCenter({
  users,
  access,
  busy,
  onUpdateUser,
  onUpdateRolePermissions
}: {
  users: AdminUser[];
  access: AdminAccess | null;
  busy: boolean;
  onUpdateUser: (id: string, payload: { status?: string; roles?: RoleName[] }) => void;
  onUpdateRolePermissions: (role: RoleName, permissions: string[]) => void;
}) {
  const pendingUsers = users.filter((item) => item.status === "pending");

  return (
    <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
      <Card className="professional-card p-5">
        <div className="professional-card__header">
          <div>
            <h2 className="professional-card__title">Verifikasi user baru</h2>
            <p className="professional-card__hint">{pendingUsers.length} user menunggu aktivasi dan role.</p>
          </div>
          <span className="professional-card__pill">{users.length} user</span>
        </div>

        <AdminUserVerificationGrid users={users} roles={access?.roles ?? []} busy={busy} onUpdateUser={onUpdateUser} />
      </Card>

      <div className="grid gap-6">
        <AdminSystemConfig access={access} />
        <AdminPermissionPanel access={access} busy={busy} onUpdateRolePermissions={onUpdateRolePermissions} />
        <AdminBankApprovalPanel />
      </div>
    </section>
  );
}

function AdminSubPage({
  view,
  users,
  access,
  classes,
  busy,
  onBack,
  onUpdateUser,
  onUpdateRolePermissions,
  onCreateClass,
  onUpdateClass,
  onDeleteClass
}: {
  view: AdminView;
  users: AdminUser[];
  access: AdminAccess | null;
  classes: AdminClass[];
  busy: boolean;
  onBack: () => void;
  onUpdateUser: (id: string, payload: { status?: string; roles?: RoleName[] }) => void;
  onUpdateRolePermissions: (role: RoleName, permissions: string[]) => void;
  onCreateClass: (payload: { teacherUserId?: string; name: string; subject: string; grade: string; students: number; status: TeacherClass["status"] }) => void;
  onUpdateClass: (id: string, payload: Partial<Pick<TeacherClass, "name" | "subject" | "grade" | "students" | "progress" | "status">> & { teacherUserId?: string }) => void;
  onDeleteClass: (id: string) => void;
}) {
  const title = {
    users: "Verifikasi user baru",
    classes: "Kelola kelas global",
    access: "Role & permission",
    system: "Konfigurasi sistem",
    home: "Beranda admin"
  }[view];

  return (
    <section className="admin-subpage">
      <div className="admin-subpage__bar">
        <button type="button" className="admin-back-button" onClick={onBack}>
          <ChevronRight className="h-4 w-4 rotate-180" />
          Beranda
        </button>
        <div>
          <p className="professional-eyebrow">Admin</p>
          <h2>{title}</h2>
        </div>
      </div>

      {view === "users" ? (
        <div className="mt-6">
          <AdminUserVerificationGrid users={users} roles={access?.roles ?? []} busy={busy} onUpdateUser={onUpdateUser} />
        </div>
      ) : null}

      {view === "classes" ? (
        <AdminClassManager users={users} classes={classes} busy={busy} onCreate={onCreateClass} onUpdate={onUpdateClass} onDelete={onDeleteClass} />
      ) : null}

      {view === "access" ? <AdminPermissionPanel access={access} busy={busy} onUpdateRolePermissions={onUpdateRolePermissions} /> : null}

      {view === "system" ? <AdminSystemConfig access={access} /> : null}
    </section>
  );
}

function AdminUserVerificationGrid({
  users,
  roles,
  busy,
  onUpdateUser
}: {
  users: AdminUser[];
  roles: { name: RoleName; label: string }[];
  busy: boolean;
  onUpdateUser: (id: string, payload: { status?: string; roles?: RoleName[] }) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {users.map((item) => {
        const selectedRoles = item.roles.map((role) => role.name as RoleName);
        return (
          <Card key={item.id} className="professional-card p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-lg">{item.name}</span>
              <span className="text-sm opacity-70 font-mono">{item.email}</span>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium opacity-70">Status</label>
              <Select
                className="w-full"
                value={item.status}
                disabled={busy}
                aria-label={`Status ${item.name}`}
                onChange={(event) => onUpdateUser(item.id, { status: event.target.value, roles: selectedRoles })}
              >
                <option value="active">Aktifkan</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspend</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium opacity-70">Role</label>
              <div className="admin-role-icon-checks">
                {roles.map((role) => {
                  const checked = selectedRoles.includes(role.name);
                  const nextRoles = checked ? selectedRoles.filter((name) => name !== role.name) : [...selectedRoles, role.name];
                  const RoleIcon = roleIcons[role.name];
                  return (
                    <label key={role.name} className={`admin-role-icon-check ${checked ? "is-checked" : ""}`} title={role.label} aria-label={role.label}>
                      <input type="checkbox" checked={checked} disabled={busy} onChange={() => onUpdateUser(item.id, { status: item.status, roles: nextRoles })} />
                      <RoleIcon className="h-4 w-4" />
                    </label>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function AdminClassManager({
  users,
  classes,
  busy,
  onCreate,
  onUpdate,
  onDelete
}: {
  users: AdminUser[];
  classes: AdminClass[];
  busy: boolean;
  onCreate: (payload: { teacherUserId?: string; name: string; subject: string; grade: string; students: number; status: TeacherClass["status"] }) => void;
  onUpdate: (id: string, payload: Partial<Pick<TeacherClass, "name" | "subject" | "grade" | "students" | "progress" | "status">> & { teacherUserId?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const teacherUsers = users.filter((user) => user.roles.some((role) => role.name === "teacher" || role.name === "admin"));
  const [form, setForm] = useState({
    teacherUserId: teacherUsers[0]?.id ?? "",
    name: "",
    subject: "",
    grade: "7",
    students: "24",
    status: "active" as TeacherClass["status"]
  });

  useEffect(() => {
    if (!form.teacherUserId && teacherUsers[0]?.id) {
      setForm((current) => ({ ...current, teacherUserId: teacherUsers[0].id }));
    }
  }, [teacherUsers.length]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({
      teacherUserId: form.teacherUserId || undefined,
      name: form.name,
      subject: form.subject,
      grade: form.grade,
      students: Number(form.students),
      status: form.status
    });
    setForm((current) => ({ ...current, name: "", subject: "", grade: "7", students: "24", status: "active" }));
  }

  return (
    <section className="admin-class-layout">
      <Card className="professional-card p-5">
        <div className="professional-card__header">
          <div>
            <h3 className="professional-card__title">Tambah kelas</h3>
            <p className="professional-card__hint">ClassID dibuat otomatis dan bisa dipakai siswa untuk bergabung.</p>
          </div>
        </div>
        <form className="admin-class-form" onSubmit={submit}>
          <label>
            <span>Guru</span>
            <Select value={form.teacherUserId} disabled={busy} onChange={(event) => setForm((current) => ({ ...current, teacherUserId: event.target.value }))}>
              {teacherUsers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} - {teacher.email}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>Nama kelas</span>
            <input value={form.name} placeholder="IPA 7A" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            <span>Mapel</span>
            <input value={form.subject} placeholder="Sains" onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} />
          </label>
          <label>
            <span>Jenjang</span>
            <Select value={form.grade} onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))}>
              {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((grade) => (
                <option key={grade} value={grade}>
                  Kelas {grade}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>Jumlah siswa</span>
            <input min="0" type="number" value={form.students} onChange={(event) => setForm((current) => ({ ...current, students: event.target.value }))} />
          </label>
          <label>
            <span>Status</span>
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TeacherClass["status"] }))}>
              <option value="active">Aktif</option>
              <option value="draft">Draft</option>
              <option value="archived">Arsip</option>
            </Select>
          </label>
          <button type="submit" disabled={busy || !form.name || !form.subject}>
            {busy ? "Menyimpan..." : "Tambah kelas"}
          </button>
        </form>
      </Card>

      <div className="mt-8">
        <div className="professional-card__header mb-4">
          <div>
            <h3 className="professional-card__title">Semua kelas guru</h3>
            <p className="professional-card__hint">{classes.length} kelas terdaftar.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map((kelas) => (
            <AdminClassCard key={kelas.id} kelas={kelas} teachers={teacherUsers} busy={busy} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminClassCard({
  kelas,
  teachers,
  busy,
  onUpdate,
  onDelete
}: {
  kelas: AdminClass;
  teachers: AdminUser[];
  busy: boolean;
  onUpdate: (id: string, payload: Partial<Pick<TeacherClass, "name" | "subject" | "grade" | "students" | "progress" | "status">> & { teacherUserId?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState({
    teacherUserId: kelas.teacherUserId,
    name: kelas.name,
    subject: kelas.subject,
    grade: kelas.grade,
    students: String(kelas.students),
    progress: String(kelas.progress),
    status: kelas.status
  });

  useEffect(() => {
    setDraft({
      teacherUserId: kelas.teacherUserId,
      name: kelas.name,
      subject: kelas.subject,
      grade: kelas.grade,
      students: String(kelas.students),
      progress: String(kelas.progress),
      status: kelas.status
    });
  }, [kelas.id, kelas.updatedAt]);

  return (
    <Card className="professional-card p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium opacity-70">Nama & Mapel</label>
        <div className="flex gap-2">
          <input className="w-full" value={draft.name} placeholder="Nama Kelas" onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          <input className="w-full" value={draft.subject} placeholder="Mapel" aria-label={`Mapel ${kelas.name}`} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} />
        </div>
      </div>
      
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium opacity-70">Guru</label>
        <Select value={draft.teacherUserId} onChange={(event) => setDraft((current) => ({ ...current, teacherUserId: event.target.value }))}>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium opacity-70">Jenjang</label>
          <Select value={draft.grade} onChange={(event) => setDraft((current) => ({ ...current, grade: event.target.value }))}>
            {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((grade) => (
              <option key={grade} value={grade}>
                Kelas {grade}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium opacity-70">Siswa</label>
          <input className="w-full" min="0" type="number" value={draft.students} onChange={(event) => setDraft((current) => ({ ...current, students: event.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium opacity-70">Status</label>
          <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as TeacherClass["status"] }))}>
            <option value="active">Aktif</option>
            <option value="draft">Draft</option>
            <option value="archived">Arsip</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
           <label className="text-sm font-medium opacity-70">ClassID</label>
           <code className="p-2 bg-black/5 dark:bg-white/10 rounded-md text-center text-sm font-mono mt-0.5">{kelas.classCode ?? kelas.nextSession}</code>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          className="flex-1"
          type="button"
          disabled={busy}
          onClick={() =>
            onUpdate(kelas.id, {
              teacherUserId: draft.teacherUserId,
              name: draft.name,
              subject: draft.subject,
              grade: draft.grade,
              students: Number(draft.students),
              progress: Number(draft.progress),
              status: draft.status
            })
          }
        >
          Simpan
        </button>
        <button
          className="flex-1 is-danger"
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Hapus kelas ${kelas.name}? Materi dan IdeQuest terkait dapat ikut terhapus.`)) onDelete(kelas.id);
          }}
        >
          Hapus
        </button>
      </div>
    </Card>
  );
}

function AdminSystemConfig({ access }: { access: AdminAccess | null }) {
  const system = access?.system;
  const items = system
    ? [
        ["User aktif", system.activeUsers],
        ["User pending", system.pendingUsers],
        ["User suspend", system.suspendedUsers],
        ["Role", system.totalRoles],
        ["Permission", system.totalPermissions],
        ["API", system.apiBase]
      ]
    : [];

  return (
    <Card className="professional-card p-5">
      <div className="professional-card__header">
        <h2 className="professional-card__title">Konfigurasi sistem</h2>
        <Settings className="h-5 w-5 text-slate-400" />
      </div>
      <div className="admin-system-grid">
        {items.map(([label, value]) => (
          <div key={label} className="admin-system-tile">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {system ? (
        <p className="mt-4 text-xs font-semibold text-slate-500">
          Auth: {system.authProvider} · Database: {system.database}
        </p>
      ) : null}
    </Card>
  );
}

function AdminPermissionPanel({
  access,
  busy,
  onUpdateRolePermissions
}: {
  access: AdminAccess | null;
  busy: boolean;
  onUpdateRolePermissions: (role: RoleName, permissions: string[]) => void;
}) {
  if (!access) {
    return (
      <Card className="professional-card p-5">
        <h2 className="professional-card__title">Role & permission</h2>
        <p className="professional-card__hint mt-2">Memuat konfigurasi permission...</p>
      </Card>
    );
  }

  return (
    <Card className="professional-card p-5">
      <div className="professional-card__header">
        <div>
          <h2 className="professional-card__title">Role & permission</h2>
          <p className="professional-card__hint">Centang izin yang boleh dipakai tiap role.</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-slate-400" />
      </div>
      <div className="mt-4 space-y-4">
        {access.roles.map((role) => (
          <div key={role.name} className="admin-permission-role">
            <div>
              <p className="font-black text-slate-900">{role.label}</p>
              <p className="text-xs font-semibold text-slate-500">{role.description}</p>
            </div>
            <div className="admin-permission-list">
              {access.permissions.map((permission) => {
                const checked = role.permissions.includes(permission.name);
                const nextPermissions = checked
                  ? role.permissions.filter((name) => name !== permission.name)
                  : [...role.permissions, permission.name];
                return (
                  <label key={permission.name} className="admin-permission-check" title={permission.description}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={() => onUpdateRolePermissions(role.name, nextPermissions)}
                    />
                    <span>{permission.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RoleSpecificPanel({ role }: { role: RoleName }) {
  const content = {
    teacher: {
      icon: BookOpen,
      title: "Alur Guru",
      rows: ["Membuat kelas", "Membuat materi IdeStudio", "Menyusun IdeQuest", "Memantau Radar Pintar"]
    },
    student: {
      icon: Sparkles,
      title: "Alur Siswa",
      rows: ["Membuka peta IdeQuest", "Mengerjakan misi", "Mengumpulkan tugas", "Mendapat poin dan badge"]
    },
    parent: {
      icon: Users,
      title: "Alur Orang Tua",
      rows: ["Memilih anak", "Melihat progres", "Membaca catatan guru", "Meninjau laporan belajar"]
    },
    admin: {
      icon: ShieldCheck,
      title: "Alur Admin",
      rows: ["Mengelola user", "Mengelola role", "Mengelola kelas global", "Mengatur sistem"]
    }
  }[role];
  const Icon = content.icon;

  if (role === "student") {
    const icons = [Map, Puzzle, ScrollText, Trophy];
    return (
      <Card className="game-panel p-5 lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-300 drop-shadow" />
          <h2 className="game-panel-title text-lg font-black">{content.title}</h2>
        </div>
        <StudentIconGrid
          items={content.rows.map((row, index) => ({
            title: row,
            subtitle: `Step ${index + 1}`,
            badge: index === 1 ? "!" : index === 3 ? "20" : undefined,
            icon: icons[index] ?? Sparkles
          }))}
        />
      </Card>
    );
  }

  return (
    <Card className="game-panel p-5 lg:col-span-2">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-yellow-300 drop-shadow" />
        <h2 className="game-panel-title text-lg font-black">{content.title}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {content.rows.map((row, index) => (
          <div key={row} className="game-mini-card p-4">
            <p className="text-xs font-black text-green-800">Langkah {index + 1}</p>
            <p className="mt-1 text-sm font-black">{row}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FullScreenState({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="rounded-lg border bg-white px-5 py-4 text-sm font-semibold shadow-sm">{text}</div>
    </main>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="game-error-banner px-4 py-3 text-sm font-black">{message}</div>;
}

function IdeTechLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`idetech-logo ${className}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" role="img">
        <defs>
          <linearGradient id="idetech-gold" x1="18" x2="82" y1="16" y2="86">
            <stop offset="0" stopColor="#fff7b8" />
            <stop offset="0.28" stopColor="#d2a73f" />
            <stop offset="0.58" stopColor="#fff1a0" />
            <stop offset="1" stopColor="#8c651d" />
          </linearGradient>
          <radialGradient id="idetech-shine" cx="30%" cy="28%" r="45%">
            <stop offset="0" stopColor="#fff8c8" />
            <stop offset="0.42" stopColor="#c7922e" />
            <stop offset="1" stopColor="#6f4b13" />
          </radialGradient>
        </defs>
        <rect x="5" y="5" width="90" height="90" rx="22" fill="#090d10" stroke="url(#idetech-gold)" strokeWidth="6" />
        <circle cx="25" cy="29" r="8" fill="url(#idetech-shine)" />
        <path
          d="M18 58 C31 37 48 30 70 32 C57 38 51 45 48 55 C57 49 67 47 80 51 C68 64 55 72 41 72 C30 72 22 67 18 58 Z"
          fill="url(#idetech-gold)"
        />
        <path d="M24 42 C42 54 59 57 78 47 C65 65 42 68 20 52" fill="none" stroke="#f7d979" strokeWidth="5" strokeLinecap="round" />
        <path d="M36 72 C45 80 59 80 70 69" fill="none" stroke="url(#idetech-gold)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? "Request gagal.");
  }

  return payload as T;
}

function TeacherProfileView({ user }: { user: AuthUser }) {
  return (
    <div className="flex flex-col gap-4 mt-4 md:mt-6">
      <Card className="professional-card p-5 shadow-sm">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-100 shadow-inner">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-xl font-bold text-slate-800">{user.fullName || user.name}</h3>
            <p className="truncate text-sm font-medium text-slate-500">{user.email}</p>
            <div className="mt-1.5 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
              {roleLabels[user.activeRole]}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Instansi Sekolah</p>
            <p className="font-semibold text-slate-800">{user.schoolName || "-"}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Kontak ({user.contactChannel || "-"})</p>
              <p className="font-semibold text-slate-800">{user.contactValue || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status Akun</p>
              <div className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${user.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                <p className="font-semibold capitalize text-slate-800">{user.status}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TeacherJournalView({ onClose }: { onClose: () => void }) {
  const [mood, setMood] = React.useState<string | null>(null);
  const [reflection, setReflection] = React.useState({ success: "", improvement: "" });
  const [anecdote, setAnecdote] = React.useState("");
  const [todos, setTodos] = React.useState<{id: number, text: string, done: boolean}[]>([{id: 1, text: "Siapkan proyektor", done: false}]);
  const [newTodo, setNewTodo] = React.useState("");
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [alertMsg, setAlertMsg] = React.useState<{type: "success" | "error", text: string} | null>(null);
  const [view, setView] = React.useState<"form" | "history">("form");
  const [history, setHistory] = React.useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  React.useEffect(() => {
    if (view === "history") {
      setIsLoadingHistory(true);
      api<{ journals: any[] }>("/api/teacher/journals")
        .then((res) => setHistory(res.journals))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [view]);

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, { id: Date.now(), text: newTodo.trim(), done: false }]);
      setNewTodo("");
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      if (mood) formData.append("mood", mood);
      formData.append("success", reflection.success);
      formData.append("improvement", reflection.improvement);
      formData.append("anecdote", anecdote);
      formData.append("todos", JSON.stringify(todos));
      if (photo) formData.append("photo", photo);

      const response = await fetch("/api/teacher/journals", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal menyimpan jurnal");
      }
      
      setAlertMsg({ type: "success", text: "Jurnal berhasil disimpan!" });
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: "error", text: "Terjadi kesalahan saat menyimpan jurnal." });
    } finally {
      setIsSaving(false);
    }
  };

  const closeAlert = () => {
    if (alertMsg?.type === "success") {
      onClose();
    }
    setAlertMsg(null);
  };

  return (
    <div className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-300 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">Jurnal Mengajar</h2>
            <p className="text-[10px] font-bold tracking-widest uppercase text-blue-200">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <button 
          onClick={() => setView(view === "form" ? "history" : "form")}
          className="text-xs font-bold uppercase tracking-wider text-emerald-300 hover:text-emerald-200 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
        >
          {view === "form" ? "Riwayat" : "Tulis Baru"}
        </button>
      </div>

      {view === "history" ? (
        <div className="flex flex-col gap-4 pb-8">
          {isLoadingHistory ? (
            <div className="text-center py-10 text-white/50 animate-pulse">Memuat riwayat...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-white/50">Belum ada jurnal yang disimpan.</div>
          ) : (
            history.map((journal) => (
              <section key={journal.id} className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-md">
                    {new Date(journal.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </span>
                  {journal.mood && (
                    <span className="text-lg" title={`Mood: ${journal.mood}`}>
                      {journal.mood === 'happy' ? '😁' : journal.mood === 'sad' ? '😞' : '😐'}
                    </span>
                  )}
                </div>
                {journal.successReflection && (
                  <p className="text-sm text-white/90 mb-2"><strong>Berhasil:</strong> {journal.successReflection}</p>
                )}
                {journal.improvementReflection && (
                  <p className="text-sm text-white/90 mb-2"><strong>Kendala:</strong> {journal.improvementReflection}</p>
                )}
                {journal.photoUrl && (
                  <img src={journal.photoUrl} alt="Momen Kelas" className="w-full h-40 object-cover rounded-xl mt-3 opacity-90 hover:opacity-100 transition-opacity" />
                )}
              </section>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6 w-full pb-8">
        <section className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <h3 className="text-[11px] font-bold text-blue-200 mb-4 uppercase tracking-wider flex items-center gap-2">
            1. Mood Hari Ini
          </h3>
          <div className="flex justify-between gap-3">
            <button onClick={() => setMood('happy')} className={`flex-1 py-4 flex flex-col items-center gap-2 rounded-2xl border transition-all duration-300 ${mood === 'happy' ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.2)]' : 'border-white/10 bg-black/10 hover:border-emerald-400/50 hover:bg-white/5'}`}>
              <Smile className={`h-8 w-8 transition-colors ${mood === 'happy' ? 'text-emerald-400' : 'text-blue-100/50'}`} />
              <span className={`text-[10px] font-bold transition-colors ${mood === 'happy' ? 'text-emerald-300' : 'text-blue-100/70'}`}>Semangat</span>
            </button>
            <button onClick={() => setMood('meh')} className={`flex-1 py-4 flex flex-col items-center gap-2 rounded-2xl border transition-all duration-300 ${mood === 'meh' ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.2)]' : 'border-white/10 bg-black/10 hover:border-amber-400/50 hover:bg-white/5'}`}>
              <Meh className={`h-8 w-8 transition-colors ${mood === 'meh' ? 'text-amber-400' : 'text-blue-100/50'}`} />
              <span className={`text-[10px] font-bold transition-colors ${mood === 'meh' ? 'text-amber-300' : 'text-blue-100/70'}`}>Biasa</span>
            </button>
            <button onClick={() => setMood('sad')} className={`flex-1 py-4 flex flex-col items-center gap-2 rounded-2xl border transition-all duration-300 ${mood === 'sad' ? 'border-rose-400 bg-rose-500/20 shadow-[0_0_20px_rgba(251,113,133,0.2)]' : 'border-white/10 bg-black/10 hover:border-rose-400/50 hover:bg-white/5'}`}>
              <Frown className={`h-8 w-8 transition-colors ${mood === 'sad' ? 'text-rose-400' : 'text-blue-100/50'}`} />
              <span className={`text-[10px] font-bold transition-colors ${mood === 'sad' ? 'text-rose-300' : 'text-blue-100/70'}`}>Lelah</span>
            </button>
          </div>
        </section>

        <section className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <h3 className="text-[11px] font-bold text-blue-200 mb-4 uppercase tracking-wider">2. Refleksi Kelas</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] font-bold text-emerald-300 mb-1.5 block">Momen/Metode yang berhasil:</label>
              <textarea 
                value={reflection.success}
                onChange={e => setReflection({...reflection, success: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm font-medium text-white focus:ring-2 focus:ring-emerald-400 focus:outline-none placeholder-blue-100/30 transition-all" 
                rows={2} 
                placeholder="Contoh: Kuis interaktif membuat anak lebih fokus..."
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-rose-300 mb-1.5 block">Kendala / Yang perlu diperbaiki:</label>
              <textarea 
                value={reflection.improvement}
                onChange={e => setReflection({...reflection, improvement: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm font-medium text-white focus:ring-2 focus:ring-rose-400 focus:outline-none placeholder-blue-100/30 transition-all" 
                rows={2} 
                placeholder="Contoh: Manajemen waktu saat kerja kelompok..."
              />
            </div>
          </div>
        </section>

        <section className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <h3 className="text-[11px] font-bold text-blue-200 mb-4 uppercase tracking-wider">3. Catatan Insiden/Siswa</h3>
          <textarea 
            value={anecdote}
            onChange={e => setAnecdote(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm font-medium text-white focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-blue-100/30 transition-all" 
            rows={3} 
            placeholder="Tulis kejadian menarik atau sorotan siswa hari ini... (misal: Budi sangat aktif di sesi tanya jawab)"
          />
        </section>

        <section className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <h3 className="text-[11px] font-bold text-blue-200 mb-4 uppercase tracking-wider">4. Tindak Lanjut (To-Do)</h3>
          <div className="flex flex-col gap-2">
            {todos.map(todo => (
              <div key={todo.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer group transition-colors" onClick={() => toggleTodo(todo.id)}>
                <button className={`flex-shrink-0 h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${todo.done ? 'bg-blue-500 border-blue-500 text-white' : 'border-white/30 bg-black/20 group-hover:border-blue-400'}`}>
                  {todo.done && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
                <span className={`text-sm ${todo.done ? 'line-through text-white/40' : 'text-white/90 font-medium'}`}>{todo.text}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="text" 
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
                placeholder="Tambah tugas baru..." 
                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 placeholder-blue-100/30 transition-all"
              />
              <button onClick={addTodo} className="bg-blue-500/80 text-white p-2.5 rounded-xl hover:bg-blue-500 transition-colors">
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <h3 className="text-[11px] font-bold text-blue-200 mb-4 uppercase tracking-wider">5. Momen Kelas (Foto)</h3>
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-white/20 border-dashed rounded-2xl cursor-pointer bg-black/20 hover:bg-white/5 transition-colors overflow-hidden relative">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview Momen Kelas" className="absolute inset-0 w-full h-full object-cover opacity-80" />
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <ImageIcon className="w-8 h-8 mb-2 text-white/40" />
                <p className="text-sm text-white/70 font-medium"><span className="text-blue-300 font-bold">Klik untuk unggah</span> foto kelas</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/30 mt-1">PNG, JPG, max 5MB</p>
              </div>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
          </label>
        </section>

        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 disabled:opacity-50 text-white font-bold text-sm py-4 rounded-xl shadow-[0_8px_16px_-4px_rgba(59,130,246,0.5)] hover:from-blue-400 hover:to-indigo-400 transition-all mt-2"
        >
          {isSaving ? "Menyimpan..." : "Simpan Jurnal Hari Ini"}
        </button>
      </div>
      )}

      {alertMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1c1c2e] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${alertMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {alertMsg.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <Frown className="w-8 h-8" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{alertMsg.type === 'success' ? 'Berhasil' : 'Gagal'}</h3>
                <p className="text-sm text-slate-300 mt-1">{alertMsg.text}</p>
              </div>
              <button 
                onClick={closeAlert}
                className="w-full py-3 mt-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminBankApprovalPanel() {
  const [tab, setTab] = React.useState<"material" | "quest">("material");
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [queue, setQueue] = React.useState<{ materials: any[]; quests: any[] }>({ materials: [], quests: [] });

  const loadQueue = async () => {
    try {
      const data = await api<{ materials: any[]; quests: any[] }>("/api/admin/bank-queue");
      setQueue(data);
    } catch (err) {
      console.error("Gagal mengambil antrean:", err);
    }
  };

  React.useEffect(() => {
    loadQueue();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const processQueue = async (type: "material" | "quest", id: string, status: "approved" | "rejected") => {
    try {
      await api(`/api/admin/bank-queue/${type}/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      showToast(`Berhasil diproses (${status === "approved" ? "Disetujui" : "Ditolak"})`);
      loadQueue();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memproses.");
    }
  };

  const pendingCount = queue.materials.length + queue.quests.length;

  return (
    <Card className="professional-card p-5 relative overflow-hidden">
      <div className="professional-card__header mb-4">
        <div>
          <h3 className="professional-card__title flex items-center gap-2">
            <div className="relative">
              <BookOpen className="h-5 w-5 text-blue-500" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-white"></span>
              )}
            </div>
            Persetujuan Bank IdeTech
          </h3>
          <p className="professional-card__hint">Tinjau dan setujui materi/quest yang dikirim guru untuk diterbitkan ke publik.</p>
        </div>
      </div>

      <div className="flex border-b border-slate-100 mb-4">
        <button
          type="button"
          onClick={() => setTab("material")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${tab === "material" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Antrean Materi
          {queue.materials.length > 0 && <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full">{queue.materials.length}</span>}
        </button>
        <button
          type="button"
          onClick={() => setTab("quest")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${tab === "quest" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Antrean IdeQuest
          {queue.quests.length > 0 && <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full">{queue.quests.length}</span>}
        </button>
      </div>

      <div className="grid gap-3">
        {tab === "material" ? (
          queue.materials.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-lg">Tidak ada antrean materi.</div>
          ) : (
            queue.materials.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center p-3 border border-slate-100 rounded-lg hover:border-blue-100 bg-slate-50/50">
                <div>
                  <strong className="text-sm text-slate-700 block">{item.title}</strong>
                  <span className="text-xs text-slate-500">Oleh: {item.teacherName}</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => processQueue("material", item.id, "approved")} className="px-3 py-1.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-none shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Setujui
                  </Button>
                  <Button type="button" onClick={() => processQueue("material", item.id, "rejected")} className="px-3 py-1.5 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border-none shadow-sm">
                    <X className="w-3.5 h-3.5 mr-1 inline" /> Tolak
                  </Button>
                </div>
              </div>
            ))
          )
        ) : (
          queue.quests.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-lg">Tidak ada antrean IdeQuest.</div>
          ) : (
            queue.quests.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center p-3 border border-slate-100 rounded-lg hover:border-blue-100 bg-slate-50/50">
                <div>
                  <strong className="text-sm text-slate-700 block">{item.title}</strong>
                  <span className="text-xs text-slate-500">Oleh: {item.teacherName} • {item.points} poin</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => processQueue("quest", item.id, "approved")} className="px-3 py-1.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-none shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Setujui
                  </Button>
                  <Button type="button" onClick={() => processQueue("quest", item.id, "rejected")} className="px-3 py-1.5 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border-none shadow-sm">
                    <X className="w-3.5 h-3.5 mr-1 inline" /> Tolak
                  </Button>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {toastMessage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm whitespace-nowrap border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            {toastMessage}
          </div>
        </div>
      )}
    </Card>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
