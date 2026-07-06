import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import ReactPlayer from "react-player/lazy";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { ParentFriendlyDashboard } from "./ParentFriendlyDashboard";
import { TeacherRPPGenerator } from "./components/TeacherRPPGenerator";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  Boxes,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  HelpCircle,
  Download,
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
  User,
  X,
  Smile,
  Frown,
  Meh,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  Info,
  Heading,
  Bold,
  Italic,
  Underline,
  Globe,
  Link,
  AlignCenter,
  List,
  ListOrdered,
  AlignJustify,
  MessageCircle,
  Calendar,
  Timer,
  Send,
  Menu,
  ShoppingCart,
  Wand2,
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
  announcements?: any[];
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

type AdminView = "home" | "users" | "classes" | "system" | "quick_action" | "advanced_features" | "parent_students" | "blog";

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
  options?: { dueDate?: string; [key: string]: any } | null;
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
  { id: "map", label: "Map", icon: Map },
  { id: "studio", label: "Tugas", icon: BookOpen },
  { id: "quest", label: "Quest", icon: Puzzle },
  { id: "rank", label: "Piala", icon: Trophy },
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
  targetDate?: string;
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
    { name: "Kelola Bank Ide", permission: "bank.manage", access: "full", description: "Kurasi dan bagikan materi di Bank Ide.", cta: "Kelola Bank" },
    { name: "Kelola Blog", permission: "blog.manage", access: "full", description: "Menulis dan mengelola artikel blog publik.", cta: "Kelola Blog" }
  ],
  teacher: [
    { name: "Lihat progres siswa", permission: "report.view", access: "full", description: "Melihat progres siswa di kelasnya.", cta: "Lihat progres" },
    { name: "Jurnal Mengajar", permission: "class.manage", access: "full", description: "Tulis catatan personal atau kejadian penting di kelas hari ini.", cta: "Tulis jurnal" },
    { name: "Kelola kelas", permission: "class.manage", access: "full", description: "Membuat kelas dan mengatur daftar siswa.", cta: "Kelola kelas" },
    { name: "Buat materi", permission: "material.create", access: "full", description: "Membuat materi interaktif di IdeStudio.", cta: "Buat materi" },
    { name: "Buat IdeQuest", permission: "quest.manage", access: "full", description: "Membuat misi, kuis, dan tugas belajar.", cta: "Buat IdeQuest" },
    { name: "Lihat Radar Pintar", permission: "radar.view", access: "full", description: "Menganalisis performa dan risiko belajar.", cta: "Buka Radar" },
    { name: "Kelola Bank Ide", permission: "bank.manage", access: "full", description: "Menyimpan dan membagikan materi ajar.", cta: "Kelola Bank" }
    // { name: "Tulis Blog", permission: "blog.write", access: "full", description: "Menulis artikel blog (Menunggu persetujuan).", cta: "Tulis Artikel" }
  ],
  student: [
    { name: "Ikut IdeQuest", permission: "quest.play", access: "full", description: "Mengikuti jalur misi IdeQuest yang tersedia.", cta: "Masuk Quest" },
    { name: "Kerjakan kuis", permission: "quest.play", access: "full", description: "Mengerjakan kuis dan tantangan aktif.", cta: "Kerjakan kuis" },
    { name: "Lihat progres siswa", permission: "report.view", access: "self", description: "Melihat progres belajar diri sendiri.", cta: "Progres saya" },
    { name: "Lihat Radar Pintar", permission: "radar.view", access: "limited", description: "Insight belajar tampil terbatas untuk siswa.", cta: "Lihat ringkasan" }
    // { name: "Tulis Blog", permission: "blog.write", access: "full", description: "Membagikan cerita/pengalaman di blog sekolah.", cta: "Tulis Cerita" }
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
  const [announcements, setAnnouncements] = useState<any[]>([]);
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
    const startTime = Date.now();

    try {
      const me = await api<{ user: AuthUser | null }>("/api/auth/me");
      if (!me.user) {
        setUser(null);
        setDashboard(null);
        return;
      }
      await loadDashboard();
    } finally {
      const elapsed = Date.now() - startTime;
      const minWait = 3000;
      if (elapsed < minWait) {
        await new Promise((r) => setTimeout(r, minWait - elapsed));
      }
      setLoading(false);
    }
  }

  async function loadDashboard() {
    const payload = await api<DashboardResponse>("/api/dashboard");
    setUser(payload.user);
    setDashboard(payload.dashboard);
    setAnnouncements(payload.announcements || []);

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

  async function deleteAdminUser(id: string) {
    if (!confirm("Yakin ingin menghapus user ini secara permanen? Semua data terkait (kelas, materi, progress) akan hilang.")) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/users/${id}`, { method: "DELETE" });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus user.");
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

  return (
    <>
      <GlobalAnnouncementsBanner announcements={announcements} />
      {user.activeRole === "student" ? (
        <StudentCompactDashboard
          user={user}
          dashboard={dashboard}
          busy={busy}
          activeMenu={activeMobileMenu}
          onChangeMenu={setActiveMobileMenu}
          onLogout={logout}
        />
      ) : user.activeRole === "parent" ? (
        <ParentFriendlyDashboard user={user} onLogout={logout} />
      ) : (
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
          onDeleteAdminUser={deleteAdminUser}
          onUpdateRolePermissions={updateRolePermissions}
          onCreateAdminClass={createAdminClass}
          onUpdateAdminClass={updateAdminClass}
          onDeleteAdminClass={deleteAdminClass}
        />
      )}
    </>
  );
}

function GlobalAnnouncementsBanner({ announcements }: { announcements: any[] }) {
  if (!announcements || announcements.length === 0) return null;
  
  // Ambil pengumuman pertama (yang paling baru/penting)
  const [closed, setClosed] = useState(false);
  
  if (closed) return null;
  const active = announcements[0];
  
  return (
    <div className={`fixed top-0 left-0 w-full z-[100] border-b shadow-sm flex items-center justify-between px-4 py-3 ${
      active.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-800' :
      active.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
      'bg-blue-50 border-blue-200 text-blue-800'
    }`}>
      <div className="flex items-center gap-3 w-full justify-center text-sm">
        <Bell className="w-5 h-5 shrink-0" />
        <p className="font-medium text-center">
          <strong>{active.title}:</strong> {active.content}
        </p>
      </div>
      <button onClick={() => setClosed(true)} className="p-1 hover:bg-black/5 rounded-full shrink-0 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
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
        .then((res) => {
          setSchools(res.schools || []);
        })
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
  const [activeOrb, setActiveOrb] = useState<StudentIndicator | null>(null);
  const [studentMaterials, setStudentMaterials] = useState<StudentMaterial[]>([]);
  const [studentQuests, setStudentQuests] = useState<StudentQuest[]>([]);
  const [studentAchievements, setStudentAchievements] = useState<StudentAchievement[]>([]);
  const [studentClasses, setStudentClasses] = useState<StudentClass[]>([]);
  const [studentMeta, setStudentMeta] = useState<{ completedMaterials: number; completedQuests: number; totalPoints: number } | null>(null);
  const [studentPanelBusy, setStudentPanelBusy] = useState(false);
  const [studentPanelError, setStudentPanelError] = useState("");
  const [showDailyMissions, setShowDailyMissions] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const loadIndicators = async () => {
    const classQuery = selectedClassId ? `?classId=${selectedClassId}` : "";
    const response = await fetch(`/api/student/indicators${classQuery}`, { credentials: "include" });
    if (!response.ok) throw new Error("Gagal memuat indikator siswa.");
    return (await response.json()) as StudentIndicatorResponse;
  };

  const refreshIndicators = () => {
    const classQuery = selectedClassId ? `?classId=${selectedClassId}` : "";
    fetch(`/api/student/indicators${classQuery}`, { credentials: "include" })
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
  }, [selectedClassId]);

  useEffect(() => {
    if (!localStorage.getItem("studentIdeTechTourDone")) {
      const d = driver({
        showProgress: true,
        nextBtnText: 'Lanjut',
        prevBtnText: 'Kembali',
        doneBtnText: 'Selesai',
        steps: [
          { element: '#student-tour-1', popover: { title: 'Status Belajar', description: 'Pantau nyawa (HP) dan koin yang kamu dapatkan setiap menyelesaikan misi.' } },
          { element: '#student-tour-2', popover: { title: 'Peta Petualangan', description: 'Jelajahi radar materi dan misi dari gurumu di sini.' } },
          { element: '#student-tour-3', popover: { title: 'Aksi Cepat', description: 'Lanjutkan progres belajarmu atau buka level terbaru dari sini.' } },
          { element: '#student-tour-4', popover: { title: 'Menu Navigasi', description: 'Beralih antara peta, misi (quest), dan fitur lainnya.' } }
        ],
        onDestroyStarted: () => {
          localStorage.setItem("studentIdeTechTourDone", "true");
          d.destroy();
        }
      });
      setTimeout(() => d.drive(), 500);
    }
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
  const completeQuest = async (questId: string, answerText: string, file: File | null) => {
    setStudentPanelBusy(true);
    setStudentPanelError("");
    try {
      const formData = new FormData();
      if (answerText) formData.append("answerText", answerText);
      if (file) formData.append("file", file);

      const res = await fetch(`/api/student/quests/${questId}/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Gagal mengumpulkan IdeQuest.");
      }
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
        <header id="student-tour-1" className="student-compact-hud">
          <img
            className="student-compact-avatar"
            src={user.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
            alt={user.name}
          />
          <div className="game-hud-pill">
            <Heart className="h-5 w-5 text-red-500" />
            <span>{indicators?.meta?.chapterProgress ?? "0/0"}</span>
          </div>
          <div className="game-hud-pill">
            <CircleDollarSign className="h-5 w-5 text-yellow-500" />
            <span>{indicators?.right?.find(i => i.id === 'coins')?.badge ?? "0"}</span>
          </div>
          <button className="game-settings-button" disabled={busy} type="button" onClick={() => setShowDailyMissions(true)} aria-label="Misi Harian">
            <Target className="h-5 w-5" />
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

        <section id="student-tour-2" className="student-compact-map" aria-label={dashboard.title}>
          <StudentDesktopQuickAccess active={openPanel ?? activeMenu} notifications={indicators?.nav} onChange={handleChangeMenu} />

          <div className="student-compact-side is-left">
            {leftItems.map((item) => (
              <StudentMapIcon key={item.id} item={{ ...item, icon: studentMapIcon(item.id) }} onClick={() => setActiveOrb(item)} />
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
                <span>{activeMenu === "map" ? (indicators?.meta.chapter ?? content.badge) : content.badge}</span>
              </div>
            </div>
          </div>

          <div className="student-compact-side is-right">
            {rightItems.map((item) => (
              <StudentMapIcon key={item.id} item={{ ...item, icon: studentMapIcon(item.id) }} onClick={() => setActiveOrb(item)} />
            ))}
          </div>

          <StudentDailyMissionPanel />
        </section>

        <section id="student-tour-3" className="student-compact-actions">
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
          selectedClassId={selectedClassId}
          onSelectClass={setSelectedClassId}
        />
      ) : null}

      <MobileGameNav id="student-tour-4" active={openPanel ?? activeMenu} role="student" notifications={indicators?.nav} onChange={handleChangeMenu} />
      
      {activeOrb && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveOrb(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setActiveOrb(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                {(() => {
                  const OrbIcon = studentMapIcon(activeOrb.id);
                  return <OrbIcon className="w-6 h-6" strokeWidth={2.5} />;
                })()}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">{activeOrb.title}</h3>
                {activeOrb.targetDate ? (
                  <div className="mt-1">
                    <AgendaCountdown targetDate={new Date(activeOrb.targetDate)} />
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-blue-600">{activeOrb.subtitle}</p>
                )}
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 leading-relaxed">
              {activeOrb.id === "map" && "Jalur utama petualangan IdeQuest. Terus selesaikan materi dan kuis untuk membuka peta wilayah baru!"}
              {activeOrb.id === "quest" && "Daftar misi khusus berbatas waktu. Kerjakan secepatnya sebelum waktunya habis untuk mendapat koin ekstra."}
              {activeOrb.id === "rank" && "Peringkat dan pencapaianmu. Kumpulkan piala untuk menaikkan reputasimu di kelas!"}
              {activeOrb.id === "tasks" && "Materi atau tugas aktif dari guru yang menunggumu. Jangan ditunda-tunda ya!"}
              {activeOrb.id === "coins" && "Poin/koin yang sudah kamu kumpulkan dari penyelesaian misi. Bisa ditukarkan dengan hadiah menarik."}
              {activeOrb.id === "radar" && "Radar Pintar yang memantau performa belajarmu. Jika menyala merah, berarti ada peringatan penting dari guru!"}
            </div>
            
            {activeOrb.badge && (
              <div className="mt-4 flex items-center justify-center gap-2 bg-yellow-50 text-yellow-800 py-2 px-3 rounded-lg text-sm font-bold border border-yellow-200">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                Badge aktif: {activeOrb.badge}
              </div>
            )}
            
            <button onClick={() => setActiveOrb(null)} className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-blue-500/25">Tutup Info</button>
          </div>
        </div>
      )}

      {showDailyMissions && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDailyMissions(false)} />
          <div className="relative z-10 w-full max-w-sm animate-in zoom-in-95 duration-200 [&>aside]:!flex [&>aside]:!w-full">
            <button onClick={() => setShowDailyMissions(false)} className="absolute top-3 right-3 text-white hover:text-slate-200 bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors z-20">
              <X className="w-5 h-5" />
            </button>
            <StudentDailyMissionPanel />
          </div>
        </div>
      )}
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
  item,
  onClick
}: {
  item: StudentIndicator & { icon: typeof Sparkles };
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      className={item.connected ? "student-map-icon" : "student-map-icon is-disconnected"}
      type="button"
      aria-label={item.title}
      onClick={onClick}
    >
      <span className="student-map-icon__orb">
        <Icon className="student-map-icon__glyph" strokeWidth={2.8} />
        {item.badge ? (
          <span className={item.badge === "!" || item.id === "tasks" || item.id === "quest" ? "student-map-icon__badge is-alert" : "student-map-icon__badge"}>
            {item.badge}
          </span>
        ) : null}
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
  onJoinClass,
  selectedClassId,
  onSelectClass
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
  onCompleteQuest: (questId: string, answerText: string, file: File | null) => void;
  onJoinClass: (classCode: string) => void;
  selectedClassId: string | null;
  onSelectClass: (id: string | null) => void;
}) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [classCode, setClassCode] = useState("");
  const [showClasses, setShowClasses] = useState(false);
  
  const activeClassId = selectedClassId ?? classes[0]?.id ?? null;
  const activeMaterials = materials.filter(m => !activeClassId || m.classId === activeClassId);
  const activeQuests = quests.filter(q => !activeClassId || !q.classId || q.classId === activeClassId);
  const title = roleMenuLabels.student[active];
  const summary = {
    studio: "Materi dari guru yang bisa dipelajari siswa.",
    rank: "Piala dan badge dari materi serta IdeQuest yang sudah selesai.",
    map: "Jalur belajar yang menghubungkan materi guru ke IdeQuest.",
    quest: "Misi IdeQuest dari guru yang bisa dikumpulkan siswa."
  }[active];
  
  const [taskPage, setTaskPage] = useState(0);
  const [readingProgress, setReadingProgress] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [questAnswerText, setQuestAnswerText] = useState("");
  const [questAnswerFile, setQuestAnswerFile] = useState<File | null>(null);
  const [questSubmitMode, setQuestSubmitMode] = useState<"text" | "file">("text");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  const totalTaskPages = Math.max(1, Math.ceil(activeMaterials.length / 9));
  const taskSlots = Array.from({ length: 9 }, (_, index) => activeMaterials[index + taskPage * 9] ?? null);
  const completedTasks = taskSlots.filter((material) => material && material.progress >= 100).length;
  const selectedTask = selectedTaskId ? materials.find((material) => material.id === selectedTaskId) ?? quests.find((quest) => quest.id === selectedTaskId) ?? null : null;

  useEffect(() => {
    setSelectedTaskId(null);
    setTaskPage(0);
  }, [active, activeClassId]);

  useEffect(() => {
    setReadingProgress(0);
    setQuizAnswers({});
    setShowQuizResults(false);
    setQuestAnswerText("");
    setQuestAnswerFile(null);
    setQuestSubmitMode("text");
    const timer = setTimeout(() => {
      const el = document.getElementById("lesson-scroll-container");
      if (el && el.scrollHeight <= el.clientHeight) {
        setReadingProgress(100);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedTaskId]);

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

            {totalTaskPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button 
                  type="button"
                  onClick={() => setTaskPage(p => Math.max(0, p - 1))}
                  disabled={taskPage === 0}
                  className="p-2 rounded-full bg-slate-800 text-white disabled:opacity-50 hover:bg-slate-700 transition-all flex items-center justify-center w-10 h-10 shadow-lg"
                >
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </button>
                <span className="text-sm font-medium text-slate-300">
                  {taskPage + 1} / {totalTaskPages}
                </span>
                <button 
                  type="button"
                  onClick={() => setTaskPage(p => Math.min(totalTaskPages - 1, p + 1))}
                  disabled={taskPage >= totalTaskPages - 1}
                  className="p-2 rounded-full bg-slate-800 text-white disabled:opacity-50 hover:bg-slate-700 transition-all flex items-center justify-center w-10 h-10 shadow-lg"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}

          </section>
        ) : null}

        {active === "quest" ? (
          <div className="student-task-card-grid">
            {activeQuests.length ? null : <p className="student-content-empty text-slate-100 col-span-3 text-center">Belum ada IdeQuest aktif.</p>}
            {activeQuests.map((quest) => {
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
                    <article key={kelas.id} className={`student-class-card ${activeClassId === kelas.id ? "ring-2 ring-[#e6b12a]" : ""}`}>
                      <div className="flex-1">
                        <span>{kelas.classCode ?? kelas.nextSession}</span>
                        <strong>{kelas.name}</strong>
                        <small>{kelas.subject} - Kelas {kelas.grade} · {kelas.students} siswa</small>
                      </div>
                      <button 
                        type="button"
                        onClick={() => onSelectClass(kelas.id)}
                        className={`text-xs px-3 py-1.5 rounded-full font-bold ml-3 border-b-2 transition-colors ${activeClassId === kelas.id ? "bg-[#e6b12a] text-white border-[#d69818]" : "bg-white text-[#7d2f0f] border-[#f0c34a] hover:bg-[#fff9e6]"}`}
                      >
                        {activeClassId === kelas.id ? "Terpilih" : "Masuk"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </form>

            <div className="student-map-path-saga">
              {[...activeMaterials, ...activeQuests].length ? null : <p className="student-content-empty">Materi dan IdeQuest akan muncul setelah kamu masuk kelas.</p>}
              
              <div className="saga-path-container">
                {(() => {
                  const pathNodes: { type: 'material'|'quest', data: any, id: string, title: string, progress: number }[] = [];
                  activeMaterials.forEach(m => {
                    pathNodes.push({ type: 'material', data: m, id: m.id, title: m.title, progress: m.progress });
                    activeQuests.filter(q => q.materialId === m.id).forEach(q => {
                      pathNodes.push({ type: 'quest', data: q, id: q.id, title: q.title, progress: q.progress });
                    });
                  });
                  activeQuests.filter(q => !q.materialId).forEach(q => {
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

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl z-[100] text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-6">
          <Info className="w-5 h-5 text-yellow-400" />
          {toastMessage}
        </div>
      )}

      {selectedTask ? (
        <div className="student-task-detail-modal" role="dialog" aria-modal="true" aria-label={`Detail tugas ${selectedTask.title}`}>
          <div className="student-task-detail-modal__backdrop" onClick={() => setSelectedTaskId(null)} />
          <article className="student-task-detail">
            <button className="student-task-detail__close" type="button" onClick={() => setSelectedTaskId(null)} aria-label="Tutup detail tugas">
              <X className="h-5 w-5" strokeWidth={4} />
            </button>
            <small>{(selectedTask as any).type || 'IdeQuest'}</small>
            <h3>{selectedTask.title}</h3>
            <div className="text-justify whitespace-pre-wrap text-[15px] leading-relaxed prose prose-sm max-w-none text-slate-700">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                {(selectedTask as any).description || (selectedTask as any).mission}
              </ReactMarkdown>
            </div>
            
            { (selectedTask as any).content && (
              <div className="mt-4 mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-hidden shadow-inner">
                {(selectedTask as any).type === 'lesson' && (
                  <div 
                    id="lesson-scroll-container"
                    className="prose prose-sm prose-blue max-w-none text-slate-700 overflow-y-auto max-h-[300px] pr-2"
                    onScroll={(e) => {
                      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                      if (scrollHeight <= clientHeight) {
                        setReadingProgress(100);
                      } else {
                        setReadingProgress(Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)));
                      }
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{(selectedTask as any).content}</ReactMarkdown>
                  </div>
                )}
                {(selectedTask as any).type === 'video' && (
                  <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative shadow-md">
                    <ReactPlayer 
                      url={(selectedTask as any).content}
                      width="100%"
                      height="100%"
                      controls={true}
                      onProgress={(progress: { played: number }) => {
                        setReadingProgress(Math.min(100, Math.round(progress.played * 100)));
                      }}
                      onEnded={() => setReadingProgress(100)}
                      className="absolute inset-0"
                    />
                  </div>
                )}
                {(selectedTask as any).type === 'document' && (
                  <div className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-lg">
                    <ScrollText className="h-10 w-10 text-slate-400 mb-2" />
                    <p className="text-slate-600 text-sm mb-4 font-medium text-center">Dokumen PDF siap dibaca oleh siswa.</p>
                    <a href={(selectedTask as any).content} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors shadow-sm shadow-blue-500/20" onClick={() => setReadingProgress(100)}>
                      Buka Dokumen
                    </a>
                  </div>
                )}
                {(selectedTask as any).type === 'quiz' && (
                  <div className="flex flex-col w-full p-4 bg-white border border-slate-200 rounded-lg">
                    {(() => {
                      let data: { soal: string; jawaban: string[]; pembahasan?: string }[] = [];
                      try {
                        data = JSON.parse((selectedTask as any).content || "[]");
                      } catch (e) {}

                      if (!Array.isArray(data) || data.length === 0) {
                         return <p className="text-center text-slate-500 py-4">Kuis ini belum memiliki soal.</p>;
                      }

                      return (
                        <div className="w-full text-left">
                          <h4 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
                            <Puzzle className="w-5 h-5 text-yellow-500" /> Kuis Interaktif
                          </h4>
                          <div 
                            className="space-y-4 max-h-[300px] overflow-y-auto pr-2" 
                            id="lesson-scroll-container"
                            onScroll={(e) => {
                              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                              if (scrollHeight <= clientHeight) {
                                setReadingProgress(100);
                              } else {
                                setReadingProgress(Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)));
                              }
                            }}
                          >
                            {data.map((q, i) => {
                               const userAnswer = quizAnswers[i] || "";
                               const isCorrect = showQuizResults ? q.jawaban.some(ans => ans.trim().toLowerCase() === userAnswer.trim().toLowerCase()) : null;
                               
                               return (
                               <div key={i} className={`p-4 rounded-lg border ${showQuizResults ? (isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-slate-50 border-slate-100'}`}>
                                 <div className="font-medium text-slate-700 mb-3 flex items-start gap-2">
                                   <span className="text-slate-400">{i+1}.</span>
                                   <div className="prose prose-sm prose-blue max-w-none prose-p:my-0 flex-1">
                                     <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{q.soal}</ReactMarkdown>
                                   </div>
                                 </div>
                                 <input 
                                   type="text" 
                                   placeholder="Ketik jawabanmu di sini..." 
                                   className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${showQuizResults ? (isCorrect ? 'border-green-300 bg-green-100 text-green-900' : 'border-red-300 bg-red-100 text-red-900') : 'border-slate-200'}`}
                                   value={userAnswer}
                                   onChange={(e) => setQuizAnswers(prev => ({...prev, [i]: e.target.value}))}
                                   disabled={showQuizResults}
                                 />
                                 {showQuizResults && (
                                    <div className="mt-3 text-sm">
                                      {isCorrect ? (
                                        <p className="font-bold text-green-600 mb-1">✓ Jawaban Benar!</p>
                                      ) : (
                                        <p className="font-bold text-red-600 mb-1">✗ Jawaban Salah. Kunci: {q.jawaban.join(" atau ")}</p>
                                      )}
                                      {q.pembahasan && (
                                        <div className="mt-2 p-2 bg-white/60 rounded text-slate-600 text-xs border border-slate-200/50">
                                          <strong className="block mb-1">Pembahasan:</strong> 
                                          <div className="prose prose-sm prose-blue max-w-none prose-p:my-0">
                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{q.pembahasan}</ReactMarkdown>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                 )}
                               </div>
                               );
                            })}
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                            {!showQuizResults ? (
                              <button 
                                type="button" 
                                className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold rounded-lg text-sm shadow-sm transition-colors" 
                                onClick={() => { 
                                  setShowQuizResults(true);
                                  setReadingProgress(100); 
                                }}
                              >
                                Cek Jawaban & Simpan
                              </button>
                            ) : (
                              <p className="text-green-600 font-bold text-sm">Jawaban tersimpan. Klik tombol submit di bawah untuk menyelesaikan kuis.</p>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}

            { 'mission' in selectedTask && selectedTask.progress < 100 && (
              <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 mb-4">
                <div className="flex gap-2 mb-3">
                  <button 
                    type="button" 
                    onClick={() => setQuestSubmitMode("text")} 
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${questSubmitMode === "text" ? "bg-blue-600 text-white shadow-sm" : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50"}`}
                  >
                    Kotak Isian
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setQuestSubmitMode("file")} 
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${questSubmitMode === "file" ? "bg-blue-600 text-white shadow-sm" : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50"}`}
                  >
                    Unggah PDF
                  </button>
                </div>
                
                {questSubmitMode === "text" ? (
                  <textarea 
                    placeholder="Tuliskan jawaban misi kamu di sini..." 
                    value={questAnswerText} 
                    onChange={(e) => setQuestAnswerText(e.target.value)} 
                    className="w-full text-sm p-3 border border-blue-200 rounded-lg min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                ) : (
                  <label className="flex flex-col gap-2">
                    <span className="font-bold text-blue-900 text-sm">Unggah File Jawaban (Wajib PDF)</span>
                    <input 
                      type="file" 
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
                          showToast("Hanya file PDF yang diizinkan!");
                          e.target.value = '';
                          return;
                        }
                        setQuestAnswerFile(file);
                      }} 
                      className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" 
                    />
                  </label>
                )}
              </div>
            )}

            { 'mission' in selectedTask && selectedTask.progress >= 100 && (
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200 mb-4 animate-in fade-in slide-in-from-bottom-2">
                <h4 className="font-bold text-green-800 text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 
                  IdeQuest Telah Diselesaikan
                </h4>
                <div className="text-sm text-green-700">
                  Kamu mendapatkan <strong className="text-xl">{(selectedTask as any).earnedPoints}</strong> / {(selectedTask as any).points} Poin.
                </div>
                {(selectedTask as any).teacherFeedback && (
                  <div className="mt-4 p-3 bg-white border border-green-100 rounded-lg text-sm text-slate-700 relative shadow-sm">
                    <div className="absolute -top-2.5 left-3 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">Komentar Guru</div>
                    <span className="italic mt-1 block leading-relaxed">"{(selectedTask as any).teacherFeedback}"</span>
                  </div>
                )}
              </div>
            )}

            <div className="student-content-progress">
              <span>{((selectedTask as any).type === 'lesson' || (selectedTask as any).type === 'video' || (selectedTask as any).type === 'document' || (selectedTask as any).type === 'quiz') && selectedTask.progress < 100 ? readingProgress : selectedTask.progress}%</span>
              <i style={{ width: `${((selectedTask as any).type === 'lesson' || (selectedTask as any).type === 'video' || (selectedTask as any).type === 'document' || (selectedTask as any).type === 'quiz') && selectedTask.progress < 100 ? readingProgress : selectedTask.progress}%` }} />
            </div>
            <button 
              type="button" 
              disabled={busy || selectedTask.progress >= 100}
              className={(((selectedTask as any).type === 'lesson' || (selectedTask as any).type === 'video' || (selectedTask as any).type === 'document' || (selectedTask as any).type === 'quiz') && selectedTask.progress < 100 && readingProgress < 100) ? "opacity-50 grayscale cursor-not-allowed" : ""}
              onClick={(e) => {
                const isContent = ((selectedTask as any).type === 'lesson' || (selectedTask as any).type === 'video' || (selectedTask as any).type === 'document' || (selectedTask as any).type === 'quiz');
                const isIncomplete = isContent && selectedTask.progress < 100 && readingProgress < 100;
                
                if (isIncomplete) {
                  e.preventDefault();
                  if ((selectedTask as any).type === 'lesson') showToast("Baca materi sampai selesai");
                  else if ((selectedTask as any).type === 'video') showToast("Tonton video sampai akhir");
                  else if ((selectedTask as any).type === 'document') showToast("Buka dokumen untuk menyelesaikan materi");
                  else if ((selectedTask as any).type === 'quiz') showToast("Selesaikan kuis terlebih dahulu");
                  return;
                }

                if ('mission' in selectedTask) {
                  if (questSubmitMode === "text" && !questAnswerText.trim() && selectedTask.progress < 100) {
                     showToast("Silakan isi teks jawaban terlebih dahulu!");
                     return;
                  }
                  if (questSubmitMode === "file" && !questAnswerFile && selectedTask.progress < 100) {
                     showToast("Silakan unggah file PDF jawaban terlebih dahulu!");
                     return;
                  }
                  onCompleteQuest(selectedTask.id, questSubmitMode === "text" ? questAnswerText : "", questSubmitMode === "file" ? questAnswerFile : null);
                } else {
                  onCompleteMaterial(selectedTask.id);
                }
              }}
            >
              {selectedTask.progress >= 100 
                ? "Tugas Selesai" 
                : ('mission' in selectedTask 
                  ? "Kumpulkan Quest" 
                  : ((selectedTask as any).type === "lesson" 
                     ? "Saya Sudah Membaca Materi Ini" 
                     : ((selectedTask as any).type === "video"
                        ? "Saya Sudah Menonton Video Ini"
                        : ((selectedTask as any).type === "document"
                           ? "Saya Sudah Membaca Materi Ini"
                           : ((selectedTask as any).type === "quiz"
                              ? "Saya Sudah Mengerjakan Kuis Ini"
                              : "Buka dan Kerjakan")))))}
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
  onDeleteAdminUser,
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
  onDeleteAdminUser: (id: string) => void;
  onUpdateRolePermissions: (role: RoleName, permissions: string[]) => void;
  onCreateAdminClass: (payload: { teacherUserId?: string; name: string; subject: string; grade: string; students: number; status: TeacherClass["status"] }) => void;
  onUpdateAdminClass: (id: string, payload: Partial<Pick<TeacherClass, "name" | "subject" | "grade" | "students" | "progress" | "status">> & { teacherUserId?: string }) => void;
  onDeleteAdminClass: (id: string) => void;
}) {
  const [adminView, setAdminView] = useState<AdminView>("home");
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    { label: "Pantau konfigurasi sistem", view: "system", description: "Lihat ringkasan konfigurasi dan atur hak akses.", icon: Settings },
    { label: "Persetujuan Bank Idetech", view: "quick_action", description: "Persetujuan Bank Idetech dan aksi instan lainnya.", icon: Rocket },
    { label: "Kelola Blog", view: "blog", description: "Tulis dan publikasikan artikel blog edukatif menggunakan AI.", icon: BookOpen },
    { label: "Manajemen Orang Tua & Siswa", view: "parent_students", description: "Kelola relasi orang tua dan anak.", icon: Users },
    { label: "Pengaturan Lanjutan", view: "advanced_features", description: "Log aktivitas, pengumuman global, dan master data.", icon: Boxes }
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
            onDeleteUser={onDeleteAdminUser}
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

      {showBackToTop && user.activeRole === "admin" ? (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[100] p-3 bg-slate-800/90 hover:bg-slate-900 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 focus:outline-none backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
          title="Kembali ke Atas"
        >
          <ArrowUp className="h-5 w-5 stroke-[2.5]" />
        </button>
      ) : null}
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

function AgendaCountdown({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);

      setTimeLeft({ days, hours, minutes, isExpired: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const { days, hours, minutes, isExpired } = timeLeft;
  const isPulsating = !isExpired && days === 0 && hours === 0 && minutes <= 59;
  
  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600 shadow-sm">
        <Timer className="w-3.5 h-3.5" />
        Terlewat
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm transition-colors ${isPulsating ? 'animate-pulse text-orange-600 border-orange-300 bg-orange-50' : ''}`}>
      <Timer className={`w-3.5 h-3.5 ${isPulsating ? 'text-orange-500' : 'text-slate-400'}`} />
      {String(days).padStart(2, '0')} hari : {String(hours).padStart(2, '0')} jam : {String(minutes).padStart(2, '0')} menit
    </span>
  );
}

function TeacherAgendaCalendar({ materials, quests, classes }: { materials: TeacherMaterial[]; quests: TeacherIdeQuest[]; classes: TeacherClass[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<number | null>(null);
  const currentRealDate = new Date();
  const currentRealMonth = currentRealDate.getMonth();
  const currentRealYear = currentRealDate.getFullYear();
  const todayDay = currentRealDate.getDate();

  const initialOffset = (new Date(currentRealYear, currentRealMonth, 1).getDay() + 6) % 7;
  const initialWeekIndex = Math.floor((initialOffset + todayDay - 1) / 7) * 7;

  const [selectedMonth, setSelectedMonth] = useState(currentRealMonth);
  const [selectedYear, setSelectedYear] = useState(currentRealYear);
  const [weekStartIndex, setWeekStartIndex] = useState(initialWeekIndex);

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const days = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const firstDayOffset = (firstDay + 6) % 7; // Monday = 0
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
  
  const gridCells = Array.from({ length: totalCells }, (_, i) => {
    const date = i - firstDayOffset + 1;
    return (date > 0 && date <= daysInMonth) ? date : null;
  });

  const eventsMap = useMemo(() => {
    const map: Record<number, number> = {};
    const addDate = (dateStr?: string) => {
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (!isNaN(d.getTime()) && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
        const day = d.getDate();
        map[day] = (map[day] || 0) + 1;
      }
    };
    materials.forEach(m => addDate(m.options?.dueDate));
    quests.forEach(q => addDate(q.dueDate));
    return map;
  }, [materials, quests, selectedMonth, selectedYear]);

  const currentMonthAgendas = useMemo(() => {
    const list: Array<{ type: 'materi' | 'quest', title: string, classId: string, date: Date }> = [];
    
    materials.forEach(m => {
      if (m.options?.dueDate) {
        const d = new Date(m.options.dueDate);
        if (!isNaN(d.getTime()) && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
          list.push({ type: 'materi', title: m.title, classId: m.classId, date: d });
        }
      }
    });
    
    quests.forEach(q => {
      if (q.dueDate) {
        const d = new Date(q.dueDate);
        if (!isNaN(d.getTime()) && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
          list.push({ type: 'quest', title: q.title, classId: q.classId, date: d });
        }
      }
    });

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [materials, quests, selectedMonth, selectedYear]);
  
  const isCurrentMonth = selectedMonth === currentRealMonth && selectedYear === currentRealYear;
  const activeDate = isCurrentMonth ? todayDay : -1;

  // Active week is dynamic
  const activeWeekDates = gridCells.slice(weekStartIndex, weekStartIndex + 7);

  function prevWeek() {
    setWeekStartIndex(prev => Math.max(0, prev - 7));
  }

  function nextWeek() {
    setWeekStartIndex(prev => Math.min(gridCells.length - 7, prev + 7));
  }

  function goToCurrentMonth() {
    setSelectedMonth(currentRealMonth);
    setSelectedYear(currentRealYear);
    const offset = (new Date(currentRealYear, currentRealMonth, 1).getDay() + 6) % 7;
    setWeekStartIndex(Math.floor((offset + todayDay - 1) / 7) * 7);
  }

  function prevMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setWeekStartIndex(0);
  }

  function nextMonth() {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setWeekStartIndex(0);
  }

  return (
    <>
      <div className="mt-8 mb-8 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Agenda Terdekat</h2>
          <p className="text-white/70 text-sm">Kalender kegiatan sekolah. Klik tanggal yang ditandai untuk melihat detail.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 md:p-6 overflow-hidden relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <div>
              <p className="text-orange-500 text-[10px] md:text-xs font-bold tracking-wider mb-1 uppercase">Kalender Agenda</p>
              <div className="flex items-center gap-1 group relative">
                <select 
                  value={selectedMonth} 
                  onChange={e => { setSelectedMonth(Number(e.target.value)); setWeekStartIndex(0); }}
                  className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight bg-transparent border-none focus:ring-0 cursor-pointer p-0 appearance-none outline-none hover:text-blue-600 transition-colors z-10"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i}>{m} {selectedYear}</option>
                  ))}
                </select>
                <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button 
                  type="button"
                  onClick={prevWeek}
                  className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button 
                  type="button"
                  onClick={goToCurrentMonth}
                  className="h-9 md:h-10 px-3 md:px-4 rounded-xl border border-slate-200 text-slate-600 text-xs md:text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Bulan Ini
                </button>
                <button 
                  type="button"
                  onClick={nextWeek}
                  className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setSelectedDateForModal(null);
                  setIsModalOpen(true);
                }}
                className="h-9 md:h-10 px-3 md:px-4 rounded-xl border border-blue-200 text-blue-700 text-xs md:text-sm font-bold hover:bg-blue-50 transition-colors ml-1"
              >
                Lihat Semua Agenda
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-2 md:gap-4 mb-2">
            {days.map(d => (
              <div key={d} className="text-center text-[10px] md:text-xs font-bold text-slate-400 tracking-wider">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {activeWeekDates.map((date, index) => {
              if (date === null) {
                return <div key={`empty-wk-${index}`} className="h-14 md:h-20 rounded-xl md:rounded-2xl border border-transparent"></div>;
              }
              const hasEvent = date in eventsMap;
              const isSelected = date === activeDate;
              return (
                <div 
                  key={date} 
                  onClick={() => {
                    if (hasEvent) {
                      setSelectedDateForModal(date);
                      setIsModalOpen(true);
                    }
                  }}
                  className={`
                    relative h-14 md:h-20 rounded-xl md:rounded-2xl border p-2 flex flex-col justify-start transition-all ${hasEvent ? 'cursor-pointer' : 'cursor-default'}
                    ${isSelected 
                        ? (hasEvent ? "bg-orange-50/50 border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.4)] hover:bg-orange-100" : "bg-blue-50/50 border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.4)] hover:bg-blue-50") 
                        : (hasEvent ? "bg-orange-50/50 border-orange-200 hover:bg-orange-50" : "bg-slate-50/30 border-slate-100 hover:bg-slate-50")}
                  `}
                >
                  <div className={`text-xs md:text-sm font-bold flex items-center justify-center rounded-full ${isSelected ? "w-6 h-6 md:w-7 md:h-7 bg-blue-600 text-white shadow-md ring-2 ring-blue-200" : hasEvent ? "w-6 h-6 md:w-7 md:h-7 bg-orange-500 text-white" : "text-slate-600 w-6 h-6 md:w-7 md:h-7"}`}>
                    {date}
                  </div>
                  {hasEvent && (
                    <div className="absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2 w-4 h-4 md:w-5 md:h-5 bg-blue-700/90 text-white text-[9px] md:text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {eventsMap[date]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 md:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              type="button"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1 transition-colors z-20" 
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 pr-10">
              <div>
                <p className="text-orange-500 text-xs font-bold tracking-wider mb-1 uppercase">Kalender Agenda</p>
                <div className="flex items-center gap-1 group relative">
                  <select 
                    value={selectedMonth} 
                    onChange={e => { setSelectedMonth(Number(e.target.value)); setWeekStartIndex(0); setSelectedDateForModal(null); }}
                    className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight bg-transparent border-none focus:ring-0 cursor-pointer p-0 appearance-none outline-none hover:text-blue-600 transition-colors z-10"
                  >
                    {months.map((m, i) => (
                      <option key={i} value={i}>{m} {selectedYear}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-6 w-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { prevMonth(); setSelectedDateForModal(null); }} className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
                  <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button onClick={() => { goToCurrentMonth(); setSelectedDateForModal(null); }} className="h-9 md:h-10 px-3 md:px-4 rounded-full bg-blue-50 text-blue-700 text-xs md:text-sm font-bold hover:bg-blue-100 transition-colors">
                  Bulan Ini
                </button>
                <button onClick={() => { nextMonth(); setSelectedDateForModal(null); }} className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>
            </div>
            
            <div className="mt-2">
              <h4 className="text-lg font-bold text-slate-800 mb-4">
                {selectedDateForModal 
                  ? `Agenda: ${selectedDateForModal} ${months[selectedMonth]} ${selectedYear}` 
                  : `Daftar Agenda (${months[selectedMonth]} ${selectedYear})`}
              </h4>
              
              {(() => {
                const filteredAgendas = currentMonthAgendas.filter(a => selectedDateForModal === null || a.date.getDate() === selectedDateForModal);
                if (filteredAgendas.length === 0) {
                  return <div className="text-center py-8 text-slate-500">Belum ada agenda untuk {selectedDateForModal ? 'tanggal' : 'bulan'} ini.</div>;
                }
                return (
                  <div className="space-y-3">
                    {filteredAgendas.map((agenda, i) => (
                      <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 flex items-center justify-center min-w-8 w-8 h-8 rounded-full ${agenda.type === 'materi' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                            {agenda.type === 'materi' ? <BookOpen className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-tight">{agenda.title}</p>
                            <p className="text-xs font-medium text-slate-500 mt-1">Kelas: {classes.find(c => c.id === agenda.classId)?.name || agenda.classId}</p>
                          </div>
                        </div>
                        <div className="mt-3 md:mt-0 md:text-right shrink-0">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 md:hidden">Tenggat Waktu</div>
                          <span className="inline-flex flex-col md:items-end gap-1">
                            <AgendaCountdown targetDate={agenda.date} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:block">Tenggat Waktu</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DianyssaWidget({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("https://asisten.ferilee.gurumuda.eu.org/api/integration/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages
        })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: "Maaf, terjadi kesalahan atau respon kosong dari server." }]);
      }
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { role: "assistant", content: "Maaf, gagal terhubung ke Asisten Dianyssa." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-[999] w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[70vh] bg-slate-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-800 animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden border border-blue-400/30">
            <img src="https://asisten.ferilee.gurumuda.eu.org/assets/DianyssaBot.webp" alt="Dianyssa" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-2">
              Dianyssa <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>
            <div className="text-[10px] text-slate-400">Asisten Pintar IdeTech</div>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-1 mb-4 shadow-lg shadow-blue-900/20">
              <div className="w-full h-full bg-slate-900 rounded-xl overflow-hidden">
                <img src="https://asisten.ferilee.gurumuda.eu.org/assets/DianyssaBot.webp" alt="Dianyssa" className="w-full h-full object-cover" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-outfit">Halo!</h3>
            <p className="text-sm text-slate-400">Saya Dianyssa, asisten pintar IdeTech. Ada yang bisa saya bantu hari ini?</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex-shrink-0 mr-2 mt-1 overflow-hidden">
                  <img src="https://asisten.ferilee.gurumuda.eu.org/assets/DianyssaBot.webp" alt="D" className="w-full h-full object-cover" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed overflow-hidden ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'}`}>
                {m.role === 'user' ? (
                  m.content
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-slate-700 prose-pre:text-xs text-slate-200 overflow-x-auto">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex-shrink-0 mr-2 mt-1 overflow-hidden">
              <img src="https://asisten.ferilee.gurumuda.eu.org/assets/DianyssaBot.webp" alt="D" className="w-full h-full object-cover" />
            </div>
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-700 flex items-center gap-1.5 h-11">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="relative flex items-end bg-slate-950 border border-slate-700 rounded-xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all shadow-inner overflow-hidden">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Tanya Dianyssa..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 resize-none outline-none py-3 px-4 max-h-[120px]"
            rows={1}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="mb-2 mr-2 p-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-50 disabled:bg-slate-700 transition-colors shrink-0 flex items-center justify-center h-8 w-8"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>
    </div>
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
  const [guideModal, setGuideModal] = useState<MobileNavId | null>(null);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [hasUnpublishedJournalDraft, setHasUnpublishedJournalDraft] = useState(false);

  useEffect(() => {
    const checkDraft = () => {
      setHasUnpublishedJournalDraft(!!localStorage.getItem("teacher_journal_draft"));
    };
    checkDraft();
    window.addEventListener("storage", checkDraft);
    window.addEventListener("journal_draft_changed", checkDraft);
    return () => {
      window.removeEventListener("storage", checkDraft);
      window.removeEventListener("journal_draft_changed", checkDraft);
    };
  }, []);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [classSummary, setClassSummary] = useState<TeacherClassSummary | null>(null);
  const [activeClassFilter, setActiveClassFilter] = useState<string>("all");
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [showRppGenerator, setShowRppGenerator] = useState(false);
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
    content: "",
    dueDate: ""
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
    map: roleFeatures.teacher.filter((feature) => feature.name === "Jurnal Mengajar"),
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
        const payload = {
          ...materialForm,
          options: materialForm.dueDate ? { dueDate: materialForm.dueDate } : null
        };
        await api<{ material: TeacherMaterial }>(`/api/teacher/materials/${editingMaterialId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setEditingMaterialId(null);
      } else {
        const payload = {
          ...materialForm,
          options: materialForm.dueDate ? { dueDate: materialForm.dueDate } : null
        };
        await api<{ material: TeacherMaterial }>("/api/teacher/materials", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setMaterialForm((current) => ({ ...current, title: "", description: "", dueDate: "" }));
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
      content: material.content || "",
      dueDate: material.options?.dueDate || ""
    });
  }

  function cancelEditMaterial() {
    setEditingMaterialId(null);
    setEditingQuestId(null);
    setMaterialForm({ classId: "", title: "", type: "lesson", description: "", content: "", dueDate: "" });
    setQuestForm({ classId: "", materialId: "", title: "", mission: "", points: "100", dueDate: "" });
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

  async function deleteMaterial(id: string) {
    if (!confirm("Yakin ingin menghapus materi ini?")) return;
    setStudioBusy(true);
    setStudioError(null);
    try {
      await api(`/api/teacher/materials/${id}`, { method: "DELETE" });
      await loadTeacherStudio();
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Gagal menghapus materi.");
    } finally {
      setStudioBusy(false);
    }
  }

  async function deleteQuest(id: string) {
    if (!confirm("Yakin ingin menghapus IdeQuest ini?")) return;
    setStudioBusy(true);
    setStudioError(null);
    try {
      await api(`/api/teacher/idequests/${id}`, { method: "DELETE" });
      await loadTeacherStudio();
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Gagal menghapus IdeQuest.");
    } finally {
      setStudioBusy(false);
    }
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

    if (featureName.includes("Radar") || featureName.includes("Peringatan") || featureName.includes("Grading")) {
      setActiveFeature("radar");
      return;
    } else if (featureName.includes("progres") || featureName.includes("Laporan")) {
      setActiveFeature("report");
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
            <div className="w-9 h-9" aria-hidden="true" />
            <h1 className="teacher-space-logo-title">
              <IdeTechLogo className="teacher-space-logo" />
              IdeTech
            </h1>
            <button className="teacher-space-menu-button" type="button" aria-label="Informasi Pengembang" onClick={() => setShowDevModal(true)}>
              <Users className="h-5 w-5 text-slate-700" />
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
                <button type="button" onClick={() => activeMenu === "map" ? onChangeMenu("profile") : setGuideModal(activeMenu)}>
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
              onDeleteMaterial={deleteMaterial}
              onDeleteQuest={deleteQuest}
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
          ) : activeMenu === "rank" ? (
            <TeacherRadarView onClose={() => onChangeMenu("map")} mode="radar" />
          ) : (
            <>
              {activeMenu === "map" && (
                <>
                  <TeacherAgendaCalendar materials={materials} quests={ideQuestRows} classes={teacherClasses} />
                  
                  <div className="mb-6 flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-3">
                      {dashboard.metrics.slice(0, 3).map((metric, index) => (
                        <div key={metric.label} className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-md flex flex-col justify-between">
                          <span className="text-white/70 text-[9px] uppercase font-bold tracking-wider mb-1 leading-tight">{metric.label}</span>
                          <span className="text-white text-2xl font-black">{metric.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {dashboard.metrics.slice(3, 5).map((metric, index) => (
                        <div key={metric.label} className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-md flex flex-col justify-between">
                          <span className="text-white/70 text-[11px] uppercase font-bold tracking-wider mb-2 leading-tight">{metric.label}</span>
                          <span className="text-white text-3xl font-black">{metric.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <section className="teacher-space-card-grid">
                {exploreCards.map((feature, index) => (
                  <button
                    key={feature.name}
                    className={index === 0 ? "teacher-space-planet-card is-warm" : "teacher-space-planet-card is-green"}
                    type="button"
                    onClick={() => openTeacherFeature(feature.name)}
                  >
                    <span className="teacher-feature-orb" />
                    <strong className="flex items-center gap-2">
                      {feature.name}
                      {feature.name === "Jurnal Mengajar" && hasUnpublishedJournalDraft && (
                        <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      )}
                    </strong>
                    <small>{feature.cta}</small>
                    <ChevronRight className="teacher-feature-arrow h-5 w-5" />
                  </button>
                ))}
                
                {/* Custom RPP Generator Banner Card */}
                <button
                  className="teacher-space-planet-card bg-gradient-to-br from-indigo-500 to-purple-600 border-none relative overflow-hidden"
                  type="button"
                  onClick={() => setShowRppGenerator(true)}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Sparkles className="w-16 h-16 text-white" />
                  </div>
                  <span className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-3 shrink-0 relative z-10 backdrop-blur-md text-white shadow-inner">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <strong className="text-white relative z-10 text-lg">AI RPP Generator</strong>
                  <small className="text-white/80 relative z-10 leading-relaxed max-w-[200px]">Buat Modul Ajar Kurikulum Merdeka instan</small>
                  <ChevronRight className="teacher-feature-arrow h-5 w-5 text-white absolute bottom-5 right-5 z-10" />
                </button>
              </section>

              {activeMenu !== "map" && (
                <section className="teacher-space-list">
                  {(listItems.length ? listItems : roleFeatures.teacher.slice(0, 3)).map((feature, index) => {
                    const Icon = index === 0 ? Gauge : index === 1 ? BookOpen : Target;

                    return (
                      <button key={feature.name} className="teacher-space-list-card" type="button" onClick={() => openTeacherFeature(feature.name)}>
                        <span>
                          <Icon className="h-6 w-6" />
                        </span>
                        <div>
                          <strong className="flex items-center gap-2">
                            {feature.name}
                            {feature.name === "Jurnal Mengajar" && hasUnpublishedJournalDraft && (
                              <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                            )}
                          </strong>
                          <small>{feature.description}</small>
                        </div>
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    );
                  })}
                </section>
              )}
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

      {guideModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => setGuideModal(null)}>
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-slate-800">
              {guideModal === "quest" ? "Panduan Kelas Saya" :
               guideModal === "studio" ? "Panduan IdeStudio Guru" :
               "Panduan Radar Pintar"}
            </h3>
            <div className="prose prose-sm text-slate-600 overflow-y-auto max-h-[60vh] pr-2">
              {guideModal === "quest" && (
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                  {`
**Membuat Kelas:**
1. Masukkan nama kelas, mata pelajaran, dan jenjang.
2. Klik 'Tambah Kelas'.
3. Bagikan ClassID ke siswa untuk bergabung.

**Mengelola Kelas:**
- Pantau jumlah siswa yang telah bergabung.
- Lihat persentase progres penyelesaian materi kelas secara keseluruhan.
- Kamu dapat melihat laporan rinci melalui fitur Radar Pintar.
                  `}
                </ReactMarkdown>
              )}
              {guideModal === "studio" && (
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                  {`
**Membuat Materi:**
1. Pilih tab 'Materi' dan buat materi baru.
2. Materi bisa berupa teks kaya (Rich Text), tautan video, atau dokumen PDF.
3. Simpan materi untuk diakses siswa.

**IdeQuest (Misi & Kuis):**
1. Setiap IdeQuest sebaiknya ditautkan ke materi tertentu agar siswa membaca materi terlebih dahulu.
2. Berikan misi spesifik atau soal pilihan.
3. Atur *points* (XP) sebagai reward untuk gamifikasi.
                  `}
                </ReactMarkdown>
              )}
              {guideModal === "rank" && (
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                  {`
**Radar Pintar:**
Fitur ini menganalisis semua aktivitas siswa di kelas Anda:
- **Peringatan Dini:** Deteksi otomatis siswa yang kesulitan pada materi atau IdeQuest tertentu.
- **Intervensi:** Panduan untuk menindaklanjuti progres siswa yang lambat.
- **Performa Relatif:** Bandingkan rata-rata kelas dengan aktivitas individu.
                  `}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <DeveloperModal isOpen={showDevModal} onClose={() => setShowDevModal(false)} />

      {/* Floating Chat Widget */}
      {showChat ? (
        <DianyssaWidget onClose={() => setShowChat(false)} />
      ) : (
        <button 
          onClick={() => setShowChat(true)}
          className="fixed bottom-24 right-4 z-[999] h-14 w-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 border-2 border-white animate-in slide-in-from-bottom-5"
          aria-label="Buka Chat"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* RPP Generator Modal */}
      {showRppGenerator && (
        <TeacherRPPGenerator onClose={() => setShowRppGenerator(false)} />
      )}
    </main>
  );
}

function DeveloperModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="relative h-72 w-full">
          <img src="/idetechteam.webp" alt="Tim Pengembang" className="h-full w-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <h2 className="text-2xl font-black text-white drop-shadow-md">Meet Our Team</h2>
            <p className="text-xs font-bold text-white/80 mt-0.5">Para visioner di balik layar IdeTech</p>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-md hover:bg-black/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm font-semibold leading-relaxed text-slate-600 mb-5">
            IdeTech dibangun dengan semangat untuk mewujudkan pendidikan yang lebih baik, efisien, dan menyenangkan di seluruh Indonesia.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-100">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Feri Lee</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Development & Design</p>
              </div>
              <div className="flex gap-2">
                <a href="https://t.me/ferilee" target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Telegram @ferilee">
                  <Send className="h-4 w-4" />
                </a>
                <a href="https://ferilee.gurumuda.eu.org/" target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Website Feri Lee">
                  <Globe className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-100">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Gunanto</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Development & Design</p>
              </div>
              <div className="flex gap-2">
                <a href="https://t.me/pg957" target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 transition-colors" title="Telegram @pg957">
                  <Send className="h-4 w-4" />
                </a>
                <a href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 transition-colors" title="Website (Belum Tersedia)">
                  <Globe className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  onCancelEditQuest,
  onDeleteMaterial,
  onDeleteQuest
}: {
  classes: TeacherClass[];
  materials: TeacherMaterial[];
  quests: TeacherIdeQuest[];
  materialForm: { classId: string; title: string; type: TeacherMaterial["type"]; description: string; content: string; dueDate: string };
  questForm: { classId: string; materialId: string; title: string; mission: string; points: string; dueDate: string };
  busy: boolean;
  error: string | null;
  editingMaterialId?: string | null;
  editingQuestId?: string | null;
  onMaterialFormChange: React.Dispatch<React.SetStateAction<{ classId: string; title: string; type: TeacherMaterial["type"]; description: string; content: string; dueDate: string }>>;
  onQuestFormChange: React.Dispatch<React.SetStateAction<{ classId: string; materialId: string; title: string; mission: string; points: string; dueDate: string }>>;
  onCreateMaterial: (event: React.FormEvent<HTMLFormElement>) => void;
  onCreateQuest: (event: React.FormEvent<HTMLFormElement>) => void;
  onEditMaterial?: (material: TeacherMaterial) => void;
  onEditQuest?: (quest: TeacherIdeQuest) => void;
  onCancelEditMaterial?: () => void;
  onCancelEditQuest?: () => void;
  onDeleteMaterial?: (id: string) => void;
  onDeleteQuest?: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<"material" | "quest">("material");
  const [showMarkdownGuide, setShowMarkdownGuide] = React.useState(false);
  const [showAdvancedMaterial, setShowAdvancedMaterial] = React.useState(false);
  const [showAdvancedQuest, setShowAdvancedQuest] = React.useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchFilter, setSearchFilter] = React.useState<"all" | "material" | "quest">("all");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!localStorage.getItem("ideTechTourDone")) {
      const d = driver({
        showProgress: true,
        nextBtnText: 'Lanjut',
        prevBtnText: 'Kembali',
        doneBtnText: 'Selesai',
        steps: [
          { element: '#tour-step-1', popover: { title: 'Selamat Datang!', description: 'Ini adalah Studio Pembuatan, tempat Anda meracik materi dan IdeQuest untuk siswa.' } },
          { element: '#tour-step-2', popover: { title: 'Pilih Tipe Materi', description: 'Gunakan tipe Lesson (Teks), Video, Kuis, atau Dokumen PDF sesuai kebutuhan belajar.' } },
          { element: '#tour-step-3', popover: { title: 'Daftar Terbit', description: 'Semua materi & tugas yang sudah diterbitkan akan muncul di papan ini dan otomatis masuk ke akun siswa Anda.' } }
        ],
        onDestroyStarted: () => {
          localStorage.setItem("ideTechTourDone", "true");
          d.destroy();
        }
      });
      setTimeout(() => d.drive(), 500);
    }
  }, []);

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

  let quizData: { soal: string; jawaban: string[]; pembahasan?: string }[] = [];
  if (materialForm.type === "quiz") {
    try {
      quizData = JSON.parse(materialForm.content || "[]");
      if (!Array.isArray(quizData)) quizData = [];
    } catch {
      quizData = [];
    }
  }

  const updateQuizData = (newData: { soal: string; jawaban: string[]; pembahasan?: string }[]) => {
    onMaterialFormChange((current) => ({ ...current, content: JSON.stringify(newData) }));
  };

  const [isGeneratingAI, setIsGeneratingAI] = React.useState(false);

  const handleGenerateAI = async () => {
    if (!materialForm.title) {
      showToast("Tulis judul materi terlebih dahulu!");
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const isQuiz = materialForm.type === 'quiz';
      const prompt = isQuiz
        ? `Buatkan 3 soal pilihan ganda tentang "${materialForm.title}".
Berikan balasan HANYA berupa array JSON murni, tanpa backtick, tanpa markdown, tanpa teks pembuka/penutup.
Contoh persis:
[
  {"soal": "Pertanyaan 1?", "jawaban": ["Jawaban Benar 1"], "pembahasan": "Penjelasan singkat"},
  {"soal": "Pertanyaan 2?", "jawaban": ["Jawaban Benar 2"], "pembahasan": "Penjelasan singkat"}
]`
        : `Bertindaklah sebagai pengajar ahli. Buatkan materi pembelajaran (Lesson) ringkas dan mudah dipahami untuk topik: "${materialForm.title}".
Gunakan format Markdown (Heading, tebal, miring, list). Sisipkan emoji agar menarik bagi siswa.
Buat struktur: 1. Pendahuluan, 2. Isi Materi, 3. Kesimpulan.`;

      const res = await fetch("https://asisten.ferilee.gurumuda.eu.org/api/integration/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] })
      });
      
      const resText = await res.text();
      let data;
      try {
        data = JSON.parse(resText);
      } catch (e) {
        showToast("Respons API tidak valid (Bukan JSON).");
        return;
      }
      if (data.reply) {
        let content = data.reply;
        if (isQuiz) {
          const startIdx = content.indexOf('[');
          const endIdx = content.lastIndexOf(']');
          if (startIdx !== -1 && endIdx !== -1) {
            content = content.substring(startIdx, endIdx + 1);
          }
          try {
             JSON.parse(content);
          } catch(e) {
             showToast("Dianyssa gagal merespons dengan format yang benar. Coba lagi.");
             setIsGeneratingAI(false);
             return;
          }
        }
        onMaterialFormChange((current) => ({ ...current, content }));
        showToast("Berhasil di-generate oleh Dianyssa AI!");
      } else {
        showToast("Gagal mendapatkan respons AI.");
      }
    } catch (err: any) {
      showToast(`Kesalahan: ${err.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const [isGeneratingQuestAI, setIsGeneratingQuestAI] = React.useState(false);

  const handleGenerateQuestAI = async () => {
    if (!questForm.title) {
      showToast("Tulis topik/judul dasar IdeQuest terlebih dahulu!");
      return;
    }
    
    setIsGeneratingQuestAI(true);
    try {
      const prompt = `Bertindaklah sebagai perancang game edukasi. Buatkan Judul Misi dan Deskripsi Misi yang epik, kreatif, dan menantang untuk topik: "${questForm.title}".
Format harus teks biasa dengan pola berikut:
Judul: [Tulis judul di sini]
Misi: [Tulis deskripsi misi di sini]`;

      const res = await fetch("https://asisten.ferilee.gurumuda.eu.org/api/integration/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] })
      });
      
      const resText = await res.text();
      let data;
      try {
        data = JSON.parse(resText);
      } catch (e) {
        showToast("Respons API tidak valid (Bukan JSON).");
        return;
      }
      
      if (data.reply) {
        let content = data.reply;
        const titleMatch = content.match(/Judul:\s*([^\n]+)/i);
        const missionMatch = content.match(/Misi:\s*([\s\S]+)/i);
        
        if (titleMatch && missionMatch) {
          onQuestFormChange((current) => ({ 
            ...current, 
            title: titleMatch[1].trim().replace(/["*]/g, ''),
            mission: missionMatch[1].trim()
          }));
          showToast("IdeQuest berhasil dikembangkan oleh AI!");
        } else {
           showToast("Format balasan AI tidak sesuai (Gagal parsing).");
        }
      } else {
        showToast("Gagal mendapatkan respons AI.");
      }
    } catch (err: any) {
      showToast(`Kesalahan: ${err.message}`);
    } finally {
      setIsGeneratingQuestAI(false);
    }
  };

  const [showBankModal, setShowBankModal] = React.useState(false);
  const [showRequestsModal, setShowRequestsModal] = React.useState(false);
  const [bankTab, setBankTab] = React.useState<"material" | "quest" | "rpp">("material");
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  
  const [bankItems, setBankItems] = React.useState<{ materials: any[]; quests: any[]; lessonPlans: any[] }>({ materials: [], quests: [], lessonPlans: [] });
  const [bankRequests, setBankRequests] = React.useState<{ incoming: any[]; outgoing: any[] }>({ incoming: [], outgoing: [] });
  const [requestTargetClass, setRequestTargetClass] = React.useState<Record<string, string>>({});
  
  const loadBankPublic = async () => {
    try {
      const data = await api<{ materials: any[]; quests: any[]; lessonPlans: any[] }>("/api/teacher/bank-public");
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
    if (!classId) {
      showToast("Pilih kelas tujuan terlebih dahulu.");
      return;
    }
    try {
      await api("/api/teacher/bank-requests", {
        method: "POST",
        body: JSON.stringify({ itemType: type, itemId: id, targetClassId: classId })
      });
      showToast("Permohonan berhasil dikirim ke pembuat.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal memohon.");
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
      showToast(err instanceof Error ? err.message : "Gagal memproses permohonan.");
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
        <form id="tour-step-1" className="teacher-studio-form" onSubmit={onCreateMaterial}>
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
              id="tour-step-2"
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

        
        {materialForm.type === 'lesson' && (
          <label>
            <div className="flex items-center justify-between w-full mb-2">
              <span className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGeneratingAI || !materialForm.title}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isGeneratingAI ? "Generating..." : "Generate AI"}
              </button>
            </div>

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
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100 text-sm">Daftar Pertanyaan Kuis</span>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGeneratingAI || !materialForm.title}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isGeneratingAI ? "Generating..." : "Generate AI"}
              </button>
            </div>
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
                <textarea
                  placeholder="Pembahasan materi / Penjelasan jawaban (opsional)"
                  value={q.pembahasan || ""}
                  onChange={(e) => {
                    const newQ = [...quizData];
                    newQ[i].pembahasan = e.target.value;
                    updateQuizData(newQ);
                  }}
                  rows={2}
                  className="w-full text-sm border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2 px-3 bg-white resize-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateQuizData([...quizData, { soal: "", jawaban: [], pembahasan: "" }])}
              className="flex items-center justify-center gap-2 w-full py-3 mt-1 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm font-bold shadow-sm"
            >
              <Plus className="h-5 w-5" /> Tambah Soal Kuis
            </button>
          </div>
        )}

        <div className="mt-2 mb-4">
          <button 
            type="button"
            onClick={() => setShowAdvancedMaterial(!showAdvancedMaterial)}
            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {showAdvancedMaterial ? "Sembunyikan Opsi Lanjutan" : "Tampilkan Opsi Lanjutan"}
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedMaterial ? "rotate-180" : ""}`} />
          </button>
          
          {showAdvancedMaterial && (
            <div className="flex flex-col gap-3 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="!mb-0">
                <span className="flex items-center gap-1.5 !text-slate-700" title="Ringkasan yang muncul di bawah judul materi">Deskripsi Singkat <HelpCircle className="w-3.5 h-3.5 text-slate-400" /></span>
                <textarea
                  value={materialForm.description}
                  placeholder="Ringkasan materi untuk siswa..."
                  onChange={(event) => onMaterialFormChange((current) => ({ ...current, description: event.target.value }))}
                  className="mt-1"
                />
              </label>
              <label className="!mb-0">
                <span className="flex items-center gap-1.5 !text-slate-700" title="Batas akhir pengerjaan khusus tipe Kuis atau Tugas">Batas Waktu (Opsional) <HelpCircle className="w-3.5 h-3.5 text-slate-400" /></span>
                <input
                  type="datetime-local"
                  value={materialForm.dueDate}
                  onChange={(event) => onMaterialFormChange((current) => ({ ...current, dueDate: event.target.value }))}
                  className="mt-1"
                />
              </label>
            </div>
          )}
        </div>

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
            <span>Poin Reward</span>
            <input
              min="0"
              type="number"
              value={questForm.points}
              onChange={(event) => onQuestFormChange((current) => ({ ...current, points: event.target.value }))}
            />
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
          <div className="flex items-center justify-between w-full mb-1">
            <span>Misi siswa</span>
            <button
                type="button"
                onClick={handleGenerateQuestAI}
                disabled={isGeneratingQuestAI || !questForm.title}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
                {isGeneratingQuestAI ? (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isGeneratingQuestAI ? "Generating..." : "Generate AI"}
            </button>
          </div>
          <textarea
            value={questForm.mission}
            placeholder="Instruksi misi untuk siswa..."
            onChange={(event) => onQuestFormChange((current) => ({ ...current, mission: event.target.value }))}
          />
        </label>
        <div className="mt-2 mb-4">
          <button 
            type="button"
            onClick={() => setShowAdvancedQuest(!showAdvancedQuest)}
            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {showAdvancedQuest ? "Sembunyikan Opsi Lanjutan" : "Tampilkan Opsi Lanjutan"}
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedQuest ? "rotate-180" : ""}`} />
          </button>
          
          {showAdvancedQuest && (
            <div className="flex flex-col gap-3 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="!mb-0">
                <span className="flex items-center gap-1.5 !text-slate-700" title="Hubungkan quest ini dengan materi tertentu agar siswa membaca materi sebelum mengerjakan">Materi Terkait <HelpCircle className="w-3.5 h-3.5 text-slate-400" /></span>
                <select
                  value={questForm.materialId}
                  onChange={(event) => onQuestFormChange((current) => ({ ...current, materialId: event.target.value }))}
                  className="mt-1"
                >
                  <option value="">Tanpa materi</option>
                  {selectedClassMaterials.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </label>
              <label className="!mb-0">
                <span className="flex items-center gap-1.5 !text-slate-700">Tenggat Waktu / Deadline</span>
                <input
                  type="datetime-local"
                  value={questForm.dueDate}
                  onChange={(event) => onQuestFormChange((current) => ({ ...current, dueDate: event.target.value }))}
                  className="mt-1"
                />
              </label>
            </div>
          )}
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

      <div id="tour-step-3" className="teacher-studio-board">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="!mb-0">Materi Terbit</h3>
            <button type="button" onClick={() => { setIsSearchModalOpen(true); setSearchFilter("material"); }} className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Cari Materi Terbit">
              <Search className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
            {materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-slate-700 font-semibold mb-1">Belum Ada Materi</h4>
                <p className="text-xs text-slate-500 max-w-[200px] mb-3">Bagikan modul atau referensi bacaan untuk kelas Anda.</p>
                <button type="button" onClick={() => setActiveTab("material")} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors">Buat Sekarang</button>
              </div>
            ) : materials.map((item) => (
              <article key={item.id} className="flex flex-col shrink-0 min-h-[96px] group relative p-3 bg-white rounded-lg border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                <div className="flex flex-col my-auto">
                  <strong className="leading-tight">{item.title}</strong>
                  <span className="text-[11px] text-slate-500 mt-0.5">{item.type} - {classes.find((kelas) => kelas.id === item.classId)?.name ?? "Kelas"}</span>
                </div>
                <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                  <div className="overflow-hidden min-h-0">
                    <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                      <button type="button" onClick={async () => {
                        try {
                          await api("/api/teacher/bank-submit", { method: "POST", body: JSON.stringify({ type: "material", id: item.id }) });
                          showToast("Materi ini akan ditinjau oleh tim IdeTech sebelum masuk ke Bank Materi.");
                        } catch (err) {
                          showToast(err instanceof Error ? err.message : "Gagal mengirim ke bank.");
                        }
                      }} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Kirim ke Bank Materi">
                        <Upload className="h-4 w-4" />
                      </button>
                      {onEditMaterial && (
                        <button type="button" onClick={() => onEditMaterial(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Materi">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {onDeleteMaterial && (
                        <button type="button" onClick={() => onDeleteMaterial(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus Materi">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="!mb-0">IdeQuest Terbit</h3>
            <button type="button" onClick={() => { setIsSearchModalOpen(true); setSearchFilter("quest"); }} className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Cari IdeQuest Terbit">
              <Search className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
            {quests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center">
                <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-3">
                  <Target className="w-6 h-6" />
                </div>
                <h4 className="text-slate-700 font-semibold mb-1">Belum Ada IdeQuest</h4>
                <p className="text-xs text-slate-500 max-w-[200px] mb-3">Buat misi seru berhadiah poin untuk memotivasi murid.</p>
                <button type="button" onClick={() => setActiveTab("quest")} className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors">Buat Sekarang</button>
              </div>
            ) : quests.map((item) => (
              <article key={item.id} className="flex flex-col shrink-0 min-h-[96px] group relative p-3 bg-white rounded-lg border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                <div className="flex flex-col my-auto">
                  <strong className="leading-tight">{item.title}</strong>
                  <span className="text-[11px] text-slate-500 mt-0.5">{item.points} poin - {item.dueDate}</span>
                </div>
                <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                  <div className="overflow-hidden min-h-0">
                    <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                      <button type="button" onClick={async () => {
                        try {
                          await api("/api/teacher/bank-submit", { method: "POST", body: JSON.stringify({ type: "quest", id: item.id }) });
                          showToast("IdeQuest ini akan ditinjau oleh tim IdeTech sebelum masuk ke Bank IdeQuest.");
                        } catch (err) {
                          showToast(err instanceof Error ? err.message : "Gagal mengirim ke bank.");
                        }
                      }} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Kirim ke Bank IdeQuest">
                        <Upload className="h-4 w-4" />
                      </button>
                      {onEditQuest && (
                        <button type="button" onClick={() => onEditQuest(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit IdeQuest">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {onDeleteQuest && (
                        <button type="button" onClick={() => onDeleteQuest(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus IdeQuest">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 m-0">
                <Search className="h-5 w-5 text-blue-500" />
                Cari Materi & IdeQuest
              </h3>
              <button type="button" className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 rounded-full p-1.5 transition-colors shadow-sm" onClick={() => { setIsSearchModalOpen(false); setSearchQuery(""); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik kata kunci pencarian..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setSearchFilter("all")} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${searchFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>Semua</button>
                <button type="button" onClick={() => setSearchFilter("material")} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${searchFilter === "material" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>Materi</button>
                <button type="button" onClick={() => setSearchFilter("quest")} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${searchFilter === "quest" ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-600 hover:bg-orange-100"}`}>IdeQuest</button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50 max-h-[400px]">
              {searchQuery.trim() === "" ? (
                <div className="text-center py-10 text-slate-400">
                  <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>Ketik sesuatu untuk mulai mencari</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 teacher-studio-board-search">
                  {(searchFilter === "all" || searchFilter === "material") && materials.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.type.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                    <article key={`search-m-${item.id}`} className="flex flex-col shrink-0 min-h-[96px] group relative p-3 bg-white rounded-lg border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                      <div className="flex flex-col my-auto">
                        <strong className="leading-tight text-slate-800">{item.title}</strong>
                        <span className="text-[11px] text-slate-500 mt-0.5">{item.type} - {classes.find((kelas) => kelas.id === item.classId)?.name ?? "Kelas"}</span>
                      </div>
                      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                        <div className="overflow-hidden min-h-0">
                          <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                            <button type="button" onClick={async () => { try { await api("/api/teacher/bank-submit", { method: "POST", body: JSON.stringify({ type: "material", id: item.id }) }); showToast("Materi ini akan ditinjau oleh tim IdeTech."); } catch (err) { showToast(err instanceof Error ? err.message : "Gagal mengirim ke bank."); } }} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Kirim ke Bank Materi"><Upload className="h-4 w-4" /></button>
                            {onEditMaterial && <button type="button" onClick={() => { setIsSearchModalOpen(false); onEditMaterial(item); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Materi"><Pencil className="h-4 w-4" /></button>}
                            {onDeleteMaterial && <button type="button" onClick={() => onDeleteMaterial(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus Materi"><Trash2 className="h-4 w-4" /></button>}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {(searchFilter === "all" || searchFilter === "quest") && quests.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                    <article key={`search-q-${item.id}`} className="flex flex-col shrink-0 min-h-[96px] group relative p-3 bg-white rounded-lg border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                      <div className="flex flex-col my-auto">
                        <strong className="leading-tight text-slate-800">{item.title}</strong>
                        <span className="text-[11px] text-slate-500 mt-0.5">{item.points} poin - {item.dueDate}</span>
                      </div>
                      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                        <div className="overflow-hidden min-h-0">
                          <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                            <button type="button" onClick={async () => { try { await api("/api/teacher/bank-submit", { method: "POST", body: JSON.stringify({ type: "quest", id: item.id }) }); showToast("IdeQuest ini akan ditinjau oleh tim IdeTech."); } catch (err) { showToast(err instanceof Error ? err.message : "Gagal mengirim ke bank."); } }} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Kirim ke Bank IdeQuest"><Upload className="h-4 w-4" /></button>
                            {onEditQuest && <button type="button" onClick={() => { setIsSearchModalOpen(false); onEditQuest(item); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit IdeQuest"><Pencil className="h-4 w-4" /></button>}
                            {onDeleteQuest && <button type="button" onClick={() => onDeleteQuest(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus IdeQuest"><Trash2 className="h-4 w-4" /></button>}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {((searchFilter === "all" && materials.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.type.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && quests.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) ||
                    (searchFilter === "material" && materials.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.type.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) ||
                    (searchFilter === "quest" && quests.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0)) && (
                     <div className="text-center py-8 text-slate-500">
                       <p>Tidak ada hasil yang cocok dengan pencarian Anda.</p>
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${bankTab === 'rpp' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                onClick={() => setBankTab('rpp')}
              >
                Bank RPP (AI)
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
                          className="text-xs font-medium text-slate-700 border border-slate-300 rounded p-1.5 w-full bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
              ) : bankTab === 'quest' ? (
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
                          className="text-xs font-medium text-slate-700 border border-slate-300 rounded p-1.5 w-full bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
              ) : (
                bankItems.lessonPlans?.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 bg-white rounded-xl border border-slate-100 shadow-sm">Belum ada RPP di bank.</div>
                ) : (
                  bankItems.lessonPlans?.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800">{item.topic}</h4>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Kelas {item.grade}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Oleh: {item.teacherName} • {item.duration} • {item.model}</p>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <Button type="button" onClick={() => {
                          navigator.clipboard.writeText(item.content);
                          alert('Isi RPP disalin ke clipboard!');
                        }} className="w-full text-xs py-1.5 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50">Salin Isi RPP</Button>
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
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl z-[100] text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-6">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          {toastMessage}
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

      <div className="teacher-class-grouped-list mt-8 flex flex-col gap-4">
        {Object.entries(
          classes.reduce((acc, curr) => {
            if (!acc[curr.grade]) acc[curr.grade] = [];
            acc[curr.grade].push(curr);
            return acc;
          }, {} as Record<string, typeof classes>)
        ).sort(([a], [b]) => Number(a) - Number(b)).map(([grade, gradeClasses]) => (
          <details key={grade} className="group border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <summary className="flex items-center justify-between p-4 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors select-none font-bold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <span className="flex items-center gap-2">Jenjang {grade} <span className="bg-indigo-600/80 text-white text-xs px-2 py-0.5 rounded-full">{gradeClasses.length} kelas</span></span>
              <ChevronDown className="h-5 w-5 text-slate-400 transform transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="p-4 grid gap-3 teacher-class-list bg-transparent">
              {gradeClasses.map((item) => (
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
          </details>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<"home" | "shop" | "blog" | "demo" | "usecases" | "contact">("home");
  const [readingBlog, setReadingBlog] = useState<any | null>(null);
  const [shopSearch, setShopSearch] = useState("");
  const [shopSort, setShopSort] = useState<"asc" | "desc">("asc");
  const [selectedShopItem, setSelectedShopItem] = useState<any | null>(null);

  const [showTestimoniModal, setShowTestimoniModal] = useState(false);
  const [testimoniForm, setTestimoniForm] = useState({ name: "", role: "Guru", message: "" });
  const [testimoniStatus, setTestimoniStatus] = useState<"idle" | "submitted">("idle");

  const [activeTestimoniIndex, setActiveTestimoniIndex] = useState(0);

  const testimonials = [
    { name: "Budi Santoso", role: "Guru Matematika", message: "IdeTech benar-benar mengubah cara saya mengajar. Pembuatan RPP jadi sangat cepat dan IdeQuest membuat murid lebih aktif!" },
    { name: "Siti Rahma", role: "Kepala Sekolah", message: "Dashboard admin memberikan pandangan menyeluruh yang sangat saya butuhkan untuk evaluasi kurikulum dan kinerja sekolah kami." },
    { name: "Andi Wijaya", role: "Siswa SMA", message: "Belajar lewat IdeQuest seperti main game! Saya jadi lebih semangat mengumpulkan poin dan naik level tiap selesai materi." },
    { name: "Maya Indah", role: "Orang Tua", message: "Sekarang saya bisa dengan mudah melihat perkembangan anak saya dan tugas apa saja yang belum dikerjakan dari HP." }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimoniIndex((prev) => (prev + 1) % testimonials.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const [publicBlogs, setPublicBlogs] = useState<any[]>([]);
  const [publicBlogsBusy, setPublicBlogsBusy] = useState(false);
  useEffect(() => {
    if (activeView === "blog" && publicBlogs.length === 0) {
      setPublicBlogsBusy(true);
      api<{ blogs: any[] }>("/api/public/blogs").then(res => {
        if (res.blogs) setPublicBlogs(res.blogs);
      }).catch(e => console.error("Gagal memuat blog:", e))
      .finally(() => setPublicBlogsBusy(false));
    }
  }, [activeView, publicBlogs.length]);

  useEffect(() => {
    if (activeView !== "blog") {
      setReadingBlog(null);
    }
  }, [activeView]);

  const nextTestimoni = () => setActiveTestimoniIndex((prev) => (prev + 1) % testimonials.length);
  const prevTestimoni = () => setActiveTestimoniIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  const handleTestimoniSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTestimoniStatus("submitted");
    setTimeout(() => {
      setShowTestimoniModal(false);
      setTestimoniStatus("idle");
      setTestimoniForm({ name: "", role: "Guru", message: "" });
    }, 3000);
  };

  const shopItems = useMemo(() => {
    const items = [
      { id: 1, title: "RPP Kurikulum Merdeka Terpadu", priceValue: 50000, price: "Rp 50.000", type: "Dokumen", image: "https://placehold.co/400x300/3b82f6/ffffff?text=RPP+Terpadu", description: "Dokumen RPP komprehensif untuk mendukung implementasi Kurikulum Merdeka di sekolah Anda. Berisi panduan lengkap, rubrik penilaian, dan referensi materi." },
      { id: 2, title: "Bank Soal HOTS Matematika", priceValue: 35000, price: "Rp 35.000", type: "PDF", image: "https://placehold.co/400x300/10b981/ffffff?text=Bank+Soal", description: "Kumpulan soal High Order Thinking Skills (HOTS) untuk mata pelajaran Matematika. Dirancang khusus untuk melatih nalar kritis siswa." },
      { id: 3, title: "Template Presentasi Premium", priceValue: 75000, price: "Rp 75.000", type: "PPTX", image: "https://placehold.co/400x300/8b5cf6/ffffff?text=Template+PPT", description: "Template presentasi interaktif dan profesional yang dapat disesuaikan untuk berbagai mata pelajaran. Dilengkapi animasi dan tata letak modern." },
      { id: 4, title: "Modul Ajar IPA Interaktif", priceValue: 45000, price: "Rp 45.000", type: "E-Book", image: "https://placehold.co/400x300/ec4899/ffffff?text=Modul+IPA", description: "E-Book modul ajar Ilmu Pengetahuan Alam dengan pendekatan interaktif, lengkap dengan gambar ilustrasi dan eksperimen sederhana." },
      { id: 5, title: "Kumpulan Jurnal Refleksi Guru", priceValue: 20000, price: "Rp 20.000", type: "Dokumen", image: "https://placehold.co/400x300/f59e0b/ffffff?text=Jurnal+Guru", description: "Buku panduan dan template untuk menulis jurnal refleksi harian guru. Sangat cocok untuk dokumentasi pengembangan diri." },
      { id: 6, title: "Video Animasi Tata Surya", priceValue: 120000, price: "Rp 120.000", type: "Video", image: "https://placehold.co/400x300/6366f1/ffffff?text=Video+Animasi", description: "Video edukasi animasi berkualitas HD tentang Tata Surya. Memudahkan visualisasi materi astronomi untuk siswa." },
      { id: 7, title: "Soal Persiapan Ujian Nasional", priceValue: 40000, price: "Rp 40.000", type: "PDF", image: "https://placehold.co/400x300/14b8a6/ffffff?text=Soal+UN", description: "Paket soal simulasi Ujian Nasional dari berbagai tahun ajaran, lengkap dengan kunci jawaban dan pembahasan." },
      { id: 8, title: "Flashcard Edukasi Bahasa Inggris", priceValue: 60000, price: "Rp 60.000", type: "Printable", image: "https://placehold.co/400x300/ef4444/ffffff?text=Flashcard", description: "Kartu pintar yang dapat dicetak untuk mengajarkan kosakata bahasa Inggris dasar kepada anak dengan metode visual yang menyenangkan." }
    ];
    let filtered = items.filter(item => 
      item.title.toLowerCase().includes(shopSearch.toLowerCase()) || 
      item.type.toLowerCase().includes(shopSearch.toLowerCase())
    );
    
    filtered.sort((a, b) => {
      if (shopSort === "asc") return a.priceValue - b.priceValue;
      return b.priceValue - a.priceValue;
    });

    return filtered;
  }, [shopSearch, shopSort]);

  return (
    <main className="landing-shell min-h-screen">
      <div className="landing-bg" aria-hidden="true" />
      <div className="landing-shell__glow" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-7 sm:px-6 lg:px-8">
        <header className="landing-nav relative">
          <div className="landing-brand">
            <IdeTechLogo className="landing-brand__logo" />
            <p className="landing-brand__name">IdeTech</p>
          </div>

          <nav className="landing-links hidden lg:flex" aria-label="Navigasi utama">
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView("home"); }} className={`flex items-center gap-2 hover:text-blue-600 ${activeView === 'home' ? '!text-blue-600' : ''}`}><House className="w-4 h-4"/> Home</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView("usecases"); }} className={`flex items-center gap-2 hover:text-blue-600 ${activeView === 'usecases' ? '!text-blue-600' : ''}`}><BookOpen className="w-4 h-4"/> Usecases</a>
            {/* <a href="#" onClick={(e) => { e.preventDefault(); setActiveView("shop"); }} className={`flex items-center gap-2 hover:text-blue-600 ${activeView === 'shop' ? '!text-blue-600' : ''}`}><ShoppingCart className="w-4 h-4"/> Shop</a> */}
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView("blog"); }} className={`flex items-center gap-2 hover:text-blue-600 ${activeView === 'blog' ? '!text-blue-600' : ''}`}><BookOpen className="w-4 h-4"/> Blog</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView("demo"); }} className={`flex items-center gap-2 hover:text-blue-600 ${activeView === 'demo' ? '!text-blue-600' : ''}`}><LayoutDashboard className="w-4 h-4"/> Demo</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView("contact"); }} className={`flex items-center gap-2 hover:text-blue-600 ${activeView === 'contact' ? '!text-blue-600' : ''}`}><MessageCircle className="w-4 h-4"/> Contact</a>
          </nav>

          <div className="landing-nav__cta hidden lg:block">
            <a href="/api/auth/google" className="landing-start-button">
              Login
            </a>
          </div>

          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-24 left-4 right-4 z-50 p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 flex flex-col space-y-4">
            <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); setActiveView("home"); }} className={`flex items-center gap-2 font-medium hover:text-blue-600 px-2 py-1 ${activeView === 'home' ? 'text-blue-600' : 'text-slate-700'}`}><House className="w-4 h-4"/> Home</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); setActiveView("usecases"); }} className={`flex items-center gap-2 font-medium hover:text-blue-600 px-2 py-1 ${activeView === 'usecases' ? 'text-blue-600' : 'text-slate-700'}`}><BookOpen className="w-4 h-4"/> Usecases</a>
            {/* <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); setActiveView("shop"); }} className={`flex items-center gap-2 font-medium hover:text-blue-600 px-2 py-1 ${activeView === 'shop' ? 'text-blue-600' : 'text-slate-700'}`}><ShoppingCart className="w-4 h-4"/> Shop</a> */}
            <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); setActiveView("blog"); }} className={`flex items-center gap-2 font-medium hover:text-blue-600 px-2 py-1 ${activeView === 'blog' ? 'text-blue-600' : 'text-slate-700'}`}><BookOpen className="w-4 h-4"/> Blog</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); setActiveView("demo"); }} className={`flex items-center gap-2 font-medium hover:text-blue-600 px-2 py-1 ${activeView === 'demo' ? 'text-blue-600' : 'text-slate-700'}`}><LayoutDashboard className="w-4 h-4"/> Demo</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); setActiveView("contact"); }} className={`flex items-center gap-2 font-medium hover:text-blue-600 px-2 py-1 ${activeView === 'contact' ? 'text-blue-600' : 'text-slate-700'}`}><MessageCircle className="w-4 h-4"/> Contact</a>
          </div>
        )}

        {activeView === "home" && (
          <section className="landing-hero lg:grid-cols-2" id="home">
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
                <button className="landing-secondary-button" type="button" onClick={() => setActiveView("usecases")} disabled={busy}>
                  Lihat Panduan
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {error ? <ErrorBanner message={error} /> : null}
            </div>
            
            <div className="flex flex-col gap-4 w-full max-w-md mx-auto lg:ml-auto lg:mr-0 relative z-10 pt-12 lg:pt-0">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-md border border-slate-200/50">
                  <h3 className="text-xl font-black text-blue-700">Apa kata mereka?</h3>
                </div>
                <button onClick={() => setShowTestimoniModal(true)} className="text-sm font-bold text-blue-600 bg-white/80 hover:bg-white px-4 py-2 rounded-full shadow-sm border border-white/50 backdrop-blur-md transition-all">
                  + Tulis Testimoni
                </button>
              </div>
              
              <div className="relative group">
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-slate-200/50 shadow-xl relative overflow-hidden min-h-[180px] flex flex-col justify-center">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-800 pointer-events-none">
                    <MessageCircle className="w-20 h-20" />
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                      {testimonials[activeTestimoniIndex].name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg leading-tight">{testimonials[activeTestimoniIndex].name}</p>
                      <p className="text-sm font-semibold text-blue-600">{testimonials[activeTestimoniIndex].role}</p>
                    </div>
                  </div>
                  <p className="text-slate-700 text-base leading-relaxed italic relative z-10">"{testimonials[activeTestimoniIndex].message}"</p>
                </div>
                
                {/* Navigation arrows */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button onClick={prevTestimoni} className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-sm border border-slate-200/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex gap-1.5">
                    {testimonials.map((_, idx) => (
                      <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeTestimoniIndex ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300'}`} />
                    ))}
                  </div>
                  <button onClick={nextTestimoni} className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-sm border border-slate-200/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {showTestimoniModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 relative">
                  <button onClick={() => setShowTestimoniModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  
                  {testimoniStatus === "submitted" ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 mb-2">Terima Kasih!</h3>
                      <p className="text-slate-600">Testimoni Anda telah dikirim dan menunggu validasi dari admin sebelum ditampilkan.</p>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-black text-slate-800 mb-1">Tulis Testimoni</h3>
                      <p className="text-sm text-slate-500 mb-6">Bagikan pengalaman Anda menggunakan IdeTech.</p>
                      
                      <form onSubmit={handleTestimoniSubmit} className="flex flex-col gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Nama Lengkap</label>
                          <input type="text" required value={testimoniForm.name} onChange={e => setTestimoniForm({...testimoniForm, name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Nama Anda" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Peran</label>
                          <select value={testimoniForm.role} onChange={e => setTestimoniForm({...testimoniForm, role: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <option value="Guru">Guru</option>
                            <option value="Siswa">Siswa</option>
                            <option value="Orang Tua">Orang Tua</option>
                            <option value="Kepala Sekolah">Kepala Sekolah</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Pesan Testimoni</label>
                          <textarea required value={testimoniForm.message} onChange={e => setTestimoniForm({...testimoniForm, message: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]" placeholder="Bagaimana IdeTech membantu Anda?"></textarea>
                        </div>
                        <button type="submit" className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm shadow-blue-200">
                          Kirim Testimoni
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {activeView === "shop" && (
          <section className="landing-demo-panel mt-12" id="shop">
            <div className="landing-demo-panel__header mb-4 flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <p className="landing-demo-panel__eyebrow !mb-0">IdeTech Shop</p>
                <ShoppingCart className="h-5 w-5 text-slate-700" />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari lembar kerja..." 
                    className="w-full sm:w-64 bg-white/80 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={shopSearch}
                    onChange={(e) => setShopSearch(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <select 
                    className="w-full sm:w-auto appearance-none bg-white/80 border border-slate-200 rounded-lg pl-4 pr-10 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    value={shopSort}
                    onChange={(e) => setShopSort(e.target.value as "asc" | "desc")}
                  >
                    <option value="asc">Harga: Termurah</option>
                    <option value="desc">Harga: Termahal</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2">
              {shopItems.length > 0 ? shopItems.map((item) => (
                <div key={item.id} className="border border-slate-200/50 rounded-2xl bg-white/60 backdrop-blur-sm flex flex-col hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="h-40 w-full bg-slate-200 relative">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 text-xs font-bold px-2 py-1 bg-white/90 text-slate-800 rounded-full shadow-sm">{item.type}</span>
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight mb-2 line-clamp-2">{item.title}</h3>
                      <span className="font-black text-blue-600">{item.price}</span>
                    </div>
                    <div className="flex justify-between items-center mt-4 gap-2">
                      <button onClick={() => setSelectedShopItem(item)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200">
                        <Info className="w-3.5 h-3.5" /> Detail
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-slate-900 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <ShoppingCart className="w-3.5 h-3.5" /> Beli
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-12 text-center text-slate-500 font-medium">
                  Perangkat tidak ditemukan.
                </div>
              )}
            </div>

            {selectedShopItem && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="relative h-64 w-full bg-slate-100 flex-shrink-0">
                    <img src={selectedShopItem.image} alt={selectedShopItem.title} className="w-full h-full object-cover" />
                    <button onClick={() => setSelectedShopItem(null)} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{selectedShopItem.type}</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">{selectedShopItem.title}</h2>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6">{selectedShopItem.description}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <span className="text-2xl font-black text-blue-600">{selectedShopItem.price}</span>
                      <button className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
                        <ShoppingCart className="w-4 h-4" /> Beli Sekarang
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeView === "blog" && !readingBlog && (
          <section className="landing-demo-panel mt-12" id="blog">
            <div className="landing-demo-panel__header mb-6 flex-col items-start gap-2">
              <div className="flex items-center gap-2">
                <p className="landing-demo-panel__eyebrow !mb-0">Blog IdeTech</p>
                <BookOpen className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mt-2">Kabar dan Artikel Terbaru</h2>
              <p className="text-slate-600">Simak berita, tips, dan informasi terbaru seputar pendidikan dan inovasi pembelajaran.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
              {publicBlogsBusy ? (
                <div className="col-span-full text-center py-10 text-slate-500">Memuat artikel terbaru...</div>
              ) : publicBlogs.length === 0 ? (
                <div className="col-span-full text-center py-10 text-slate-500 bg-white/50 border border-slate-200 rounded-xl">Belum ada artikel yang dipublikasikan.</div>
              ) : (
                publicBlogs.map(blog => (
                  <div key={blog.id} onClick={() => setReadingBlog(blog)} className="bg-white/80 border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all cursor-pointer">
                    <div className="h-48 bg-slate-200 relative">
                      <img src={blog.coverImageUrl || `https://placehold.co/600x400/3b82f6/ffffff?text=${encodeURIComponent(blog.title)}`} alt={blog.title} className="w-full h-full object-cover" />
                      {new Date().getTime() - new Date(blog.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000 && (
                        <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">Baru</span>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{blog.title}</h3>
                      <p className="text-slate-600 text-sm mb-4 line-clamp-3">{blog.excerpt || blog.content.substring(0, 150) + "..."}</p>
                      <button type="button" className="text-blue-600 font-bold text-sm flex items-center gap-1 hover:text-blue-700 transition-colors">Baca selengkapnya <ArrowRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeView === "blog" && readingBlog && (
          <section className="landing-demo-panel mt-12 bg-white/90 p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200" id="blog-read">
            <button onClick={() => setReadingBlog(null)} className="mb-8 flex items-center gap-2 text-slate-500 hover:text-blue-600 font-semibold transition-colors bg-white rounded-full px-4 py-2 shadow-sm border border-slate-100 w-fit">
              <ChevronLeft className="w-5 h-5"/> Kembali ke Artikel
            </button>
            {readingBlog.coverImageUrl && <img src={readingBlog.coverImageUrl} className="w-full h-64 md:h-96 object-cover rounded-2xl mb-8 shadow-sm" alt={readingBlog.title} />}
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">{readingBlog.title}</h1>
            <p className="text-sm font-semibold text-slate-500 mb-10 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(readingBlog.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })} 
              <span className="text-slate-300 mx-2">•</span> 
              Dipublikasikan oleh Tim IdeTech
            </p>
            <div className="prose prose-slate max-w-none prose-img:rounded-2xl prose-img:shadow-sm prose-headings:text-slate-800 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-10 prose-p:leading-relaxed">
              <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeKatex]} remarkPlugins={[remarkMath]}>{readingBlog.content}</ReactMarkdown>
            </div>
          </section>
        )}


        {activeView === "demo" && (
          <section className="landing-demo-panel mt-12" id="demo">
            <div className="landing-demo-panel__header flex-col items-start gap-3 mb-6">
              <div className="flex items-center gap-2">
                <p className="landing-demo-panel__eyebrow !mb-0">Demo role</p>
                <LayoutDashboard className="h-5 w-5 text-slate-700" />
              </div>
              <p className="text-sm text-slate-600 bg-blue-50/80 px-4 py-3 rounded-lg border border-blue-100 w-full leading-relaxed">
                <Info className="w-4 h-4 inline-block mr-2 text-blue-500 mb-0.5" />
                Halaman ini disediakan khusus untuk keperluan <strong>demonstrasi</strong>. Silakan pilih salah satu role di bawah ini untuk masuk sebagai akun percobaan dan melihat pratinjau antarmuka aplikasi tanpa menggunakan data asli Anda.
              </p>
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

            <div className="mt-12 text-center p-8 bg-white/60 backdrop-blur-md border border-slate-200/50 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
                <Rocket className="w-32 h-32" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-6 drop-shadow-sm relative z-10">Apakah Anda siap untuk memulai?</h3>
              <a href="/api/auth/google" className="relative z-10">
                <Button className="landing-primary-button !px-8 !py-4 !text-base" disabled={busy}>
                  Mulai
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </section>
        )}

        {activeView === "usecases" && (
          <section className="landing-demo-panel mt-12" id="usecases">
            <div className="landing-demo-panel__header mb-4">
              <p className="landing-demo-panel__eyebrow">Usecases</p>
              <BookOpen className="h-5 w-5 text-slate-700" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 p-2">
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shadow-sm"><UserCog className="w-5 h-5" /></div>
                  <h3 className="text-lg font-black text-slate-800">Untuk Guru</h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed text-justify">IdeTech membantu guru menghemat waktu dalam membuat rencana pembelajaran (RPP), merancang soal ujian yang interaktif, dan melacak progres siswa secara otomatis menggunakan Radar Pintar. Guru dapat lebih fokus pada pengajaran daripada administrasi.</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shadow-sm"><House className="w-5 h-5" /></div>
                  <h3 className="text-lg font-black text-slate-800">Untuk Sekolah</h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed text-justify">Sekolah dapat memantau efektivitas pembelajaran di seluruh kelas melalui dashboard admin. Sistem kami memudahkan distribusi materi standar, evaluasi kurikulum, dan memberikan transparansi laporan akademik kepada orang tua siswa.</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shadow-sm"><GraduationCap className="w-5 h-5" /></div>
                  <h3 className="text-lg font-black text-slate-800">Untuk Siswa</h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed text-justify">Pembelajaran menjadi lebih menyenangkan dengan IdeQuest yang menerapkan gamifikasi. Siswa bisa menyelesaikan misi, mengumpulkan poin, dan melihat perkembangan belajar mereka di berbagai mata pelajaran dalam satu portal interaktif.</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shadow-sm"><Heart className="w-5 h-5" /></div>
                  <h3 className="text-lg font-black text-slate-800">Untuk Orang Tua</h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed text-justify">Orang tua akan selalu terhubung dengan kegiatan akademik anak-anak. Lewat akses khusus wali, orang tua bisa melihat rekapitulasi nilai, jadwal penugasan (due date), dan intervensi yang disarankan oleh guru.</p>
              </div>
            </div>
          </section>
        )}

        {activeView === "contact" && (
          <section className="landing-demo-panel mt-12" id="contact">
            <div className="landing-demo-panel__header mb-4">
              <p className="landing-demo-panel__eyebrow">Hubungi Kami</p>
              <MessageCircle className="h-5 w-5 text-slate-700" />
            </div>
            <div className="max-w-2xl mx-auto p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/50">
              <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); alert("Pesan berhasil dikirim!"); }}>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nama Lengkap</label>
                  <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Masukkan nama Anda" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                  <input type="email" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="nama@email.com" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Pesan</label>
                  <textarea className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[120px]" placeholder="Bagaimana kami bisa membantu Anda?" required></textarea>
                </div>
                <button type="submit" className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2">
                  <Send className="w-4 h-4" /> Kirim Pesan
                </button>
              </form>
            </div>
          </section>
        )}
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
              <span>0/0</span>
            </div>
            <div className="game-hud-pill">
              <CircleDollarSign className="h-5 w-5 text-yellow-500" />
              <span>0</span>
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
  onChange,
  id
}: {
  active: MobileNavId;
  role: RoleName;
  notifications?: Partial<Record<MobileNavId, boolean>>;
  onChange: (id: MobileNavId) => void;
  id?: string;
}) {
  return (
    <nav id={id} className="game-mobile-nav md:hidden" aria-label="Navigasi mobile">
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
  onDeleteUser,
  onUpdateRolePermissions
}: {
  users: AdminUser[];
  access: AdminAccess | null;
  busy: boolean;
  onUpdateUser: (id: string, payload: { status?: string; roles?: RoleName[] }) => void;
  onDeleteUser?: (id: string) => void;
  onUpdateRolePermissions: (role: RoleName, permissions: string[]) => void;
}) {
  const pendingUsers = users.filter((item) => item.status === "pending");

  return (
    <section className="grid gap-6">
      <Card className="professional-card p-5">
        <div className="professional-card__header">
          <div>
            <h2 className="professional-card__title">Verifikasi user baru</h2>
            <p className="professional-card__hint">{pendingUsers.length} user menunggu aktivasi dan role.</p>
          </div>
          <span className="professional-card__pill">{users.length} user</span>
        </div>

        <AdminUserVerificationGrid users={users} roles={access?.roles ?? []} busy={busy} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} />
      </Card>
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
  onDeleteUser,
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
  onDeleteUser?: (id: string) => void;
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
    quick_action: "Persetujuan Bank Idetech",
    parent_students: "Manajemen Orang Tua & Siswa",
    advanced_features: "Pengaturan Lanjutan",
    blog: "Kelola Blog",
    home: "Beranda admin"
  }[view];

  return (
    <section className="admin-subpage">
      <div className="admin-subpage__bar">
        <button type="button" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all active:scale-95" onClick={onBack}>
          <ChevronRight className="h-5 w-5 rotate-180 stroke-[2.5]" />
          Beranda
        </button>
        <div>
          <p className="professional-eyebrow">Admin</p>
          <h2>{title}</h2>
        </div>
      </div>

      {view === "users" ? (
        <AdminControlCenter
          users={users}
          access={access}
          busy={busy}
          onUpdateUser={onUpdateUser}
          onDeleteUser={onDeleteUser}
          onUpdateRolePermissions={onUpdateRolePermissions}
        />
      ) : null}

      {view === "classes" ? (
        <AdminClassManager users={users} classes={classes} busy={busy} onCreate={onCreateClass} onUpdate={onUpdateClass} onDelete={onDeleteClass} />
      ) : null}

      {view === "system" ? <AdminSystemConfig access={access} globalBusy={busy} onUpdateRolePermissions={onUpdateRolePermissions} /> : null}

      {view === "quick_action" ? <AdminBankApprovalPanel /> : null}

      {view === "parent_students" ? <AdminParentStudents users={users} /> : null}

      {view === "advanced_features" ? <AdminAdvancedFeaturesPanel /> : null}

      {view === "blog" ? <AdminBlogManager /> : null}
    </section>
  );
}

function AdminUserVerificationGrid({
  users,
  roles,
  busy,
  onUpdateUser,
  onDeleteUser
}: {
  users: AdminUser[];
  roles: { name: RoleName; label: string }[];
  busy: boolean;
  onUpdateUser: (id: string, payload: { status?: string; roles?: RoleName[] }) => void;
  onDeleteUser?: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  const filteredUsers = users.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (query && !item.name.toLowerCase().includes(query) && !item.email.toLowerCase().includes(query)) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterRole !== "all" && !item.roles.some((r) => r.name === filterRole)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-4 bg-white/60 backdrop-blur p-4 rounded-xl border border-slate-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama atau email..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
          />
        </div>
        <div className="flex gap-4">
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full md:w-40 bg-white">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspend</option>
          </Select>
          <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full md:w-40 bg-white">
            <option value="all">Semua Role</option>
            {roles.map((r) => (
              <option key={r.name} value={r.name}>{r.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredUsers.length > 0 ? filteredUsers.map((item) => {
          const selectedRoles = item.roles.map((role) => role.name as RoleName);
          return (
            <Card key={item.id} className="professional-card p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-lg">{item.name}</span>
                {onDeleteUser && (
                  <button type="button" onClick={() => onDeleteUser(item.id)} disabled={busy} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-md transition-colors" title="Hapus User">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
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
        }) : (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white/30 rounded-2xl border border-dashed border-slate-300">
            Tidak ada user yang sesuai dengan pencarian atau filter.
          </div>
        )}
      </div>
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

  const [searchGuru, setSearchGuru] = useState("");
  const [searchJenjang, setSearchJenjang] = useState("");

  const filteredClasses = classes.filter((kelas) => {
    const teacher = teacherUsers.find((t) => t.id === kelas.teacherUserId);
    const teacherName = teacher ? teacher.name.toLowerCase() : "";
    const matchGuru = searchGuru ? teacherName.includes(searchGuru.toLowerCase()) : true;
    const matchJenjang = searchJenjang ? kelas.grade === searchJenjang : true;
    return matchGuru && matchJenjang;
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
        <div className="professional-card__header mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="professional-card__title">Semua kelas guru</h3>
            <p className="professional-card__hint">{filteredClasses.length} kelas sesuai kriteria.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Cari nama guru..." 
              value={searchGuru}
              onChange={(e) => setSearchGuru(e.target.value)}
              className="border border-slate-200 rounded-md px-3 py-1.5 text-sm w-full sm:w-48 bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <Select 
              value={searchJenjang} 
              onChange={(e) => setSearchJenjang(e.target.value)}
              className="w-full sm:w-40 border-slate-200 text-sm"
              style={{ minHeight: "34px", padding: "4px 8px" }}
            >
              <option value="">Semua Jenjang</option>
              {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((grade) => (
                <option key={grade} value={grade}>
                  Kelas {grade}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClasses.length ? null : <p className="text-slate-500 text-sm italic col-span-full">Tidak ada kelas yang ditemukan.</p>}
          {filteredClasses.map((kelas) => (
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
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 mb-1">
        <input 
          className="w-full text-xl font-extrabold text-slate-800 bg-transparent border-transparent hover:bg-slate-50 focus:bg-white rounded-md px-2 py-1 transition-all outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-300" 
          value={draft.name} 
          placeholder="Nama Kelas (Misal: IPA 7A)" 
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} 
        />
        <div className="flex items-center gap-1.5 px-2">
          <BookOpen className="h-4 w-4 text-blue-500 opacity-80" />
          <input 
            className="w-full text-sm font-semibold text-blue-600 bg-transparent border-transparent hover:bg-slate-50 focus:bg-white rounded-md px-1 py-0.5 transition-all outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-blue-300/50" 
            value={draft.subject} 
            placeholder="Mata Pelajaran" 
            aria-label={`Mapel ${kelas.name}`} 
            onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} 
          />
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
        <Button
          className="flex-1 shadow-sm"
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
        </Button>
        <button
          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2 rounded-xl transition-colors border border-red-200/50 shadow-sm"
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

function AdminSystemConfig({ 
  access,
  globalBusy,
  onUpdateRolePermissions
}: { 
  access: AdminAccess | null;
  globalBusy: boolean;
  onUpdateRolePermissions: (role: RoleName, permissions: string[]) => void;
}) {
  const [settings, setSettings] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [adminEmails, setAdminEmails] = useState("");
  const [teacherDomains, setTeacherDomains] = useState("");
  const [chatLimit, setChatLimit] = useState("5");
  const [chatWindowHours, setChatWindowHours] = useState("72");

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

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const payload = await api<{ settings: any[] }>("/api/admin/settings");
      setSettings(payload.settings);
      
      const authRules = payload.settings.find(s => s.key === "google_auth_rules");
      if (authRules && authRules.value) {
        try {
          const parsed = JSON.parse(authRules.value);
          if (parsed.adminEmails) setAdminEmails(parsed.adminEmails.join("\n"));
          if (parsed.teacherDomains) setTeacherDomains(parsed.teacherDomains.join("\n"));
        } catch (e) {}
      }

      const chatQuota = payload.settings.find(s => s.key === "chat.quota_config");
      if (chatQuota && chatQuota.value) {
        try {
          const parsed = JSON.parse(chatQuota.value);
          if (parsed.limit !== undefined) setChatLimit(String(parsed.limit));
          if (parsed.windowMs !== undefined) setChatWindowHours(String(Math.round(parsed.windowMs / (1000 * 60 * 60))));
        } catch (e) {}
      }
    } catch (e) {}
  }

  async function saveAuthRules(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        adminEmails: adminEmails.split("\n").map(s => s.trim()).filter(Boolean),
        teacherDomains: teacherDomains.split("\n").map(s => s.trim()).filter(Boolean)
      };
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ key: "google_auth_rules", value: JSON.stringify(payload) })
      });
      setSuccess("Pengaturan Google Auth berhasil disimpan.");
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  async function saveChatQuota(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        limit: Number(chatLimit),
        windowMs: Number(chatWindowHours) * 60 * 60 * 1000
      };
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ key: "chat.quota_config", value: JSON.stringify(payload) })
      });
      setSuccess("Pengaturan Kuota Chat berhasil disimpan.");
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
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

      <Card className="professional-card p-5">
        <div className="professional-card__header">
          <h2 className="professional-card__title">Google Auth Role Mapping</h2>
          <ShieldCheck className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Atur email admin dan domain email guru yang akan secara otomatis mendapatkan rolenya saat pertama kali mendaftar. Pisahkan setiap entri dengan baris baru (Enter).
        </p>

        {error ? <ErrorBanner message={error} /> : null}
        {success ? <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-700 border border-green-200">{success}</div> : null}

        <form onSubmit={saveAuthRules} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Email Admin (Superuser)</span>
            <textarea 
              value={adminEmails}
              onChange={e => setAdminEmails(e.target.value)}
              className="idetech-input min-h-[100px] font-mono text-sm leading-relaxed"
              placeholder="admin@sekolah.id"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Domain Email Guru</span>
            <textarea 
              value={teacherDomains}
              onChange={e => setTeacherDomains(e.target.value)}
              className="idetech-input min-h-[100px] font-mono text-sm leading-relaxed"
              placeholder="@guru.smp.belajar.id"
            />
          </label>
          <button type="submit" disabled={busy} className="mt-2 self-start rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all">
            {busy ? "Menyimpan..." : "Simpan Aturan"}
          </button>
        </form>
      </Card>

      <Card className="professional-card p-5">
        <div className="professional-card__header">
          <h2 className="professional-card__title">Chat Quota AI (CybraFeriBot)</h2>
          <Sparkles className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Atur batas maksimum penggunaan AI Chatbot per guru.
        </p>

        <form onSubmit={saveChatQuota} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">Batas Pesan (Pesan)</span>
              <input 
                type="number"
                min="0"
                value={chatLimit}
                onChange={e => setChatLimit(e.target.value)}
                className="idetech-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">Waktu Reset (Jam)</span>
              <input 
                type="number"
                min="1"
                value={chatWindowHours}
                onChange={e => setChatWindowHours(e.target.value)}
                className="idetech-input"
              />
            </label>
          </div>
          <button type="submit" disabled={busy} className="mt-2 self-start rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all">
            {busy ? "Menyimpan..." : "Simpan Kuota"}
          </button>
        </form>
      </Card>

      <AdminPermissionPanel access={access} busy={globalBusy} onUpdateRolePermissions={onUpdateRolePermissions} />
    </div>
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <img src="/bgidetechmobile.webp" alt="Background" className="absolute inset-0 h-full w-full object-cover md:hidden" />
      <img src="/bgidetechdesktop.webp" alt="Background" className="absolute inset-0 hidden h-full w-full object-cover md:block" />
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-500">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-blue-500/40 blur-2xl animate-pulse"></div>
          <div className="relative h-28 w-28 overflow-hidden rounded-3xl bg-slate-950 p-5 shadow-2xl ring-1 ring-white/10 transition-transform hover:scale-105">
            <img 
              src="/logoidetech.webp" 
              alt="IdeTech Loading" 
              className="h-full w-full object-contain animate-pulse" 
              style={{ animationDuration: '2s' }}
            />
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-bounce shadow-[0_0_8px_rgba(59,130,246,0.8)]" style={{ animationDelay: '0ms' }}></div>
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-bounce shadow-[0_0_8px_rgba(59,130,246,0.8)]" style={{ animationDelay: '150ms' }}></div>
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-bounce shadow-[0_0_8px_rgba(59,130,246,0.8)]" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1 drop-shadow-md">{text}</p>
        </div>
      </div>
    </main>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="game-error-banner px-4 py-3 text-sm font-black">{message}</div>;
}

function IdeTechLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`idetech-logo ${className}`} aria-hidden="true">
      <img src="/logoidetech.webp" alt="IdeTech Logo" className="w-full h-full object-contain" />
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
  const [mentionQuery, setMentionQuery] = React.useState<{ query: string; startIndex: number } | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = React.useState<any[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("teacher_journal_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mood) setMood(parsed.mood);
        if (parsed.reflection) setReflection(parsed.reflection);
        if (parsed.anecdote) setAnecdote(parsed.anecdote);
        if (parsed.todos) setTodos(parsed.todos);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    if (!mentionQuery) {
      setMentionSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      api<{ students: any[] }>(`/api/teacher/search-students?q=${encodeURIComponent(mentionQuery.query)}`)
        .then(res => setMentionSuggestions(res.students));
    }, 300);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const handleAnecdoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAnecdote(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      setMentionQuery({ query: match[1], startIndex: match.index! });
    } else {
      setMentionQuery(null);
    }
  };
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

  const saveDraftLocal = () => {
    try {
      localStorage.setItem("teacher_journal_draft", JSON.stringify({ mood, reflection, anecdote, todos }));
      setAlertMsg({ type: "success", text: "Draft berhasil disimpan secara lokal." });
    } catch {
      setAlertMsg({ type: "error", text: "Gagal menyimpan draft." });
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
      
      localStorage.removeItem("teacher_journal_draft");
      setAlertMsg({ type: "success", text: "Jurnal berhasil disimpan!" });
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: "error", text: "Terjadi kesalahan saat menyimpan jurnal." });
    } finally {
      setIsSaving(false);
      setShowPreview(false);
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
                  <p className="text-sm text-white/90 mb-2 line-clamp-2"><strong>Berhasil:</strong> {journal.successReflection}</p>
                )}
                {journal.improvementReflection && (
                  <p className="text-sm text-white/90 mb-3 line-clamp-2"><strong>Kendala:</strong> {journal.improvementReflection}</p>
                )}
                {journal.photoUrl && (
                  <img src={journal.photoUrl} alt="Momen Kelas" className="w-full h-40 object-cover rounded-xl mb-3 opacity-90 hover:opacity-100 transition-opacity" />
                )}
                <button
                  onClick={() => setHistory(history.map(h => h.id === journal.id ? { ...h, showModal: true } : h))}
                  className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-bold py-2.5 rounded-xl border border-blue-500/30 transition-colors mt-2"
                >
                  Lihat Detail
                </button>
              </section>
            ))
          )}

          {/* Modals for Details */}
          {history.filter(h => h.showModal).map(selectedJournal => (
            <div key={`modal-${selectedJournal.id}`} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl relative">
                <button 
                  onClick={() => setHistory(history.map(h => h.id === selectedJournal.id ? { ...h, showModal: false } : h))}
                  className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <X size={16} />
                </button>
                
                <h3 className="text-lg font-bold text-white mb-1">Detail Jurnal</h3>
                <p className="text-xs text-blue-300 font-medium mb-6">
                  {new Date(selectedJournal.createdAt).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                </p>

                <div className="space-y-5">
                  {selectedJournal.mood && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Mood Hari Ini</p>
                      <div className="text-3xl">{selectedJournal.mood === 'happy' ? '😁' : selectedJournal.mood === 'sad' ? '😞' : '😐'}</div>
                    </div>
                  )}

                  {selectedJournal.successReflection && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Berhasil</p>
                      <p className="text-sm text-white/90 bg-white/5 p-3 rounded-xl border border-white/10">{selectedJournal.successReflection}</p>
                    </div>
                  )}

                  {selectedJournal.improvementReflection && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-rose-400 mb-1">Kendala</p>
                      <p className="text-sm text-white/90 bg-white/5 p-3 rounded-xl border border-white/10">{selectedJournal.improvementReflection}</p>
                    </div>
                  )}

                  {selectedJournal.anecdote && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Catatan Insiden/Siswa</p>
                      <p className="text-sm text-white/90 bg-white/5 p-3 rounded-xl border border-white/10 whitespace-pre-wrap">{selectedJournal.anecdote}</p>
                    </div>
                  )}

                  {selectedJournal.todos && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-orange-400 mb-1">Tindak Lanjut (To-Do)</p>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col gap-2">
                        {(() => {
                          try {
                            const parsedTodos = JSON.parse(selectedJournal.todos);
                            if (Array.isArray(parsedTodos) && parsedTodos.length > 0) {
                              return parsedTodos.map((todo: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-2 text-sm text-white/90">
                                  <div className="mt-0.5 text-blue-400"><CheckCircle2 size={14} /></div>
                                  <span>{todo.text}</span>
                                </div>
                              ));
                            }
                            return <p className="text-sm text-slate-400 italic">Tidak ada tindak lanjut.</p>;
                          } catch {
                            return <p className="text-sm text-white/90">{selectedJournal.todos}</p>;
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {selectedJournal.photoUrl && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-purple-400 mb-1">Foto Momen</p>
                      <img src={selectedJournal.photoUrl} alt="Momen" className="w-full rounded-xl border border-white/10" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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

        <section className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] relative z-20">
          <h3 className="text-[11px] font-bold text-blue-200 mb-4 uppercase tracking-wider">3. Catatan Insiden/Siswa</h3>
          <textarea 
            ref={textareaRef}
            value={anecdote}
            onChange={handleAnecdoteChange}
            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm font-medium text-white focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-blue-100/30 transition-all" 
            rows={3} 
            placeholder="Ketik catatan... (misal: @Hafy sangat aktif di sesi tanya jawab @Budi perlu lebih fokus)"
          />
          {mentionQuery && mentionSuggestions.length > 0 && (
            <div className="absolute left-5 right-5 mt-1 max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
              {mentionSuggestions.map((student) => (
                <div 
                  key={student.id}
                  className="px-4 py-3 hover:bg-slate-700 cursor-pointer flex items-center gap-3 border-b border-slate-700/50 last:border-0 transition-colors"
                  onClick={() => {
                    const before = anecdote.substring(0, mentionQuery.startIndex);
                    const after = anecdote.substring(textareaRef.current?.selectionStart || 0);
                    // Gunakan nama lengkap tanpa spasi, atau nama depan saja
                    const mentionName = student.name.split(" ")[0];
                    const newText = `${before}@${mentionName} ${after}`;
                    setAnecdote(newText);
                    setMentionQuery(null);
                    setTimeout(() => textareaRef.current?.focus(), 0);
                  }}
                >
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center overflow-hidden shrink-0 border border-blue-500/30">
                    {student.avatarUrl ? <img src={student.avatarUrl} className="h-full w-full object-cover" /> : <User size={14} />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-bold text-white truncate">{student.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{student.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
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

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button 
            onClick={saveDraftLocal} 
            className="w-full bg-slate-800 text-slate-300 font-bold text-sm py-4 rounded-xl border border-slate-700 hover:bg-slate-700 transition-all"
          >
            Simpan Draft Lokal
          </button>
          <button 
            onClick={() => setShowPreview(true)} 
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 disabled:opacity-50 text-white font-bold text-sm py-4 rounded-xl shadow-[0_8px_16px_-4px_rgba(59,130,246,0.5)] hover:from-blue-400 hover:to-indigo-400 transition-all"
          >
            Pratinjau & Simpan
          </button>
        </div>
      </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-6">Pratinjau Draft Jurnal</h3>
            
            <div className="space-y-5">
              {mood && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Mood Hari Ini</p>
                  <div className="text-3xl">{mood === 'happy' ? '😁' : mood === 'sad' ? '😞' : '😐'}</div>
                </div>
              )}
              {reflection.success && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Berhasil</p>
                  <p className="text-sm text-white/90 bg-white/5 p-3 rounded-xl border border-white/10">{reflection.success}</p>
                </div>
              )}
              {reflection.improvement && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-rose-400 mb-1">Kendala</p>
                  <p className="text-sm text-white/90 bg-white/5 p-3 rounded-xl border border-white/10">{reflection.improvement}</p>
                </div>
              )}
              {anecdote && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Catatan Insiden/Siswa</p>
                  <p className="text-sm text-white/90 bg-white/5 p-3 rounded-xl border border-white/10 whitespace-pre-wrap">{anecdote}</p>
                </div>
              )}
              {todos.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-orange-400 mb-1">Tindak Lanjut (To-Do)</p>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col gap-2">
                    {todos.map((todo, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-white/90">
                        <div className="mt-0.5 text-blue-400"><CheckCircle2 size={14} /></div>
                        <span>{todo.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {photoPreview && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-purple-400 mb-1">Foto Momen</p>
                  <img src={photoPreview} alt="Momen" className="w-full rounded-xl border border-white/10" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-8">
              <button onClick={() => setShowPreview(false)} className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors border border-slate-700">Kembali Edit</button>
              <button onClick={handleSave} disabled={isSaving} className="py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50">{isSaving ? "Menyimpan..." : "Publikasikan"}</button>
            </div>
          </div>
        </div>
      )}

      {alertMsg && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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

function TeacherChatWidget({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = React.useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "Halo Kak! Saya asisten AI Cybra. Ada yang bisa saya bantu untuk hari ini?" }
  ]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const [quotaInfo, setQuotaInfo] = React.useState<{ remaining: number; resetAt: string; limit: number } | null>(null);
  const [timeLeft, setTimeLeft] = React.useState<string>("");

  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  React.useEffect(() => {
    if (isOpen && !quotaInfo) {
      api<any>("/api/teacher/chat-quota").then(setQuotaInfo).catch(console.error);
    }
  }, [isOpen, quotaInfo]);

  React.useEffect(() => {
    if (!quotaInfo?.resetAt) return;
    const interval = setInterval(() => {
      const ms = new Date(quotaInfo.resetAt).getTime() - Date.now();
      if (ms <= 0) {
        setTimeLeft("Reset sekarang");
        return;
      }
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(days > 0 ? `${days}h ${hours}j` : `${hours}j ${mins}m`);
    }, 1000);
    return () => clearInterval(interval);
  }, [quotaInfo?.resetAt]);

  if (!isOpen) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const quotaCheck = await api<any>("/api/teacher/chat-consume", { method: "POST" }).catch((err) => {
        throw new Error(err.message || "Gagal memverifikasi kuota obrolan.");
      });

      if (!quotaCheck.allowed) {
        setQuotaInfo({ remaining: 0, resetAt: quotaCheck.resetAt, limit: quotaCheck.limit || 5 });
        throw new Error(quotaCheck.message || "Kuota obrolan habis.");
      }
      setQuotaInfo({ remaining: quotaCheck.remaining, resetAt: quotaCheck.resetAt, limit: quotaCheck.limit || 5 });

      const history = messages.slice(1).map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));
      const response = await fetch("https://cybrabot.ferilee.gurumuda.eu.org/api/integration/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history })
      });
      
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`);
      }
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply || "Maaf, tidak ada respons." }]);
    } catch (err: any) {
      console.error("Chat Error:", err);
      setMessages((prev) => [...prev, { role: "bot", text: err.message || "Maaf, koneksi ke asisten AI terputus." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 flex h-[480px] w-[340px] flex-col overflow-hidden rounded-2xl bg-[#0f172a] shadow-2xl ring-1 ring-white/10 md:bottom-24 md:right-8 md:w-[400px] animate-in slide-in-from-bottom-8 fade-in duration-300">
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="h-4 w-4 text-yellow-300" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-none">Asisten IdeTech</h3>
            <p className="text-[10px] text-blue-200 mt-0.5">Powered by Cybra AI</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/20 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm bg-[#0a0f1c]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${m.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-white/10 text-slate-200 border border-white/5 rounded-bl-sm prose prose-invert prose-sm max-w-none"}`}>
              {m.role === "user" ? m.text : <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{m.text}</ReactMarkdown>}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2 text-slate-400 border border-white/5 flex gap-1">
              <span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {quotaInfo && (
        <div className="bg-[#0f172a] border-t border-white/10 px-4 py-2 flex justify-between items-center text-[11px] text-slate-400">
          <span className={quotaInfo.remaining === 0 ? "text-red-400 font-medium" : ""}>
            Sisa obrolan: {quotaInfo.remaining}/{quotaInfo.limit}
          </span>
          {(quotaInfo.remaining < quotaInfo.limit) && (
            <span className={quotaInfo.remaining === 0 ? "text-red-400" : ""}>
              Reset: {timeLeft}
            </span>
          )}
        </div>
      )}

      <form onSubmit={handleSend} className="bg-[#0f172a] p-3 pb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={quotaInfo?.remaining === 0}
            placeholder={quotaInfo?.remaining === 0 ? "Kuota habis. Menunggu reset..." : "Tanya asisten AI..."}
            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || quotaInfo?.remaining === 0}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
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
      showToast(err instanceof Error ? err.message : "Gagal memproses.");
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
            Persetujuan Bank Idetech
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
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl z-[100] text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-6">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          {toastMessage}
        </div>
      )}
    </Card>
  );
}

type StudentProgressReport = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  avatarUrl: string | null;
  className: string;
  materials: { id: string; title: string; type: string; progress: number; completedAt: string | null; dueDate: string | null; isLate: boolean }[];
  quests: { 
    id: string; 
    title: string; 
    type: string; 
    progress: number; 
    completedAt: string | null; 
    dueDate: string | null; 
    isLate: boolean;
    earnedPoints?: number;
    maxPoints?: number;
    submissionText?: string | null;
    submissionFileUrl?: string | null;
    teacherFeedback?: string | null;
  }[];
};

function TeacherRadarView({ onClose, mode = "radar" }: { onClose: () => void, mode?: "radar" | "report" | "koreksi" }) {
  const [currentMode, setCurrentMode] = useState<"radar" | "report" | "koreksi">(mode);
  const [data, setData] = useState<StudentProgressReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");

  const filteredData = React.useMemo(() => {
    return data.filter(student => {
      const matchSearch = student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.studentEmail.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (filterClass !== "all" && student.className !== filterClass) return false;
      if (filterRisk !== "all") {
        const allTasks = [...student.materials, ...student.quests];
        const hasLate = allTasks.some(t => t.progress >= 100 && t.isLate);
        if (filterRisk === "at-risk" && !hasLate) return false;
        if (filterRisk === "safe" && hasLate) return false;
      }
      return true;
    });
  }, [data, searchQuery, filterClass, filterRisk]);

  const uniqueClasses = Array.from(new Set(data.map(s => s.className)));

  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await api<{ progress: StudentProgressReport[] }>("/api/teacher/student-progress");
        setData(res.progress);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchProgress();
  }, []);

  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    
    const headers = ["Nama Siswa", "Email", "Kelas", "Materi Selesai Tepat Waktu", "Materi Terlambat", "Materi Belum Selesai", "IdeQuest Selesai Tepat Waktu", "IdeQuest Terlambat", "IdeQuest Belum Selesai"];
    
    const rows = filteredData.map(student => {
      const matCompleted = student.materials.filter(m => m.progress >= 100 && !m.isLate).length;
      const matLate = student.materials.filter(m => m.progress >= 100 && m.isLate).length;
      const matIncomplete = student.materials.filter(m => m.progress < 100).length;
      
      const qCompleted = student.quests.filter(q => q.progress >= 100 && !q.isLate).length;
      const qLate = student.quests.filter(q => q.progress >= 100 && q.isLate).length;
      const qIncomplete = student.quests.filter(q => q.progress < 100).length;
      
      return [
        `"${student.studentName}"`,
        `"${student.studentEmail}"`,
        `"${student.className}"`,
        matCompleted,
        matLate,
        matIncomplete,
        qCompleted,
        qLate,
        qIncomplete
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Hasil_Belajar_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-t-3xl min-h-[60vh] p-4 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative mt-4 animate-in slide-in-from-bottom-10">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full" />
      
      <div className="flex justify-between items-center mt-4 mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{currentMode === "report" ? "Laporan Hasil Belajar" : "Radar Pintar (Progres Siswa)"}</h2>
          <p className="text-sm text-slate-500">{currentMode === "report" ? "Rekapitulasi persentase penyelesaian tugas siswa" : "Analisis progres belajar, intervensi, dan risiko siswa"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={exportToCSV}
            disabled={loading || filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Unduh Laporan</span>
          </button>
          <button type="button" onClick={onClose} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200" title="Tutup Radar">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-6 w-full overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setCurrentMode("radar")}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${currentMode === "radar" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Radar Pintar
        </button>
        <button 
          onClick={() => setCurrentMode("report")}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${currentMode === "report" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Laporan Hasil Belajar
        </button>
        <button 
          onClick={() => setCurrentMode("koreksi")}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${currentMode === "koreksi" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Koreksi IdeQuest
        </button>
      </div>

      {!loading && data.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama atau email siswa..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>
          <select 
            value={filterClass} 
            onChange={e => setFilterClass(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Kelas</option>
            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={filterRisk} 
            onChange={e => setFilterRisk(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="at-risk">Beresiko (Terlambat)</option>
            <option value="safe">Aman (Tepat Waktu)</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500">Memuat data siswa...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8" />
          </div>
          <p className="text-slate-500">Belum ada siswa di kelas Anda.</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8" />
          </div>
          <p className="text-slate-500 mb-4">Siswa tidak ditemukan berdasarkan filter pencarian.</p>
          <button type="button" onClick={() => { setSearchQuery(""); setFilterClass("all"); setFilterRisk("all"); }} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
            Reset Filter
          </button>
        </div>
      ) : currentMode === "report" ? (
        <div className="overflow-x-auto mt-6 bg-white border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] sm:text-xs uppercase tracking-wider">
                <th className="p-3 sm:p-4 font-bold">Nama Siswa</th>
                <th className="p-3 sm:p-4 font-bold hidden sm:table-cell">Kelas</th>
                <th className="p-3 sm:p-4 font-bold text-center">Materi Selesai</th>
                <th className="p-3 sm:p-4 font-bold text-center">Quest Selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map(student => {
                const matCompleted = student.materials.filter(m => m.progress >= 100).length;
                const questCompleted = student.quests.filter(q => q.progress >= 100).length;
                return (
                  <tr key={student.studentId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        {student.avatarUrl ? (
                          <img src={student.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {student.studentName[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-800 text-sm leading-tight">{student.studentName}</div>
                          <div className="text-xs text-slate-500 hidden sm:block">{student.studentEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-slate-600 hidden sm:table-cell">{student.className}</td>
                    <td className="p-3 sm:p-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                        <BookOpen className="w-3.5 h-3.5" />
                        {matCompleted} / {student.materials.length}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold">
                        <Target className="w-3.5 h-3.5" />
                        {questCompleted} / {student.quests.length}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : currentMode === "koreksi" ? (
        <div className="mt-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          {filteredData.map(student => {
            const completedQuests = student.quests.filter(q => q.progress >= 100);
            if (completedQuests.length === 0) return null;
            
            return (
              <div key={student.studentId} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                  {student.avatarUrl ? (
                    <img src={student.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {student.studentName[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-slate-800 text-sm leading-tight">{student.studentName}</div>
                    <div className="text-xs text-slate-500">{student.className}</div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4">
                  {completedQuests.map(quest => (
                    <div key={quest.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-700">{quest.title}</h4>
                          <span className="text-xs text-slate-500">Dikumpulkan pada: {quest.completedAt ? new Date(quest.completedAt).toLocaleString('id-ID') : '-'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-blue-600">{quest.earnedPoints} / {quest.maxPoints} Poin</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 space-y-3">
                        {quest.submissionText && (
                          <div className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-200 whitespace-pre-wrap">
                            <strong>Isian Jawaban:</strong><br/>
                            {quest.submissionText}
                          </div>
                        )}
                        {quest.submissionFileUrl && (
                          <div>
                            <a href={quest.submissionFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 font-bold transition-colors">
                              Buka File Jawaban PDF
                            </a>
                          </div>
                        )}
                        {(!quest.submissionText && !quest.submissionFileUrl) && (
                          <p className="text-xs text-slate-400 italic">Diselesaikan tanpa lampiran (versi lawas)</p>
                        )}
                      </div>
                      
                      <form className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-3" onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newPoints = Number(formData.get("points"));
                        const feedback = formData.get("feedback") as string;
                        try {
                          const res = await api("/api/teacher/student-progress/grade-quest", {
                            method: "POST",
                            body: JSON.stringify({ studentId: student.studentId, questId: quest.id, earnedPoints: newPoints, feedback })
                          });
                          alert("Koreksi berhasil disimpan!");
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "Gagal menyimpan koreksi.");
                        }
                      }}>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                          <label className="flex flex-col flex-1">
                            <span className="text-xs font-bold text-slate-600 mb-1">Berikan / Ubah Nilai (Max {quest.maxPoints})</span>
                            <input type="number" name="points" min="0" max={quest.maxPoints} defaultValue={quest.earnedPoints} className="border border-slate-300 rounded px-3 py-2 sm:py-1.5 text-sm bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                          </label>
                          <label className="flex flex-col flex-[2]">
                            <span className="text-xs font-bold text-slate-600 mb-1">Umpan Balik (Opsional)</span>
                            <input type="text" name="feedback" defaultValue={quest.teacherFeedback || ""} placeholder="Ketik pesan untuk siswa..." className="border border-slate-300 rounded px-3 py-2 sm:py-1.5 text-sm bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </label>
                          <button type="submit" className="mt-1 sm:mt-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 sm:py-1.5 rounded-md transition-colors shadow-sm w-full sm:w-auto text-center">Simpan</button>
                        </div>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredData.map(student => {
            const allTasks = [...student.materials, ...student.quests];
            const completed = allTasks.filter(t => t.progress >= 100);
            const lateCompleted = completed.filter(t => t.isLate);
            const onTimeCompleted = completed.filter(t => !t.isLate);
            
            return (
              <div key={student.studentId} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5">
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-start sm:items-center gap-4">
                    {student.avatarUrl ? (
                      <img src={student.avatarUrl} alt={student.studentName} referrerPolicy="no-referrer" className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm shrink-0">
                        {student.studentName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{student.studentName}</h3>
                      <p className="text-sm text-slate-500">{student.className} • {student.studentEmail}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{onTimeCompleted.length} Tepat Waktu</span>
                    </div>
                    {lateCompleted.length > 0 && (
                      <div className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
                        <Timer className="w-3.5 h-3.5 shrink-0" />
                        <span>{lateCompleted.length} Terlambat</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <details className="group">
                    <summary className="flex justify-between items-center cursor-pointer text-xs font-bold text-slate-500 uppercase tracking-wider bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        <span>Materi ({student.materials.length})</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="space-y-2 mt-2 pt-1 pl-2 border-l-2 border-slate-100">
                      {student.materials.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-700 truncate" title={m.title}>{m.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-bold text-slate-500">{m.progress}%</span>
                            {m.progress >= 100 && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.isLate ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {m.isLate ? 'Terlambat' : 'Selesai'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {student.materials.length === 0 && <p className="text-sm text-slate-400 italic p-2">Belum ada materi</p>}
                    </div>
                  </details>
                  
                  <details className="group">
                    <summary className="flex justify-between items-center cursor-pointer text-xs font-bold text-slate-500 uppercase tracking-wider bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-500" />
                        <span>IdeQuest ({student.quests.length})</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="space-y-2 mt-2 pt-1 pl-2 border-l-2 border-slate-100">
                      {student.quests.map(q => (
                        <div key={q.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-700 truncate" title={q.title}>{q.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-bold text-slate-500">{q.progress}%</span>
                            {q.progress >= 100 && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${q.isLate ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {q.isLate ? 'Terlambat' : 'Selesai'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {student.quests.length === 0 && <p className="text-sm text-slate-400 italic p-2">Belum ada IdeQuest</p>}
                    </div>
                  </details>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminAdvancedFeaturesPanel() {
  const [tab, setTab] = React.useState<"logs" | "announcements" | "master">("announcements");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Pengaturan Lanjutan</h2>
          <p className="text-sm text-slate-500">Kelola log aktivitas, pengumuman, dan data master sistem.</p>
        </div>
      </div>

      <div className="flex border-b border-slate-100 mb-6">
        <button
          onClick={() => setTab("announcements")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${tab === "announcements" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Bell className="h-4 w-4" /> Pengumuman Global
        </button>
        <button
          onClick={() => setTab("master")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${tab === "master" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Boxes className="h-4 w-4" /> Master Data
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${tab === "logs" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <ScrollText className="h-4 w-4" /> Log Aktivitas
        </button>
      </div>

      <div className="min-h-[300px]">
        {tab === "announcements" && <AdvancedAnnouncements />}
        {tab === "master" && <AdvancedMasterData />}
        {tab === "logs" && <AdvancedActivityLogs />}
      </div>
    </div>
  );
}

function AdvancedAnnouncements() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("info");
  
  const load = async () => {
    try {
      const res = await api<{ announcements: any[] }>("/api/admin/announcements");
      setData(res.announcements || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    try {
      await api("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ title, content, type })
      });
      setTitle("");
      setContent("");
      setType("info");
      load();
    } catch (err) {
      alert("Gagal menambahkan pengumuman");
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pengumuman ini?")) return;
    try {
      await api(`/api/admin/announcements/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert("Gagal menghapus");
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
        <h3 className="font-bold text-slate-700 text-sm">Buat Pengumuman Baru</h3>
        <input type="text" placeholder="Judul Pengumuman" value={title} onChange={e=>setTitle(e.target.value)} className="idetech-input bg-white" required />
        <textarea placeholder="Isi pengumuman..." value={content} onChange={e=>setContent(e.target.value)} className="idetech-input bg-white min-h-[100px]" required />
        <div className="flex gap-4 items-center">
          <select value={type} onChange={e=>setType(e.target.value)} className="idetech-input bg-white w-auto">
            <option value="info">Info</option>
            <option value="warning">Peringatan</option>
            <option value="success">Sukses</option>
          </select>
          <button type="submit" disabled={!title || !content} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50">Kirim Pengumuman</button>
        </div>
      </form>
      
      <div className="space-y-3">
        {loading ? <div className="text-center text-slate-500 py-4">Memuat pengumuman...</div> : 
          data.length === 0 ? <div className="text-center text-slate-500 py-4 italic">Belum ada pengumuman</div> :
          data.map(a => (
            <div key={a.id} className={`p-4 rounded-xl border ${a.type === 'warning' ? 'bg-orange-50 border-orange-200' : a.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-800">{a.title}</h4>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-slate-400 mt-3">Oleh: {a.authorName} • {new Date(a.createdAt).toLocaleString('id-ID')}</p>
                </div>
                <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function AdvancedMasterData() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newSubj, setNewSubj] = useState("");
  const [newGrade, setNewGrade] = useState("");

  const load = async () => {
    try {
      const res = await api<{ subjects: any[], grades: any[] }>("/api/admin/master");
      setSubjects(res.subjects || []);
      setGrades(res.grades || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { load(); }, []);

  const handleAdd = async (type: "subjects" | "grades", name: string, setName: any) => {
    if (!name) return;
    try {
      await api(`/api/admin/master/${type}`, { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      load();
    } catch (err: any) {
      alert(err.message || "Gagal menambahkan");
    }
  };

  const handleDelete = async (type: "subjects" | "grades", id: string) => {
    if (!confirm("Hapus data master ini?")) return;
    try {
      await api(`/api/admin/master/${type}/${id}`, { method: "DELETE" });
      load();
    } catch (err: any) {
      alert("Gagal menghapus");
    }
  };

  if (loading) return <div className="text-center text-slate-500 py-8">Memuat master data...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-700">Master Mata Pelajaran</h3>
        </div>
        <div className="p-4 flex gap-2">
          <input type="text" placeholder="Tambah Mapel Baru" value={newSubj} onChange={e=>setNewSubj(e.target.value)} className="idetech-input flex-1" />
          <button onClick={() => handleAdd("subjects", newSubj, setNewSubj)} disabled={!newSubj} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"><Plus className="w-5 h-5" /></button>
        </div>
        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
          {subjects.map(s => (
            <div key={s.id} className="flex justify-between items-center p-3 hover:bg-slate-50">
              <span className="text-sm font-medium text-slate-700">{s.name}</span>
              <button onClick={() => handleDelete("subjects", s.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-700">Master Tingkatan Kelas</h3>
        </div>
        <div className="p-4 flex gap-2">
          <input type="text" placeholder="Tambah Kelas Baru" value={newGrade} onChange={e=>setNewGrade(e.target.value)} className="idetech-input flex-1" />
          <button onClick={() => handleAdd("grades", newGrade, setNewGrade)} disabled={!newGrade} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"><Plus className="w-5 h-5" /></button>
        </div>
        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
          {grades.map(g => (
            <div key={g.id} className="flex justify-between items-center p-3 hover:bg-slate-50">
              <span className="text-sm font-medium text-slate-700">{g.name}</span>
              <button onClick={() => handleDelete("grades", g.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdvancedActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await api<{ logs: any[] }>("/api/admin/logs");
        setLogs(res.logs || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  if (loading) return <div className="text-center text-slate-500 py-8">Memuat log aktivitas...</div>;
  if (logs.length === 0) return <div className="text-center text-slate-500 py-8 italic">Belum ada aktivitas tercatat</div>;

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            <th className="p-3 font-bold border-b">Waktu</th>
            <th className="p-3 font-bold border-b">Pengguna</th>
            <th className="p-3 font-bold border-b">Aksi</th>
            <th className="p-3 font-bold border-b">Tipe</th>
            <th className="p-3 font-bold border-b">Detail Tambahan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map(log => (
            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-3 text-slate-500 text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString('id-ID')}</td>
              <td className="p-3 font-medium text-slate-800">{log.userName}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs font-bold ${log.action === 'create' ? 'bg-green-100 text-green-700' : log.action === 'update' ? 'bg-blue-100 text-blue-700' : log.action === 'delete' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                  {log.action.toUpperCase()}
                </span>
              </td>
              <td className="p-3 text-slate-600">{log.resourceType}</td>
              <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate" title={log.details || "-"}>{log.details || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function AdminParentStudents({ users }: { users: AdminUser[] }) {
  const [data, setData] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    parentUserId: "",
    studentUserId: "",
    relationship: "Ayah",
  });

  const parentUsers = users.filter(u => u.roles.some(r => r.name === "parent"));
  const studentUsers = users.filter(u => u.roles.some(r => r.name === "student"));

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const payload = await api<{ links: any[] }>("/api/admin/parent-students");
      setData(payload.links || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/parent-students", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setForm({ parentUserId: "", studentUserId: "", relationship: "Ayah" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan data");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Apakah Anda yakin ingin menghapus relasi ini?")) return;
    setBusy(true);
    try {
      await api(`/api/admin/parent-students/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="professional-card p-5">
        <div className="professional-card__header">
          <h2 className="professional-card__title">Tambahkan Relasi</h2>
          <Users className="h-5 w-5 text-slate-400" />
        </div>
        
        {error ? <ErrorBanner message={error} /> : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">Akun Orang Tua</span>
              <Select 
                value={form.parentUserId} 
                onChange={e => setForm(current => ({ ...current, parentUserId: e.target.value }))}
                className="w-full"
                disabled={busy}
              >
                <option value="">Pilih Orang Tua...</option>
                {parentUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">Akun Siswa</span>
              <Select 
                value={form.studentUserId} 
                onChange={e => setForm(current => ({ ...current, studentUserId: e.target.value }))}
                className="w-full"
                disabled={busy}
              >
                <option value="">Pilih Siswa...</option>
                {studentUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">Hubungan</span>
              <input 
                type="text"
                placeholder="Ayah / Ibu / Wali"
                value={form.relationship}
                onChange={e => setForm(current => ({ ...current, relationship: e.target.value }))}
                className="idetech-input"
                disabled={busy}
              />
            </label>
          </div>
          <button 
            type="submit" 
            disabled={busy || !form.parentUserId || !form.studentUserId || !form.relationship} 
            className="mt-2 self-start rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all"
          >
            {busy ? "Menyimpan..." : "Tambahkan"}
          </button>
        </form>
      </Card>

      <Card className="professional-card p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="professional-card__title">Daftar Relasi Orang Tua & Siswa</h2>
          <p className="professional-card__hint">Total {data.length} relasi yang terdaftar.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="p-4 font-bold border-b">Orang Tua</th>
                <th className="p-4 font-bold border-b">Siswa</th>
                <th className="p-4 font-bold border-b">Hubungan</th>
                <th className="p-4 font-bold border-b w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 italic">Belum ada data relasi.</td>
                </tr>
              ) : null}
              {data.map(item => {
                const pUser = parentUsers.find(u => u.id === item.parentId);
                const sUser = studentUsers.find(u => u.id === item.studentId);
                return (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{pUser?.name || item.parentName}</div>
                    <div className="text-xs text-slate-500">{pUser?.email || item.parentEmail}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{sUser?.name || item.studentName}</div>
                    <div className="text-xs text-slate-500">{sUser?.email || item.studentEmail}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {item.relationship}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleDelete(item.id)}
                      disabled={busy}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors"
                      title="Hapus Relasi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AdminBlogManager() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ title: "", excerpt: "", content: "", status: "draft", prompt: "" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBlogs = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await api<{ blogs: any[] }>("/api/admin/blogs");
      if (res.blogs) setBlogs(res.blogs);
    } catch (e: any) {
      setErrorMsg("Gagal memuat blog: " + e.message);
    }
    setBusy(false);
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleGenerateAI = async () => {
    if (!form.prompt) {
      setErrorMsg("Masukkan ide tulisan untuk AI!");
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await api<{ content: string }>("/api/admin/blogs/generate", {
        method: "POST",
        body: JSON.stringify({ prompt: form.prompt })
      });
      if (res.content) {
        setForm({ ...form, content: res.content });
      }
    } catch (e: any) {
      // Fallback response for demonstration if API fails
      setErrorMsg("Gagal menggunakan AI: " + e.message);
      setForm({ ...form, content: `# ${form.title || 'Artikel Baru'}\n\nIni adalah draf yang dihasilkan sistem karena AI sedang tidak dapat dijangkau. Silakan lengkapi draf ini secara manual.` });
    }
    setBusy(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      await api("/api/admin/blogs", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setIsFormOpen(false);
      setForm({ title: "", excerpt: "", content: "", status: "draft", prompt: "" });
      fetchBlogs();
    } catch (e: any) {
      setErrorMsg("Gagal menyimpan blog: " + e.message);
    }
    setBusy(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus artikel ini?")) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await api("/api/admin/blogs/" + id, { method: "DELETE" });
      fetchBlogs();
    } catch (e: any) {
      setErrorMsg("Gagal menghapus: " + e.message);
    }
    setBusy(false);
  };

  const ErrorAlert = () => errorMsg ? (
    <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm mb-4 flex justify-between items-center shadow-sm">
      <span>{errorMsg}</span>
      <button type="button" onClick={() => setErrorMsg(null)} className="hover:bg-red-100 p-1 rounded-md transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  if (isFormOpen) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Buat Artikel Blog</h3>
          <button onClick={() => setIsFormOpen(false)} className="text-slate-500 hover:text-slate-700">Kembali</button>
        </div>
        <ErrorAlert />
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Judul Artikel</label>
            <input required type="text" className="professional-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Contoh: Pentingnya Gamifikasi" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kutipan Pendek (Excerpt)</label>
            <textarea className="professional-input" rows={2} value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} placeholder="Ringkasan singkat untuk halaman depan..." />
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-2"><Wand2 className="w-4 h-4"/> AI Writer</h4>
            <div className="flex gap-2">
              <input type="text" className="professional-input flex-1 bg-white" placeholder="Ide tulisan: Manfaat teknologi di kelas..." value={form.prompt} onChange={e => setForm({...form, prompt: e.target.value})} />
              <button type="button" onClick={handleGenerateAI} disabled={busy} className="professional-button is-primary whitespace-nowrap">
                {busy ? "Loading AI..." : "Generate Draft"}
              </button>
            </div>
            <p className="text-xs text-blue-600 mt-2">AI akan membantu menuliskan draf panjang untuk artikel Anda.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Konten (Markdown)</label>
            <textarea required className="professional-input font-mono text-sm" rows={12} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="# Judul Besar&#10;&#10;Isi tulisan..." />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Status Publikasi</label>
            <select className="professional-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="draft">Draf (Disembunyikan)</option>
              <option value="published">Publikasi Terbuka</option>
            </select>
          </div>
          
          <button type="submit" disabled={busy} className="professional-button is-primary w-full justify-center">Simpan Artikel</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800">Daftar Artikel Blog</h3>
          <p className="text-sm text-slate-500">Kelola informasi publik dan pembaruan IdeTech.</p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="professional-button is-primary flex items-center gap-2"><Plus className="w-4 h-4"/> Buat Artikel Baru</button>
      </div>

      <ErrorAlert />
      
      {busy && blogs.length === 0 ? (
        <p className="text-center text-slate-500">Memuat data blog...</p>
      ) : blogs.length === 0 ? (
        <div className="text-center bg-white p-8 rounded-xl border border-slate-200 text-slate-500">
          Belum ada artikel. Klik "Buat Artikel Baru" untuk mulai.
        </div>
      ) : (
        <div className="grid gap-4">
          {blogs.map(blog => (
            <div key={blog.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800">{blog.title}</h4>
                <div className="flex items-center gap-3 text-sm mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${blog.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {blog.status.toUpperCase()}
                  </span>
                  <span className="text-slate-500">{new Date(blog.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(blog.id)} disabled={busy} className="professional-button text-red-600 hover:bg-red-50">Hapus</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
