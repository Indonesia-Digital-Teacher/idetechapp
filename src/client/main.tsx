import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import ReactPlayer from "react-player/lazy";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { ParentFriendlyDashboard } from "./ParentFriendlyDashboard";
import { TeacherRPPGenerator } from "./components/TeacherRPPGenerator";
import { TeacherConsultationModal } from "./components/TeacherConsultationModal";
import { CP_DATA, Fase, getKkaCp, JURUSAN_SMK, MapelOption, SubOption } from "./data/cpData";
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() { if (this.state.hasError) return <div style={{background:'red', color:'white', padding:'20px', zIndex: 9999, position: 'relative'}}><h1>Error Boundary Caught:</h1><pre>{this.state.error?.message}</pre><pre>{this.state.error?.stack}</pre></div>; return this.props.children; }
}

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
  MessageSquare,
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
  Check,
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
  ShoppingCart,
  Wand2,
  Gift,
  Ticket,
  Menu,
  CheckSquare,
  AlertCircle,
  Flag,
  ClipboardList,
  Copy,
  GripVertical,
  Edit3,
  XCircle,
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
  hp: number;
  coins: number;
  lastCheckInDate: string | null;
  checkInStreak: number;
  welcomeBonusClaimed: boolean;
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
  unlockedLevel?: number;
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
  level?: number;
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
  level?: number;
};

type TeacherTodo = {
  id: string;
  userId: string;
  classId: string | null;
  category: string | null;
  title: string;
  description: string | null;
  priority: "high" | "medium" | "low";
  isCompleted: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
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
  level?: number;
};

type StudentAchievement = {
  id: string;
  title: string;
  description: string;
  value: number;
  unlocked: boolean;
};

type StudentClass = TeacherClass;

type WelcomeQuote = {
  id: string;
  text: string;
  author?: string;
  roles: ("teacher" | "student" | "parent")[];
  isActive: boolean;
};

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

type StudentLeaderboardItem = {
  name: string;
  avatarUrl: string | null;
  points: number;
  isMe: boolean;
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
    stats?: {
      totalPoints: number;
      completedQuests: number;
      completedMaterials: number;
      earnedBadges: number;
      classesJoined: number;
    };
  };
  leaderboard?: StudentLeaderboardItem[];
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
  const [adminContact, setAdminContact] = useState("6281234567890");
  const [welcomeQuotes, setWelcomeQuotes] = useState<WelcomeQuote[]>([]);
  const [showWelcomeGreeting, setShowWelcomeGreeting] = useState(false);
  const [welcomeAiQuota, setWelcomeAiQuota] = useState<{ limit: number; used: number; remaining: number } | null>(null);
  const [teacherHasClasses, setTeacherHasClasses] = useState<boolean | null>(null);
  const [globalAlert, setGlobalAlert] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  async function loadSession() {
    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const me = await api<{ user: AuthUser | null; settings?: { adminContactWa: string } }>("/api/auth/me");
      if (!me.user) {
        setUser(null);
        setDashboard(null);
        return;
      }
      if (me.settings?.adminContactWa) {
        setAdminContact(me.settings.adminContactWa);
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

    // Cek apakah perlu tampil welcome greeting hari ini (skip untuk admin)
    if (payload.user.activeRole !== "admin") {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      const greetingKey = `idetech_greeting_${payload.user.id}_${today}`;
      if (!localStorage.getItem(greetingKey)) {
        // Fetch quotes dan jadwalkan modal tampil
        try {
          const qRes = await api<{ quotes: WelcomeQuote[]; aiQuota: { limit: number; used: number; remaining: number } | null }>("/api/welcome-quotes");
          setWelcomeQuotes(qRes.quotes || []);
          setWelcomeAiQuota(qRes.aiQuota || null);
        } catch {
          setWelcomeQuotes([]);
          setWelcomeAiQuota(null);
        }
        setShowWelcomeGreeting(true);
      }
    }

    if (payload.user.activeRole === "teacher") {
      try {
        const classPayload = await api<{ classes: { id: string }[] }>("/api/teacher/classes");
        setTeacherHasClasses((classPayload.classes || []).length > 0);
      } catch {
        setTeacherHasClasses(true);
      }
    } else {
      setTeacherHasClasses(true);
    }

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

    window.alert = (message?: any) => {
      const msgStr = String(message ?? "");
      let type: "success" | "error" | "info" = "info";
      const msgLower = msgStr.toLowerCase();
      if (
        msgLower.includes("berhasil") ||
        msgLower.includes("sukses") ||
        msgLower.includes("disalin")
      ) {
        type = "success";
      } else if (
        msgLower.includes("gagal") ||
        msgLower.includes("salah") ||
        msgLower.includes("error") ||
        msgLower.includes("terjadi kesalahan") ||
        msgLower.includes("koneksi")
      ) {
        type = "error";
      }
      setGlobalAlert({ message: msgStr, type });
    };
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

  if (user.status === "pending" || user.status === "suspended") {
    return (
      <main className="landing-shell min-h-screen flex items-center justify-center p-4">
        <div className="landing-bg" aria-hidden="true" />
        <Card className="max-w-md w-full bg-white/90 backdrop-blur p-8 rounded-3xl shadow-2xl text-center z-10 border border-slate-200">
           <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${user.status === 'pending' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
             <ShieldCheck className="w-8 h-8" />
           </div>
           <h1 className="text-2xl font-black text-slate-800 mb-2">
             {user.status === "pending" ? "Akun Menunggu Verifikasi" : "Akun Dinonaktifkan"}
           </h1>
           <p className="text-slate-600 mb-8 leading-relaxed">
             {user.status === "pending"
               ? "Akun Anda telah berhasil didaftarkan namun saat ini sedang menunggu proses verifikasi oleh Administrator. Harap tunggu atau hubungi pihak sekolah."
               : "Akun Anda saat ini dinonaktifkan oleh Administrator. Silakan hubungi pihak sekolah untuk informasi lebih lanjut."}
           </p>
           <div className="flex flex-col gap-3">
             <a href={`https://wa.me/${adminContact}`} target="_blank" rel="noreferrer" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
               <MessageCircle className="w-4 h-4" />
               Hubungi Admin (WhatsApp)
             </a>
             <button onClick={logout} disabled={busy} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2">
               <LogOut className="w-4 h-4" />
               Keluar
             </button>
           </div>
        </Card>
      </main>
    );
  }

  return (
    <>
      <GlobalAnnouncementsBanner announcements={announcements} />
      {showWelcomeGreeting && user && (
        <WelcomeGreetingModal
          user={user}
          quotes={welcomeQuotes}
          aiQuota={welcomeAiQuota}
          adminContact={adminContact}
          onClose={() => {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
            localStorage.setItem(`idetech_greeting_${user.id}_${today}`, "1");
            setShowWelcomeGreeting(false);
          }}
          teacherHasClasses={teacherHasClasses ?? true}
        />
      )}
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

      {globalAlert && (() => {
        const role = user?.activeRole;
        if (role === "student") {
          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-[#2b2b2b] rounded-[32px] p-2 shadow-[0_12px_0_#1a1a1a,0_25px_30px_rgba(0,0,0,0.5)] border-2 border-[#1a1a1a] max-w-sm w-full animate-in zoom-in-95 duration-200">
                <div className="bg-[#3a3a3a] rounded-[24px] p-6 flex flex-col items-center text-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-[0_4px_0_var(--shadow-color)] ${
                    globalAlert.type === 'success'
                      ? 'bg-gradient-to-b from-[#22c55e] to-[#15803d] border-green-200 text-white [--shadow-color:#166534]'
                      : globalAlert.type === 'error'
                      ? 'bg-gradient-to-b from-[#ef4444] to-[#b91c1c] border-red-200 text-white [--shadow-color:#991b1b]'
                      : 'bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] border-blue-200 text-white [--shadow-color:#1e40af]'
                  }`}>
                    {globalAlert.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> :
                     globalAlert.type === 'error' ? <XCircle className="w-8 h-8" /> :
                     <AlertCircle className="w-8 h-8" />}
                  </div>
                  <div className="w-full">
                    <h3 className="text-xl font-black text-white drop-shadow-[0_2px_0_#1a1a1a] tracking-wide">
                      {globalAlert.type === 'success' ? 'Berhasil' :
                       globalAlert.type === 'error' ? 'Gagal' : 'Informasi'}
                    </h3>
                    <div className="bg-[#222] border border-white/5 rounded-[20px] p-4 mt-3 shadow-inner w-full">
                      <p className="text-sm text-slate-200 font-bold leading-relaxed whitespace-pre-line">{globalAlert.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setGlobalAlert(null)}
                    className="w-full py-3.5 mt-2 bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-yellow-950 font-black rounded-xl border-2 border-yellow-200 shadow-[0_4px_0_#977500] hover:scale-[1.02] active:scale-[0.98] active:translate-y-[2px] active:shadow-[0_2px_0_#977500] transition-all cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          );
        } else if (role === "teacher") {
          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-[#0c1844] border-2 border-cyan-500/30 p-6 rounded-[36px] shadow-[0_0_30px_rgba(6,25,120,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] max-w-sm w-full animate-in zoom-in-95 duration-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full -mr-10 -mt-10 blur-3xl pointer-events-none"></div>
                <div className="flex flex-col items-center text-center gap-4 relative z-10">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${
                    globalAlert.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                      : globalAlert.type === 'error'
                      ? 'bg-rose-500/10 border-rose-400/30 text-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.3)]'
                      : 'bg-cyan-500/10 border-cyan-400/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                  }`}>
                    {globalAlert.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> :
                     globalAlert.type === 'error' ? <XCircle className="w-8 h-8" /> :
                     <AlertCircle className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-wide">
                      {globalAlert.type === 'success' ? 'Berhasil' :
                       globalAlert.type === 'error' ? 'Gagal' : 'Informasi'}
                    </h3>
                    <p className="text-sm text-cyan-100/80 mt-2 font-medium whitespace-pre-line leading-relaxed">{globalAlert.message}</p>
                  </div>
                  <button
                    onClick={() => setGlobalAlert(null)}
                    className="w-full py-3.5 mt-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-white font-black rounded-xl border border-yellow-300/30 shadow-[0_4px_14px_rgba(245,166,0,0.3)] transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          );
        } else if (role === "parent") {
          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-[#09090b] border border-white/10 p-6 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] max-w-sm w-full animate-in zoom-in-95 duration-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 blur-2xl pointer-events-none"></div>
                <div className="flex flex-col items-center text-center gap-4 relative z-10">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${
                    globalAlert.type === 'success'
                      ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#34d399] shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : globalAlert.type === 'error'
                      ? 'bg-[#f43f5e]/10 border-[#f43f5e]/30 text-[#fb7185] shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                      : 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#60a5fa] shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  }`}>
                    {globalAlert.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> :
                     globalAlert.type === 'error' ? <XCircle className="w-8 h-8" /> :
                     <AlertCircle className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">
                      {globalAlert.type === 'success' ? 'Berhasil' :
                       globalAlert.type === 'error' ? 'Gagal' : 'Informasi'}
                    </h3>
                    <p className="text-sm text-slate-300 mt-2 font-medium whitespace-pre-line leading-relaxed">{globalAlert.message}</p>
                  </div>
                  <button
                    onClick={() => setGlobalAlert(null)}
                    className="w-full py-3.5 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-[0_4px_14px_rgba(59,130,246,0.2)] transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          );
        } else {
          // Default / admin role styling
          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-[#1c1c2e] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    globalAlert.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                    globalAlert.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {globalAlert.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> :
                     globalAlert.type === 'error' ? <XCircle className="w-8 h-8" /> :
                     <AlertCircle className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {globalAlert.type === 'success' ? 'Berhasil' :
                       globalAlert.type === 'error' ? 'Gagal' : 'Informasi'}
                    </h3>
                    <p className="text-sm text-slate-300 mt-1 whitespace-pre-line leading-relaxed">{globalAlert.message}</p>
                  </div>
                  <button
                    onClick={() => setGlobalAlert(null)}
                    className="w-full py-3 mt-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          );
        }
      })()}
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
            <input value={fullName} maxLength={100} placeholder="Nama sesuai identitas sekolah" onChange={(event) => setFullName(event.target.value)} />
          </label>

          <label>
            <span>Nama Sekolah</span>
            <input
              value={schoolName}
              maxLength={150}
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
                maxLength={50}
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

function StudentWelcomeModal({ onClaim, busy }: { onClaim: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
      <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden text-center">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-yellow-100 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-20"></div>
            <img src="/karaktergame3d.webp" alt="Karakter" className="w-full h-full object-contain drop-shadow-xl animate-bounce" style={{ animationDuration: '2s' }} />
          </div>

          <h2 className="text-3xl font-extrabold text-slate-800 mb-2 font-display">Selamat Bergabung!</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Mulai petualanganmu di IdeTech. Kami telah menyiapkan <strong>100 Koin</strong> sebagai modal awal untukmu!
          </p>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 mb-8 transform transition-transform hover:scale-105">
            <div className="flex items-center justify-center gap-3">
              <CircleDollarSign className="w-10 h-10 text-yellow-500" strokeWidth={2.5} />
              <div className="text-4xl font-black text-yellow-600 tracking-tighter">+100</div>
            </div>
            <div className="text-sm font-bold text-yellow-800 mt-1 uppercase tracking-widest opacity-80">Koin Bonus</div>
          </div>

          <button
            onClick={onClaim}
            disabled={busy}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {busy ? "Mengklaim..." : "Mulai Petualangan!"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentCheckInModal({
  user,
  onClose,
  onCheckInSuccess,
  onOpenMissions
}: {
  user: AuthUser;
  onClose: () => void;
  onCheckInSuccess: (coins: number, streak: number, lastDate: string) => void;
  onOpenMissions: () => void;
}) {
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/student/coins/history", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const hasCheckedInToday = user.lastCheckInDate === today;

  const days = [
    { day: 1, reward: 10 },
    { day: 2, reward: 40 },
    { day: 3, reward: 100 },
    { day: 4, reward: 10 },
    { day: 5, reward: 40 },
    { day: 6, reward: 100 },
    { day: 7, reward: 500, isMax: true }
  ];

  const handleCheckIn = async () => {
    setCheckingIn(true);
    setError("");
    try {
      const response = await fetch("/api/student/check-in", { method: "POST", credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Gagal klaim koin");
      onCheckInSuccess(data.coins, data.streak, data.checkInDate);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#8d4715] sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl transform transition-transform animate-in slide-in-from-bottom-12 duration-300">
        <header className="px-5 py-4 flex items-center justify-between text-white border-b border-white/10">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft className="h-6 w-6" /></button>
            <h2 className="text-xl font-bold">Koin Saya</h2>
          </div>
          <Ticket className="h-6 w-6 opacity-80" />
        </header>

        <div className="px-6 py-4">
          <div className="flex items-center gap-3 text-white">
            <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center border-2 border-yellow-200 shadow-md">
              <span className="text-amber-700 font-black text-xl">S</span>
            </div>
            <span className="text-5xl font-black drop-shadow-md tracking-tight">{user.coins}</span>
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-amber-100/90 text-[13px] font-medium">Koin ini tidak akan pernah kadaluwarsa</span>
            <button
              type="button"
              className="text-sm font-bold text-white flex items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity"
              onClick={fetchHistory}
            >
              Riwayat <ChevronRight className="h-4 w-4"/>
            </button>
          </div>
        </div>

        <div className="mt-6 bg-[#262626] rounded-t-[32px] p-6 pb-8 relative shadow-[0_-10px_20px_rgba(0,0,0,0.3)] min-h-[300px]">
          {showHistory ? (
            <div className="pt-1 flex flex-col h-[280px]">
              <div className="flex justify-between items-center mb-4 text-white">
                <h3 className="font-bold">Riwayat Transaksi</h3>
                <button onClick={() => setShowHistory(false)} className="text-[11px] font-bold bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-full">Tutup</button>
              </div>
              <div className="overflow-y-auto pr-2 flex-1 space-y-2.5 custom-scrollbar">
                {loadingHistory ? (
                   <p className="text-white/50 text-sm text-center mt-6 animate-pulse">Memuat riwayat...</p>
                ) : history.length === 0 ? (
                   <p className="text-white/50 text-sm text-center mt-6">Belum ada riwayat koin.</p>
                ) : (
                   history.map((tx, idx) => (
                     <div key={tx.id || idx} className="flex justify-between items-center bg-[#333] hover:bg-[#3a3a3a] transition-colors p-3.5 rounded-[14px] border border-white/5">
                        <div>
                          <p className="text-[13px] text-white font-bold leading-tight">{tx.description || (tx.type === 'check_in' ? 'Cek-in Harian' : tx.type)}</p>
                          <p className="text-[10px] text-white/50 mt-1 font-medium">{new Date(tx.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#444] px-2.5 py-1 rounded-full">
                          <span className="text-[#f1a823] font-black text-sm">+{tx.amount}</span>
                          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#ffd54f] to-[#f57f17] flex items-center justify-center shadow-inner">
                            <span className="text-[8px] font-black text-amber-900">S</span>
                          </div>
                        </div>
                     </div>
                   ))
                )}
              </div>
            </div>
          ) : (
            <>
              <button
            type="button"
            onClick={onOpenMissions}
            className="absolute -top-7 left-6 right-6 bg-gradient-to-r from-[#fff9db] to-[#ffefad] rounded-2xl p-3 px-4 flex justify-between items-center shadow-lg border-2 border-amber-200/50 hover:scale-[1.02] hover:shadow-xl transition-all cursor-pointer text-left w-[calc(100%-3rem)]"
          >
            <div>
              <strong className="text-[#d85827] text-[17px] font-black block drop-shadow-sm leading-tight">Dapatkan Ekstra Koin!</strong>
              <span className="text-[10px] font-bold bg-[#6a3511] text-white px-2.5 py-0.5 rounded-full mt-1.5 inline-block shadow-inner">Selesaikan Misi Harian</span>
            </div>
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl transform rotate-12 shadow-lg flex items-center justify-center border-2 border-red-300">
                <Gift className="h-7 w-7 text-white drop-shadow-sm" />
              </div>
            </div>
          </button>

          <div className="pt-12 flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
            {days.map((d) => {
              const checkInMod = (user.checkInStreak % 7);
              const currentTarget = hasCheckedInToday ? (checkInMod === 0 ? 7 : checkInMod) : (checkInMod + 1);

              const isPast = d.day < currentTarget;
              const isToday = d.day === currentTarget;

              return (
                <div key={d.day} className={`flex-none snap-center flex flex-col items-center w-[64px] ${d.isMax ? 'w-[76px]' : ''}`}>
                  <div className={`w-full h-[88px] rounded-xl flex flex-col items-center justify-center border-[3px] relative shadow-sm transition-all
                    ${isToday ? 'bg-[#402e1a] border-[#f1a823] shadow-[#f1a823]/20 shadow-lg transform -translate-y-1' :
                      isPast ? 'bg-[#333] border-[#444] opacity-50' : 'bg-white border-[#e5e7eb]'}`}
                  >
                    {d.isMax && (
                      <div className="absolute -top-3.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border border-red-700/50">
                        Max +{d.reward}
                      </div>
                    )}
                    {!d.isMax && (
                      <span className={`text-[12px] font-black ${isToday ? 'text-[#f1a823]' : isPast ? 'text-slate-400' : 'text-slate-500'}`}>+{d.reward}</span>
                    )}
                    <div className={`w-7 h-7 rounded-full mt-1.5 flex items-center justify-center shadow-inner ${isToday ? 'bg-gradient-to-br from-[#ffd54f] to-[#f57f17]' : isPast ? 'bg-slate-500' : 'bg-gradient-to-br from-[#ffd54f] to-[#fbc02d]'}`}>
                      <span className={`text-[12px] font-black ${isPast ? 'text-slate-300' : 'text-amber-900'}`}>S</span>
                    </div>
                  </div>
                  <span className={`text-[11px] mt-2 font-black ${isToday ? 'text-red-500' : isPast ? 'text-slate-500' : 'text-slate-400'}`}>
                    Hari {d.day === 1 ? 'ini' : d.day}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleCheckIn}
            disabled={hasCheckedInToday || checkingIn}
            className="w-full bg-gradient-to-b from-[#ff6b4a] to-[#e64a2e] hover:from-[#ff795b] hover:to-[#f05033] text-white font-black py-4 rounded-[20px] text-[17px] shadow-[0_5px_0_#b5331c] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none transform active:translate-y-1 active:shadow-none transition-all mt-4"
          >
            {hasCheckedInToday ? 'Kembali Besok' : checkingIn ? 'Memproses...' : 'Cek-in dan Klaim Koin'}
          </button>
                {error && <p className="text-red-400 text-sm font-medium text-center mt-4">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
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
  const [localUser, setLocalUser] = useState(user);
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

  const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const [showWelcomeModal, setShowWelcomeModal] = useState(user.welcomeBonusClaimed === false);
  const [showCheckInModal, setShowCheckInModal] = useState(user.welcomeBonusClaimed !== false && user.lastCheckInDate !== todayDateStr);
  const [claimingWelcome, setClaimingWelcome] = useState(false);

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

      const headers: Record<string, string> = {};
      const token = localStorage.getItem("token");
      if (token && token !== "null" && token !== "undefined") {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/student/quests/${questId}/complete`, {
        method: "POST",
        credentials: "include",
        headers,
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
            <span>{user.hp}</span>
          </div>
          <button type="button" className="game-hud-pill hover:scale-105 transition-transform cursor-pointer relative" onClick={() => setShowCheckInModal(true)} aria-label="Cek-in Harian">
            {localUser.lastCheckInDate !== todayDateStr && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#542d13] animate-pulse shadow-sm"></span>
            )}
            <Ticket className="h-5 w-5 text-yellow-500" />
            <span>{localUser.coins ?? 0}</span>
          </button>
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
                <span className="block max-w-[220px] truncate" title={user.name}>{user.name}</span>
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
            Pertemuan {(indicators?.meta.levelButton ?? content.button).replace(/[^0-9]/g, "") || "1"}
          </button>
        </section>
      </section>

      {openPanel === "profile" ? <StudentProfileModal user={user} indicators={indicators} onClose={() => setOpenPanel(null)} onUserUpdate={(u) => setLocalUser(prev => ({ ...prev, name: u.name, fullName: u.fullName, schoolName: u.schoolName, contactChannel: u.contactChannel, contactValue: u.contactValue }))} /> : null}
      {openPanel && openPanel !== "profile" ? (
        <StudentContentModal
          user={user}
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
          leaderboard={indicators?.leaderboard ?? []}
        />
      ) : null}

      <MobileGameNav id="student-tour-4" active={openPanel ?? activeMenu} role="student" notifications={indicators?.nav} onChange={handleChangeMenu} />

      {activeOrb && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setActiveOrb(null)} />

          <section className="relative w-full max-w-[400px] bg-[#2b2b2b] rounded-[32px] p-2 shadow-[0_12px_0_#1a1a1a,0_25px_30px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
            <button onClick={() => setActiveOrb(null)} className="absolute -top-4 -right-2 bg-red-500 hover:bg-red-400 text-white rounded-full p-2 border-4 border-[#2b2b2b] shadow-[0_4px_0_#991b1b] transition-transform hover:scale-110 active:scale-95 z-20">
              <X className="w-6 h-6" strokeWidth={4} />
            </button>

            <div className="bg-[#3a3a3a] rounded-[24px] p-5">
              <div className="bg-gradient-to-b from-[#6b8cff] to-[#4568dc] rounded-[20px] p-1 shadow-[0_6px_0_#2b48a3,0_10px_15px_rgba(0,0,0,0.3)] mb-6">
                <div className="bg-gradient-to-b from-[#87a3ff] to-[#5a7bed] rounded-[16px] p-4 flex items-center gap-4 border border-white/20">
                  <div className="relative">
                    <div className="w-[64px] h-[64px] rounded-full bg-white p-1.5 shadow-[0_4px_0_#3855b5] flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        {(() => {
                          const OrbIcon = studentMapIcon(activeOrb.id);
                          return <OrbIcon className="w-7 h-7" strokeWidth={2.5} />;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 text-white">
                    <h3 className="font-black text-[20px] leading-tight drop-shadow-[0_2px_0_#2b48a3]">{activeOrb.title}</h3>
                    {activeOrb.targetDate ? (
                      <div className="mt-1.5 bg-[#2b48a3]/60 px-3 py-1 rounded-full inline-block border border-white/20 shadow-inner">
                        <AgendaCountdown targetDate={new Date(activeOrb.targetDate)} />
                      </div>
                    ) : (
                      <p className="font-medium text-blue-100 text-[11px] mt-0.5 opacity-90 tracking-wide uppercase">{activeOrb.subtitle}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-[#222] border border-white/5 shadow-inner rounded-[20px] p-5 text-[13px] text-[#ddd] leading-relaxed font-medium">
                {activeOrb.id === "map" && "Jalur utama petualangan IdeQuest. Terus selesaikan materi dan kuis untuk membuka peta wilayah baru!"}
                {activeOrb.id === "quest" && "Daftar misi khusus berbatas waktu. Kerjakan secepatnya sebelum waktunya habis untuk mendapat koin ekstra."}
                {activeOrb.id === "rank" && "Peringkat dan pencapaianmu. Kumpulkan piala untuk menaikkan reputasimu di kelas!"}
                {activeOrb.id === "tasks" && "Materi atau tugas aktif dari guru yang menunggumu. Jangan ditunda-tunda ya!"}
                {activeOrb.id === "coins" && "Poin/koin yang sudah kamu kumpulkan dari penyelesaian misi. Bisa ditukarkan dengan hadiah menarik."}
                {activeOrb.id === "radar" && "Radar Pintar yang memantau performa belajarmu. Jika menyala merah, berarti ada peringatan penting dari guru!"}
              </div>

              {activeOrb.badge && (
                <div className="mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900 py-3 px-4 rounded-xl text-sm font-black border-2 border-yellow-200 shadow-[0_4px_0_#b45309]">
                  <Star className="w-5 h-5 text-white fill-current drop-shadow-md" />
                  <span className="drop-shadow-sm">Badge aktif: {activeOrb.badge}</span>
                </div>
              )}

              <button onClick={() => setActiveOrb(null)} className="mt-6 w-full bg-gradient-to-b from-[#ff7043] to-[#e64a19] text-white font-black text-lg py-3.5 rounded-xl transition-transform hover:scale-[1.02] active:scale-95 shadow-[0_5px_0_#bf360c] border-2 border-[#ffab91]">
                Tutup Info
              </button>
            </div>
          </section>
        </div>
      )}

      {showDailyMissions && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDailyMissions(false)} />
          <div className="relative z-10 w-full max-w-sm animate-in zoom-in-95 duration-200 [&>aside]:!flex [&>aside]:!w-full">
            <button onClick={() => setShowDailyMissions(false)} className="absolute top-3 right-3 text-white hover:text-slate-200 bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors z-20">
              <X className="w-5 h-5" />
            </button>
            <StudentDailyMissionPanel onStart={() => setShowDailyMissions(false)} />
          </div>
        </div>
      )}

      {showCheckInModal && (
        <StudentCheckInModal
          user={localUser}
          onClose={() => setShowCheckInModal(false)}
          onCheckInSuccess={(coins, streak, lastDate) => {
            setLocalUser(prev => ({ ...prev, coins, checkInStreak: streak, lastCheckInDate: lastDate }));
          }}
          onOpenMissions={() => {
            setShowCheckInModal(false);
            setShowDailyMissions(true);
          }}
        />
      )}

      {showWelcomeModal && (
        <StudentWelcomeModal
          busy={claimingWelcome}
          onClaim={async () => {
            setClaimingWelcome(true);
            try {
              const res = await fetch("/api/student/claim-welcome", { method: "POST", credentials: "include" });
              if (res.ok) {
                const data = await res.json();
                setLocalUser(prev => ({ ...prev, welcomeBonusClaimed: true, coins: prev.coins + data.bonus }));
                user.welcomeBonusClaimed = true;
                user.coins = user.coins + data.bonus;
                refreshIndicators();
                setTimeout(() => setShowWelcomeModal(false), 500);
              }
            } catch (e) {
              console.error(e);
            } finally {
              setClaimingWelcome(false);
            }
          }}
        />
      )}
    </main>
  );
}

function StudentDailyMissionPanel({ onStart }: { onStart?: () => void }) {
  const missions = [
    { label: "Kerjakan 1 kuis", progress: "0/1", reward: "+20" },
    { label: "Selesaikan quest", progress: "0/2", reward: "+35" },
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
        <span>0/4</span>
        <div>
          <i style={{ width: '0%' }} />
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

      <button className="student-daily-panel__button hover:scale-105 active:scale-95 transition-transform" type="button" onClick={onStart}>
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
  onClose,
  onUserUpdate
}: {
  user: AuthUser;
  indicators: StudentIndicatorResponse | null;
  onClose: () => void;
  onUserUpdate?: (updated: {
    name: string;
    fullName: string | null;
    schoolName: string | null;
    contactChannel: "wa" | "telegram" | null;
    contactValue: string | null;
  }) => void;
}) {
  const level = indicators?.meta.levelButton.replace(/[^0-9]/g, "") || "101";
  const totalPoints = indicators?.meta.stats?.totalPoints ?? 0;
  const completedQuests = indicators?.meta.stats?.completedQuests ?? 0;
  const completedMaterials = indicators?.meta.stats?.completedMaterials ?? 0;
  const earnedBadges = indicators?.meta.stats?.earnedBadges ?? 0;
  const classesJoined = indicators?.meta.stats?.classesJoined ?? 0;

  const [showEditName, setShowEditName] = useState(false);
  const [editedName, setEditedName] = useState(user.fullName || user.name);
  const [editedSchoolName, setEditedSchoolName] = useState(user.schoolName ?? "");
  const [editedContactChannel, setEditedContactChannel] = useState<"wa" | "telegram">(user.contactChannel ?? "wa");
  const [editedContactValue, setEditedContactValue] = useState(user.contactValue ?? "");
  const [savingName, setSavingName] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const [schoolBusy, setSchoolBusy] = useState(false);

  useEffect(() => {
    if (!showEditName) return;
    if (editedSchoolName.trim().length < 2) {
      setSchoolOptions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      setSchoolBusy(true);
      api<{ schools: SchoolOption[] }>(`/api/schools/search?q=${encodeURIComponent(editedSchoolName)}`)
        .then((res) => setSchoolOptions(res.schools || []))
        .catch(() => setSchoolOptions([]))
        .finally(() => setSchoolBusy(false));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [editedSchoolName, showEditName]);

  useEffect(() => {
    if (!showEditName) return;
    setEditedName(user.fullName || user.name);
    setEditedSchoolName(user.schoolName ?? "");
    setEditedContactChannel(user.contactChannel ?? "wa");
    setEditedContactValue(user.contactValue ?? "");
    setEditError(null);
  }, [showEditName, user.fullName, user.name, user.schoolName, user.contactChannel, user.contactValue]);

  const stats = [
    { label: "Total Poin", value: String(totalPoints), icon: Target },
    { label: "Nyawa (HP)", value: String(user.hp ?? 100), icon: Heart },
    { label: "Kelas Diikuti", value: String(classesJoined), icon: ScrollText },
    { label: "Quest Selesai", value: String(completedQuests), icon: Star },
    { label: "Materi Selesai", value: String(completedMaterials), icon: BadgeCheck },
    { label: "Badge Diraih", value: String(earnedBadges), icon: Trophy }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="student-profile-title">
      <div className="absolute inset-0" onClick={onClose} />
      <section className="relative w-full max-w-[480px] bg-[#2b2b2b] rounded-[32px] p-2 shadow-[0_12px_0_#1a1a1a,0_25px_30px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">

        {/* Header/Close Button */}
        <button type="button" className="absolute -top-4 -right-2 bg-red-500 hover:bg-red-400 text-white rounded-full p-2 border-4 border-[#2b2b2b] shadow-[0_4px_0_#991b1b] transition-transform hover:scale-110 active:scale-95 z-20" onClick={onClose} aria-label="Tutup profil">
          <X className="h-6 w-6" strokeWidth={4} />
        </button>

        <div className="bg-[#3a3a3a] rounded-[24px] p-5">
          {/* 3D Profile Card */}
          <div className="bg-gradient-to-b from-[#6b8cff] to-[#4568dc] rounded-[24px] p-1 shadow-[0_6px_0_#2b48a3,0_10px_15px_rgba(0,0,0,0.3)] mb-8 relative">
            <div className="bg-gradient-to-b from-[#87a3ff] to-[#5a7bed] rounded-[20px] p-5 flex items-center gap-4 border border-white/20">

              {/* 3D Avatar */}
              <div className="relative">
                <div className="w-[84px] h-[84px] rounded-full bg-white p-1.5 shadow-[0_5px_0_#3855b5]">
                  <img
                    className="w-full h-full rounded-full object-cover bg-blue-100"
                    src={user.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                    alt={user.name}
                  />
                </div>
                <button className="absolute -bottom-1 -right-1 bg-yellow-400 p-2.5 rounded-full shadow-[0_3px_0_#c29400] text-yellow-900 hover:scale-105 active:scale-95 transition-transform border-2 border-yellow-200">
                  <Settings className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>

              {/* Identity */}
              <div className="flex-1 text-white">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-[22px] leading-tight drop-shadow-[0_2px_0_#2b48a3]">{user.name}</h3>
                  <button
                    type="button"
                    onClick={() => setShowEditName(true)}
                    className="bg-white/20 hover:bg-white/30 p-1 rounded-full transition-colors"
                    aria-label="Ubah profil"
                    title="Ubah profil"
                  >
                    <Pencil className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </button>
                </div>
                <p className="font-medium text-blue-100 text-xs mt-0.5 opacity-90 truncate max-w-[150px] sm:max-w-none">{user.email}</p>
                <div className="inline-block mt-2 bg-[#2b48a3]/60 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border border-white/20 shadow-inner">
                  Siswa IdeTech
                </div>
              </div>

              {/* 3D Level Badge */}
              <div className="relative flex flex-col items-center justify-start pt-2 pb-5 px-2 w-[72px] h-[84px] shrink-0 transform rotate-3"
                   style={{
                     background: '#ffd500',
                     clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)',
                   }}>
                <div className="absolute inset-x-1.5 top-0 bottom-2 bg-[#1e88e5] flex flex-col items-center pt-2"
                     style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 88%, 0 100%)' }}>
                   <span className="text-white font-black text-[10px] uppercase tracking-wider" style={{ textShadow: '0 2px 0 #0d47a1' }}>Level</span>
                   <strong className="text-white font-black text-3xl mt-[-2px]" style={{ textShadow: '0 3px 0 #0d47a1' }}>{level}</strong>
                </div>
              </div>

            </div>
          </div>

          {/* 3D General Stats */}
          <section className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-b from-[#ff7043] to-[#e64a19] text-white px-5 py-1.5 rounded-full text-[11px] font-black tracking-widest shadow-[0_4px_0_#bf360c] border-2 border-[#ffab91] z-10 uppercase">
              General Stats
            </div>

            <div className="bg-[#222] rounded-3xl p-5 pt-7 shadow-inner border border-white/5">
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  const colors = [
                    "from-amber-300 to-orange-500 shadow-[0_3px_0_#c2410c] border-orange-200", // Total Poin
                    "from-rose-400 to-red-500 shadow-[0_3px_0_#be123c] border-red-200", // HP
                    "from-emerald-400 to-green-500 shadow-[0_3px_0_#15803d] border-green-200", // Kelas
                    "from-cyan-400 to-blue-500 shadow-[0_3px_0_#1d4ed8] border-blue-200", // Quest
                    "from-purple-400 to-fuchsia-500 shadow-[0_3px_0_#a21caf] border-fuchsia-200", // Materi
                    "from-yellow-300 to-amber-400 shadow-[0_3px_0_#b45309] border-yellow-100" // Badge
                  ];
                  const colorClass = colors[idx % colors.length];

                  return (
                    <div key={stat.label} className="bg-[#333] rounded-2xl p-3 flex flex-col items-center justify-center border-b-[4px] border-[#1a1a1a] transition-transform hover:-translate-y-1">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center mb-2 border-2`}>
                        <Icon className="text-white w-5 h-5 drop-shadow-md" strokeWidth={3} />
                      </div>
                      <strong className="text-white font-black text-lg sm:text-xl drop-shadow-md">{stat.value}</strong>
                      <span className="text-[#999] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center mt-1 leading-tight">{stat.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </section>

      {showEditName && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Ubah profil">
          <div className="absolute inset-0" onClick={() => { if (!savingName) { setShowEditName(false); setEditError(null); } }} />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#2b2b2b] rounded-2xl p-5 shadow-[0_12px_0_#1a1a1a,0_25px_30px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 border border-white/10">
            <button
              type="button"
              onClick={() => { if (!savingName) { setShowEditName(false); setEditError(null); } }}
              className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-white text-lg mb-1">Ubah Profil</h3>
            <p className="text-xs text-slate-400 mb-4">Data dipakai untuk mencocokkan sekolah dan komunikasi belajar.</p>

            {editError && (
              <div className="mb-3 p-2 bg-rose-500/20 border border-rose-400/30 rounded-lg text-rose-200 text-xs">
                {editError}
              </div>
            )}

            <label className="flex flex-col w-full mb-3">
              <span className="text-xs font-bold text-slate-300 mb-1">Nama Lengkap</span>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                maxLength={100}
                className="w-full bg-[#1a1a1a] border border-[#444] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                placeholder="Masukkan nama lengkap"
                disabled={savingName}
              />
            </label>

            <label className="flex flex-col w-full mb-1">
              <span className="text-xs font-bold text-slate-300 mb-1">Nama Sekolah</span>
              <input
                type="text"
                value={editedSchoolName}
                onChange={(e) => setEditedSchoolName(e.target.value)}
                maxLength={150}
                list="profile-edit-school-options"
                className="w-full bg-[#1a1a1a] border border-[#444] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                placeholder="Cari nama sekolah se-Indonesia"
                disabled={savingName}
              />
              <datalist id="profile-edit-school-options">
                {schoolOptions.map((school) => (
                  <option key={`${school.name}-${school.city}-${school.province}`} value={school.name}>
                    {[school.city, school.province].filter(Boolean).join(", ")}
                  </option>
                ))}
              </datalist>
              <small className="text-[10px] text-slate-500 mt-1">
                {schoolBusy ? "Mencari sekolah..." : "Ketik minimal 2 huruf untuk mencari dari API sekolah Indonesia."}
              </small>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 mb-2">
              <label className="flex flex-col w-full">
                <span className="text-xs font-bold text-slate-300 mb-1">Kontak</span>
                <select
                  value={editedContactChannel}
                  onChange={(e) => setEditedContactChannel(e.target.value as "wa" | "telegram")}
                  disabled={savingName}
                  className="w-full bg-[#1a1a1a] border border-[#444] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                >
                  <option value="wa">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                </select>
              </label>
              <label className="flex flex-col w-full">
                <span className="text-xs font-bold text-slate-300 mb-1">
                  {editedContactChannel === "wa" ? "Nomor HP / WA" : "Username Telegram"}
                </span>
                <input
                  type="text"
                  value={editedContactValue}
                  onChange={(e) => setEditedContactValue(e.target.value)}
                  maxLength={50}
                  className="w-full bg-[#1a1a1a] border border-[#444] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  placeholder={editedContactChannel === "wa" ? "08xxxxxxxxxx" : "@username"}
                  disabled={savingName}
                />
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowEditName(false); setEditError(null); }}
                disabled={savingName}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#444] text-slate-300 text-sm font-bold hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const trimmedName = editedName.trim();
                  if (trimmedName.length < 3) {
                    setEditError("Nama minimal 3 karakter.");
                    return;
                  }
                  if (trimmedName.length > 100) {
                    setEditError("Nama maksimal 100 karakter.");
                    return;
                  }
                  if (!/^[a-zA-Z\s.'’`]+$/.test(trimmedName)) {
                    setEditError("Nama hanya boleh mengandung huruf, spasi, titik, atau tanda petik.");
                    return;
                  }

                  const trimmedSchool = editedSchoolName.trim();
                  if (trimmedSchool.length < 3) {
                    setEditError("Nama sekolah minimal 3 karakter.");
                    return;
                  }
                  if (trimmedSchool.length > 150) {
                    setEditError("Nama sekolah maksimal 150 karakter.");
                    return;
                  }

                  const trimmedContact = editedContactValue.trim();
                  if (trimmedContact.length > 50) {
                    setEditError("Kontak maksimal 50 karakter.");
                    return;
                  }
                  if (editedContactChannel === "wa" && !/^[0-9+][0-9\s-]{7,18}$/.test(trimmedContact)) {
                    setEditError("Nomor WA tidak valid.");
                    return;
                  }
                  if (editedContactChannel === "telegram" && !/^@?[a-zA-Z0-9_]{5,32}$/.test(trimmedContact)) {
                    setEditError("Username Telegram tidak valid.");
                    return;
                  }

                  setSavingName(true);
                  setEditError(null);
                  try {
                    await api("/api/profile", {
                      method: "PATCH",
                      body: JSON.stringify({
                        fullName: trimmedName,
                        schoolName: trimmedSchool,
                        contactChannel: editedContactChannel,
                        contactValue: trimmedContact
                      })
                    });
                    if (onUserUpdate) {
                      onUserUpdate({
                        name: trimmedName,
                        fullName: trimmedName,
                        schoolName: trimmedSchool,
                        contactChannel: editedContactChannel,
                        contactValue: editedContactChannel === "telegram" && !trimmedContact.startsWith("@") ? `@${trimmedContact}` : trimmedContact
                      });
                    }
                    setShowEditName(false);
                  } catch (err) {
                    setEditError(err instanceof Error ? err.message : "Gagal menyimpan profil.");
                  } finally {
                    setSavingName(false);
                  }
                }}
                disabled={savingName}
                className="flex-1 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                {savingName ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeagueLeaderboard({
  user,
  points,
  leaderboard = []
}: {
  user: AuthUser;
  points: number;
  leaderboard?: StudentLeaderboardItem[];
}) {
  const userName = user.name;
  const userAvatar = user.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name)}`;

  const displayList = leaderboard && leaderboard.length > 0
    ? leaderboard.map(u => ({
        name: u.name,
        avatar: u.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(u.name)}`,
        points: u.points,
        isMe: u.isMe
      }))
    : [
        { name: userName, avatar: userAvatar, points: points, isMe: true }
      ];

  const sorted = [...displayList].sort((a, b) => b.points - a.points);
  const myRank = sorted.findIndex(u => u.isMe) + 1;

  return (
    <div className="bg-slate-900 rounded-3xl p-6 text-white mb-8 relative overflow-hidden shadow-2xl shadow-indigo-500/20">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center shadow-lg border-2 border-amber-600/50 shrink-0">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">Liga Perunggu</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-medium">Musim 1 • Berakhir dalam 3 hari</p>
          </div>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start bg-slate-800/40 sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-slate-700/30 sm:border-0 shrink-0">
          <p className="text-xs sm:text-sm text-slate-400 font-medium">Peringkatmu</p>
          <p className="text-2xl sm:text-3xl font-black text-white ml-2 sm:ml-0">#{myRank}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-2 border border-slate-700/50 relative z-10 backdrop-blur-sm">
        <div className="px-4 py-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 border-b border-slate-700/50">Top 3 Promosi ke Liga Perak</div>

        {sorted.map((u, i) => (
          <div key={u.name} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${u.isMe ? 'bg-indigo-600 shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400' : 'hover:bg-slate-700/30'}`}>
            <div className={`w-8 text-center font-black ${i < 3 ? 'text-amber-400' : 'text-slate-500'}`}>
              {i + 1}
            </div>
            <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700" />
            <div className="flex-1">
              <p className={`font-bold ${u.isMe ? 'text-white' : 'text-slate-200'}`}>{u.name} {u.isMe && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-2">Kamu</span>}</p>
            </div>
            <div className="font-black text-indigo-200">{u.points} <span className="text-xs font-medium opacity-60">XP</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentContentModal({
  user,
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
  onSelectClass,
  leaderboard = []
}: {
  user: AuthUser;
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
  leaderboard?: StudentLeaderboardItem[];
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
  const [rankTab, setRankTab] = useState<"league" | "badges">("league");

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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="student-content-title">
      <div className="absolute inset-0" onClick={onClose} />

      <section className={`relative w-full ${active === "studio" ? 'max-w-4xl' : 'max-w-[480px]'} bg-[#2b2b2b] rounded-[32px] p-2 shadow-[0_12px_0_#1a1a1a,0_25px_30px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]`}>

        <button type="button" className="absolute -top-4 -right-2 bg-red-500 hover:bg-red-400 text-white rounded-full p-2 border-4 border-[#2b2b2b] shadow-[0_4px_0_#991b1b] transition-transform hover:scale-110 active:scale-95 z-20 cursor-pointer" onClick={onClose} aria-label={`Tutup ${title}`}>
          <X className="h-6 w-6" strokeWidth={4} />
        </button>

        <div className="bg-[#3a3a3a] rounded-[24px] flex flex-col overflow-hidden h-full">
          {/* Banner Header */}
          <header className="bg-gradient-to-b from-[#6b8cff] to-[#4568dc] rounded-[20px] mx-5 mt-5 p-5 pb-6 shadow-[0_6px_0_#2b48a3] shrink-0 z-10 border border-white/20">
            <h2 id="student-content-title" className="text-white font-black text-3xl drop-shadow-[0_2px_0_#2b48a3] leading-none">{active === "studio" ? "Tugas" : title}</h2>
            <p className="text-blue-100 font-medium mt-2 text-sm">{summary}</p>
          </header>

          {/* Body Wrapper */}
          <div className="p-5 flex-1 flex flex-col overflow-hidden">
            {error ? <div className="bg-red-500 text-white p-3 font-bold text-center text-sm mb-3 rounded-lg shadow-inner">{error}</div> : null}

            {/* Inner Dark Board */}
            <div className="bg-[#222] border border-white/5 rounded-[20px] p-5 shadow-inner flex-1 overflow-y-auto custom-scrollbar flex flex-col">

        {active === "studio" ? (
          <section className="flex-1 flex flex-col">

            <div className="flex items-center gap-3 sm:gap-4 bg-[#333] border-2 border-[#1a1a1a] rounded-full p-2 pr-4 sm:pr-6 mb-6 shadow-inner w-full max-w-md mx-auto">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-blue-200 shadow-md shrink-0">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 relative h-5 sm:h-6 bg-[#1a1a1a] rounded-full shadow-inner overflow-hidden border border-black/50">
                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 ease-out" style={{ width: `${(completedTasks / 9) * 100}%` }} />
                <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] sm:text-[11px] font-black tracking-wider drop-shadow-md">
                  {completedTasks} / 9
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 bg-[#444] px-2.5 py-1 rounded-full border border-[#555]">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-sm">
                  <span className="text-yellow-900 font-bold text-[9px] sm:text-[10px]">C</span>
                </div>
                <span className="text-white font-black text-xs sm:text-sm">{materials.reduce((total, item) => total + (item.progress >= 100 ? 50 : 0), 0)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {taskSlots.map((material, index) => {
                const isUnavailable = !material || (material as any).isLocked;
                const isDone = Boolean(material && material.progress >= 100);
                const Icon = material?.type === "quiz" ? Puzzle : material?.type === "video" ? Rocket : material?.type === "document" ? ScrollText : BookOpen;
                const isSelected = material && selectedTaskId === material.id;

                return (
                  <button
                    key={material?.id ?? `empty-task-${index}`}
                    type="button"
                    className={`bg-[#333] rounded-2xl p-3 flex flex-col items-center justify-start border-b-[4px] transition-transform hover:-translate-y-1 relative aspect-[3/4] focus:outline-none ${isSelected ? 'border-yellow-400 ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#222]' : 'border-[#1a1a1a]'} ${isUnavailable ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                    disabled={isUnavailable}
                    onClick={() => {
                      if (material) setSelectedTaskId(material.id);
                    }}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center">
                      <Star className={`w-6 h-6 drop-shadow-md fill-current ${isDone ? 'text-yellow-400' : 'text-slate-500'}`} />
                    </div>

                    {material && (
                      <div className="absolute top-2 left-0 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-r-md border border-red-700 shadow-sm z-10">
                        +{isDone ? 1 : 0}
                      </div>
                    )}

                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mt-3 mb-2 border-2 border-white/20 shadow-inner shrink-0 ${isDone ? 'bg-gradient-to-br from-green-400 to-green-600' : isUnavailable ? 'bg-slate-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}>
                      <Icon className="text-white w-6 h-6 sm:w-7 sm:h-7 drop-shadow-md" strokeWidth={2.5} />
                    </div>

                    <strong className="text-white font-black text-[10px] sm:text-[11px] leading-tight text-center drop-shadow-md line-clamp-2 mt-auto w-full">
                      {material?.title ?? "Belum Tersedia"}
                    </strong>

                    <span className="text-[#bbb] text-[9px] font-bold uppercase tracking-wider text-center mt-1.5 bg-black/40 px-2 py-0.5 rounded-full border border-white/10 w-full truncate">
                      {material && !(material as any).isLocked ? (isDone ? "Selesai" : `${material.progress}%`) : "Terkunci"}
                    </span>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-2">
            {activeQuests.length ? null : <p className="text-slate-400 col-span-2 sm:col-span-3 text-center font-medium my-10">Belum ada IdeQuest aktif.</p>}
            {activeQuests.map((quest) => {
              const relatedMaterial = materials.find((material) => material.id === quest.materialId);
              const materialDone = !quest.materialId || (relatedMaterial?.progress ?? 0) >= 100;
              const isDone = quest.progress >= 100;
              const isUnavailable = (quest as any).isLocked || !materialDone;
              const isSelected = selectedTaskId === quest.id;

              return (
                <button
                  key={quest.id}
                  type="button"
                  className={`bg-[#333] rounded-2xl p-3 flex flex-col items-center justify-start border-b-[4px] transition-transform hover:-translate-y-1 relative aspect-[3/4] focus:outline-none ${isSelected ? 'border-amber-400 ring-2 ring-amber-400 ring-offset-2 ring-offset-[#222]' : 'border-[#1a1a1a]'} ${isUnavailable ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  disabled={isUnavailable}
                  onClick={() => setSelectedTaskId(quest.id)}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center">
                    <Star className={`w-6 h-6 drop-shadow-md fill-current ${isDone ? 'text-amber-400' : 'text-slate-500'}`} />
                  </div>

                  <div className="absolute top-2 left-0 bg-gradient-to-b from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-r-md border border-red-700 shadow-sm z-10">
                    +{quest.points}
                  </div>

                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mt-4 mb-3 border-2 border-white/20 shadow-inner shrink-0 ${isDone ? 'bg-gradient-to-br from-green-400 to-green-600' : isUnavailable ? 'bg-slate-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                    <Puzzle className="text-white w-7 h-7 sm:w-8 sm:h-8 drop-shadow-md" strokeWidth={2.5} />
                  </div>

                  <strong className="text-white font-black text-[11px] sm:text-[13px] leading-tight text-center drop-shadow-md line-clamp-2 mt-auto w-full">
                    {quest.title}
                  </strong>

                  <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center mt-2 px-2 py-0.5 rounded-full border w-full truncate ${isDone ? 'bg-green-500/20 text-green-400 border-green-500/30' : isUnavailable ? 'bg-black/40 text-slate-400 border-white/10' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                    {isDone ? "Selesai" : isUnavailable ? "Terkunci" : "Terbuka"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {active === "rank" ? (
          <div className="student-achievement-wrap" style={{ marginTop: '24px' }}>
            <div className="flex bg-slate-800/80 p-1.5 rounded-full mb-2 border border-slate-700/50 shadow-inner">
              <button
                type="button"
                onClick={() => setRankTab("league")}
                className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all ${rankTab === 'league' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              >
                Liga & Peringkat
              </button>
              <button
                type="button"
                onClick={() => setRankTab("badges")}
                className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all ${rankTab === 'badges' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              >
                Koleksi Badge
              </button>
            </div>

            {rankTab === "league" ? (
              <>
                <LeagueLeaderboard user={user} points={meta?.totalPoints ?? 0} leaderboard={leaderboard} />
                <div className="grid grid-cols-3 gap-2 mt-4 mb-2">
                  <div className="bg-[#333] border-b-[4px] border-[#1a1a1a] rounded-xl p-3 flex flex-col items-center justify-center shadow-inner">
                    <strong className="text-white text-2xl font-black drop-shadow-md">{meta?.totalPoints ?? 0}</strong>
                    <span className="text-[#999] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center mt-1">Total Poin</span>
                  </div>
                  <div className="bg-[#333] border-b-[4px] border-[#1a1a1a] rounded-xl p-3 flex flex-col items-center justify-center shadow-inner">
                    <strong className="text-white text-2xl font-black drop-shadow-md">{meta?.completedQuests ?? 0}</strong>
                    <span className="text-[#999] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center mt-1">Quest Selesai</span>
                  </div>
                  <div className="bg-[#333] border-b-[4px] border-[#1a1a1a] rounded-xl p-3 flex flex-col items-center justify-center shadow-inner">
                    <strong className="text-white text-2xl font-black drop-shadow-md">{meta?.completedMaterials ?? 0}</strong>
                    <span className="text-[#999] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center mt-1">Materi Selesai</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {achievements.length ? null : <p className="text-slate-400 col-span-2 sm:col-span-4 text-center font-medium my-10">Belum ada pencapaian yang bisa diraih.</p>}
                {achievements.map((achievement, idx) => {
                  const colors = [
                    'from-yellow-400 to-amber-600 border-amber-300 text-yellow-100', // gold
                    'from-purple-400 to-purple-600 border-purple-300 text-purple-100', // purple
                    'from-green-400 to-green-600 border-green-300 text-green-100', // green
                    'from-blue-400 to-blue-600 border-blue-300 text-blue-100' // blue
                  ];
                  const colorClass = colors[idx % 4];
                  return (
                    <article key={achievement.id} className={`bg-[#333] rounded-2xl p-3 flex flex-col items-center justify-start border-b-[4px] border-[#1a1a1a] shadow-inner text-center ${!achievement.unlocked ? 'opacity-50 grayscale' : ''}`}>
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center mb-3 border-2 shadow-md relative mt-1`}>
                         <div className="absolute inset-1 rounded-full border border-white/30" />
                         <Star className="h-8 w-8 sm:h-10 sm:w-10 drop-shadow-md" strokeWidth={2.5} fill="currentColor" />
                      </div>
                      <strong className="text-white font-black text-xs sm:text-sm leading-tight drop-shadow-md line-clamp-2 w-full">{achievement.title}</strong>
                      <span className="text-[#bbb] text-[9px] sm:text-[10px] font-bold leading-tight mt-1 w-full">{achievement.description}</span>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {active === "map" ? (
          <div className="w-full h-full flex flex-col">
            <form className="bg-[#333] border-b-[4px] border-[#1a1a1a] rounded-[20px] p-4 mb-5 flex flex-col gap-3 shadow-inner" onSubmit={submitClassCode}>
              <div className="flex justify-between items-start w-full">
                <div>
                  <strong className="text-white text-base font-black drop-shadow-md block mb-1">Masuk Kelas</strong>
                  <span className="text-slate-400 text-xs font-medium">Masukkan ClassID dari guru untuk membuka materi dan IdeQuest.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClasses(!showClasses)}
                  className="text-[11px] bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white px-3 py-1.5 rounded-full font-black ml-2 shrink-0 border-b-[3px] border-[#1e3a8a] shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {showClasses ? "Sembunyikan" : `Kelas (${classes.length})`}
                </button>
              </div>
              <div className="flex gap-2 w-full mt-2">
                <input
                  className="flex-1 bg-[#222] border-2 border-[#111] rounded-xl px-4 py-2.5 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors shadow-inner uppercase"
                  value={classCode}
                  placeholder="IDT-ABC123"
                  onChange={(event) => setClassCode(event.target.value.toUpperCase())}
                />
                <button
                  type="submit"
                  disabled={busy || !classCode.trim()}
                  className="bg-gradient-to-b from-green-500 to-green-700 text-white font-black px-5 py-2.5 rounded-xl border-b-[4px] border-[#166534] shadow-md transition-all hover:brightness-110 active:border-b-0 active:translate-y-[4px] disabled:opacity-50 disabled:grayscale shrink-0"
                >
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

              <div className="flex flex-col items-center py-6 relative">
                {/* Connecting Line */}
                <div className="absolute top-0 bottom-0 w-2 bg-[#333] border-x border-[#111] left-1/2 -translate-x-1/2 rounded-full" />

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

                  pathNodes.sort((a, b) => {
                    const aLvl = a.data.level ?? 1;
                    const bLvl = b.data.level ?? 1;
                    if (aLvl !== bLvl) return aLvl - bLvl;
                    if (a.type !== b.type) return a.type === 'material' ? -1 : 1;
                    return 0;
                  });

                  return pathNodes.map((node, i) => {
                    const isCompleted = node.progress >= 100;
                    const isLocked = node.data.isLocked;

                    const positions = ['translate-x-0', 'translate-x-12', 'translate-x-0', '-translate-x-12'];
                    const alignClass = positions[i % 4];

                    const currentLevel = node.data.level ?? 1;
                    const prevLevel = i > 0 ? pathNodes[i-1].data.level ?? 1 : null;
                    const showLevelHeader = prevLevel === null || currentLevel !== prevLevel;

                    return (
                      <React.Fragment key={node.id}>
                        {showLevelHeader && (
                          <div className="w-full flex items-center justify-center my-6 relative z-10">
                            <div className="bg-[#1f2937] border-2 border-indigo-500/50 rounded-full px-5 py-1.5 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                              <span className="text-indigo-400 font-extrabold text-xs tracking-wider uppercase">⚔️ Pertemuan / Level {currentLevel}</span>
                            </div>
                          </div>
                        )}
                        <div className={`relative flex items-center justify-center my-4 ${alignClass} w-full max-w-[200px]`}>
                          <button
                            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-4 shadow-[0_6px_0_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-1 active:translate-y-0 relative z-10 ${isCompleted ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-200' : isLocked ? 'bg-[#444] border-[#222] grayscale opacity-70 cursor-not-allowed' : 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-200 ring-4 ring-yellow-400 ring-offset-2 ring-offset-[#222]'}`}
                            onClick={() => {
                              if (!isLocked) {
                                  setSelectedTaskId(node.id);
                              }
                            }}
                            aria-label={node.title}
                            disabled={isLocked}
                          >
                             <div className="absolute inset-1 rounded-full border-2 border-white/20 pointer-events-none" />
                             {isLocked ? <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 drop-shadow-md" /> : (node.type === 'quest' ? <Puzzle className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-md" /> : <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-md" />)}
                          </button>

                          <div className={`absolute top-1/2 -translate-y-1/2 ${i % 4 === 1 ? 'right-full mr-4 text-right' : i % 4 === 3 ? 'left-full ml-4 text-left' : (i % 2 === 0 ? (i % 4 === 0 ? 'left-full ml-6' : 'right-full mr-6 text-right') : '')} w-[140px] drop-shadow-md pointer-events-none`}>
                            <small className="block text-yellow-400 font-bold text-[10px] uppercase tracking-wider">{node.type === 'material' ? 'Materi' : 'Quest'}</small>
                            <span className="block text-white font-black text-[12px] sm:text-sm leading-tight">{node.title}</span>
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  });
                })()}
              </div>
            </div>
          </div>
        ) : null}

          </div>
        </div>
        </div>

        {busy ? <div className="student-content-loading">Memproses...</div> : null}
      </section>

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0a1f5c] border border-[rgba(125,211,252,0.3)] shadow-[0_0_20px_rgba(125,211,252,0.25)] text-white px-6 py-3.5 rounded-full z-[100] text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-6">
          <Info className="w-5 h-5 text-amber-400" />
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
              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
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
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{(selectedTask as any).content}</ReactMarkdown>
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
                                     <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{q.soal}</ReactMarkdown>
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
                                            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{q.pembahasan}</ReactMarkdown>
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
                    className="w-full text-sm p-3 border border-blue-200 rounded-lg min-h-[120px] max-h-[220px] overflow-y-auto focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white resize-y"
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

            <div className="student-content-progress" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
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
      <ErrorBoundary>
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
      </ErrorBoundary>
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
        {user.activeRole === "admin" ? (
          <div className="bg-gradient-to-b from-[#6b8cff] to-[#4568dc] rounded-[24px] p-1 shadow-[0_6px_0_#2b48a3,0_10px_15px_rgba(0,0,0,0.3)] relative">
            <div className="bg-gradient-to-b from-[#87a3ff] to-[#5a7bed] rounded-[20px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/20">
              <div className="flex-1 text-white">
                <div className="inline-block mb-3 bg-[#2b48a3]/60 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border border-white/20 shadow-inner">
                  {roleLabels[user.activeRole]}
                </div>
                <h1 className="font-black text-2xl md:text-3xl leading-tight drop-shadow-[0_2px_0_#2b48a3] mb-2">{dashboard.title}</h1>
                <p className="font-medium text-blue-50 text-sm opacity-95 max-w-2xl leading-relaxed">{dashboard.description}</p>
              </div>
              <div className="shrink-0 self-start md:self-center mt-2 md:mt-0">
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_8px_rgba(0,0,0,0.2)] uppercase tracking-widest text-center">
                  {user.status}
                </div>
              </div>
            </div>
          </div>
        ) : (
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
        )}

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
  const [showMore, setShowMore] = useState(false);

  const shortNames: Record<string, string> = {
    users: "User",
    classes: "Kelas",
    quick_action: "Persetujuan",
    system: "Sistem",
    blog: "Kelola",
    parent_students: "Manajemen",
    advanced_features: "Pengaturan"
  };

  const mainViews = ["users", "classes", "quick_action"];
  const mainActions = actions.filter(a => mainViews.includes(a.view));
  const moreActions = actions.filter(a => !mainViews.includes(a.view));

  const handleNav = (view: AdminView) => {
    onViewChange(view);
    setShowMore(false);
  };

  return (
    <>
      {showMore && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowMore(false)}
        />
      )}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#18181b] border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
        {showMore && (
          <div className="flex flex-wrap justify-center items-center bg-[#27272a] border-b border-white/5 py-4 px-2 gap-y-4 animate-in slide-in-from-bottom-4 duration-300">
            {moreActions.map((action) => {
              const Icon = action.icon;
              const isActive = activeView === action.view;
              return (
                <button
                  key={action.view}
                  className={`flex flex-col items-center gap-1.5 p-2 w-1/4 transition-colors ${isActive ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}
                  onClick={() => handleNav(action.view)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-bold">{shortNames[action.view] || action.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-around pb-2 pt-2">
          <button
            className={`flex flex-col items-center gap-1 p-2 flex-1 transition-colors ${activeView === "home" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}
            onClick={() => handleNav("home")}
          >
            <House className="h-5 w-5" />
            <span className="text-[10px] font-bold">Beranda</span>
          </button>

          {mainActions.map((action) => {
            const Icon = action.icon;
            const isActive = activeView === action.view;
            return (
              <button
                key={action.view}
                className={`flex flex-col items-center gap-1 p-2 flex-1 transition-colors ${isActive ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}
                onClick={() => handleNav(action.view)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-bold">{shortNames[action.view] || action.label.split(" ")[0]}</span>
              </button>
            );
          })}

          <button
            className={`flex flex-col items-center gap-1 p-2 flex-1 transition-colors ${showMore ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}
            onClick={() => setShowMore(!showMore)}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-bold">More</span>
          </button>
        </div>
      </nav>
    </>
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
        <div className="teacher-profile-card border-0 shadow-sm p-4 md:p-6 overflow-hidden relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <div>
              <p className="text-[rgba(226,245,255,0.76)] text-[10px] md:text-xs font-bold tracking-wider mb-1 uppercase">Kalender Agenda</p>
              <div className="flex items-center gap-1 group relative">
                <select
                  value={selectedMonth}
                  onChange={e => { setSelectedMonth(Number(e.target.value)); setWeekStartIndex(0); }}
                  className="text-xl md:text-2xl font-extrabold text-white tracking-tight bg-transparent border-none focus:ring-0 cursor-pointer p-0 appearance-none outline-none hover:text-[rgba(226,245,255,0.8)] transition-colors z-10"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i}>{m} {selectedYear}</option>
                  ))}
                </select>
                <ChevronDown className="h-5 w-5 text-[rgba(226,245,255,0.76)] group-hover:text-white transition-colors" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevWeek}
                  className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-[rgba(5,29,83,0.42)] border border-[rgba(125,211,252,0.22)] flex items-center justify-center text-[rgba(226,245,255,0.76)] hover:bg-[rgba(5,29,83,0.6)] hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button
                  type="button"
                  onClick={goToCurrentMonth}
                  className="h-9 md:h-10 px-3 md:px-4 rounded-xl border border-[rgba(125,211,252,0.22)] bg-[rgba(5,29,83,0.42)] text-[rgba(226,245,255,0.76)] text-xs md:text-sm font-bold hover:bg-[rgba(5,29,83,0.6)] hover:text-white transition-colors"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={nextWeek}
                  className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-[rgba(5,29,83,0.42)] border border-[rgba(125,211,252,0.22)] flex items-center justify-center text-[rgba(226,245,255,0.76)] hover:bg-[rgba(5,29,83,0.6)] hover:text-white transition-colors"
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
                className="h-9 md:h-10 px-3 md:px-4 rounded-xl border border-blue-400/50 bg-blue-500/20 text-blue-200 text-xs md:text-sm font-bold hover:bg-blue-500/30 transition-colors ml-1"
              >
                Lihat Semua Agenda
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-4 mb-2">
            {days.map(d => (
              <div key={d} className="text-center text-[10px] md:text-xs font-bold text-[rgba(226,245,255,0.76)] tracking-wider">
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
                        ? (hasEvent ? "bg-amber-400/20 border-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.4)] hover:bg-amber-400/30" : "bg-white/10 border-white/40 shadow-[0_0_0_2px_rgba(255,255,255,0.2)] hover:bg-white/20")
                        : (hasEvent ? "bg-amber-400/10 border-amber-400/30 hover:bg-amber-400/20" : "bg-[rgba(5,29,83,0.42)] border-[rgba(125,211,252,0.1)] hover:bg-[rgba(5,29,83,0.6)]")}
                  `}
                >
                  <div className={`text-xs md:text-sm font-bold flex items-center justify-center rounded-full ${isSelected ? "w-6 h-6 md:w-7 md:h-7 bg-white text-[#06165e] shadow-md ring-2 ring-white/50" : hasEvent ? "w-6 h-6 md:w-7 md:h-7 bg-amber-400/20 text-amber-400" : "text-[rgba(226,245,255,0.76)] w-6 h-6 md:w-7 md:h-7"}`}>
                    {date}
                  </div>
                  {hasEvent && (
                    <div className="absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2 w-4 h-4 md:w-5 md:h-5 bg-amber-400 text-[#06165e] text-[9px] md:text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.5)]">
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
          <div className="teacher-profile-card border-0 rounded-2xl max-w-3xl w-full p-4 md:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute top-4 right-4 text-[rgba(226,245,255,0.76)] hover:text-white bg-[rgba(5,29,83,0.42)] rounded-full p-1 transition-colors z-20"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 pr-10">
              <div>
                <p className="text-[rgba(226,245,255,0.76)] text-xs font-bold tracking-wider mb-1 uppercase">Kalender Agenda</p>
                <div className="flex items-center gap-1 group relative">
                  <select
                    value={selectedMonth}
                    onChange={e => { setSelectedMonth(Number(e.target.value)); setWeekStartIndex(0); setSelectedDateForModal(null); }}
                    className="text-2xl md:text-3xl font-extrabold text-white tracking-tight bg-transparent border-none focus:ring-0 cursor-pointer p-0 appearance-none outline-none hover:text-[rgba(226,245,255,0.8)] transition-colors z-10"
                  >
                    {months.map((m, i) => (
                      <option key={i} value={i}>{m} {selectedYear}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-6 w-6 text-[rgba(226,245,255,0.76)] group-hover:text-white transition-colors" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { prevMonth(); setSelectedDateForModal(null); }} className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-[rgba(5,29,83,0.42)] border border-[rgba(125,211,252,0.22)] flex items-center justify-center text-[rgba(226,245,255,0.76)] hover:bg-[rgba(5,29,83,0.6)] hover:text-white transition-colors">
                  <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button onClick={() => { goToCurrentMonth(); setSelectedDateForModal(null); }} className="h-9 md:h-10 px-3 md:px-4 rounded-full bg-blue-500/20 border border-blue-400/50 text-blue-200 text-xs md:text-sm font-bold hover:bg-blue-500/30 transition-colors">
                  Bulan Ini
                </button>
                <button onClick={() => { nextMonth(); setSelectedDateForModal(null); }} className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-[rgba(5,29,83,0.42)] border border-[rgba(125,211,252,0.22)] flex items-center justify-center text-[rgba(226,245,255,0.76)] hover:bg-[rgba(5,29,83,0.6)] hover:text-white transition-colors">
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>
            </div>

            <div className="mt-2">
              <h4 className="text-lg font-bold text-white mb-4">
                {selectedDateForModal
                  ? `Agenda: ${selectedDateForModal} ${months[selectedMonth]} ${selectedYear}`
                  : `Daftar Agenda (${months[selectedMonth]} ${selectedYear})`}
              </h4>

              {(() => {
                const filteredAgendas = currentMonthAgendas.filter(a => selectedDateForModal === null || a.date.getDate() === selectedDateForModal);
                if (filteredAgendas.length === 0) {
                  return <div className="text-center py-8 text-[rgba(226,245,255,0.76)]">Belum ada agenda untuk {selectedDateForModal ? 'tanggal' : 'bulan'} ini.</div>;
                }
                return (
                  <div className="space-y-3">
                    {filteredAgendas.map((agenda, i) => (
                      <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[rgba(5,29,83,0.42)] border border-[rgba(125,211,252,0.22)] rounded-xl hover:bg-[rgba(5,29,83,0.6)] transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 flex items-center justify-center min-w-8 w-8 h-8 rounded-full ${agenda.type === 'materi' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                            {agenda.type === 'materi' ? <BookOpen className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-white leading-tight">{agenda.title}</p>
                            <p className="text-xs font-medium text-[rgba(226,245,255,0.76)] mt-1">Kelas: {classes.find(c => c.id === agenda.classId)?.name || agenda.classId}</p>
                          </div>
                        </div>
                        <div className="mt-3 md:mt-0 md:text-right shrink-0">
                          <div className="text-[10px] font-bold text-[rgba(226,245,255,0.6)] uppercase tracking-wider mb-1 md:hidden">Tenggat Waktu</div>
                          <span className="inline-flex flex-col md:items-end gap-1">
                            <AgendaCountdown targetDate={agenda.date} />
                            <span className="text-[10px] font-bold text-[rgba(226,245,255,0.6)] uppercase tracking-wider hidden md:block">Tenggat Waktu</span>
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
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{m.content}</ReactMarkdown>
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
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultationUnreadCount, setConsultationUnreadCount] = useState(0);
  const [hasUnpublishedJournalDraft, setHasUnpublishedJournalDraft] = useState(false);
  const [todos, setTodos] = useState<TeacherTodo[]>([]);
  const [showTodoPanel, setShowTodoPanel] = useState(false);

  const loadConsultationUnreadCount = useCallback(() => {
    fetch("/api/teacher/consultations/unread-count", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setConsultationUnreadCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  // Real-time consultation badge + fallback polling
  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      loadConsultationUnreadCount();
    }, 1200);
    const es = new EventSource("/api/teacher/consultations/stream", { withCredentials: true });
    const refresh = () => {
      if (!showConsultationModal) {
        loadConsultationUnreadCount();
      }
    };

    es.addEventListener("consultation", () => {
      refresh();
    });

    es.onerror = () => {};

    const interval = setInterval(() => {
      if (!showConsultationModal) {
        loadConsultationUnreadCount();
      }
    }, 15000);

    return () => {
      window.clearTimeout(initialTimer);
      es.close();
      clearInterval(interval);
    };
  }, [loadConsultationUnreadCount, showConsultationModal]);

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

  useEffect(() => {
    setActiveFeature(null);
  }, [activeMenu]);

  useEffect(() => {
    api<{ todos: TeacherTodo[] }>("/api/teacher/todos")
      .then((payload) => setTodos(payload.todos))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const openSemester = () => setShowTodoPanel(true);
    const openRpp = () => setShowRppGenerator(true);
    window.addEventListener("idetech:open-semester", openSemester);
    window.addEventListener("idetech:open-rpp", openRpp);
    return () => {
      window.removeEventListener("idetech:open-semester", openSemester);
      window.removeEventListener("idetech:open-rpp", openRpp);
    };
  }, []);

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
    dueDate: "",
    level: "1"
  });
  const [questForm, setQuestForm] = useState({
    classId: "",
    materialId: "",
    title: "",
    mission: "",
    points: "100",
    dueDate: "",
    level: "1"
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

  async function updateUnlockedLevel(classId: string, unlockedLevel: number) {
    setClassBusy(true);
    setClassError(null);
    try {
      await api<{ class: TeacherClass }>(`/api/teacher/classes/${classId}`, {
        method: "PATCH",
        body: JSON.stringify({ unlockedLevel })
      });
      await loadTeacherClasses();
    } catch (err) {
      setClassError(err instanceof Error ? err.message : "Gagal memperbarui level.");
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
          level: Number(materialForm.level || 1),
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
          level: Number(materialForm.level || 1),
          options: materialForm.dueDate ? { dueDate: materialForm.dueDate } : null
        };
        await api<{ material: TeacherMaterial }>("/api/teacher/materials", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setMaterialForm((current) => ({ ...current, title: "", description: "", dueDate: "", level: "1" }));
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
        level: Number(questForm.level || 1),
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
      setQuestForm((current) => ({ ...current, materialId: "", title: "", mission: "", points: "100", dueDate: "", level: "1" }));
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
      dueDate: material.options?.dueDate || "",
      level: String(material.level ?? 1)
    });
  }

  function cancelEditMaterial() {
    setEditingMaterialId(null);
    setEditingQuestId(null);
    setMaterialForm({ classId: "", title: "", type: "lesson", description: "", content: "", dueDate: "", level: "1" });
    setQuestForm({ classId: "", materialId: "", title: "", mission: "", points: "100", dueDate: "", level: "1" });
  }

  function startEditQuest(quest: TeacherIdeQuest) {
    setEditingQuestId(quest.id);
    setQuestForm({
      classId: quest.classId,
      materialId: quest.materialId ?? "",
      title: quest.title,
      mission: quest.mission,
      points: String(quest.points),
      dueDate: quest.dueDate,
      level: String(quest.level ?? 1)
    });
  }

  function cancelEditQuest() {
    setEditingQuestId(null);
    setQuestForm({ classId: "", materialId: "", title: "", mission: "", points: "100", dueDate: "", level: "1" });
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
            <button
              className="teacher-space-menu-button relative"
              type="button"
              aria-label="Konsultasi Orang Tua"
              onClick={() => { setShowConsultationModal(true); setConsultationUnreadCount(0); }}
            >
              <MessageSquare className="h-5 w-5 text-slate-700" />
              {consultationUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 text-white text-[8px] font-black items-center justify-center">
                    {consultationUnreadCount > 9 ? "9+" : consultationUnreadCount}
                  </span>
                </span>
              )}
            </button>

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
              onUpdateUnlockedLevel={updateUnlockedLevel}
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
          <div className="teacher-profile-card border-0 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button className="absolute top-4 right-4 text-[rgba(226,245,255,0.76)] hover:text-white transition-colors bg-[rgba(5,29,83,0.42)] p-1 rounded-full hover:bg-[rgba(5,29,83,0.6)]" onClick={() => setGuideModal(null)}>
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-white border-b border-white/10 pb-4">
              {guideModal === "quest" ? "Panduan Kelas Saya" :
               guideModal === "studio" ? "Panduan IdeStudio Guru" :
               "Panduan Radar Pintar"}
            </h3>
            <div className="prose prose-sm prose-invert prose-p:text-[rgba(226,245,255,0.76)] prose-li:text-[rgba(226,245,255,0.76)] prose-strong:text-amber-400 overflow-y-auto max-h-[60vh] pr-2">
              {guideModal === "quest" && (
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
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
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
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
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
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

      {/* Consultation Modal */}
      {showConsultationModal && (
        <TeacherConsultationModal
          onClose={() => {
            setShowConsultationModal(false);
            loadConsultationUnreadCount();
          }}
          currentUserId={user.id}
        />
      )}


      {/* Todo Floating Button */}
      <button
        type="button"
        onClick={() => setShowTodoPanel(true)}
        className="fixed bottom-40 right-4 z-[990] h-14 w-14 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(99,102,241,0.45)] hover:scale-110 active:scale-95 transition-all border-2 border-white/30"
        aria-label="Buka To-Do List"
      >
        <CheckSquare size={22} />
        {(() => {
          const overduePending = todos.filter(t => !t.isCompleted && t.dueDate && new Date(t.dueDate) < new Date());
          const pendingCount = todos.filter(t => !t.isCompleted).length;
          const badgeCount = overduePending.length > 0 ? overduePending.length : pendingCount;
          return badgeCount > 0 ? (
            <span className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white animate-pulse ${overduePending.length > 0 ? 'bg-red-500' : 'bg-amber-400 text-slate-900'}`}>
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          ) : null;
        })()}
      </button>

      {/* Todo Panel Sidebar */}
      <TeacherTodoPanel
        todos={todos}
        classes={teacherClasses}
        isOpen={showTodoPanel}
        onClose={() => setShowTodoPanel(false)}
        onTodosChange={setTodos}
      />
    </main>
  );
}

function TeacherTodoPanel({
  todos,
  classes,
  isOpen,
  onClose,
  onTodosChange
}: {
  todos: TeacherTodo[];
  classes: TeacherClass[];
  isOpen: boolean;
  onClose: () => void;
  onTodosChange: (todos: TeacherTodo[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<"all" | "high" | "medium" | "low">("all");
  const [filterStatus, setFilterStatus] = useState<"active" | "done" | "all">("active");
  const [filterCategory, setFilterCategory] = useState<"all" | "rpp" | "grading" | "teaching" | "other">("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "createdAt">("priority");

  // AI Suggestions state
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  // Semester Plan Generator state
  const [showSemesterGen, setShowSemesterGen] = useState(false);
  const [genFase, setGenFase] = useState<Fase>("E");
  const [genMapel, setGenMapel] = useState("");
  const [genSubOption, setGenSubOption] = useState("");
  const [genJurusan, setGenJurusan] = useState("");
  const [genCp, setGenCp] = useState("");
  const [genDays, setGenDays] = useState<number[]>([]);
  const [genStartDate, setGenStartDate] = useState("2026-07-13");
  const [genEndDate, setGenEndDate] = useState("2026-12-11");
  const [genMaxMeetings, setGenMaxMeetings] = useState("");
  const [genClassId, setGenClassId] = useState("");
  const [genUseMaterial, setGenUseMaterial] = useState(false);
  const [genSemester, setGenSemester] = useState<"ganjil" | "genap" | "auto">("auto");
  const [loadingSemester, setLoadingSemester] = useState(false);
  const [semesterError, setSemesterError] = useState("");
  const [generatedMeetings, setGeneratedMeetings] = useState<any[]>([]);
  const [showSemesterPreview, setShowSemesterPreview] = useState(false);

  const availableMapel = useMemo(() => CP_DATA[genFase] || [], [genFase]);
  const selectedMapel = useMemo<MapelOption | undefined>(() => availableMapel.find(m => m.value === genMapel), [availableMapel, genMapel]);

  useEffect(() => {
    if (!selectedMapel) {
      setGenCp("");
      return;
    }
    if (selectedMapel.requiresJurusan) {
      if (genJurusan) {
        setGenCp(getKkaCp(genFase, genJurusan));
      } else {
        setGenCp("");
      }
      return;
    }
    if (selectedMapel.subOptions) {
      const sub = selectedMapel.subOptions.find((s: SubOption) => s.value === genSubOption);
      setGenCp(sub ? sub.cp : "");
      return;
    }
    setGenCp(selectedMapel.cp || "");
  }, [genFase, selectedMapel, genSubOption, genJurusan]);

  async function generateSemesterPlan() {
    setLoadingSemester(true);
    setSemesterError("");
    try {
      const semesterValue = genSemester === "auto"
        ? null
        : genSemester;
      const res = await api<{ meetings: any[] }>("/api/teacher/todos/semester-plan", {
        method: "POST",
        body: JSON.stringify({
          capaianPembelajaran: genCp,
          teachingDays: genDays,
          startDate: genStartDate,
          endDate: genEndDate,
          maxMeetings: genMaxMeetings ? parseInt(genMaxMeetings, 10) : undefined,
          classId: genClassId || null,
          mapel: genMapel || null,
          fase: genFase || null,
          semester: semesterValue,
          useMaterial: genUseMaterial
        })
      });
      setGeneratedMeetings(res.meetings || []);
      setShowSemesterPreview(true);
      setShowSemesterGen(false);
    } catch (err) {
      setSemesterError(err instanceof Error ? err.message : "Gagal membuat program semester.");
    } finally {
      setLoadingSemester(false);
    }
  }

  async function applySemesterPlan() {
    setLoadingSemester(true);
    setSemesterError("");
    try {
      const savedTodos: TeacherTodo[] = [];
      for (const m of generatedMeetings) {
        const res = await api<{ todo: TeacherTodo }>("/api/teacher/todos", {
          method: "POST",
          body: JSON.stringify({
            title: m.title,
            description: m.description,
            priority: m.priority,
            dueDate: m.dueDate,
            classId: m.classId || null,
            category: m.category || "teaching"
          })
        });
        if (res.todo) {
          savedTodos.push(res.todo);
        }
      }
      onTodosChange([...todos, ...savedTodos]);
      setShowSemesterPreview(false);
      setGeneratedMeetings([]);
    } catch (err) {
      setSemesterError(err instanceof Error ? err.message : "Gagal menyimpan rincian tugas.");
    } finally {
      setLoadingSemester(false);
    }
  }

  const exportToPDF = () => {
    if (!generatedMeetings || generatedMeetings.length === 0) return;

    const currentYear = new Date().getFullYear();
    const rowsHtml = generatedMeetings.map((m, idx) => {
      const cleanTopic = m.title.replace(/^Pertemuan\s+\d+:\s*/i, "");
      const unitText = m.unit || "-";
      const elemenText = m.elemen || "-";
      const meetingNum = m.meetingNumber || (idx + 1);

      return `
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 8px 12px; vertical-align: top;">${unitText}</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px 12px; vertical-align: top; text-align: center;">${meetingNum}</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px 12px; vertical-align: top;">
            <div style="font-weight: 600; color: #0f172a; margin-bottom: 2px;">${cleanTopic}</div>
            <div style="font-size: 9px; color: #64748b;">${m.description}</div>
          </td>
          <td style="border: 1px solid #e2e8f0; padding: 8px 12px; vertical-align: top;">${elemenText}</td>
        </tr>
      `;
    }).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Pastikan pop-up diperbolehkan di browser Anda.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Program Semester - Dianyssa</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm 20mm 30mm 20mm;
            }
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.5;
            }
            tr {
              page-break-inside: avoid;
            }
            .header {
              margin-bottom: 24px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 12px;
            }
            .header h1 {
              font-size: 18px;
              font-weight: 800;
              margin: 0 0 4px 0;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .header p {
              font-size: 10px;
              color: #64748b;
              margin: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background-color: #f1f5f9;
              color: #334155;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.5px;
              padding: 8px 12px;
              border: 1px solid #cbd5e1;
            }
            .footer {
              position: fixed;
              bottom: 0px;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              padding: 10px 0;
              border-top: 1px solid #f1f5f9;
              background-color: white;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Program Semester</h1>
            <p>Dibuat secara otomatis berdasarkan Capaian Pembelajaran & Rentang Tanggal Mengajar</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Unit / Bab</th>
                <th style="width: 10%;">Pertemuan</th>
                <th style="width: 50%;">Topik Bahasan</th>
                <th style="width: 15%;">Elemen</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Dibuat dengan ❤️ oleh Dianyssa ${currentYear}
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TeacherTodo | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState<"high" | "medium" | "low">("medium");
  const [formDueDate, setFormDueDate] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formCategory, setFormCategory] = useState("other");
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const now = new Date();

  const priorityWeight = { high: 3, medium: 2, low: 1 };

  const sortedAndFiltered = [...todos]
    .filter((t) => {
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchPriority = filterPriority === "all" || t.priority === filterPriority;
      const matchStatus = filterStatus === "all" || (filterStatus === "active" ? !t.isCompleted : t.isCompleted);
      const matchCategory = filterCategory === "all" || t.category === filterCategory;
      const matchClass = filterClass === "all" || t.classId === filterClass;
      return matchSearch && matchPriority && matchStatus && matchCategory && matchClass;
    })
    .sort((a, b) => {
      if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === "priority") {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const overdueCount = todos.filter(t => !t.isCompleted && t.dueDate && new Date(t.dueDate) < now).length;

  async function loadAiSuggestions() {
    setLoadingSuggestions(true);
    setSuggestError("");
    try {
      const res = await api<{ suggestions: any[] }>("/api/teacher/todos/suggest", { method: "POST" });
      setAiSuggestions(res.suggestions || []);
      setShowAiSuggestions(true);
    } catch (err) {
      setSuggestError("Gagal memuat rekomendasi AI.");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function addSuggestedTodo(suggested: { title: string; description: string; priority: "high" | "medium" | "low"; category: string; classId: string | null }) {
    try {
      const res = await api<{ todo: TeacherTodo }>("/api/teacher/todos", {
        method: "POST",
        body: JSON.stringify({
          title: suggested.title,
          description: suggested.description,
          priority: suggested.priority,
          category: suggested.category,
          classId: suggested.classId || undefined
        })
      });
      onTodosChange([res.todo, ...todos]);
      setAiSuggestions(prev => prev.filter(s => s.title !== suggested.title));
    } catch (err) {
      alert("Gagal menambahkan tugas saran.");
    }
  }

  function openAddForm() {
    setEditingTodo(null);
    setFormTitle("");
    setFormDesc("");
    setFormPriority("medium");
    setFormDueDate("");
    setFormClassId("");
    setFormCategory("other");
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(todo: TeacherTodo) {
    setEditingTodo(todo);
    setFormTitle(todo.title);
    setFormDesc(todo.description ?? "");
    setFormPriority(todo.priority);
    setFormDueDate(todo.dueDate ? todo.dueDate.slice(0, 16) : "");
    setFormClassId(todo.classId ?? "");
    setFormCategory(todo.category ?? "other");
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Judul tugas wajib diisi.");
      return;
    }
    setFormBusy(true);
    setFormError("");
    try {
      const dueDate = formDueDate ? new Date(formDueDate).toISOString() : null;
      const body = {
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        priority: formPriority,
        dueDate,
        classId: formClassId || null,
        category: formCategory
      };
      if (editingTodo) {
        const result = await api<{ todo: TeacherTodo }>(`/api/teacher/todos/${editingTodo.id}`, {
          method: "PATCH",
          body: JSON.stringify(body)
        });
        onTodosChange(todos.map(t => t.id === editingTodo.id ? result.todo : t));
      } else {
        const result = await api<{ todo: TeacherTodo }>("/api/teacher/todos", {
          method: "POST",
          body: JSON.stringify(body)
        });
        onTodosChange([result.todo, ...todos]);
      }
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan tugas.");
    }
    setFormBusy(false);
  }

  async function toggleComplete(todo: TeacherTodo) {
    try {
      const result = await api<{ todo: TeacherTodo }>(`/api/teacher/todos/${todo.id}`, { method: "PATCH", body: JSON.stringify({ isCompleted: !todo.isCompleted }) });
      onTodosChange(todos.map(t => t.id === todo.id ? result.todo : t));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal memperbarui status tugas.");
    }
  }

  async function deleteTodo(todo: TeacherTodo) {
    if (!confirm(`Hapus tugas "${todo.title}"?`)) return;
    try {
      await api(`/api/teacher/todos/${todo.id}`, { method: "DELETE" });
      onTodosChange(todos.filter(t => t.id !== todo.id));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menghapus tugas.");
    }
  }

  const priorityConfig = {
    high: { label: "Tinggi", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/25", dot: "bg-rose-400" },
    medium: { label: "Sedang", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25", dot: "bg-amber-400" },
    low: { label: "Rendah", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25", dot: "bg-blue-400" }
  };

  const categoryConfig: Record<string, { label: string; bg: string; color: string }> = {
    rpp: { label: "📚 RPP", bg: "bg-purple-500/10 border-purple-500/20", color: "text-purple-400" },
    grading: { label: "📝 Nilai", bg: "bg-rose-500/10 border-rose-500/20", color: "text-rose-400" },
    teaching: { label: "💻 Mengajar", bg: "bg-cyan-500/10 border-cyan-500/20", color: "text-cyan-400" },
    other: { label: "⚙️ Lainnya", bg: "bg-slate-500/10 border-slate-500/20", color: "text-slate-400" }
  };

  function getDueDateLabel(dueDate: string | null): { label: string; className: string } | null {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffH = diffMs / 3600000;
    if (diffH < 0) return { label: "⚠ Terlambat", className: "text-red-400 font-bold animate-pulse" };
    if (diffH < 24) return { label: "⏰ Hari ini", className: "text-orange-400 font-bold" };
    const diffDays = Math.ceil(diffH / 24);
    return { label: `📅 ${diffDays} hari lagi`, className: "text-slate-400" };
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[995] bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <aside className="todo-panel fixed right-0 top-0 h-full z-[996] w-[340px] max-w-[95vw] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="todo-panel__header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">To-Do List</h2>
              <p className="text-[11px] text-white/60 font-medium">
                {todos.filter(t => !t.isCompleted).length} tugas aktif{overdueCount > 0 && <span className="text-red-400 ml-1">• {overdueCount} terlambat!</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Stats & Progress */}
        <div className="px-5 py-4 border-b border-white/5 bg-white/5 space-y-3">
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold text-white/50 mb-1.5 uppercase tracking-wider">
              <span>Progres Selesai</span>
              <span>{todos.filter(t => t.isCompleted).length} / {todos.length}</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${todos.length > 0 ? (todos.filter(t => t.isCompleted).length / todos.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={loadAiSuggestions}
              disabled={loadingSuggestions}
              className="flex items-center justify-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/35 text-indigo-300 hover:text-indigo-200 text-[10px] font-bold py-2 px-1 rounded-xl transition-all shadow-md active:scale-98"
            >
              <Sparkles className={`w-3 h-3 ${loadingSuggestions ? 'animate-spin' : ''}`} />
              {loadingSuggestions ? 'Analisis...' : 'Saran AI Harian'}
            </button>
            <button
              onClick={() => setShowSemesterGen(true)}
              className="flex items-center justify-center gap-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/35 text-violet-300 hover:text-violet-200 text-[10px] font-bold py-2 px-1 rounded-xl transition-all shadow-md active:scale-98"
            >
              <Calendar className="w-3 h-3 text-violet-400" />
              Program Semester
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="todo-panel__filters px-5 py-3 border-b border-white/5 space-y-2">
          {/* Search Input */}
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
            <Search className="w-4 h-4 text-white/40 shrink-0" />
            <input
              type="text"
              placeholder="Cari tugas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white placeholder-white/40 w-full"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2">
            {/* Status Filter */}
            <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10 flex-1">
              {(["active","done","all"] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`flex-1 text-[9px] font-bold py-1 rounded transition-colors ${filterStatus === s ? 'bg-indigo-500 text-white' : 'text-white/50 hover:text-white/80'}`}>
                  {s === "active" ? "Aktif" : s === "done" ? "Selesai" : "Semua"}
                </button>
              ))}
            </div>
            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-lg text-[10px] text-white/70 px-1.5 py-1 outline-none cursor-pointer"
            >
              <option value="priority">🔥 Prioritas</option>
              <option value="dueDate">📅 Tenggat</option>
              <option value="createdAt">🆕 Terbaru</option>
            </select>
          </div>

          {/* Advanced Dropdowns */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Priority */}
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-lg text-[9px] text-white/70 p-1 outline-none cursor-pointer"
            >
              <option value="all">Prioritas</option>
              <option value="high">🔴 Tinggi</option>
              <option value="medium">🟡 Sedang</option>
              <option value="low">🔵 Rendah</option>
            </select>

            {/* Category */}
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-lg text-[9px] text-white/70 p-1 outline-none cursor-pointer"
            >
              <option value="all">Kategori</option>
              <option value="rpp">📚 RPP</option>
              <option value="grading">📝 Nilai</option>
              <option value="teaching">💻 Mengajar</option>
              <option value="other">⚙️ Lainnya</option>
            </select>

            {/* Class */}
            <select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-[9px] text-white/70 p-1 outline-none cursor-pointer max-w-full truncate"
            >
              <option value="all">Kelas: Semua</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Todo List */}
        <div className="todo-panel__list flex-1 overflow-y-auto">
          {sortedAndFiltered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center px-4">
              <CheckSquare className="w-10 h-10 text-white/15 mb-3" />
              <p className="text-white/40 text-xs font-medium">
                {todos.length === 0 ? "Belum ada tugas. Tambahkan yang pertama!" : "Tidak ada tugas yang cocok."}
              </p>
            </div>
          )}
          {sortedAndFiltered.map(todo => {
            const pc = priorityConfig[todo.priority];
            const cat = categoryConfig[todo.category ?? "other"] || categoryConfig.other;
            const dueMeta = getDueDateLabel(todo.dueDate);
            const targetClass = classes.find(c => c.id === todo.classId);
            return (
              <div key={todo.id} className={`todo-item ${todo.isCompleted ? 'is-done' : ''} ${!todo.isCompleted && todo.dueDate && new Date(todo.dueDate) < now ? 'is-overdue' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleComplete(todo)}
                  className={`todo-item__check ${todo.isCompleted ? 'is-checked' : ''}`}
                  aria-label={todo.isCompleted ? "Tandai belum selesai" : "Tandai selesai"}
                >
                  {todo.isCompleted && <CheckSquare className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold leading-tight ${todo.isCompleted ? 'line-through text-white/35' : 'text-white'}`}>{todo.title}</p>
                  {todo.description && <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed line-clamp-2">{todo.description}</p>}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${pc.bg} ${pc.color}`}>
                      <span className={`w-1 h-1 rounded-full ${pc.dot}`} />
                      {pc.label}
                    </span>
                    <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cat.bg} ${cat.color}`}>
                      {cat.label}
                    </span>
                    {targetClass && (
                      <span className="inline-flex items-center text-[9px] font-medium text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded-full border border-slate-500/20 max-w-[120px] truncate">
                        🏫 {targetClass.name}
                      </span>
                    )}
                    {dueMeta && <span className={`text-[9px] ${dueMeta.className}`}>{dueMeta.label}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => openEditForm(todo)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-indigo-500/30 flex items-center justify-center transition-colors" aria-label="Edit">
                    <Edit3 className="w-3.5 h-3.5 text-white/50 hover:text-indigo-300" />
                  </button>
                  <button onClick={() => deleteTodo(todo)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/30 flex items-center justify-center transition-colors" aria-label="Hapus">
                    <Trash2 className="w-3.5 h-3.5 text-white/50 hover:text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Add Button */}
        <div className="todo-panel__footer">
          <button
            type="button"
            onClick={openAddForm}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white font-bold rounded-xl py-3 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Tambah Tugas Baru
          </button>
        </div>

        {/* AI Suggestions Overlay View */}
        {showAiSuggestions && (
          <div className="absolute inset-0 z-10 flex flex-col bg-[#0f1628]/95 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-white font-black text-base">Rekomendasi AI</h3>
              </div>
              <button onClick={() => setShowAiSuggestions(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-[11px] text-white/60 leading-relaxed">
                Asisten AI menganalisis profil dan modul ajar Anda untuk menyarankan tugas berikut:
              </p>
              {aiSuggestions.length === 0 ? (
                <div className="text-center py-10 text-white/40 text-xs">
                  Semua saran telah ditambahkan atau tidak ada saran baru.
                </div>
              ) : (
                aiSuggestions.map((s, idx) => {
                  const pc = priorityConfig[s.priority as "high"|"medium"|"low"] || priorityConfig.medium;
                  const cat = categoryConfig[s.category] || categoryConfig.other;
                  const targetClass = classes.find(c => c.id === s.classId);
                  return (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 relative group hover:border-indigo-500/30 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-white leading-snug">{s.title}</h4>
                        <button
                          onClick={() => addSuggestedTodo(s)}
                          className="shrink-0 text-[10px] font-black bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg transition-all"
                        >
                          Tambah
                        </button>
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed">{s.description}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${pc.bg} ${pc.color}`}>
                          {pc.label}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cat.bg} ${cat.color}`}>
                          {cat.label}
                        </span>
                        {targetClass && (
                          <span className="text-[9px] font-medium text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded-full border border-slate-500/20">
                            🏫 {targetClass.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showSemesterGen && (
          <div className="absolute inset-0 z-10 flex flex-col bg-[#0f1628]/95 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <h3 className="text-white font-black text-base">Generator Semester</h3>
              </div>
              <button onClick={() => setShowSemesterGen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="flex flex-col gap-4 p-5 flex-1 overflow-y-auto">
              {semesterError ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 animate-pulse">
                  {semesterError}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">Fase *</span>
                  <select
                    value={genFase}
                    onChange={e => {
                      setGenFase(e.target.value as Fase);
                      setGenMapel("");
                      setGenSubOption("");
                      setGenJurusan("");
                    }}
                    className="todo-form-input text-xs cursor-pointer"
                  >
                    <option value="E">Fase E (Kelas X)</option>
                    <option value="F">Fase F (Kelas XI - XII/XIII)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">Mata Pelajaran *</span>
                  <select
                    value={genMapel}
                    onChange={e => {
                      setGenMapel(e.target.value);
                      setGenSubOption("");
                      setGenJurusan("");
                    }}
                    className="todo-form-input text-xs cursor-pointer"
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {availableMapel.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedMapel?.subOptions && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">{selectedMapel.subLabel} *</span>
                  <select
                    value={genSubOption}
                    onChange={e => setGenSubOption(e.target.value)}
                    className="todo-form-input text-xs cursor-pointer"
                  >
                    <option value="">Pilih {selectedMapel.subLabel?.toLowerCase()}</option>
                    {selectedMapel.subOptions.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </label>
              )}

              {selectedMapel?.requiresJurusan && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">{selectedMapel.subLabel} *</span>
                  <select
                    value={genJurusan}
                    onChange={e => setGenJurusan(e.target.value)}
                    className="todo-form-input text-xs cursor-pointer"
                  >
                    <option value="">Pilih jurusan</option>
                    {JURUSAN_SMK.map(j => (
                      <option key={j.value} value={j.value}>{j.label}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">Capaian Pembelajaran (CP) *</span>
                <textarea
                  value={genCp}
                  onChange={e => setGenCp(e.target.value)}
                  placeholder="Pilih fase dan mata pelajaran untuk mengisi CP secara otomatis. Anda tetap dapat mengedit isian ini."
                  rows={5}
                  className="todo-form-input py-2 resize-none text-xs"
                  required
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">Hari Mengajar *</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Senin", val: 1 },
                    { label: "Selasa", val: 2 },
                    { label: "Rabu", val: 3 },
                    { label: "Kamis", val: 4 },
                    { label: "Jumat", val: 5 }
                  ].map(d => {
                    const isSelected = genDays.includes(d.val);
                    return (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setGenDays(genDays.filter(x => x !== d.val));
                          } else {
                            setGenDays([...genDays, d.val].sort());
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                          isSelected
                            ? "bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-500/20"
                            : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">Tanggal Mulai *</span>
                  <input
                    type="date"
                    value={genStartDate}
                    onChange={e => setGenStartDate(e.target.value)}
                    className="todo-form-input text-xs"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">Tanggal Selesai *</span>
                  <input
                    type="date"
                    value={genEndDate}
                    onChange={e => setGenEndDate(e.target.value)}
                    className="todo-form-input text-xs"
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">Maks Pertemuan</span>
                  <input
                    type="number"
                    value={genMaxMeetings}
                    onChange={e => setGenMaxMeetings(e.target.value)}
                    placeholder="Contoh: 16"
                    className="todo-form-input text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">Kelas</span>
                  <select
                    value={genClassId}
                    onChange={e => setGenClassId(e.target.value)}
                    className="todo-form-input text-xs cursor-pointer"
                  >
                    <option value="">(Umum / Tanpa Kelas)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">Semester</span>
                  <select
                    value={genSemester}
                    onChange={e => setGenSemester(e.target.value as any)}
                    className="todo-form-input text-xs cursor-pointer"
                    title="Auto = dari tanggal mulai (Ganjil: Jul-Des, Genap: Jan-Jun)"
                  >
                    <option value="auto">Auto (dari tanggal mulai)</option>
                    <option value="ganjil">Ganjil</option>
                    <option value="genap">Genap</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">Mode</span>
                  <div className="flex items-center gap-2 h-9">
                    <button
                      type="button"
                      onClick={() => setGenUseMaterial(false)}
                      className={`flex-1 h-full text-[10px] font-bold rounded-lg border transition-all ${!genUseMaterial ? "bg-violet-600 border-violet-500 text-white" : "bg-white/5 border-white/10 text-white/60 hover:text-white"}`}
                    >
                      AI CYBRA
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenUseMaterial(true)}
                      className={`flex-1 h-full text-[10px] font-bold rounded-lg border transition-all ${genUseMaterial ? "bg-emerald-600 border-emerald-500 text-white" : "bg-white/5 border-white/10 text-white/60 hover:text-white"}`}
                    >
                      Template Materi
                    </button>
                  </div>
                </label>
              </div>

              <button
                type="button"
                onClick={generateSemesterPlan}
                disabled={loadingSemester || !genCp.trim() || genDays.length === 0}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white font-bold rounded-xl py-3 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loadingSemester ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Sparkles className="w-4 h-4 text-violet-200" />
                )}
                {loadingSemester ? (genUseMaterial ? 'Memuat Template Materi...' : 'Memproses Rencana AI...') : (genUseMaterial ? 'Rencanakan dari Materi' : 'Rencanakan dengan AI')}
              </button>
            </div>
          </div>
        )}

        {showSemesterPreview && (
          <div className="absolute inset-0 z-10 flex flex-col bg-[#0f1628]/95 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-400" />
                <h3 className="text-white font-black text-base">Pratinjau Jadwal</h3>
              </div>
              <button
                onClick={() => {
                  setShowSemesterPreview(false);
                  setShowSemesterGen(true);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-[11px] text-white/60 leading-relaxed">
                Tinjau jadwal materi semester hasil pembagian AI berikut. Anda dapat menyesuaikan secara langsung sebelum menyimpan:
              </p>
              {generatedMeetings.map((m, idx) => {
                const targetClass = classes.find(c => c.id === m.classId);
                const dateLabel = new Date(m.dueDate).toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                });
                return (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 hover:border-violet-500/30 transition-all">
                    <div className="flex flex-col gap-1">
                      <div className="text-[9px] font-black text-violet-400 uppercase tracking-widest">
                        📆 {dateLabel}
                      </div>
                      <input
                        type="text"
                        value={m.title}
                        onChange={e => {
                          const updated = [...generatedMeetings];
                          updated[idx].title = e.target.value;
                          setGeneratedMeetings(updated);
                        }}
                        className="bg-transparent border-none p-0 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-violet-500/50 rounded px-1 -mx-1"
                      />
                    </div>
                    <textarea
                      value={m.description}
                      onChange={e => {
                        const updated = [...generatedMeetings];
                        updated[idx].description = e.target.value;
                        setGeneratedMeetings(updated);
                      }}
                      rows={2}
                      className="bg-transparent border-none p-0 text-[10px] text-white/60 leading-relaxed outline-none focus:ring-1 focus:ring-violet-500/50 rounded px-1 -mx-1 resize-none"
                    />
                    <div className="flex items-center justify-between gap-1.5 mt-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={m.priority}
                          onChange={e => {
                            const updated = [...generatedMeetings];
                            updated[idx].priority = e.target.value;
                            setGeneratedMeetings(updated);
                          }}
                          className="bg-white/5 border border-white/10 rounded text-[9px] text-white/70 p-0.5 outline-none cursor-pointer"
                        >
                          <option value="high">🔴 Tinggi</option>
                          <option value="medium">🟡 Sedang</option>
                          <option value="low">🔵 Rendah</option>
                        </select>
                        <select
                          value={m.category}
                          onChange={e => {
                            const updated = [...generatedMeetings];
                            updated[idx].category = e.target.value;
                            setGeneratedMeetings(updated);
                          }}
                          className="bg-white/5 border border-white/10 rounded text-[9px] text-white/70 p-0.5 outline-none cursor-pointer"
                        >
                          <option value="teaching">💻 Mengajar</option>
                          <option value="rpp">📚 RPP</option>
                          <option value="grading">📝 Nilai</option>
                          <option value="other">⚙️ Lainnya</option>
                        </select>
                      </div>
                      <input
                        type="date"
                        value={m.dueDate}
                        onChange={e => {
                          const updated = [...generatedMeetings];
                          updated[idx].dueDate = e.target.value;
                          setGeneratedMeetings(updated);
                        }}
                        className="bg-white/5 border border-white/10 rounded text-[9px] text-white/70 px-1 py-0.5 outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-5 border-t border-white/10 flex gap-2">
              <button
                onClick={() => {
                  setShowSemesterPreview(false);
                  setShowSemesterGen(true);
                }}
                className="flex-1 md:flex-initial bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl p-2.5 md:px-4 text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={exportToPDF}
                className="flex-1 md:flex-initial bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/30 font-bold rounded-xl p-2.5 md:px-4 text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={applySemesterPlan}
                disabled={loadingSemester}
                className="flex-[3] md:flex-[2] bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white font-bold rounded-xl py-2.5 text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
              >
                {loadingSemester ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {loadingSemester ? 'Menyimpan...' : 'Terapkan ke To-Do List'}
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="absolute inset-0 z-10 flex flex-col bg-[#0f1628]/95 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="text-white font-black text-base">{editingTodo ? "Edit Tugas" : "Tugas Baru"}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <form onSubmit={handleSubmitForm} className="flex flex-col gap-4 p-5 flex-1 overflow-y-auto">
              {formError ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
                  {formError}
                </div>
              ) : null}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Judul Tugas *</span>
                <input
                  autoFocus
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Contoh: Siapkan soal ulangan harian..."
                  className="todo-form-input"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Deskripsi (opsional)</span>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Detail tambahan tentang tugas ini..."
                  rows={2}
                  className="todo-form-input resize-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Category Selection */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Kategori</span>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="todo-form-input appearance-none cursor-pointer"
                  >
                    <option value="other">⚙️ Lainnya</option>
                    <option value="rpp">📚 RPP / Modul</option>
                    <option value="grading">📝 Penilaian</option>
                    <option value="teaching">💻 Pengajaran</option>
                  </select>
                </label>

                {/* Class Association */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Hubungkan Kelas</span>
                  <select
                    value={formClassId}
                    onChange={e => setFormClassId(e.target.value)}
                    className="todo-form-input appearance-none cursor-pointer max-w-full truncate"
                  >
                    <option value="">Tidak ada</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider block mb-2">Prioritas</span>
                <div className="flex gap-2">
                  {(["high","medium","low"] as const).map(p => {
                    const pc = priorityConfig[p];
                    return (
                      <button key={p} type="button" onClick={() => setFormPriority(p)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${formPriority === p ? `${pc.bg} ${pc.color} border-current scale-105 shadow-lg` : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
                      >{pc.label}</button>
                    );
                  })}
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Tenggat Waktu (opsional)</span>
                <input
                  type="datetime-local"
                  value={formDueDate}
                  onChange={e => setFormDueDate(e.target.value)}
                  className="todo-form-input"
                />
              </label>

              <button type="submit" disabled={formBusy || !formTitle.trim()} className="mt-auto bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white font-black rounded-xl py-3 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20">
                {formBusy ? "Menyimpan..." : editingTodo ? "Perbarui Tugas" : "Simpan Tugas"}
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
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
          <div className="grid grid-cols-2 gap-2.5">
            {/* Feri Lee */}
            <div className="flex flex-col justify-between rounded-2xl bg-slate-50 p-3 border border-slate-100 min-h-[100px]">
              <div>
                <p className="text-sm font-bold text-slate-800 leading-tight">Feri Lee</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 leading-snug">UI/UX Designer</p>
              </div>
              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/60">
                <a href="https://t.me/ferilee" target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Telegram @ferilee">
                  <Send className="h-3.5 w-3.5" />
                </a>
                <a href="https://ferilee.gurumuda.eu.org/" target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Website Feri Lee">
                  <Globe className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Gunanto */}
            <div className="flex flex-col justify-between rounded-2xl bg-slate-50 p-3 border border-slate-100 min-h-[100px]">
              <div>
                <p className="text-sm font-bold text-slate-800 leading-tight">Gunanto</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 leading-snug">Full Stack Vibe Coder</p>
              </div>
              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/60">
                <a href="https://t.me/pg957" target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 transition-colors" title="Telegram @pg957">
                  <Send className="h-3.5 w-3.5" />
                </a>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-300 cursor-not-allowed" title="Website (Belum Tersedia)">
                  <Globe className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            {/* Aan Triono */}
            <div className="flex flex-col justify-between rounded-2xl bg-slate-50 p-3 border border-slate-100 min-h-[100px]">
              <div>
                <p className="text-sm font-bold text-slate-800 leading-tight">Aan Triono</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 leading-snug">Idea & Marketing</p>
              </div>
              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/60">
                <a href="https://t.me/aantriono" target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-purple-100 hover:text-purple-600 transition-colors" title="Telegram @aantriono">
                  <Send className="h-3.5 w-3.5" />
                </a>
                <a href="https://www.aantriono.com" target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-purple-100 hover:text-purple-600 transition-colors" title="Website Aan Triono">
                  <Globe className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Bang Hasan */}
            <div className="flex flex-col justify-between rounded-2xl bg-slate-50 p-3 border border-slate-100 min-h-[100px]">
              <div>
                <p className="text-sm font-bold text-slate-800 leading-tight">Bang Hasan</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 leading-snug">Coach</p>
              </div>
              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/60">
                <a href="https://t.me/hasanudinhs" target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-amber-100 hover:text-amber-600 transition-colors" title="Telegram @hasanudinhs">
                  <Send className="h-3.5 w-3.5" />
                </a>
                <a href="https://banghasan.com" target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-amber-100 hover:text-amber-600 transition-colors" title="Website Bang Hasan">
                  <Globe className="h-3.5 w-3.5" />
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
  materialForm: { classId: string; title: string; type: TeacherMaterial["type"]; description: string; content: string; dueDate: string; level: string };
  questForm: { classId: string; materialId: string; title: string; mission: string; points: string; dueDate: string; level: string };
  busy: boolean;
  error: string | null;
  editingMaterialId?: string | null;
  editingQuestId?: string | null;
  onMaterialFormChange: React.Dispatch<React.SetStateAction<{ classId: string; title: string; type: TeacherMaterial["type"]; description: string; content: string; dueDate: string; level: string }>>;
  onQuestFormChange: React.Dispatch<React.SetStateAction<{ classId: string; materialId: string; title: string; mission: string; points: string; dueDate: string; level: string }>>;
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
  const [showCreator, setShowCreator] = React.useState(false);
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

      const data = await api<any>("/api/teacher/generate-ai", {
        method: "POST",
        body: JSON.stringify({ prompt })
      });

      if (data && data.reply) {
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
      const prompt = `Bertindaklah sebagai perancang game edukasi. Buatkan detail quest/petualangan belajar yang epik, kreatif, dan menantang untuk topik pembelajaran: "${questForm.title}".
Format balasan harus menggunakan pola berikut secara persis:

Judul: [Tulis judul di sini, tambahkan emoji pembuka yang seru dan relevan di depannya, contoh: 🗝️ Membuka Gerbang Aljabar Linear]
Poin: [Tulis angka koin reward di sini saja sesuai tingkat kesulitan, contoh: 100 atau 150]
Misi:
[Deskripsi cerita/narasi misi yang memotivasi siswa untuk belajar/menyelesaikan tugas, contoh: "Kunci gerbang kastil angka telah hilang! Gerbang ini hanya bisa dibuka dengan memecahkan kode rahasia yang menggunakan variabel X dan Y."]

Langkah Petualangan:
- [Langkah 1, contoh: Pelajari metode Eliminasi & Substitusi pada lampiran materi.]
- [Langkah 2, contoh: Kerjakan 3 soal latihan pemanasan di buku tulismu.]
- [Langkah 3, contoh: Selesaikan kuis "Gerbang SPLDV" dengan nilai minimal 80 untuk mendapatkan kunci gerbangnya!]`;

      const data = await api<any>("/api/teacher/generate-ai", {
        method: "POST",
        body: JSON.stringify({ prompt })
      });

      if (data && data.reply) {
        let content = data.reply;
        const titleMatch = content.match(/Judul:\s*([^\n]+)/i);
        const pointsMatch = content.match(/Poin:\s*(\d+)/i);
        const missionMatch = content.match(/Misi:\s*([\s\S]+)/i);

        if (titleMatch && missionMatch) {
          onQuestFormChange((current) => ({
            ...current,
            title: titleMatch[1].trim().replace(/["*]/g, ''),
            mission: missionMatch[1].trim(),
            points: pointsMatch ? pointsMatch[1].trim() : current.points
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
  const [bankTab, setBankTab] = React.useState<"package" | "material" | "quest" | "rpp">("package");
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const [bankItems, setBankItems] = React.useState<{ materials: any[]; quests: any[]; lessonPlans: any[] }>({ materials: [], quests: [], lessonPlans: [] });
  const [libraryItems, setLibraryItems] = React.useState<{ packages: any[]; materials: any[]; quests: any[] }>({ packages: [], materials: [], quests: [] });
  const [selectedLibrarySubject, setSelectedLibrarySubject] = React.useState<string | null>(null);
  const [showLibrarySearch, setShowLibrarySearch] = React.useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = React.useState("");
  const [selectedLibraryPackage, setSelectedLibraryPackage] = React.useState<any | null>(null);
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

  const loadLibrary = async () => {
    try {
      const data = await api<{ packages: any[]; materials: any[]; quests: any[] }>("/api/teacher/library");
      setLibraryItems(data);
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
    loadLibrary();
  }, []);

  React.useEffect(() => {
    if (showBankModal) {
      loadBankPublic();
      loadLibrary();
    }
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

  const adoptLibraryItem = async (kind: "package" | "quest", id: string) => {
    const classId = requestTargetClass[`library-${id}`];
    if (!classId) {
      showToast("Pilih kelas tujuan terlebih dahulu.");
      return;
    }
    try {
      const path = kind === "package" ? `/api/teacher/library/packages/${id}/adopt` : `/api/teacher/library/quests/${id}/adopt`;
      await api(path, { method: "POST", body: JSON.stringify({ targetClassId: classId }) });
      showToast(kind === "package" ? "Paket pembelajaran siap digunakan di kelas Anda." : "IdeQuest siap digunakan di kelas Anda.");
      setShowBankModal(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menggunakan konten pembelajaran.");
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
  const librarySubjects = Array.from(new Set(libraryItems.packages.map((item) => item.subject || "Umum")));
  const subjectCards = librarySubjects.map((subject) => {
    const packages = libraryItems.packages.filter((item) => (item.subject || "Umum") === subject);
    return {
      subject,
      packages,
      materialCount: packages.length,
      questCount: packages.reduce((total, item) => total + item.quests.length, 0),
      grades: Array.from(new Set(packages.map((item) => item.grade).filter(Boolean)))
    };
  });
  const visiblePackages = selectedLibrarySubject
    ? libraryItems.packages.filter((item) => (item.subject || "Umum") === selectedLibrarySubject)
    : [];
  const librarySearchResults = libraryItems.packages.filter((item) => {
    const query = librarySearchQuery.trim().toLowerCase();
    return Boolean(query) && (!selectedLibrarySubject || (item.subject || "Umum") === selectedLibrarySubject) && [item.title, item.subject, item.material.description, item.contributorName].some((value) => String(value || "").toLowerCase().includes(query));
  });

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <section className="teacher-studio-manager">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Paket Pembelajaran</h2>
          <p className="text-sm text-white/80">Pilih paket, gunakan di kelas, fokus mengajar.</p>
        </div>
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
          <button type="button" onClick={() => setShowCreator((current) => !current)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-sm hover:shadow text-sm transition-all hover:scale-105">
            <BookOpen className="h-4 w-4" />
            {showCreator ? "Tutup Studio" : "Buat Konten Sendiri"}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[rgba(125,211,252,0.28)] bg-[rgba(5,29,83,0.58)] p-4 shadow-lg shadow-blue-950/20">
        {selectedLibrarySubject === null ? (
          <>
            <div className="mb-4"><h3 className="font-bold text-white">Pilih mata pelajaran</h3><p className="text-sm text-[rgba(226,245,255,0.76)]">Paket disusun oleh kontributor dan siap dipakai di kelas Anda.</p></div>
            {subjectCards.length === 0 ? <p className="py-8 text-center text-sm text-[rgba(226,245,255,0.76)]">Belum ada paket pembelajaran terkurasi.</p> : (
              <div className="grid gap-3 md:grid-cols-2">
                {subjectCards.map((card) => (
                  <button key={card.subject} type="button" onClick={() => setSelectedLibrarySubject(card.subject)} className="rounded-xl border border-[rgba(125,211,252,0.24)] bg-[rgba(12,52,121,0.52)] p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-300/70 hover:bg-[rgba(20,80,165,0.60)] hover:shadow-lg hover:shadow-blue-950/30">
                    <div className="mb-3 flex items-start justify-between gap-2"><strong className="text-base text-white">{card.subject}</strong><span className="rounded-full border border-sky-300/30 bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold text-sky-200">{card.packages.length} paket</span></div>
                    <div className="grid grid-cols-2 gap-2 text-xs"><span className="rounded-lg border border-white/10 bg-[rgba(5,29,83,0.48)] p-2 text-[rgba(226,245,255,0.76)]"><b className="block text-sm text-white">{card.materialCount}</b>materi</span><span className="rounded-lg border border-white/10 bg-[rgba(5,29,83,0.48)] p-2 text-[rgba(226,245,255,0.76)]"><b className="block text-sm text-white">{card.questCount}</b>IdeQuest</span></div>
                    <p className="mt-3 text-xs text-[rgba(226,245,255,0.66)]">{card.grades.length ? `Kelas ${card.grades.join(", ")}` : "Beragam jenjang"}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div><button type="button" onClick={() => { setSelectedLibrarySubject(null); setShowLibrarySearch(false); setLibrarySearchQuery(""); }} className="text-xs font-bold text-sky-300 hover:text-white">← Semua mata pelajaran</button><h3 className="mt-1 font-bold text-white">{selectedLibrarySubject}</h3></div>
            <div className="mx-auto flex min-h-[310px] max-w-xl flex-col items-center justify-center py-8 text-center">
              <div className="mb-5 rounded-full border border-sky-300/25 bg-sky-400/10 p-4 text-sky-200"><Search className="h-7 w-7" /></div>
              <h4 className="text-xl font-bold text-white">Cari materi {selectedLibrarySubject}</h4>
              <p className="mt-2 max-w-sm text-sm text-[rgba(226,245,255,0.72)]">Temukan paket pembelajaran yang siap digunakan di kelas Anda.</p>
              {!showLibrarySearch ? (
                <button type="button" onClick={() => setShowLibrarySearch(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-sky-300/35 bg-sky-400/15 px-5 py-3 text-sm font-bold text-sky-100 transition hover:bg-sky-400/25"><Search className="h-4 w-4" />Cari materi</button>
              ) : (
                <div className="relative mt-6 w-full text-left">
                  <Search className="absolute left-4 top-4 h-5 w-5 text-sky-200" />
                  <input autoFocus value={librarySearchQuery} onChange={(event) => setLibrarySearchQuery(event.target.value)} placeholder={`Cari materi ${selectedLibrarySubject}...`} className="w-full rounded-xl border border-sky-300/35 bg-[rgba(5,29,83,0.62)] py-3.5 pl-12 pr-10 text-sm text-white placeholder:text-white/45 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/20" />
                  <button type="button" onClick={() => { setShowLibrarySearch(false); setLibrarySearchQuery(""); }} className="absolute right-3 top-2.5 rounded-full p-1.5 text-white/55 hover:bg-white/10 hover:text-white" aria-label="Tutup pencarian"><X className="h-4 w-4" /></button>
                  {librarySearchQuery.trim() && <div className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-sky-300/25 bg-[#08235f] p-1.5 shadow-2xl">
                    {librarySearchResults.length === 0 ? <p className="p-4 text-center text-sm text-white/65">Materi tidak ditemukan.</p> : librarySearchResults.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedLibraryPackage(item); setShowLibrarySearch(false); setLibrarySearchQuery(""); }} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-sky-400/15"><strong className="block text-sm text-white">{item.title}</strong><span className="mt-0.5 block text-xs text-sky-200">{item.grade ? `Kelas ${item.grade}` : "Beragam jenjang"} · {item.quests.length} IdeQuest</span></button>)}
                  </div>}
                </div>
              )}
              <p className="mt-5 text-xs text-white/55">{visiblePackages.length} paket tersedia</p>
            </div>
          </>
        )}
      </div>

      {showCreator && <>
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
        <div className="teacher-studio-form__grid mt-2">
          <label>
            <span>Pertemuan / Level</span>
            <input
              type="number"
              min="1"
              value={materialForm.level || "1"}
              onChange={(event) => onMaterialFormChange((current) => ({ ...current, level: event.target.value }))}
            />
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
        <div className="teacher-studio-form__grid mt-2">
          <label>
            <span>Pertemuan / Level</span>
            <input
              type="number"
              min="1"
              value={questForm.level || "1"}
              onChange={(event) => onQuestFormChange((current) => ({ ...current, level: event.target.value }))}
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

      </>}

      {showCreator && <div id="tour-step-3" className="teacher-studio-board">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="!mb-0">Materi Terbit</h3>
            <button type="button" onClick={() => { setIsSearchModalOpen(true); setSearchFilter("material"); }} className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Cari Materi Terbit">
              <Search className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
            {materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 bg-[rgba(5,29,83,0.42)] rounded-xl border border-dashed border-[rgba(226,245,255,0.4)] text-center">
                <div className="w-12 h-12 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-white font-semibold mb-1">Belum Ada Materi</h4>
                <p className="text-xs text-[rgba(226,245,255,0.76)] max-w-[200px] mb-3">Bagikan modul atau referensi bacaan untuk kelas Anda.</p>
                <button type="button" onClick={() => setActiveTab("material")} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-full transition-colors border-0">Buat Sekarang</button>
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
              <div className="flex flex-col items-center justify-center py-8 px-4 bg-[rgba(5,29,83,0.42)] rounded-xl border border-dashed border-[rgba(226,245,255,0.4)] text-center">
                <div className="w-12 h-12 bg-orange-500/20 text-orange-300 border border-orange-400/30 rounded-full flex items-center justify-center mb-3">
                  <Target className="w-6 h-6" />
                </div>
                <h4 className="text-white font-semibold mb-1">Belum Ada IdeQuest</h4>
                <p className="text-xs text-[rgba(226,245,255,0.76)] max-w-[200px] mb-3">Buat misi seru berhadiah poin untuk memotivasi murid.</p>
                <button type="button" onClick={() => setActiveTab("quest")} className="text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 px-3 py-1.5 rounded-full transition-colors border-0">Buat Sekarang</button>
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
      </div>}
      {selectedLibraryPackage && (
        <div className="fixed inset-0 z-[102] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(125,211,252,0.28)] bg-[#08235f] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-sky-200">{selectedLibraryPackage.subject || "Umum"}{selectedLibraryPackage.grade ? ` · Kelas ${selectedLibraryPackage.grade}` : ""}</p><h3 className="mt-1 text-lg font-bold text-white">{selectedLibraryPackage.title}</h3></div><button type="button" onClick={() => setSelectedLibraryPackage(null)} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Tutup"><X className="h-5 w-5" /></button></div>
            <p className="mt-3 text-sm text-[rgba(226,245,255,0.78)]">{selectedLibraryPackage.material.description || "Paket pembelajaran siap digunakan."}</p>
            <p className="mt-3 text-xs text-white/60">Kontributor: {selectedLibraryPackage.contributorName} · {selectedLibraryPackage.quests.length} IdeQuest</p>
            <select className="mt-5 w-full rounded-lg border border-sky-300/25 bg-[rgba(5,29,83,0.55)] p-2.5 text-sm text-white" value={requestTargetClass[`library-${selectedLibraryPackage.id}`] || ""} onChange={(event) => setRequestTargetClass((current) => ({ ...current, [`library-${selectedLibraryPackage.id}`]: event.target.value }))}><option value="">Pilih kelas tujuan</option>{classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}</select>
            <button type="button" onClick={() => { adoptLibraryItem("package", selectedLibraryPackage.id); setSelectedLibraryPackage(null); }} className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Gunakan untuk Kelas Saya</button>
          </div>
        </div>
      )}
      {showLibrarySearch && !selectedLibrarySubject && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[rgba(125,211,252,0.28)] bg-[#08235f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div><h3 className="font-bold text-white">Cari paket pembelajaran</h3><p className="text-xs text-[rgba(226,245,255,0.72)]">Cari berdasarkan topik, mapel, atau kontributor.</p></div>
              <button type="button" onClick={() => { setShowLibrarySearch(false); setLibrarySearchQuery(""); }} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-200" /><input autoFocus value={librarySearchQuery} onChange={(event) => setLibrarySearchQuery(event.target.value)} placeholder="Contoh: stoikiometri, kelas 11…" className="w-full rounded-xl border border-sky-300/25 bg-[rgba(5,29,83,0.55)] py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-sky-300" /></div>
              <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
                {librarySearchResults.length === 0 ? <p className="py-8 text-center text-sm text-white/65">Paket tidak ditemukan.</p> : librarySearchResults.map((item) => (
                  <button key={item.id} type="button" onClick={() => { setSelectedLibrarySubject(item.subject || "Umum"); setShowLibrarySearch(false); setLibrarySearchQuery(""); }} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-sky-400/10 hover:border-sky-300/30">
                    <strong className="block text-sm text-white">{item.title}</strong><span className="mt-1 block text-xs text-sky-200">{item.subject || "Umum"}{item.grade ? ` · Kelas ${item.grade}` : ""} · {item.quests.length} quest</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="teacher-profile-card border-0 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0">
                <Search className="h-5 w-5 text-amber-400" />
                Cari Materi & IdeQuest
              </h3>
              <button type="button" className="text-[rgba(226,245,255,0.76)] hover:text-white bg-[rgba(5,29,83,0.42)] hover:bg-[rgba(5,29,83,0.6)] rounded-full p-1.5 transition-colors shadow-sm" onClick={() => { setIsSearchModalOpen(false); setSearchQuery(""); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[rgba(226,245,255,0.76)]" />
                <input
                  type="text"
                  placeholder="Ketik kata kunci pencarian..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[rgba(5,29,83,0.42)] border border-[rgba(125,211,252,0.22)] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all text-white placeholder-[rgba(226,245,255,0.5)]"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setSearchFilter("all")} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors border ${searchFilter === "all" ? "bg-amber-400/20 text-amber-300 border-amber-400/30" : "bg-[rgba(5,29,83,0.42)] text-[rgba(226,245,255,0.76)] border-[rgba(125,211,252,0.22)] hover:bg-[rgba(5,29,83,0.6)]"}`}>Semua</button>
                <button type="button" onClick={() => setSearchFilter("material")} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors border ${searchFilter === "material" ? "bg-amber-400/20 text-amber-300 border-amber-400/30" : "bg-[rgba(5,29,83,0.42)] text-[rgba(226,245,255,0.76)] border-[rgba(125,211,252,0.22)] hover:bg-[rgba(5,29,83,0.6)]"}`}>Materi</button>
                <button type="button" onClick={() => setSearchFilter("quest")} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors border ${searchFilter === "quest" ? "bg-amber-400/20 text-amber-300 border-amber-400/30" : "bg-[rgba(5,29,83,0.42)] text-[rgba(226,245,255,0.76)] border-[rgba(125,211,252,0.22)] hover:bg-[rgba(5,29,83,0.6)]"}`}>IdeQuest</button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1 max-h-[400px]">
              {searchQuery.trim() === "" ? (
                <div className="text-center py-10 text-[rgba(226,245,255,0.6)]">
                  <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>Ketik sesuatu untuk mulai mencari</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 teacher-studio-board-search">
                  {(searchFilter === "all" || searchFilter === "material") && materials.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.type.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                    <article key={`search-m-${item.id}`} className="flex flex-col shrink-0 min-h-[96px] group relative p-3 bg-[rgba(5,29,83,0.42)] rounded-lg border border-[rgba(125,211,252,0.22)] shadow-sm hover:border-amber-400/50 transition-all">
                      <div className="flex flex-col my-auto">
                        <strong className="leading-tight text-white">{item.title}</strong>
                        <span className="text-[11px] text-[rgba(226,245,255,0.76)] mt-0.5">{item.type} - {classes.find((kelas) => kelas.id === item.classId)?.name ?? "Kelas"}</span>
                      </div>
                      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                        <div className="overflow-hidden min-h-0">
                          <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t border-[rgba(125,211,252,0.22)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                            <button type="button" onClick={async () => { try { await api("/api/teacher/bank-submit", { method: "POST", body: JSON.stringify({ type: "material", id: item.id }) }); showToast("Materi ini akan ditinjau oleh tim IdeTech."); } catch (err) { showToast(err instanceof Error ? err.message : "Gagal mengirim ke bank."); } }} className="p-1.5 text-[rgba(226,245,255,0.76)] hover:text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors" title="Kirim ke Bank Materi"><Upload className="h-4 w-4" /></button>
                            {onEditMaterial && <button type="button" onClick={() => { setIsSearchModalOpen(false); onEditMaterial(item); }} className="p-1.5 text-[rgba(226,245,255,0.76)] hover:text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors" title="Edit Materi"><Pencil className="h-4 w-4" /></button>}
                            {onDeleteMaterial && <button type="button" onClick={() => onDeleteMaterial(item.id)} className="p-1.5 text-[rgba(226,245,255,0.76)] hover:text-rose-400 hover:bg-rose-500/20 rounded-md transition-colors" title="Hapus Materi"><Trash2 className="h-4 w-4" /></button>}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {(searchFilter === "all" || searchFilter === "quest") && quests.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                    <article key={`search-q-${item.id}`} className="flex flex-col shrink-0 min-h-[96px] group relative p-3 bg-[rgba(5,29,83,0.42)] rounded-lg border border-[rgba(125,211,252,0.22)] shadow-sm hover:border-amber-400/50 transition-all">
                      <div className="flex flex-col my-auto">
                        <strong className="leading-tight text-white">{item.title}</strong>
                        <span className="text-[11px] text-[rgba(226,245,255,0.76)] mt-0.5">{item.points} poin - {item.dueDate}</span>
                      </div>
                      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                        <div className="overflow-hidden min-h-0">
                          <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t border-[rgba(125,211,252,0.22)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                            <button type="button" onClick={async () => { try { await api("/api/teacher/bank-submit", { method: "POST", body: JSON.stringify({ type: "quest", id: item.id }) }); showToast("IdeQuest ini akan ditinjau oleh tim IdeTech."); } catch (err) { showToast(err instanceof Error ? err.message : "Gagal mengirim ke bank."); } }} className="p-1.5 text-[rgba(226,245,255,0.76)] hover:text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors" title="Kirim ke Bank IdeQuest"><Upload className="h-4 w-4" /></button>
                            {onEditQuest && <button type="button" onClick={() => { setIsSearchModalOpen(false); onEditQuest(item); }} className="p-1.5 text-[rgba(226,245,255,0.76)] hover:text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors" title="Edit IdeQuest"><Pencil className="h-4 w-4" /></button>}
                            {onDeleteQuest && <button type="button" onClick={() => onDeleteQuest(item.id)} className="p-1.5 text-[rgba(226,245,255,0.76)] hover:text-rose-400 hover:bg-rose-500/20 rounded-md transition-colors" title="Hapus IdeQuest"><Trash2 className="h-4 w-4" /></button>}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {((searchFilter === "all" && materials.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.type.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && quests.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) ||
                    (searchFilter === "material" && materials.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.type.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) ||
                    (searchFilter === "quest" && quests.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0)) && (
                     <div className="text-center py-8 text-[rgba(226,245,255,0.6)]">
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
          <div className="teacher-profile-card border-0 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-400" />
                Perpustakaan Pembelajaran
              </h3>
              <button type="button" onClick={() => setShowBankModal(false)} className="text-[rgba(226,245,255,0.76)] hover:text-white transition-colors p-1 rounded-md hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex border-b border-white/10">
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${bankTab === 'package' ? 'border-amber-400 text-amber-400' : 'border-transparent text-[rgba(226,245,255,0.76)] hover:text-white hover:bg-white/5'}`}
                onClick={() => setBankTab('package')}
              >
                Paket Siap Pakai
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${bankTab === 'material' ? 'border-amber-400 text-amber-400' : 'border-transparent text-[rgba(226,245,255,0.76)] hover:text-white hover:bg-white/5'}`}
                onClick={() => setBankTab('material')}
              >
                Bank Materi
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${bankTab === 'quest' ? 'border-amber-400 text-amber-400' : 'border-transparent text-[rgba(226,245,255,0.76)] hover:text-white hover:bg-white/5'}`}
                onClick={() => setBankTab('quest')}
              >
                Bank IdeQuest
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${bankTab === 'rpp' ? 'border-amber-400 text-amber-400' : 'border-transparent text-[rgba(226,245,255,0.76)] hover:text-white hover:bg-white/5'}`}
                onClick={() => setBankTab('rpp')}
              >
                Bank RPP (AI)
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {bankTab === 'package' ? (
                libraryItems.packages.length === 0 ? (
                  <div className="text-center p-8 text-[rgba(226,245,255,0.76)] bg-[rgba(5,29,83,0.42)] rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm">Belum ada paket pembelajaran terkurasi.</div>
                ) : (
                  libraryItems.packages.map(item => (
                    <div key={item.id} className="bg-[rgba(5,29,83,0.42)] p-4 rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-[rgba(5,29,83,0.6)] transition-colors">
                      <div>
                        <div className="flex items-center gap-2"><h4 className="font-bold text-white">{item.title}</h4><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">{item.quests.length} IdeQuest</span></div>
                        <p className="text-xs text-[rgba(226,245,255,0.76)] mt-1">Kontributor: {item.contributorName} • {item.material.type}</p>
                        <p className="text-sm text-[rgba(226,245,255,0.86)] mt-2 line-clamp-2">{item.material.description}</p>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <select className="text-xs font-medium text-white border border-[rgba(125,211,252,0.22)] rounded p-1.5 w-full bg-[#0a1f5c] shadow-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none" value={requestTargetClass[`library-${item.id}`] || ""} onChange={(e) => setRequestTargetClass(prev => ({ ...prev, [`library-${item.id}`]: e.target.value }))}>
                          <option value="">-- Pilih Kelas Tujuan --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button type="button" onClick={() => adoptLibraryItem("package", item.id)} className="w-full text-xs py-1.5 px-3 rounded border border-emerald-400/50 bg-emerald-400/20 text-emerald-300 font-bold hover:bg-emerald-400/30 transition-colors shadow-sm">Gunakan untuk Kelas Saya</button>
                      </div>
                    </div>
                  ))
                )
              ) : bankTab === 'material' ? (
                bankItems.materials.length === 0 ? (
                  <div className="text-center p-8 text-[rgba(226,245,255,0.76)] bg-[rgba(5,29,83,0.42)] rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm">Belum ada materi di bank.</div>
                ) : (
                  bankItems.materials.map(item => (
                    <div key={item.id} className="bg-[rgba(5,29,83,0.42)] p-4 rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-[rgba(5,29,83,0.6)] transition-colors">
                      <div>
                        <h4 className="font-bold text-white">{item.title}</h4>
                        <p className="text-xs text-[rgba(226,245,255,0.76)] mt-1">Oleh: {item.teacherName} • Tipe: {item.type}</p>
                        <p className="text-sm text-[rgba(226,245,255,0.86)] mt-2 line-clamp-2">{item.description}</p>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <select
                          className="text-xs font-medium text-white border border-[rgba(125,211,252,0.22)] rounded p-1.5 w-full bg-[#0a1f5c] shadow-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                          value={requestTargetClass[`library-${item.id}`] || ""}
                          onChange={(e) => setRequestTargetClass(prev => ({...prev, [`library-${item.id}`]: e.target.value}))}
                        >
                          <option value="">-- Pilih Kelas Tujuan --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button type="button" onClick={() => adoptLibraryItem("package", item.id)} className="w-full text-xs py-1.5 px-3 rounded border border-emerald-400/50 bg-emerald-400/20 text-emerald-300 font-bold hover:bg-emerald-400/30 transition-colors shadow-sm">Gunakan untuk Kelas Saya</button>
                      </div>
                    </div>
                  ))
                )
              ) : bankTab === 'quest' ? (
                libraryItems.quests.length === 0 ? (
                  <div className="text-center p-8 text-[rgba(226,245,255,0.76)] bg-[rgba(5,29,83,0.42)] rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm">Belum ada IdeQuest mandiri di perpustakaan.</div>
                ) : (
                  libraryItems.quests.map(item => (
                    <div key={item.id} className="bg-[rgba(5,29,83,0.42)] p-4 rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-[rgba(5,29,83,0.6)] transition-colors">
                      <div>
                        <h4 className="font-bold text-white">{item.title}</h4>
                        <p className="text-xs text-[rgba(226,245,255,0.76)] mt-1">Oleh: {item.teacherName} • Poin: {item.points}</p>
                        <p className="text-sm text-[rgba(226,245,255,0.86)] mt-2 line-clamp-2">{item.mission}</p>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <select
                          className="text-xs font-medium text-white border border-[rgba(125,211,252,0.22)] rounded p-1.5 w-full bg-[#0a1f5c] shadow-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                          value={requestTargetClass[`library-${item.id}`] || ""}
                          onChange={(e) => setRequestTargetClass(prev => ({...prev, [`library-${item.id}`]: e.target.value}))}
                        >
                          <option value="">-- Pilih Kelas Tujuan --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button type="button" onClick={() => adoptLibraryItem("quest", item.id)} className="w-full text-xs py-1.5 px-3 rounded border border-emerald-400/50 bg-emerald-400/20 text-emerald-300 font-bold hover:bg-emerald-400/30 transition-colors shadow-sm">Gunakan untuk Kelas Saya</button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                bankItems.lessonPlans?.length === 0 ? (
                  <div className="text-center p-8 text-[rgba(226,245,255,0.76)] bg-[rgba(5,29,83,0.42)] rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm">Belum ada RPP di bank.</div>
                ) : (
                  bankItems.lessonPlans?.map(item => (
                    <div key={item.id} className="bg-[rgba(5,29,83,0.42)] p-4 rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-[rgba(5,29,83,0.6)] transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white">{item.topic}</h4>
                          <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-400/30">Kelas {item.grade}</span>
                        </div>
                        <p className="text-xs text-[rgba(226,245,255,0.76)] mt-1">Oleh: {item.teacherName} • {item.duration} • {item.model}</p>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <button type="button" onClick={() => {
                          navigator.clipboard.writeText(item.content);
                          alert('Isi RPP disalin ke clipboard!');
                        }} className="w-full text-xs py-1.5 px-3 rounded border border-blue-400/50 bg-blue-500/20 text-blue-300 font-bold hover:bg-blue-500/30 transition-colors shadow-sm">Salin Isi RPP</button>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end">
              <button type="button" onClick={() => setShowBankModal(false)} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-sm transition-colors border border-white/10">
                Tutup Bank
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="teacher-profile-card border-0 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-400" />
                Permintaan Bank IdeTech
              </h3>
              <button type="button" onClick={() => setShowRequestsModal(false)} className="text-[rgba(226,245,255,0.76)] hover:text-white transition-colors p-1 rounded-md hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <h4 className="font-bold text-white mb-3 border-b border-white/10 pb-2 flex items-center justify-between">
                  Permintaan Masuk
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{bankRequests.incoming.length}</span>
                </h4>
                {bankRequests.incoming.length === 0 ? (
                  <p className="text-sm text-[rgba(226,245,255,0.76)] italic">Belum ada permintaan masuk dari guru lain.</p>
                ) : (
                  <div className="space-y-3">
                    {bankRequests.incoming.map(req => (
                      <div key={req.id} className="bg-[rgba(5,29,83,0.42)] p-3 rounded-lg border border-[rgba(125,211,252,0.22)] shadow-sm text-sm hover:bg-[rgba(5,29,83,0.6)] transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-semibold text-white">{req.requesterName}</span> meminta izin untuk menggunakan <span className="font-semibold text-amber-400">{req.itemTitle}</span> ({req.itemType})
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${req.status === 'pending' ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : req.status === 'approved' ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30' : 'bg-rose-400/20 text-rose-400 border border-rose-400/30'}`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="text-xs text-[rgba(226,245,255,0.76)] mb-3">Tujuan: Kelas ID {req.targetClassId} • Dikirim: {new Date(req.createdAt).toLocaleDateString()}</div>
                        {req.status === 'pending' && (
                          <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-[rgba(125,211,252,0.22)]">
                            <button type="button" onClick={() => processBankRequest(req.id, "approved")} className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/50 rounded shadow-sm transition-colors"><CheckCircle2 className="w-3.5 h-3.5 mr-1 inline"/> Izinkan</button>
                            <button type="button" onClick={() => processBankRequest(req.id, "rejected")} className="px-3 py-1.5 text-xs bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/50 rounded shadow-sm transition-colors"><X className="w-3.5 h-3.5 mr-1 inline"/> Tolak</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-white mb-3 border-b border-white/10 pb-2 flex items-center justify-between">
                  Permintaan Keluar
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{bankRequests.outgoing.length}</span>
                </h4>
                {bankRequests.outgoing.length === 0 ? (
                  <p className="text-sm text-[rgba(226,245,255,0.76)] italic">Anda belum pernah meminta izin materi guru lain.</p>
                ) : (
                  <div className="space-y-3">
                    {bankRequests.outgoing.map(req => (
                      <div key={req.id} className="bg-[rgba(5,29,83,0.42)] p-3 rounded-lg border border-[rgba(125,211,252,0.22)] shadow-sm text-sm hover:bg-[rgba(5,29,83,0.6)] transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            Anda meminta izin kepada <span className="font-semibold text-white">{req.ownerName}</span> untuk menggunakan <span className="font-semibold text-amber-400">{req.itemTitle}</span> ({req.itemType})
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${req.status === 'pending' ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : req.status === 'approved' ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30' : 'bg-rose-400/20 text-rose-400 border border-rose-400/30'}`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="text-xs text-[rgba(226,245,255,0.76)] mt-1">Tujuan: Kelas ID {req.targetClassId} • Dikirim: {new Date(req.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end">
              <button type="button" onClick={() => setShowRequestsModal(false)} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-sm transition-colors border border-white/10">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0a1f5c] border border-[rgba(125,211,252,0.3)] shadow-[0_0_20px_rgba(125,211,252,0.25)] text-white px-6 py-3.5 rounded-full z-[100] text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-6">
          <CheckCircle2 className="w-5 h-5 text-amber-400" />
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
  onCreate,
  onUpdateUnlockedLevel
}: {
  classes: TeacherClass[];
  summary: TeacherClassSummary | null;
  form: { name: string; subject: string; grade: string; students: string };
  busy: boolean;
  error: string | null;
  onFormChange: React.Dispatch<React.SetStateAction<{ name: string; subject: string; grade: string; students: string }>>;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdateUnlockedLevel: (classId: string, level: number) => void;
}) {
  const [managingClass, setManagingClass] = useState<TeacherClass | null>(null);
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
                  <div className="teacher-class-card__meta flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded border border-white/20 text-[10px] text-white">
                      <span>Lvl {item.unlockedLevel ?? 1}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateUnlockedLevel(item.id, Math.max(1, (item.unlockedLevel ?? 1) - 1));
                        }}
                        disabled={busy}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded w-3.5 h-3.5 flex items-center justify-center font-black transition-colors ml-1"
                      >-</button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateUnlockedLevel(item.id, (item.unlockedLevel ?? 1) + 1);
                        }}
                        disabled={busy}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded w-3.5 h-3.5 flex items-center justify-center font-black transition-colors"
                      >+</button>
                    </div>
                    <b>{item.progress}%</b>
                    <span className="text-[10px] text-white/60">{item.students} siswa</span>
                    <button type="button" onClick={() => setManagingClass(item)} className="mt-1 rounded-lg border border-sky-300/30 bg-sky-400/15 px-2.5 py-1.5 text-[10px] font-bold text-sky-100 hover:bg-sky-400/25">Kelola Siswa</button>
                  </div>
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>
      {managingClass && <ClassStudentManagerModal classId={managingClass.id} className={managingClass.name} onClose={() => setManagingClass(null)} />}
    </section>
  );
}

function ClassStudentManagerModal({ classId, className, onClose }: { classId: string; className: string; onClose: () => void }) {
  const [students, setStudents] = useState<{ id: string; name: string; email: string; avatarUrl: string | null; joinedAt?: string }[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ students: typeof students }>(`/api/teacher/classes/${classId}/students`).then((result) => setStudents(result.students)).catch((reason) => setError(reason instanceof Error ? reason.message : "Gagal memuat siswa.")).finally(() => setLoading(false));
  }, [classId]);

  const saveName = async () => {
    if (!editingId || nameDraft.trim().length < 3) return;
    setSaving(true);
    setError("");
    try {
      const result = await api<{ student: { id: string; name: string } }>(`/api/teacher/students/${editingId}/name`, { method: "PATCH", body: JSON.stringify({ name: nameDraft.trim() }) });
      setStudents((current) => current.map((student) => student.id === result.student.id ? { ...student, name: result.student.name } : student));
      setEditingId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menyimpan nama siswa.");
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((student) => [student.name, student.email].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())));
  return <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"><div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[rgba(125,211,252,0.28)] bg-[#08235f] shadow-2xl"><div className="flex items-start justify-between border-b border-white/10 p-5"><div><h3 className="text-lg font-bold text-white">Kelola Siswa</h3><p className="mt-1 text-sm text-[rgba(226,245,255,0.72)]">{className} · perbaiki nama siswa bila diperlukan.</p></div><button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Tutup"><X className="h-5 w-5" /></button></div><div className="p-5"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-200" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau email siswa..." className="w-full rounded-xl border border-sky-300/25 bg-[rgba(5,29,83,0.55)] py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-sky-300" /></div>{error && <p className="mt-3 text-sm text-rose-300">{error}</p>}<div className="mt-4 max-h-[48vh] space-y-2 overflow-y-auto">{loading ? <p className="py-8 text-center text-sm text-white/65">Memuat siswa...</p> : filteredStudents.length === 0 ? <p className="py-8 text-center text-sm text-white/65">Siswa tidak ditemukan.</p> : filteredStudents.map((student) => <div key={student.id} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="flex items-center gap-3">{student.avatarUrl ? <img src={student.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-400/15 text-sm font-bold text-sky-200">{student.name.charAt(0).toUpperCase()}</div>}<div className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{student.name}</strong><span className="block truncate text-xs text-white/60">{student.email}</span></div>{editingId !== student.id && <button type="button" onClick={() => { setEditingId(student.id); setNameDraft(student.name); }} className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/20">Ubah nama</button>}</div>{editingId === student.id && <div className="mt-3 flex gap-2"><input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={100} className="min-w-0 flex-1 rounded-lg border border-sky-300/25 bg-[rgba(5,29,83,0.55)] px-3 py-2 text-sm text-white outline-none focus:border-sky-300" /><button type="button" onClick={saveName} disabled={saving || nameDraft.trim().length < 3} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-[#07133b] disabled:opacity-50">{saving ? "..." : "Simpan"}</button><button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/75">Batal</button></div>}</div>)}</div></div></div></div>;
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
              <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeKatex]} remarkPlugins={[remarkMath, remarkGfm]}>{readingBlog.content}</ReactMarkdown>
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
              <span>{user.hp ?? 0}</span>
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
      <AdminStudentNameManager users={users} />
    </section>
  );
}

function AdminStudentNameManager({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const students = users.filter((user) => user.roles.some((role) => role.name === "student"));
  const filteredStudents = students.filter((student) => [student.name, student.email].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())));
  const saveName = async () => {
    if (!editingId || nameDraft.trim().length < 3) return;
    setSaving(true);
    setMessage("");
    try {
      await api(`/api/admin/students/${editingId}/name`, { method: "PATCH", body: JSON.stringify({ name: nameDraft.trim() }) });
      setMessage("Nama siswa berhasil diperbarui. Muat ulang halaman untuk memperbarui daftar utama.");
      setEditingId(null);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Gagal mengubah nama siswa.");
    } finally {
      setSaving(false);
    }
  };
  return <Card className="professional-card p-5"><div className="professional-card__header"><div><h2 className="professional-card__title">Kelola Siswa</h2><p className="professional-card__hint">Cari siswa lintas kelas dan perbaiki nama akun bila diperlukan.</p></div><span className="professional-card__pill">{students.length} siswa</span></div><div className="relative mt-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau email siswa..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-blue-400" /></div>{message && <p className="mt-3 text-sm text-slate-600">{message}</p>}<div className="mt-4 grid gap-3 md:grid-cols-2">{filteredStudents.slice(0, 20).map((student) => <div key={student.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{student.name.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-800">{student.name}</strong><span className="block truncate text-xs text-slate-500">{student.email}</span></div>{editingId !== student.id && <button type="button" onClick={() => { setEditingId(student.id); setNameDraft(student.name); }} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">Ubah nama</button>}</div>{editingId === student.id && <div className="mt-3 flex gap-2"><input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={100} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800" /><button type="button" onClick={saveName} disabled={saving || nameDraft.trim().length < 3} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? "..." : "Simpan"}</button><button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Batal</button></div>}</div>)}</div>{filteredStudents.length > 20 && <p className="mt-3 text-xs text-slate-500">Persempit pencarian untuk melihat siswa lainnya.</p>}</Card>;
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
      <div className="flex flex-col md:flex-row gap-4 bg-black/20 backdrop-blur p-4 rounded-xl border border-white/10">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-4">
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full md:w-40 professional-select">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspend</option>
          </Select>
          <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full md:w-40 professional-select">
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
                <span className="font-semibold text-lg text-slate-100">{item.name}</span>
                {onDeleteUser && (
                  <button type="button" onClick={() => onDeleteUser(item.id)} disabled={busy} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 p-2 rounded-lg transition-colors" title="Hapus User">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <span className="text-sm text-slate-400 font-mono">{item.email}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Status</label>
              <Select
                className="w-full professional-select"
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
              <label className="text-sm font-medium text-slate-300">Role</label>
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
          <div className="col-span-full py-12 text-center text-slate-400 bg-black/20 rounded-2xl border border-dashed border-white/20">
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
              className="border border-white/10 rounded-xl px-3 py-1.5 text-sm w-full sm:w-48 bg-[#27272a] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Select
              value={searchJenjang}
              onChange={(e) => setSearchJenjang(e.target.value)}
              className="w-full sm:w-40 professional-select"
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
      <div className="flex flex-col gap-1 border-b border-white/10 pb-3 mb-1">
        <input
          className="w-full text-xl font-extrabold text-white bg-transparent border-transparent hover:bg-white/5 focus:bg-white/10 rounded-md px-2 py-1 transition-all outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-500"
          value={draft.name}
          placeholder="Nama Kelas (Misal: IPA 7A)"
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        />
        <div className="flex items-center gap-1.5 px-2">
          <BookOpen className="h-4 w-4 text-blue-400 opacity-80" />
          <input
            className="w-full text-sm font-semibold text-blue-400 bg-transparent border-transparent hover:bg-white/5 focus:bg-white/10 rounded-md px-1 py-0.5 transition-all outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-blue-300/30"
            value={draft.subject}
            placeholder="Mata Pelajaran"
            aria-label={`Mapel ${kelas.name}`}
            onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300">Guru</label>
        <Select className="professional-select w-full" value={draft.teacherUserId} onChange={(event) => setDraft((current) => ({ ...current, teacherUserId: event.target.value }))}>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Jenjang</label>
          <Select className="professional-select w-full" value={draft.grade} onChange={(event) => setDraft((current) => ({ ...current, grade: event.target.value }))}>
            {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((grade) => (
              <option key={grade} value={grade}>
                Kelas {grade}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Siswa</label>
          <input className="w-full px-3 py-2 bg-[#27272a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" type="number" value={draft.students} onChange={(event) => setDraft((current) => ({ ...current, students: event.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Status</label>
          <Select className="professional-select w-full" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as TeacherClass["status"] }))}>
            <option value="active">Aktif</option>
            <option value="draft">Draft</option>
            <option value="archived">Arsip</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
           <label className="text-sm font-medium text-slate-300">ClassID</label>
           <code className="p-2 bg-[#27272a] border border-white/10 rounded-xl text-center text-sm font-mono mt-0.5 text-slate-300">{kelas.classCode ?? kelas.nextSession}</code>
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
          className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 rounded-xl transition-colors border border-red-500/20 shadow-sm"
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
  const [studentDomains, setStudentDomains] = useState("");
  const [adminContactWa, setAdminContactWa] = useState("");
  const [chatLimit, setChatLimit] = useState("5");
  const [chatWindowHours, setChatWindowHours] = useState("72");
  const [aiDefaultLimit, setAiDefaultLimit] = useState("1");
  const [aiOverridesText, setAiOverridesText] = useState("");

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

      const authRules = payload.settings.find(s => s.key === "google.role_rule");
      if (authRules && authRules.value) {
        try {
          const parsed = JSON.parse(authRules.value);
          if (parsed.adminEmails) setAdminEmails(parsed.adminEmails.join("\n"));
          if (parsed.teacherDomains) setTeacherDomains(parsed.teacherDomains.join("\n"));
          if (parsed.studentDomains) setStudentDomains(parsed.studentDomains.join("\n"));
        } catch (e) {}
      }

      const generalSettings = payload.settings.find(s => s.key === "general_settings");
      if (generalSettings && generalSettings.value) {
        try {
          const parsed = JSON.parse(generalSettings.value);
          if (parsed.adminContactWa) setAdminContactWa(parsed.adminContactWa);
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

      const aiQuotaConfig = payload.settings.find(s => s.key === "ai.generation_quota_config");
      if (aiQuotaConfig && aiQuotaConfig.value) {
        try {
          const parsed = JSON.parse(aiQuotaConfig.value);
          if (parsed.defaultLimit !== undefined) setAiDefaultLimit(String(parsed.defaultLimit));
          if (parsed.overrides) {
            setAiOverridesText(Object.entries(parsed.overrides).map(([email, limit]) => `${email}=${limit}`).join("\n"));
          }
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
        teacherDomains: teacherDomains.split("\n").map(s => s.trim()).filter(Boolean),
        studentDomains: studentDomains.split("\n").map(s => s.trim()).filter(Boolean),
        defaultRole: "student"
      };
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ key: "google.role_rule", value: JSON.stringify(payload) })
      });
      setSuccess("Pengaturan Google Auth berhasil disimpan.");
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  async function saveGeneralSettings(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { adminContactWa };
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ key: "general_settings", value: JSON.stringify(payload) })
      });
      setSuccess("Pengaturan Umum berhasil disimpan.");
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

  async function saveAiQuota(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const overrides: Record<string, number> = {};
      const lines = aiOverridesText.split("\n").map(s => s.trim()).filter(Boolean);
      for (const line of lines) {
        const parts = line.split("=");
        if (parts.length === 2) {
          const email = parts[0].trim();
          const limit = parseInt(parts[1].trim(), 10);
          if (!isNaN(limit)) {
            overrides[email] = limit;
          }
        }
      }
      const payload = {
        defaultLimit: Number(aiDefaultLimit),
        overrides
      };
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ key: "ai.generation_quota_config", value: JSON.stringify(payload) })
      });
      setSuccess("Pengaturan Kuota Generate AI berhasil disimpan.");
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
        <p className="text-sm text-slate-400 mb-4">
          Atur email admin dan domain email guru yang akan secara otomatis mendapatkan rolenya saat pertama kali mendaftar. Pisahkan setiap entri dengan baris baru (Enter).
        </p>

        {error ? <ErrorBanner message={error} /> : null}
        {success ? <div className="mb-4 rounded-md bg-green-950/30 p-4 text-sm text-green-300 border border-green-500/30">{success}</div> : null}

        <form onSubmit={saveAuthRules} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-300">Email Admin (Superuser)</span>
            <textarea
              value={adminEmails}
              onChange={e => setAdminEmails(e.target.value)}
              className="idetech-input min-h-[100px] font-mono text-sm leading-relaxed bg-white/5 border-white/10 text-white placeholder-slate-500"
              placeholder="admin@sekolah.id"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-300">Domain Email Guru</span>
            <textarea
              value={teacherDomains}
              onChange={e => setTeacherDomains(e.target.value)}
              className="idetech-input min-h-[100px] font-mono text-sm leading-relaxed bg-white/5 border-white/10 text-white placeholder-slate-500"
              placeholder="@guru.smp.belajar.id"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-300">Domain Email Siswa</span>
            <textarea
              value={studentDomains}
              onChange={e => setStudentDomains(e.target.value)}
              className="idetech-input min-h-[100px] font-mono text-sm leading-relaxed bg-white/5 border-white/10 text-white placeholder-slate-500"
              placeholder="@siswa.smp.belajar.id"
            />
          </label>
          <button type="submit" disabled={busy} className="mt-2 self-start rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all">
            {busy ? "Menyimpan..." : "Simpan Aturan"}
          </button>
        </form>
      </Card>

      <Card className="professional-card p-5">
        <div className="professional-card__header">
          <h2 className="professional-card__title">Pengaturan Umum</h2>
          <Settings className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Atur nomor kontak Admin untuk ditampilkan di sistem.
        </p>

        <form onSubmit={saveGeneralSettings} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-300">Nomor WhatsApp Admin</span>
            <input
              type="text"
              value={adminContactWa}
              onChange={e => setAdminContactWa(e.target.value)}
              className="idetech-input font-mono text-sm bg-white/5 border-white/10 text-white placeholder-slate-500"
              placeholder="6281234567890"
            />
            <span className="text-xs text-slate-400">Gunakan format internasional tanpa tanda plus (+), misal: 628...</span>
          </label>
          <button type="submit" disabled={busy} className="mt-2 self-start rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all">
            {busy ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </form>
      </Card>

      <Card className="professional-card p-5">
        <div className="professional-card__header">
          <h2 className="professional-card__title">Chat Quota AI (CybraFeriBot)</h2>
          <Sparkles className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Atur batas maksimum penggunaan AI Chatbot per guru.
        </p>

        <form onSubmit={saveChatQuota} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-300">Batas Pesan (Pesan)</span>
              <input
                type="number"
                min="0"
                value={chatLimit}
                onChange={e => setChatLimit(e.target.value)}
                className="idetech-input bg-white/5 border-white/10 text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-300">Waktu Reset (Jam)</span>
              <input
                type="number"
                min="1"
                value={chatWindowHours}
                onChange={e => setChatWindowHours(e.target.value)}
                className="idetech-input bg-white/5 border-white/10 text-white"
              />
            </label>
          </div>
          <button type="submit" disabled={busy} className="mt-2 self-start rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all">
            {busy ? "Menyimpan..." : "Simpan Kuota"}
          </button>
        </form>
      </Card>

      <Card className="professional-card p-5">
        <div className="professional-card__header">
          <h2 className="professional-card__title">Generate AI Quota (RPP/Materi/Quest)</h2>
          <Sparkles className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Atur batas penggunaan fitur Generate AI per guru (direset otomatis setiap pukul 06:00).
        </p>

        <form onSubmit={saveAiQuota} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <label className="flex flex-col gap-1.5 w-full md:w-1/2">
              <span className="text-sm font-semibold text-slate-300">Batas Penggunaan Default per Hari</span>
              <input
                type="number"
                min="0"
                value={aiDefaultLimit}
                onChange={e => setAiDefaultLimit(e.target.value)}
                className="idetech-input bg-white/5 border-white/10 text-white"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-300">Pengecualian Guru (Overrides)</span>
            <textarea
              value={aiOverridesText}
              onChange={e => setAiOverridesText(e.target.value)}
              className="idetech-input min-h-[100px] font-mono text-sm leading-relaxed bg-white/5 border-white/10 text-white placeholder-slate-500"
              placeholder={`email.guru@belajar.id=5\nguru.lain@belajar.id=10`}
            />
            <span className="text-xs text-slate-400">Gunakan format "email=batas", setiap baris satu guru. Contoh: the.real.ferilee@gmail.com=5</span>
          </label>
          <button type="submit" disabled={busy} className="mt-2 self-start rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all">
            {busy ? "Menyimpan..." : "Simpan Kuota AI"}
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
              <p className="font-black text-slate-200">{role.label}</p>
              <p className="text-xs font-semibold text-slate-400">{role.description}</p>
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
      <Card className="teacher-profile-card relative overflow-hidden p-6 border-0">
        <div className="relative flex items-center gap-5 border-b border-white/10 pb-5 mb-5">
          <div className="h-20 w-20 overflow-hidden rounded-full ring-4 ring-white/10 shadow-2xl">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-400 to-indigo-500 text-2xl font-black text-white">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">{user.fullName || user.name}</h3>
            <p className="truncate text-sm font-medium text-[rgba(226,245,255,0.74)] mt-0.5">{user.email}</p>
            <div className="mt-2.5 inline-flex items-center rounded-full bg-[rgba(225,247,255,0.94)] px-3 py-1 text-xs font-bold text-[#10265c] shadow-sm">
              {roleLabels[user.activeRole]}
            </div>
          </div>
        </div>

        <div className="relative flex flex-col gap-4">
          <div className="teacher-class-auto-id p-4 border border-[rgba(125,211,252,0.22)] bg-[rgba(5,29,83,0.42)] rounded-[18px]">
            <p className="text-[12px] font-bold text-[rgba(226,245,255,0.76)] mb-1.5 flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5" /> Instansi Sekolah
            </p>
            <p className="font-black text-lg text-white">{user.schoolName || "-"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="teacher-class-auto-id p-4 border border-[rgba(125,211,252,0.22)] bg-[rgba(5,29,83,0.42)] rounded-[18px]">
              <p className="text-[12px] font-bold text-[rgba(226,245,255,0.76)] mb-1.5 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Kontak ({user.contactChannel || "-"})
              </p>
              <p className="font-black text-white">{user.contactValue || "-"}</p>
            </div>
            <div className="teacher-class-auto-id p-4 border border-[rgba(125,211,252,0.22)] bg-[rgba(5,29,83,0.42)] rounded-[18px]">
              <p className="text-[12px] font-bold text-[rgba(226,245,255,0.76)] mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Status Akun
              </p>
              <div className="inline-flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${user.status === "active" ? "bg-emerald-400 shadow-emerald-400/50" : "bg-amber-400 shadow-amber-400/50"}`} />
                <p className="font-black capitalize text-white">{user.status}</p>
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
        credentials: "include",
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c1844] border-2 border-cyan-500/30 p-6 rounded-[36px] shadow-[0_0_30px_rgba(6,25,120,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] max-w-sm w-full animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full -mr-10 -mt-10 blur-3xl pointer-events-none"></div>
            <div className="flex flex-col items-center text-center gap-4 relative z-10">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${
                alertMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                  : 'bg-rose-500/10 border-rose-400/30 text-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.3)]'
              }`}>
                {alertMsg.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-wide">
                  {alertMsg.type === 'success' ? 'Berhasil' : 'Gagal'}
                </h3>
                <p className="text-sm text-cyan-100/80 mt-2 font-medium whitespace-pre-line leading-relaxed">{alertMsg.text}</p>
              </div>
              <button
                onClick={closeAlert}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-white font-black rounded-xl border border-yellow-300/30 shadow-[0_4px_14px_rgba(245,166,0,0.3)] transition-all active:scale-[0.98] cursor-pointer"
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
      const response = await fetch("https://asisten.ferilee.gurumuda.eu.org/api/integration/chat", {
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
              {m.role === "user" ? m.text : <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{m.text}</ReactMarkdown>}
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
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0a1f5c] border border-[rgba(125,211,252,0.3)] shadow-[0_0_20px_rgba(125,211,252,0.25)] text-white px-6 py-3.5 rounded-full z-[100] text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-6">
          <CheckCircle2 className="w-5 h-5 text-amber-400" />
          {toastMessage}
        </div>
      )}
    </Card>
  );
}

type StudentProgressReport = {
  studentId: string;
  classId: string;
  studentName: string;
  studentEmail: string;
  avatarUrl: string | null;
  className: string;
  joinedAt: string | null;
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

function TeacherRadarView({ onClose, mode = "radar" }: { onClose: () => void, mode?: "radar" | "report" | "koreksi" | "peringkat" }) {
  const [currentMode, setCurrentMode] = useState<"radar" | "report" | "koreksi" | "peringkat">(mode);
  const [data, setData] = useState<StudentProgressReport[]>([]);
  const [radarClasses, setRadarClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [filterRisk, setFilterRisk] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [editingStudentName, setEditingStudentName] = useState<StudentProgressReport | null>(null);
  const [studentNameDraft, setStudentNameDraft] = useState("");
  const [savingStudentName, setSavingStudentName] = useState(false);
  const [showReportPrintDialog, setShowReportPrintDialog] = useState(false);
  const [rankingClassId, setRankingClassId] = useState<string>("");
  const [rankingMetric, setRankingMetric] = useState<"points" | "progress" | "completion">("points");
  const itemsPerPage = 5;

  const uniqueClassIds = React.useMemo(() => {
    const obj: Record<string, string> = {};
    data.forEach(s => { if (s.classId) obj[s.classId] = s.className; });
    return Object.entries(obj).map(([id, name]) => ({ id, name }));
  }, [data]);

  const classChoices = React.useMemo(() => {
    const safeClasses = Array.isArray(radarClasses) ? radarClasses : [];
    const safeData = Array.isArray(data) ? data : [];
    const classesById = new globalThis.Map<string, TeacherClass>(safeClasses.map((classItem) => [classItem.id, classItem]));
    safeData.forEach((student) => {
      if (student.classId && !classesById.has(student.classId)) {
        classesById.set(student.classId, {
          id: student.classId,
          name: student.className,
          subject: "",
          grade: "",
          students: 0,
          classCode: null,
          teacherUserId: "",
          progress: 0,
          nextSession: "",
          status: "active"
        });
      }
    });
    return Array.from(classesById.values()).map((classItem) => ({
      ...classItem,
      studentCount: typeof classItem.students === "number" ? classItem.students : safeData.filter((student) => student.classId === classItem.id).length
    }));
  }, [data, radarClasses]);

  const filteredData = React.useMemo(() => {
    return data.filter(student => {
      const matchSearch = student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.studentEmail.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (selectedClassId && student.classId !== selectedClassId) return false;
      if (selectedStudentId && student.studentId !== selectedStudentId) return false;
      if (filterClass !== "all" && student.className !== filterClass) return false;
      if (filterRisk !== "all") {
        const allTasks = [...student.materials, ...student.quests];
        const hasLate = allTasks.some(t => t.progress >= 100 && t.isLate);
        if (filterRisk === "at-risk" && !hasLate) return false;
        if (filterRisk === "safe" && hasLate) return false;
      }
      return true;
    });
  }, [data, searchQuery, filterClass, filterRisk, selectedClassId, selectedStudentId]);

  const studentSearchResults = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query || !selectedClassId) return [];
    return data.filter((student) => student.classId === selectedClassId && [student.studentName, student.studentEmail].some((value) => String(value || "").toLowerCase().includes(query))).slice(0, 8);
  }, [data, searchQuery, selectedClassId]);

  const sortedAndPaginatedData = filteredData;

  const totalPages = Math.ceil(sortedAndPaginatedData.length / itemsPerPage);
  const paginatedData = sortedAndPaginatedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Peringkat per kelas (hanya quest yang sudah dinilai / earnedPoints tersedia)
  const rankingByClass = React.useMemo(() => {
    const computeMetric = (student: StudentProgressReport, metric: "points" | "progress" | "completion") => {
      const allTasks = [...student.materials, ...student.quests];
      if (metric === "points") {
        return student.quests
          .filter(q => q.progress >= 100 && typeof q.earnedPoints === "number")
          .reduce((sum, q) => sum + (q.earnedPoints ?? 0), 0);
      }
      if (metric === "progress") {
        if (allTasks.length === 0) return 0;
        return allTasks.reduce((sum, t) => sum + (t.progress ?? 0), 0) / allTasks.length;
      }
      return allTasks.filter(t => t.progress >= 100).length;
    };
    const obj: Record<string, Record<string, number>> = {};
    data.forEach(student => {
      if (!student.classId) return;
      if (!obj[student.classId]) obj[student.classId] = {};
      obj[student.classId][student.studentId] = computeMetric(student, "points");
    });
    Object.values(obj).forEach(students => {
      const sorted = Object.entries(students).sort((a, b) => Number(b[1]) - Number(a[1]));
      sorted.forEach(([sid], idx) => {
        students[sid] = idx + 1;
      });
    });
    return obj;
  }, [data]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterClass, filterRisk, selectedStudentId]);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const [progressResult, classResult] = await Promise.all([
          api<{ progress: StudentProgressReport[] }>("/api/teacher/student-progress"),
          api<{ classes: TeacherClass[] }>("/api/teacher/classes").catch(() => ({ classes: [] }))
        ]);
        setData(Array.isArray(progressResult.progress) ? progressResult.progress : []);
        setRadarClasses(Array.isArray(classResult.classes) ? classResult.classes : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchProgress();
  }, []);

  const removeStudent = async (classId: string, studentId: string, studentName: string, className: string) => {
    if (!confirm(`Apakah Anda yakin ingin mengeluarkan siswa "${studentName}" dari kelas "${className}"?`)) {
      return;
    }
    try {
      await api(`/api/teacher/classes/${classId}/students/${studentId}`, { method: "DELETE" });
      setData(prev => prev.filter(s => !(s.studentId === studentId && s.classId === classId)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengeluarkan siswa.");
    }
  };

  const saveStudentName = async () => {
    if (!editingStudentName) return;
    const name = studentNameDraft.trim();
    if (!name) return;
    setSavingStudentName(true);
    try {
      const result = await api<{ student: { id: string; name: string } }>(`/api/teacher/students/${editingStudentName.studentId}/name`, {
        method: "PATCH",
        body: JSON.stringify({ name })
      });
      setData((current) => current.map((student) => student.studentId === result.student.id ? { ...student, studentName: result.student.name } : student));
      setEditingStudentName(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal mengubah nama siswa.");
    } finally {
      setSavingStudentName(false);
    }
  };

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

  const printReport = (scope: "class" | "all") => {
    const reportStudents = scope === "class" && selectedClassId ? data.filter((student) => student.classId === selectedClassId) : data;
    const scopeName = scope === "class" ? classChoices.find((classItem) => classItem.id === selectedClassId)?.name || "Kelas terpilih" : "Semua Kelas";
    const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
    const rows = reportStudents.map((student) => {
      const tasks = [...student.materials, ...student.quests];
      const completed = tasks.filter((task) => task.progress >= 100).length;
      const late = tasks.filter((task) => task.progress >= 100 && task.isLate).length;
      const progress = tasks.length ? Math.round(tasks.reduce((total, task) => total + task.progress, 0) / tasks.length) : 0;
      return `<tr><td>${escapeHtml(student.studentName)}</td><td>${escapeHtml(student.className)}</td><td>${completed}/${tasks.length}</td><td>${progress}%</td><td>${late}</td></tr>`;
    }).join("");
    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan Hasil Belajar - ${escapeHtml(scopeName)}</title><style>body{font-family:Arial,sans-serif;color:#12203f;padding:32px}h1{margin:0;color:#0b3b82;font-size:24px}p{color:#4b6388}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:12px}th{background:#0b3b82;color:#fff;text-align:left}th,td{padding:10px;border:1px solid #d7e2f2}tr:nth-child(even){background:#f5f8fd}.meta{margin-top:6px;font-size:12px}@media print{body{padding:0}}</style></head><body><h1>Laporan Hasil Belajar</h1><p>${escapeHtml(scopeName)}</p><p class="meta">Dicetak ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · ${reportStudents.length} siswa</p><table><thead><tr><th>Nama Siswa</th><th>Kelas</th><th>Tugas Selesai</th><th>Rata-rata Progres</th><th>Terlambat</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Belum ada siswa untuk dilaporkan.</td></tr>'}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setShowReportPrintDialog(false);
  };

  const requiresClassSelection = currentMode === "radar" || currentMode === "report" || currentMode === "koreksi";
  const selectedStudent = selectedStudentId ? data.find((student) => student.studentId === selectedStudentId) ?? null : null;

  return (
    <div className="teacher-profile-card border-0 rounded-t-3xl min-h-[60vh] p-4 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative mt-4 animate-in slide-in-from-bottom-10">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-[rgba(226,245,255,0.3)] rounded-full" />

      <div className="flex justify-between items-center mt-4 mb-2">
        <div>
          <h2 className="text-xl font-bold text-white">
            {currentMode === "report" ? "Laporan Hasil Belajar" : currentMode === "peringkat" ? "Peringkat Siswa" : currentMode === "koreksi" ? "Koreksi IdeQuest" : "Radar Pintar (Progres Siswa)"}
          </h2>
          <p className="text-sm text-[rgba(226,245,255,0.76)]">
            {currentMode === "report" ? "Rekapitulasi persentase penyelesaian tugas siswa"
              : currentMode === "peringkat" ? "Lihat peringkat siswa per kelas berdasarkan poin dan progres"
              : currentMode === "koreksi" ? "Beri nilai dan umpan balik untuk IdeQuest yang sudah dikumpulkan"
              : "Analisis progres belajar, intervensi, dan risiko siswa"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {requiresClassSelection && selectedClassId && (
            <button
              type="button"
              onClick={() => { setSelectedClassId(null); setSelectedStudentId(null); setShowStudentSearch(false); setSearchQuery(""); setFilterRisk("all"); }}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-white/10 text-sky-100 hover:bg-white/15 font-bold rounded-lg transition-colors border border-white/15 text-sm"
            >
              Ganti Kelas
            </button>
          )}
          <button
            type="button"
            onClick={exportToCSV}
            disabled={loading || filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400/20 text-amber-400 hover:bg-amber-400/30 font-bold rounded-lg transition-colors border border-amber-400/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Unduh Laporan</span>
          </button>
          {currentMode === "report" && <button type="button" onClick={() => setShowReportPrintDialog(true)} disabled={loading || data.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-sky-300/30 bg-sky-400/15 px-3 py-2 text-sm font-bold text-sky-100 hover:bg-sky-400/25 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" /><span className="hidden sm:inline">Cetak PDF</span></button>}
          <button type="button" onClick={onClose} className="p-2 bg-[rgba(5,29,83,0.42)] text-[rgba(226,245,255,0.76)] rounded-full hover:bg-[rgba(5,29,83,0.6)] hover:text-white transition-colors border border-[rgba(125,211,252,0.22)]" title="Tutup Radar">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-[rgba(125,211,252,0.22)] bg-[rgba(5,29,83,0.42)] p-1 mb-6 w-full sm:flex sm:gap-2">
        <button
          onClick={() => setCurrentMode("radar")}
          className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-md transition-colors sm:flex-1 ${currentMode === "radar" ? "bg-[rgba(5,29,83,0.8)] border border-[rgba(125,211,252,0.22)] text-amber-400 shadow-sm" : "text-[rgba(226,245,255,0.76)] hover:text-white hover:bg-white/5"}`}
        >
          <Gauge className="h-4 w-4 sm:hidden" /><span className="sm:hidden">Radar</span><span className="hidden sm:inline">Radar Pintar</span>
        </button>
        <button
          onClick={() => setCurrentMode("report")}
          className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-md transition-colors sm:flex-1 ${currentMode === "report" ? "bg-[rgba(5,29,83,0.8)] border border-[rgba(125,211,252,0.22)] text-amber-400 shadow-sm" : "text-[rgba(226,245,255,0.76)] hover:text-white hover:bg-white/5"}`}
        >
          <BookOpen className="h-4 w-4 sm:hidden" /><span className="sm:hidden">Laporan</span><span className="hidden sm:inline">Laporan Hasil Belajar</span>
        </button>
        <button
          onClick={() => setCurrentMode("koreksi")}
          className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-md transition-colors sm:flex-1 ${currentMode === "koreksi" ? "bg-[rgba(5,29,83,0.8)] border border-[rgba(125,211,252,0.22)] text-amber-400 shadow-sm" : "text-[rgba(226,245,255,0.76)] hover:text-white hover:bg-white/5"}`}
        >
          <Pencil className="h-4 w-4 sm:hidden" /><span className="sm:hidden">Koreksi</span><span className="hidden sm:inline">Koreksi IdeQuest</span>
        </button>
        <button
          onClick={() => setCurrentMode("peringkat")}
          className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-md transition-colors sm:flex-1 ${currentMode === "peringkat" ? "bg-[rgba(5,29,83,0.8)] border border-[rgba(125,211,252,0.22)] text-amber-400 shadow-sm" : "text-[rgba(226,245,255,0.76)] hover:text-white hover:bg-white/5"}`}
        >
          <Trophy className="h-4 w-4 sm:hidden" /><span>Peringkat</span>
        </button>
      </div>

      {requiresClassSelection && selectedClassId === null ? (
        loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            <p className="text-[rgba(226,245,255,0.76)]">Memuat daftar kelas...</p>
          </div>
        ) : classChoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[rgba(226,245,255,0.4)] bg-[rgba(5,29,83,0.42)] py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[rgba(226,245,255,0.76)]"><Users className="h-8 w-8" /></div>
            <p className="text-white">Belum ada kelas yang dapat ditampilkan.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-top-2">
            <div className="mb-5 text-center"><h3 className="text-lg font-bold text-white">Pilih kelas</h3><p className="mt-1 text-sm text-[rgba(226,245,255,0.76)]">Pilih satu kelas untuk melihat {currentMode === "koreksi" ? "IdeQuest yang perlu dikoreksi" : currentMode === "report" ? "laporan hasil belajar" : "progres dan risiko siswa"}.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {classChoices.map((classItem) => (
                <button key={classItem.id} type="button" onClick={() => { setSelectedClassId(classItem.id); setSelectedStudentId(null); setShowStudentSearch(false); setFilterClass("all"); setSearchQuery(""); setFilterRisk("all"); }} className="rounded-xl border border-[rgba(125,211,252,0.24)] bg-[rgba(5,29,83,0.42)] p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-300/70 hover:bg-[rgba(20,80,165,0.48)] hover:shadow-lg hover:shadow-blue-950/30">
                  <div className="flex items-start justify-between gap-3"><div><strong className="block text-base text-white">{classItem.name}</strong><span className="mt-1 block text-xs text-sky-200">{[classItem.subject, classItem.grade ? `Kelas ${classItem.grade}` : ""].filter(Boolean).join(" · ") || "Kelas aktif"}</span></div><span className="rounded-full border border-sky-300/30 bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold text-sky-200">{classItem.studentCount} siswa</span></div>
                  <span className="mt-4 inline-flex text-xs font-bold text-white/75">Lihat kelas →</span>
                </button>
              ))}
            </div>
          </div>
        )
      ) : <>
      {requiresClassSelection && selectedClassId && selectedStudentId === null ? (
        <div className="mx-auto flex min-h-[310px] max-w-xl flex-col items-center justify-center py-8 text-center">
          <div className="mb-5 rounded-full border border-sky-300/25 bg-sky-400/10 p-4 text-sky-200"><Search className="h-7 w-7" /></div>
          <h3 className="text-xl font-bold text-white">Cari siswa</h3>
          <p className="mt-2 max-w-sm text-sm text-[rgba(226,245,255,0.76)]">Pilih siswa untuk melihat {currentMode === "koreksi" ? "IdeQuest dan memberikan koreksi" : currentMode === "report" ? "laporan hasil belajarnya" : "progres belajarnya"}.</p>
          {!showStudentSearch ? (
            <button type="button" onClick={() => setShowStudentSearch(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-sky-300/35 bg-sky-400/15 px-5 py-3 text-sm font-bold text-sky-100 transition hover:bg-sky-400/25"><Search className="h-4 w-4" />Cari siswa</button>
          ) : (
            <div className="relative mt-6 w-full text-left">
              <Search className="absolute left-4 top-4 h-5 w-5 text-sky-200" />
              <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Ketik nama atau email siswa..." className="w-full rounded-xl border border-sky-300/35 bg-[rgba(5,29,83,0.62)] py-3.5 pl-12 pr-10 text-sm text-white placeholder:text-white/45 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/20" />
              <button type="button" onClick={() => { setShowStudentSearch(false); setSearchQuery(""); }} className="absolute right-3 top-2.5 rounded-full p-1.5 text-white/55 hover:bg-white/10 hover:text-white" aria-label="Tutup pencarian"><X className="h-4 w-4" /></button>
              {searchQuery.trim() && <div className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-sky-300/25 bg-[#08235f] p-1.5 shadow-2xl">
                {studentSearchResults.length === 0 ? <p className="p-4 text-center text-sm text-white/65">Siswa tidak ditemukan.</p> : studentSearchResults.map((student) => <button key={`${student.studentId}-${student.classId}`} type="button" onClick={() => { setSelectedStudentId(student.studentId); setShowStudentSearch(false); setSearchQuery(""); }} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-sky-400/15"><strong className="block text-sm text-white">{student.studentName}</strong><span className="mt-0.5 block text-xs text-sky-200">{student.studentEmail}</span></button>)}
              </div>}
            </div>
          )}
        </div>
      ) : <>

      {!loading && data.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-[rgba(5,29,83,0.42)] p-3 rounded-xl border border-[rgba(125,211,252,0.22)] animate-in fade-in slide-in-from-top-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(226,245,255,0.76)]" />
            <input
              type="text"
              placeholder="Cari nama atau email siswa..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0a1f5c] border border-[rgba(125,211,252,0.22)] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder:text-[rgba(226,245,255,0.5)]"
            />
          </div>
          {requiresClassSelection && selectedClassId && <div className="flex items-center rounded-lg border border-[rgba(125,211,252,0.22)] bg-[#0a1f5c] px-3 py-2 text-sm font-semibold text-sky-100">{classChoices.find((classItem) => classItem.id === selectedClassId)?.name}</div>}
          {requiresClassSelection && selectedStudentId && <button type="button" onClick={() => { setSelectedStudentId(null); setSearchQuery(""); setFilterRisk("all"); }} className="rounded-lg border border-sky-300/25 bg-sky-400/10 px-3 py-2 text-sm font-bold text-sky-100 hover:bg-sky-400/20">Cari siswa lain</button>}
          {requiresClassSelection && selectedStudent && <button type="button" onClick={() => { setEditingStudentName(selectedStudent); setStudentNameDraft(selectedStudent.studentName); }} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-300 hover:bg-amber-400/20"><Pencil className="h-4 w-4" />Ubah nama</button>}
          <select
            value={filterRisk}
            onChange={e => setFilterRisk(e.target.value)}
            className="px-3 py-2 bg-[#0a1f5c] border border-[rgba(125,211,252,0.22)] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">Semua Status</option>
            <option value="at-risk">Beresiko (Terlambat)</option>
            <option value="safe">Aman (Tepat Waktu)</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[rgba(226,245,255,0.76)]">Memuat data siswa...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[rgba(226,245,255,0.4)] rounded-2xl bg-[rgba(5,29,83,0.42)]">
          <div className="w-16 h-16 bg-white/10 text-[rgba(226,245,255,0.76)] rounded-full flex items-center justify-center mb-4 border border-white/20">
            <Users className="h-8 w-8" />
          </div>
          <p className="text-white">Belum ada siswa di kelas Anda.</p>
        </div>
      ) : currentMode === "peringkat" ? (
        (() => {
          const effectiveClassId = rankingClassId || uniqueClassIds[0]?.id || "";
          const classStudents = data.filter(s => s.classId === effectiveClassId);

          const computeMetric = (student: StudentProgressReport, metric: "points" | "progress" | "completion") => {
            const allTasks = [...student.materials, ...student.quests];
            if (metric === "points") {
              return student.quests
                .filter(q => q.progress >= 100 && typeof q.earnedPoints === "number")
                .reduce((sum, q) => sum + (q.earnedPoints ?? 0), 0);
            }
            if (metric === "progress") {
              if (allTasks.length === 0) return 0;
              return allTasks.reduce((sum, t) => sum + (t.progress ?? 0), 0) / allTasks.length;
            }
            return allTasks.filter(t => t.progress >= 100).length;
          };

          const ranked = classStudents
            .map(s => ({ student: s, value: computeMetric(s, rankingMetric) }))
            .sort((a, b) => b.value - a.value);

          const metricLabel: Record<typeof rankingMetric, string> = {
            points: "Total Poin",
            progress: "Rata-rata Progres",
            completion: "Jumlah Selesai"
          };
          const metricSuffix: Record<typeof rankingMetric, string> = {
            points: " pts",
            progress: "%",
            completion: ""
          };
          const formatValue = (v: number) => {
            if (rankingMetric === "progress") return `${Math.round(v)}%`;
            if (rankingMetric === "points") return `${v} pts`;
            return `${v}`;
          };

          if (classStudents.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-[rgba(5,29,83,0.42)] rounded-2xl border-2 border-dashed border-[rgba(226,245,255,0.4)]">
                <div className="w-16 h-16 bg-white/10 text-[rgba(226,245,255,0.76)] rounded-full flex items-center justify-center mb-4 border border-white/20">
                  <Trophy className="h-8 w-8" />
                </div>
                <p className="text-white">Belum ada siswa untuk ditampilkan.</p>
              </div>
            );
          }

          const [first, second, third] = ranked;
          const others = ranked.slice(3);

          return (
            <div className="mt-6 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3 bg-[rgba(5,29,83,0.42)] p-3 rounded-xl border border-[rgba(125,211,252,0.22)]">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-[rgba(226,245,255,0.76)] shrink-0">Kelas:</span>
                  <select
                    value={effectiveClassId}
                    onChange={e => setRankingClassId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#0a1f5c] border border-[rgba(125,211,252,0.22)] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {uniqueClassIds.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-[rgba(226,245,255,0.76)] shrink-0">Metrik:</span>
                  <select
                    value={rankingMetric}
                    onChange={e => setRankingMetric(e.target.value as any)}
                    className="flex-1 px-3 py-2 bg-[#0a1f5c] border border-[rgba(125,211,252,0.22)] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="points">Total Poin</option>
                    <option value="progress">Rata-rata Progres</option>
                    <option value="completion">Jumlah Selesai</option>
                  </select>
                </div>
              </div>

              {/* Podium */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end">
                {second && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-full bg-gradient-to-b from-slate-300/30 to-slate-400/10 border border-slate-300/40 rounded-xl p-3 text-center shadow-md">
                      <div className="text-2xl sm:text-3xl mb-1">🥈</div>
                      <div className="font-black text-white text-sm truncate w-full">{second.student.studentName}</div>
                      <div className="text-xs text-slate-200 font-bold mt-1">{formatValue(second.value)}</div>
                    </div>
                    <div className="bg-slate-300/20 border border-slate-300/40 rounded-t-lg px-3 py-2 text-slate-200 font-black text-sm">#2</div>
                  </div>
                )}
                {first && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-full bg-gradient-to-b from-amber-300/30 to-amber-500/10 border border-amber-400/50 rounded-xl p-3 sm:p-4 text-center shadow-lg">
                      <div className="text-3xl sm:text-4xl mb-1">🥇</div>
                      <div className="font-black text-white text-sm truncate w-full">{first.student.studentName}</div>
                      <div className="text-sm sm:text-base text-amber-200 font-black mt-1">{formatValue(first.value)}</div>
                    </div>
                    <div className="bg-amber-400/30 border border-amber-400/60 rounded-t-lg px-3 py-2 text-amber-200 font-black text-sm">#1</div>
                  </div>
                )}
                {third && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-full bg-gradient-to-b from-orange-400/30 to-orange-600/10 border border-orange-400/40 rounded-xl p-3 text-center shadow-md">
                      <div className="text-2xl sm:text-3xl mb-1">🥉</div>
                      <div className="font-black text-white text-sm truncate w-full">{third.student.studentName}</div>
                      <div className="text-xs text-orange-200 font-bold mt-1">{formatValue(third.value)}</div>
                    </div>
                    <div className="bg-orange-400/20 border border-orange-400/40 rounded-t-lg px-3 py-2 text-orange-200 font-black text-sm">#3</div>
                  </div>
                )}
              </div>

              {/* Full list */}
              {others.length > 0 && (
                <div className="bg-[rgba(5,29,83,0.42)] border border-[rgba(125,211,252,0.22)] rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-[rgba(5,29,83,0.6)] border-b border-[rgba(125,211,252,0.22)] text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Peringkat {classStudents[0]?.className || ""} • {metricLabel[rankingMetric]}
                  </div>
                  <div className="divide-y divide-[rgba(125,211,252,0.12)]">
                    {others.map(({ student, value }, idx) => {
                      const rank = idx + 4;
                      return (
                        <div key={`${student.studentId}-${student.classId}`} className="flex items-center gap-3 px-4 py-3">
                          <span className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white font-black text-sm flex items-center justify-center">#{rank}</span>
                          {student.avatarUrl ? (
                            <img src={student.avatarUrl} alt={student.studentName} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {student.studentName[0].toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-sm truncate">{student.studentName}</div>
                            <div className="text-xs text-[rgba(226,245,255,0.76)] truncate">{student.className}</div>
                          </div>
                          <span className="shrink-0 font-black text-amber-300 text-sm">{formatValue(value)}{metricSuffix[rankingMetric]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-[rgba(5,29,83,0.42)] rounded-2xl border-2 border-dashed border-[rgba(226,245,255,0.4)]">
          <div className="w-16 h-16 bg-white/10 text-[rgba(226,245,255,0.76)] rounded-full flex items-center justify-center mb-4 border border-white/20">
            <Search className="h-8 w-8" />
          </div>
          <p className="text-white mb-4">Siswa tidak ditemukan berdasarkan filter pencarian.</p>
          <button type="button" onClick={() => { setSearchQuery(""); setFilterClass("all"); setFilterRisk("all"); }} className="px-4 py-2 bg-amber-400/20 border border-amber-400/30 text-amber-300 rounded-lg text-sm font-bold hover:bg-amber-400/30 transition-colors shadow-sm">
            Reset Filter
          </button>
        </div>
      ) : currentMode === "radar" ? (
        <div className="mt-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          {filteredData.map(student => {
            const allItems = [
              ...student.materials.map(m => ({ ...m, kind: 'Materi' as const, icon: '📖' })),
              ...student.quests.map(q => ({ ...q, kind: 'IdeQuest' as const, icon: '🎯' }))
            ].sort((a, b) => {
              const aTime = a.completedAt || a.dueDate || '';
              const bTime = b.completedAt || b.dueDate || '';
              return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
            });

            const totalCompleted = allItems.filter(i => i.progress >= 100).length;
            const totalItems = allItems.length;
            const studentRank = rankingByClass[student.classId]?.[student.studentId] ?? null;

            return (
              <div key={`${student.studentId}-${student.classId}`} className="bg-[rgba(5,29,83,0.42)] border border-[rgba(125,211,252,0.22)] rounded-xl p-4 shadow-sm hover:border-amber-400/50 transition-all">
                <div className="flex items-start gap-3 mb-3 border-b border-[rgba(125,211,252,0.22)] pb-3">
                  {student.avatarUrl ? (
                    <img src={student.avatarUrl} className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {student.studentName[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-white text-sm leading-tight line-clamp-2">{student.studentName}</div>
                      {studentRank !== null && (
                        <span className={`shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-full text-[10px] font-black border sm:hidden ${studentRank === 1 ? "bg-amber-400/20 text-amber-300 border-amber-400/40" : studentRank === 2 ? "bg-slate-300/20 text-slate-200 border-slate-300/40" : studentRank === 3 ? "bg-orange-500/20 text-orange-300 border-orange-400/40" : "bg-white/5 text-[rgba(226,245,255,0.76)] border-white/15"}`}>
                          #{studentRank}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[rgba(226,245,255,0.76)] mt-0.5">
                      {student.className}
                      {student.joinedAt ? (
                        <> • Bergabung {new Date(student.joinedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                      ) : ' • Bergabung -'}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex gap-1.5 text-xs text-[rgba(226,245,255,0.7)]">
                    <span className="font-bold text-amber-400">{totalCompleted}/{totalItems}</span> selesai
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {allItems.map((item, idx) => {
                    const isCompleted = item.progress >= 100;
                    const timeLabel = item.completedAt
                      ? new Date(item.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      : item.dueDate
                        ? `Tenggat: ${new Date(item.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : 'Belum ada tenggat';

                    return (
                      <div key={item.id || idx} className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 rounded-lg text-xs transition-colors ${isCompleted ? 'bg-emerald-500/10 border border-emerald-400/20' : 'bg-[rgba(5,29,83,0.6)] border border-[rgba(125,211,252,0.15)]'}`}>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="shrink-0 mt-0.5">{item.icon}</span>
                          <span className="font-medium text-white break-words leading-snug">{item.title}</span>
                        </div>
                        <span className={`pl-6 sm:pl-0 sm:ml-auto sm:shrink-0 font-medium ${isCompleted ? 'text-emerald-300' : 'text-[rgba(226,245,255,0.6)]'}`}>
                          {isCompleted ? `✅ ${timeLabel}` : `⏳ ${timeLabel}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : currentMode === "koreksi" ? (
        <div className="mt-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          {filteredData.map(student => {
            const completedQuests = student.quests.filter(q => q.progress >= 100);
            if (completedQuests.length === 0) return null;

            return (
              <div key={student.studentId} className="bg-[rgba(5,29,83,0.42)] border border-[rgba(125,211,252,0.22)] rounded-xl p-4 shadow-sm hover:border-amber-400/50 transition-all">
                <div className="flex items-center gap-3 mb-4 border-b border-[rgba(125,211,252,0.22)] pb-3">
                  {student.avatarUrl ? (
                    <img src={student.avatarUrl} className="w-8 h-8 rounded-full object-cover border border-white/20" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {student.studentName[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-white text-sm leading-tight">{student.studentName}</div>
                    <div className="text-xs text-[rgba(226,245,255,0.76)]">{student.className}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {completedQuests.map(quest => (
                    <div key={quest.id} className="bg-[rgba(5,29,83,0.42)] p-4 rounded-lg border border-[rgba(125,211,252,0.22)] shadow-sm hover:border-amber-400/50 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 flex-1 pr-2">
                          <h4 className="font-bold text-white break-words">{quest.title}</h4>
                          <span className="text-xs text-[rgba(226,245,255,0.76)]">Dikumpulkan pada: {quest.completedAt ? new Date(quest.completedAt).toLocaleString('id-ID') : '-'}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-amber-400">{quest.earnedPoints} / {quest.maxPoints} Poin</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingQuestId(quest.id)}
                        className="mt-3 w-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 font-bold text-xs px-3 py-2 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Mulai Koreksi
                      </button>

                      {editingQuestId === quest.id && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label={`Koreksi ${quest.title}`}>
                          <div className="absolute inset-0" onClick={() => setEditingQuestId(null)} />
                          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[rgba(5,29,83,0.95)] border border-[rgba(125,211,252,0.22)] rounded-2xl p-5 shadow-2xl">
                            <button
                              type="button"
                              onClick={() => setEditingQuestId(null)}
                              className="absolute top-3 right-3 p-1.5 text-[rgba(226,245,255,0.76)] hover:text-white hover:bg-white/10 rounded-full transition-colors"
                              aria-label="Tutup modal"
                            >
                              <X className="w-5 h-5" />
                            </button>

                            <h4 className="font-bold text-white text-lg pr-8 mb-1">{quest.title}</h4>
                            <p className="text-xs text-[rgba(226,245,255,0.76)] mb-4">{student.studentName} • {student.className}</p>

                            <div className="space-y-3 mb-5">
                              {quest.submissionText && (
                                <div className="text-sm text-white bg-[#0a1f5c] p-3 rounded border border-[rgba(125,211,252,0.22)] whitespace-pre-wrap">
                                  <strong className="text-amber-400">Isian Jawaban:</strong><br/>
                                  {quest.submissionText}
                                </div>
                              )}
                              {quest.submissionFileUrl && (
                                <div>
                                  <a href={quest.submissionFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-300 bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg border border-blue-400/30 font-bold transition-colors shadow-sm">
                                    Buka File Jawaban PDF
                                  </a>
                                </div>
                              )}
                              {(!quest.submissionText && !quest.submissionFileUrl) && (
                                <p className="text-xs text-[rgba(226,245,255,0.76)] italic">Diselesaikan tanpa lampiran (versi lawas)</p>
                              )}
                            </div>

                            <form className="flex flex-col gap-3" onSubmit={async (e) => {
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
                                setEditingQuestId(null);
                              } catch (err) {
                                alert(err instanceof Error ? err.message : "Gagal menyimpan koreksi.");
                              }
                            }}>
                              <label className="flex flex-col w-full">
                                <span className="text-xs font-bold text-[rgba(226,245,255,0.76)] mb-1">Berikan / Ubah Nilai (Max {quest.maxPoints})</span>
                                <input type="number" name="points" min="0" max={quest.maxPoints} defaultValue={quest.earnedPoints} className="w-full border border-[rgba(125,211,252,0.22)] rounded px-3 py-2 text-sm bg-[#0a1f5c] text-white focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                              </label>
                              <label className="flex flex-col w-full">
                                <span className="text-xs font-bold text-[rgba(226,245,255,0.76)] mb-1">Umpan Balik (Opsional)</span>
                                <input type="text" name="feedback" defaultValue={quest.teacherFeedback || ""} placeholder="Ketik pesan untuk siswa..." className="w-full border border-[rgba(125,211,252,0.22)] rounded px-3 py-2 text-sm bg-[#0a1f5c] text-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-[rgba(226,245,255,0.5)]" />
                              </label>
                              <div className="flex gap-2 mt-2">
                                <button type="button" onClick={() => setEditingQuestId(null)} className="flex-1 px-4 py-2.5 rounded-md border border-[rgba(125,211,252,0.22)] text-[rgba(226,245,255,0.76)] text-sm font-bold hover:bg-white/5 transition-colors">Batal</button>
                                <button type="submit" className="flex-1 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-sm px-4 py-2.5 rounded-md transition-colors shadow-sm">Simpan</button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {paginatedData.map(student => {
            const allTasks = [...student.materials, ...student.quests];
            const completed = allTasks.filter(t => t.progress >= 100);
            const lateCompleted = completed.filter(t => t.isLate);
            const onTimeCompleted = completed.filter(t => !t.isLate);

            return (
              <div key={`${student.studentId}-${student.classId}`} className="relative bg-[rgba(5,29,83,0.42)] border border-[rgba(125,211,252,0.22)] rounded-2xl p-4 md:p-5 shadow-sm hover:border-amber-400/50 transition-all">
                <button
                  type="button"
                  onClick={() => removeStudent(student.classId, student.studentId, student.studentName, student.className)}
                  className="absolute top-3 right-3 md:top-4 md:right-4 p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl transition-colors border border-rose-500/10 shrink-0 z-10"
                  title="Keluarkan Siswa"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
                <div className="flex flex-col gap-3 mb-4 pr-10">
                  <div className="flex items-start gap-4">
                    {student.avatarUrl ? (
                      <img src={student.avatarUrl} alt={student.studentName} referrerPolicy="no-referrer" className="w-12 h-12 rounded-full border border-white/20 shadow-sm object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-lg border border-blue-400/30 shadow-sm shrink-0">
                        {student.studentName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-lg leading-tight break-words">{student.studentName}</h3>
                        {(() => {
                          const reportRank = rankingByClass[student.classId]?.[student.studentId] ?? null;
                          if (reportRank === null) return null;
                          return (
                            <span className={`shrink-0 inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-full text-[11px] font-black border sm:hidden ${reportRank === 1 ? "bg-amber-400/20 text-amber-300 border-amber-400/40" : reportRank === 2 ? "bg-slate-300/20 text-slate-200 border-slate-300/40" : reportRank === 3 ? "bg-orange-500/20 text-orange-300 border-orange-400/40" : "bg-white/5 text-[rgba(226,245,255,0.76)] border-white/15"}`}>
                              #{reportRank}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-sm text-[rgba(226,245,255,0.76)] break-words">{student.className}</p>
                      <p className="text-xs text-[rgba(226,245,255,0.6)] break-all">{student.studentEmail}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{onTimeCompleted.length} Tepat Waktu</span>
                    </div>
                    {lateCompleted.length > 0 && (
                      <div className="px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-400/30 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                        <Timer className="w-3.5 h-3.5 shrink-0" />
                        <span>{lateCompleted.length} Terlambat</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <details className="group">
                    <summary className="flex justify-between items-center cursor-pointer text-xs font-bold text-amber-400 uppercase tracking-wider bg-[#0a1f5c] p-3 rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm hover:bg-[rgba(5,29,83,0.6)] transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        <span>Materi ({student.materials.length})</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-amber-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="space-y-2 mt-2 pt-1 pl-2 border-l-2 border-[rgba(125,211,252,0.22)]">
                      {student.materials.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-[rgba(5,29,83,0.42)] p-3 rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            <span className="text-sm font-medium text-white truncate" title={m.title}>{m.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-bold text-white">{m.progress}%</span>
                            {m.progress >= 100 && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.isLate ? 'bg-rose-500/20 text-rose-400 border border-rose-400/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'}`}>
                                {m.isLate ? 'Terlambat' : 'Selesai'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {student.materials.length === 0 && <p className="text-sm text-[rgba(226,245,255,0.76)] italic p-2">Belum ada materi</p>}
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex justify-between items-center cursor-pointer text-xs font-bold text-amber-400 uppercase tracking-wider bg-[#0a1f5c] p-3 rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm hover:bg-[rgba(5,29,83,0.6)] transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-amber-400" />
                        <span>IdeQuest ({student.quests.length})</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-amber-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="space-y-2 mt-2 pt-1 pl-2 border-l-2 border-[rgba(125,211,252,0.22)]">
                      {student.quests.map(q => (
                        <div key={q.id} className="flex items-center justify-between bg-[rgba(5,29,83,0.42)] p-3 rounded-xl border border-[rgba(125,211,252,0.22)] shadow-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            <span className="text-sm font-medium text-white truncate" title={q.title}>{q.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-bold text-white">{q.progress}%</span>
                            {q.progress >= 100 && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${q.isLate ? 'bg-rose-500/20 text-rose-400 border border-rose-400/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'}`}>
                                {q.isLate ? 'Terlambat' : 'Selesai'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {student.quests.length === 0 && <p className="text-sm text-[rgba(226,245,255,0.76)] italic p-2">Belum ada IdeQuest</p>}
                    </div>
                  </details>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {currentMode === "report" && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-[rgba(5,29,83,0.42)] p-3 rounded-xl border border-[rgba(125,211,252,0.22)]">
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 bg-[#0a1f5c] text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgba(5,29,83,0.6)] transition-colors"
          >
            ← Sebelumnya
          </button>
          <span className="text-sm text-[rgba(226,245,255,0.76)]">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 bg-[#0a1f5c] text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgba(5,29,83,0.6)] transition-colors"
          >
            Berikutnya →
          </button>
        </div>
      )}
      </>}
      </>}
      {showReportPrintDialog && (
        <div className="fixed inset-0 z-[205] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Cetak laporan PDF">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(125,211,252,0.25)] bg-[rgba(5,29,83,0.96)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-white">Cetak laporan PDF</h3><p className="mt-1 text-sm text-[rgba(226,245,255,0.76)]">Pilih cakupan laporan yang akan dicetak atau disimpan sebagai PDF.</p></div><button type="button" onClick={() => setShowReportPrintDialog(false)} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Tutup"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" disabled={!selectedClassId} onClick={() => printReport("class")} className="rounded-xl border border-sky-300/25 bg-sky-400/10 p-4 text-left text-sky-100 transition hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-45"><strong className="block">Kelas terpilih</strong><span className="mt-1 block text-xs text-white/65">{selectedClassId ? classChoices.find((classItem) => classItem.id === selectedClassId)?.name : "Pilih kelas terlebih dahulu"}</span></button><button type="button" onClick={() => printReport("all")} className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-left text-amber-200 transition hover:bg-amber-400/20"><strong className="block">Semua kelas</strong><span className="mt-1 block text-xs text-white/65">Gabungkan seluruh laporan siswa</span></button></div>
            <p className="mt-4 text-xs text-white/55">Pada dialog cetak browser, pilih “Save as PDF” untuk mengunduh PDF.</p>
          </div>
        </div>
      )}
      {editingStudentName && (
        <div className="fixed inset-0 z-[205] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Ubah nama siswa">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(125,211,252,0.25)] bg-[rgba(5,29,83,0.96)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-white">Ubah nama siswa</h3><p className="mt-1 text-sm text-[rgba(226,245,255,0.76)]">Perubahan akan terlihat pada akun dan laporan siswa.</p></div><button type="button" onClick={() => setEditingStudentName(null)} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Tutup"><X className="h-5 w-5" /></button></div>
            <form className="mt-5" onSubmit={(event) => { event.preventDefault(); void saveStudentName(); }}>
              <label className="block text-sm font-semibold text-sky-100">Nama siswa<input autoFocus value={studentNameDraft} onChange={(event) => setStudentNameDraft(event.target.value)} maxLength={100} className="mt-2 w-full rounded-lg border border-sky-300/25 bg-[#0a1f5c] px-3 py-2.5 text-white outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/20" /></label>
              <div className="mt-5 flex gap-2"><button type="button" onClick={() => setEditingStudentName(null)} className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/10">Batal</button><button type="submit" disabled={savingStudentName || studentNameDraft.trim().length < 3} className="flex-1 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-amber-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">{savingStudentName ? "Menyimpan..." : "Simpan nama"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminAdvancedFeaturesPanel() {
  const [tab, setTab] = React.useState<"logs" | "announcements" | "master" | "quotes">("announcements");

  return (
    <Card className="professional-card p-5">
      <div className="professional-card__header">
        <div>
          <h2 className="professional-card__title">Pengaturan Lanjutan</h2>
          <p className="professional-card__hint">Kelola log aktivitas, pengumuman, data master, dan quotes selamat datang.</p>
        </div>
      </div>

      <div className="flex flex-wrap border-b border-white/10 mb-6">
        <button
          onClick={() => setTab("announcements")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${tab === "announcements" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Bell className="h-4 w-4" /> Pengumuman Global
        </button>
        <button
          onClick={() => setTab("quotes")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${tab === "quotes" ? "border-violet-500 text-violet-400" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Sparkles className="h-4 w-4" /> Quotes Selamat Datang
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
        {tab === "quotes" && <AdminWelcomeQuotes />}
        {tab === "master" && <AdvancedMasterData />}
        {tab === "logs" && <AdvancedActivityLogs />}
      </div>
    </Card>
  );
}

// =============================================
// WELCOME GREETING MODAL
// =============================================

function WelcomeGreetingModal({
  user,
  quotes,
  aiQuota,
  adminContact = "6281234567890",
  onClose,
  onStartSemester,
  onStartRPP,
  onStartIdeStudio,
  onStartIdeQuest,
  teacherHasClasses = false
}: {
  user: AuthUser;
  quotes: WelcomeQuote[];
  aiQuota: { limit: number; used: number; remaining: number; resetAt?: string } | null;
  adminContact?: string;
  onClose: () => void;
  onStartSemester?: () => void;
  onStartRPP?: () => void;
  onStartIdeStudio?: () => void;
  onStartIdeQuest?: () => void;
  teacherHasClasses?: boolean;
}) {
  const role = user.activeRole as "teacher" | "student" | "parent";
  const compact = role === "teacher";
  const displayName = user.fullName?.split(" ")[0] || user.name?.split(" ")[0] || "Kamu";
  const now = new Date();

  // Waktu sapaan dinamis (WIB = UTC+7)
  const jakartaHour = new Date(now.getTime() + 7 * 60 * 60 * 1000).getUTCHours();
  const greeting =
    jakartaHour < 11 ? "Selamat Pagi" :
    jakartaHour < 15 ? "Selamat Siang" :
    jakartaHour < 18 ? "Selamat Sore" : "Selamat Malam";

  // Hari & tanggal format Indonesia
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const dayStr = `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  // Quote random untuk role ini
  const activeQuotes = quotes.filter(q => q.isActive && q.roles.includes(role));
  const quote = activeQuotes.length > 0 ? activeQuotes[Math.floor(Math.random() * activeQuotes.length)] : null;

  // Config per role
  const roleConfig = {
    teacher: {
      emoji: "🎓",
      accent: "from-indigo-600 via-blue-600 to-cyan-500",
      cardBg: "from-indigo-950 via-blue-950 to-slate-950",
      glow: "rgba(99,102,241,0.35)",
      badge: "Selamat mengajar hari ini!",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
      btnGradient: "from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500",
      btnText: "Mulai Mengajar",
      particles: false
    },
    student: {
      emoji: "✨",
      accent: "from-violet-600 via-purple-600 to-pink-500",
      cardBg: "from-violet-950 via-purple-950 to-slate-950",
      glow: "rgba(139,92,246,0.35)",
      badge: "Semangat belajar hari ini!",
      badgeColor: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
      btnGradient: "from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500",
      btnText: "Mulai Belajar",
      particles: true
    },
    parent: {
      emoji: "💚",
      accent: "from-emerald-600 via-teal-600 to-cyan-500",
      cardBg: "from-emerald-950 via-teal-950 to-slate-950",
      glow: "rgba(16,185,129,0.35)",
      badge: "Terima kasih sudah hadir!",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
      btnGradient: "from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
      btnText: "Pantau Anak",
      particles: false
    }
  }[role] ?? {
    emoji: "👋",
    accent: "from-slate-600 to-slate-500",
    cardBg: "from-slate-950 to-slate-900",
    glow: "rgba(100,116,139,0.3)",
    badge: "Selamat datang!",
    badgeColor: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
    btnGradient: "from-slate-600 to-slate-500",
    btnText: "Masuk",
    particles: false
  };

  return (
    <div
      style={{ zIndex: 9999 }}
      className="fixed inset-0 flex items-center justify-center p-4 welcome-greeting-overlay"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Particle layer for students */}
      {roleConfig.particles && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="welcome-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                backgroundColor: ["#a78bfa","#f472b6","#60a5fa","#34d399","#fbbf24"][Math.floor(Math.random()*5)]
              }}
            />
          ))}
        </div>
      )}

      {/* Modal card */}
      <div
        className={`relative w-full ${compact ? "max-w-sm" : "max-w-md"} welcome-greeting-card bg-gradient-to-br ${roleConfig.cardBg} border border-white/10 ${compact ? "rounded-xl md:rounded-2xl" : "rounded-2xl md:rounded-3xl"} shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
        style={{ boxShadow: `0 0 80px ${roleConfig.glow}, 0 25px 50px rgba(0,0,0,0.6)` }}
      >
        {/* Gradient top bar */}
        <div className={`${compact ? "h-1" : "h-1.5"} w-full bg-gradient-to-r ${roleConfig.accent} flex-shrink-0`} />

        <div className={`${compact ? "p-4 md:p-5" : "p-5 md:p-7"} overflow-y-auto flex-1 scrollbar-thin`}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 md:top-5 md:right-5 text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 z-10"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Emoji + greeting */}
          <div className={`flex flex-col items-center text-center ${compact ? "mb-3 md:mb-4" : "mb-4 md:mb-6"}`}>
            <div
              className={`${compact ? "text-3xl md:text-4xl mb-1.5 md:mb-2" : "text-4xl md:text-6xl mb-2 md:mb-4"} welcome-emoji-bounce`}
              role="img"
              aria-label="emoji"
            >
              {roleConfig.emoji}
            </div>

            <span className={`${compact ? "text-[10px] px-2.5 py-0.5 mb-1.5 md:mb-2" : "text-[11px] md:text-xs px-3 py-1 mb-2 md:mb-3"} font-bold rounded-full ${roleConfig.badgeColor}`}>
              {roleConfig.badge}
            </span>

            <h2 className={`${compact ? "text-lg md:text-xl" : "text-xl md:text-2xl"} font-black text-white mb-1 welcome-title-slide`}>
              {greeting},
            </h2>
            <h1 className={`${compact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"} font-black bg-gradient-to-r ${roleConfig.accent} bg-clip-text text-transparent welcome-name-slide leading-tight`}>
              {displayName}!
            </h1>

            {/* Tanggal */}
            <div className={`flex items-center gap-2 ${compact ? "mt-1.5 md:mt-2" : "mt-2 md:mt-3"} text-slate-400 ${compact ? "text-[10px] md:text-xs" : "text-xs md:text-sm"}`}>
              <Calendar className={`${compact ? "w-3 h-3 md:w-3.5 md:h-3.5" : "w-3.5 h-3.5 md:w-4 md:h-4"}`} />
              <span>{dayStr}</span>
            </div>
          </div>

          {/* Divider */}
          <div className={`h-px w-full bg-gradient-to-r ${roleConfig.accent} opacity-30 ${compact ? "mb-2 md:mb-3" : "mb-3 md:mb-5"}`} />

          {/* Quote */}
          {quote ? (
            <div className={`bg-white/5 ${compact ? "rounded-lg md:rounded-xl p-2.5 md:p-3 mb-3 md:mb-4" : "rounded-xl md:rounded-2xl p-3 md:p-4 mb-4 md:mb-6"} text-center border border-white/8 welcome-quote-fade`}>
              <p className={`text-slate-200 ${compact ? "text-[11px] md:text-xs" : "text-xs md:text-sm"} leading-relaxed italic line-clamp-2`}>
                &ldquo;{quote.text}&rdquo;
              </p>
              {quote.author && (
                <p className={`${compact ? "text-[10px] mt-1" : "text-[11px] md:text-xs mt-1.5 md:mt-2"} font-semibold bg-gradient-to-r ${roleConfig.accent} bg-clip-text text-transparent`}>
                  — {quote.author}
                </p>
              )}
            </div>
          ) : (
            <div className={`${compact ? "mb-3 md:mb-4" : "mb-4 md:mb-6"}`} />
          )}

          {/* AI Quota Information for Teachers/Admins */}
          {role === "teacher" && aiQuota && (
            <div className={`bg-indigo-950/40 border border-indigo-500/20 ${compact ? "rounded-lg md:rounded-xl p-2.5 md:p-3 mb-3 md:mb-4" : "rounded-xl md:rounded-2xl p-3 md:p-4 mb-4 md:mb-6"} text-center welcome-quote-fade flex flex-col ${compact ? "gap-1" : "gap-1.5 md:gap-2"}`}>
              <div className="flex items-center justify-center gap-1.5 md:gap-2">
                <span className="text-indigo-400 text-sm md:text-base">⚡</span>
                <h4 className={`${compact ? "text-[10px]" : "text-[10px] md:text-xs"} font-extrabold tracking-wider uppercase text-indigo-300`}>
                  Kuota AI
                </h4>
              </div>
              <p className={`${compact ? "text-lg md:text-xl" : "text-xl md:text-2xl"} font-black text-white`}>
                {aiQuota.remaining} <span className={`${compact ? "text-[10px]" : "text-[11px] md:text-xs"} font-normal text-slate-400`}>/ {aiQuota.limit}</span>
              </p>
              {aiQuota.limit === 3 ? (
                <p className={`${compact ? "text-[9px]" : "text-[10px]"} text-indigo-300 bg-indigo-500/10 py-0.5 px-2 rounded border border-indigo-500/20 inline-block self-center`}>
                  🎉 Hari pertama: kuota ekstra
                </p>
              ) : aiQuota.resetAt ? (
                <p className={`${compact ? "text-[9px]" : "text-[10px]"} text-indigo-300 bg-indigo-500/10 py-0.5 px-2 rounded border border-indigo-500/20 inline-block self-center`}>
                  🔄 Reset {new Date(aiQuota.resetAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </p>
              ) : (
                <p className={`${compact ? "text-[9px]" : "text-[10px]"} text-slate-400`}>
                  Reset otomatis tiap 3 jam
                </p>
              )}
              <a
                href={`https://wa.me/${adminContact}?text=Halo%20Admin%20IdeTech%2C%20saya%20ingin%20membeli%20tambahan%20kuota%20AI%20Generator.`}
                target="_blank"
                rel="noreferrer"
                className={`${compact ? "text-[9px] md:text-[10px]" : "text-[10px] md:text-[11px]"} font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1`}
              >
                💬 Beli kuota tambahan
              </a>
            </div>
          )}

          {role === "teacher" && !teacherHasClasses && (
            <div className={`${compact ? "mb-3 md:mb-4 p-2.5 md:p-3 rounded-lg md:rounded-xl" : "mb-4 md:mb-6 p-3 md:p-4 rounded-xl md:rounded-2xl"} bg-white/[0.03] border border-dashed border-amber-400/30`}>
              <h4 className={`${compact ? "text-[10px] mb-1.5 md:mb-2" : "text-[11px] md:text-xs mb-2 md:mb-3"} font-extrabold tracking-wider uppercase text-amber-300`}>
                🎯 Mulai dari sini
              </h4>
              <div className={`flex flex-col ${compact ? "gap-1 md:gap-1.5" : "gap-1.5 md:gap-2"}`}>
                {[
                  { event: "idetech:open-semester", label: "Program Semester" },
                  { event: "idetech:open-rpp", label: "RPP per Pertemuan" },
                  { event: "idetech:open-ide-studio", label: "Materi (IdeStudio)" },
                  { event: "idetech:open-ide-quest", label: "IdeQuest (Kuis/Tugas)" },
                ].map((item, idx) => (
                  <a
                    key={item.event}
                    href="#"
                    onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent(item.event)); onClose(); }}
                    className={`flex items-center gap-2 ${compact ? "px-2 py-1 rounded-md md:rounded-lg" : "px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl"} bg-white/[0.04] hover:bg-amber-400/10 border border-white/5 hover:border-amber-400/30 transition-all ${compact ? "text-[10px] md:text-xs" : "text-[11px] md:text-xs"}`}
                  >
                    <span className={`${compact ? "w-4 h-4 text-[9px]" : "w-5 h-5 md:w-6 md:h-6 text-[10px]"} flex items-center justify-center rounded-full bg-amber-500/20 text-amber-300 font-bold flex-shrink-0`}>{idx + 1}</span>
                    <span className="flex-1 text-slate-200 font-medium">{item.label}</span>
                    <span className="text-amber-300">→</span>
                  </a>
                ))}
              </div>
              <p className={`${compact ? "text-[9px] mt-1 md:mt-1.5" : "text-[10px] mt-1.5 md:mt-2"} text-slate-500 text-center`}>
                Ikuti langkah di atas untuk memulai
              </p>
            </div>
          )}

          {/* CTA Button */}
          <button
            id="welcome-greeting-start-btn"
            onClick={onClose}
            className={`w-full ${compact ? "py-2.5 md:py-3 px-4 rounded-lg md:rounded-xl text-xs md:text-sm" : "py-3 md:py-3.5 px-6 rounded-xl md:rounded-2xl text-sm md:text-base"} font-bold text-white bg-gradient-to-r ${roleConfig.btnGradient} transition-all shadow-lg hover:shadow-xl active:scale-95 welcome-btn-pulse`}
          >
            {roleConfig.btnText} →
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// ADMIN: WELCOME QUOTES MANAGER
// =============================================

function AdminWelcomeQuotes() {
  const [quotes, setQuotes] = useState<WelcomeQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [roles, setRoles] = useState<("teacher" | "student" | "parent")[]>(["teacher"]);

  const load = async () => {
    try {
      const res = await api<{ quotes: WelcomeQuote[] }>("/api/admin/welcome-quotes");
      setQuotes(res.quotes || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || roles.length === 0) return;
    setSubmitting(true);
    try {
      await api("/api/admin/welcome-quotes", {
        method: "POST",
        body: JSON.stringify({ text, author, roles })
      });
      setText(""); setAuthor(""); setRoles(["teacher"]);
      load();
    } catch { alert("Gagal menambahkan quote."); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await api(`/api/admin/welcome-quotes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive })
      });
      load();
    } catch { alert("Gagal mengubah status."); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus quote ini?")) return;
    try {
      await api(`/api/admin/welcome-quotes/${id}`, { method: "DELETE" });
      load();
    } catch { alert("Gagal menghapus."); }
  };

  const toggleRole = (r: "teacher" | "student" | "parent") => {
    setRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const roleChipColor: Record<string, string> = {
    teacher: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    student: "bg-violet-500/20 text-violet-300 border-violet-500/40",
    parent: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
  };
  const roleLabel: Record<string, string> = { teacher: "🎓 Guru", student: "✨ Siswa", parent: "💚 Ortu" };

  return (
    <div className="space-y-6">
      {/* Form tambah quote */}
      <form onSubmit={handleAdd} className="bg-black/20 p-5 rounded-2xl border border-white/10 flex flex-col gap-3">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" /> Tambah Quote Baru
        </h3>
        <textarea
          placeholder="Teks kutipan motivasi..."
          value={text}
          onChange={e => setText(e.target.value)}
          className="idetech-input bg-white/5 border-white/10 text-white placeholder-slate-400 min-h-[80px]"
          required
        />
        <input
          type="text"
          placeholder="Nama penulis (opsional)"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          className="idetech-input bg-white/5 border-white/10 text-white placeholder-slate-400"
        />
        <div>
          <p className="text-xs text-slate-400 mb-2">Tampilkan untuk:</p>
          <div className="flex gap-2 flex-wrap">
            {(["teacher","student","parent"] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${roles.includes(r) ? roleChipColor[r] : "bg-white/5 text-slate-500 border-white/10"}`}
              >
                {roleLabel[r]}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || !text.trim() || roles.length === 0}
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-xl disabled:opacity-50 transition-colors self-start"
        >
          {submitting ? "Menyimpan..." : "Tambah Quote"}
        </button>
      </form>

      {/* Daftar quotes */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-slate-500 py-6 animate-pulse">Memuat quotes...</div>
        ) : quotes.length === 0 ? (
          <div className="text-center text-slate-500 py-6 italic">Belum ada quote. Tambahkan di atas.</div>
        ) : quotes.map(q => (
          <div
            key={q.id}
            className={`p-4 rounded-xl border transition-all ${q.isActive ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5 opacity-60"}`}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm italic leading-relaxed">"{q.text}"</p>
                {q.author && <p className="text-xs text-slate-500 mt-1">— {q.author}</p>}
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {q.roles.map(r => (
                    <span key={r} className={`text-xs px-2 py-0.5 rounded-full border ${roleChipColor[r]}`}>{roleLabel[r]}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(q.id, !q.isActive)}
                  title={q.isActive ? "Nonaktifkan" : "Aktifkan"}
                  className={`p-2 rounded-lg transition-colors text-sm font-bold ${q.isActive ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-slate-500/20 text-slate-400 hover:bg-slate-500/30"}`}
                >
                  {q.isActive ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
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
      <form onSubmit={handleSubmit} className="bg-black/20 p-4 rounded-xl border border-white/10 flex flex-col gap-3">
        <h3 className="font-bold text-slate-200 text-sm">Buat Pengumuman Baru</h3>
        <input type="text" placeholder="Judul Pengumuman" value={title} onChange={e=>setTitle(e.target.value)} className="idetech-input bg-white/5 border-white/10 text-white placeholder-slate-400" required />
        <textarea placeholder="Isi pengumuman..." value={content} onChange={e=>setContent(e.target.value)} className="idetech-input bg-white/5 border-white/10 text-white placeholder-slate-400 min-h-[100px]" required />
        <div className="flex gap-4 items-center">
          <select value={type} onChange={e=>setType(e.target.value)} className="idetech-input bg-white/5 border-white/10 text-white w-auto">
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
            <div key={a.id} className={`p-4 rounded-xl border ${a.type === 'warning' ? 'bg-orange-950/30 border-orange-500/30' : a.type === 'success' ? 'bg-green-950/30 border-green-500/30' : 'bg-blue-950/30 border-blue-500/30'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-200">{a.title}</h4>
                  <p className="text-sm text-slate-400 mt-1 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-slate-500 mt-3">Oleh: {a.authorName} • {new Date(a.createdAt).toLocaleString('id-ID')}</p>
                </div>
                <button onClick={() => handleDelete(a.id)} className="text-red-400 hover:text-red-300 p-2"><Trash2 className="w-4 h-4" /></button>
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
      <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
        <div className="bg-white/5 p-4 border-b border-white/10">
          <h3 className="font-bold text-slate-200">Master Mata Pelajaran</h3>
        </div>
        <div className="p-4 flex gap-2">
          <input type="text" placeholder="Tambah Mapel Baru" value={newSubj} onChange={e=>setNewSubj(e.target.value)} className="idetech-input flex-1 bg-white/5 border-white/10 text-white placeholder-slate-400" />
          <button onClick={() => handleAdd("subjects", newSubj, setNewSubj)} disabled={!newSubj} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"><Plus className="w-5 h-5" /></button>
        </div>
        <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
          {subjects.map(s => (
            <div key={s.id} className="flex justify-between items-center p-3 hover:bg-white/5">
              <span className="text-sm font-medium text-slate-300">{s.name}</span>
              <button onClick={() => handleDelete("subjects", s.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
        <div className="bg-white/5 p-4 border-b border-white/10">
          <h3 className="font-bold text-slate-200">Master Tingkatan Kelas</h3>
        </div>
        <div className="p-4 flex gap-2">
          <input type="text" placeholder="Tambah Kelas Baru" value={newGrade} onChange={e=>setNewGrade(e.target.value)} className="idetech-input flex-1 bg-white/5 border-white/10 text-white placeholder-slate-400" />
          <button onClick={() => handleAdd("grades", newGrade, setNewGrade)} disabled={!newGrade} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"><Plus className="w-5 h-5" /></button>
        </div>
        <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
          {grades.map(g => (
            <div key={g.id} className="flex justify-between items-center p-3 hover:bg-white/5">
              <span className="text-sm font-medium text-slate-300">{g.name}</span>
              <button onClick={() => handleDelete("grades", g.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
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
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (actionFilter) params.set("action", actionFilter);
      if (resourceFilter) params.set("resourceType", resourceFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      params.set("page", String(page));
      const res = await api<{ logs: any[]; pagination: typeof pagination }>(`/api/admin/logs?${params.toString()}`);
      setLogs(res.logs || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, resourceFilter, fromDate, toDate, page]);

  const handleCopyDetails = useCallback(async (logId: string, text: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedId(logId);
      window.setTimeout(() => {
        setCopiedId(prev => (prev === logId ? null : prev));
      }, 1500);
    } catch (err) {
      console.error("Gagal menyalin detail aktivitas:", err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [search, actionFilter, resourceFilter, fromDate, toDate]);

  const resetFilters = () => {
    setSearch("");
    setActionFilter("");
    setResourceFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const actionColor = (a: string) => {
    if (a.includes("error")) return "bg-red-900/60 text-red-300 border border-red-500/40";
    if (a === "create") return "bg-green-900/50 text-green-300";
    if (a === "update") return "bg-blue-900/50 text-blue-300";
    if (a === "delete") return "bg-red-900/50 text-red-300";
    if (a === "grade") return "bg-amber-900/50 text-amber-300";
    return "bg-slate-800 text-slate-300";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 p-4 bg-black/20 border border-white/10 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          <input
            type="text"
            placeholder="🔍 Cari nama, email, aksi, atau detail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 lg:col-span-2"
          />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Semua Aksi</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="grade">Grade</option>
            <option value="ai_error">⚠️ AI Error</option>
            <option value="create_error">⚠️ Create Error</option>
            <option value="update_error">⚠️ Update Error</option>
            <option value="upload_error">⚠️ Upload Error</option>
          </select>
          <input
            type="text"
            placeholder="Resource type..."
            value={resourceFilter}
            onChange={e => setResourceFilter(e.target.value)}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/30 text-amber-300 rounded-lg text-sm font-bold transition-colors"
          >
            Reset Filter
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <span>Dari:</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <span>Sampai:</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Total: <span className="font-bold text-white">{pagination.total}</span> aktivitas
          </span>
          <span>
            Halaman <span className="font-bold text-white">{pagination.page}</span> dari <span className="font-bold text-white">{pagination.totalPages || 1}</span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-8">Memuat log aktivitas...</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-slate-500 py-8 italic border border-white/10 rounded-xl bg-black/20">
          Tidak ada aktivitas yang cocok dengan filter.
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/10 rounded-xl bg-black/20">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-white/5 text-slate-300">
                <th className="p-3 font-bold border-b border-white/10">Waktu</th>
                <th className="p-3 font-bold border-b border-white/10">Pengguna</th>
                <th className="p-3 font-bold border-b border-white/10">Aksi</th>
                <th className="p-3 font-bold border-b border-white/10">Tipe</th>
                <th className="p-3 font-bold border-b border-white/10">Detail Tambahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map(log => (
                <tr key={log.id} className={`group hover:bg-white/5 transition-colors ${log.action.includes("error") ? "bg-red-950/20" : ""}`}>
                  <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString('id-ID')}</td>
                  <td className="p-3 font-medium text-slate-200">{log.userName}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${actionColor(log.action)}`}>
                      {log.action.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{log.resourceType}</td>
                  <td className="p-3 text-xs text-slate-400 max-w-[280px]">
                    {log.details ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate flex-1 min-w-0" title={log.details}>{log.details}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyDetails(log.id, log.details)}
                          aria-label={copiedId === log.id ? "Detail tersalin" : "Salin detail"}
                          className={`relative shrink-0 inline-flex items-center justify-center w-6 h-6 rounded transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 ${copiedId === log.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
                        >
                          {copiedId === log.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                          )}
                          <span
                            role="status"
                            aria-live="polite"
                            className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold whitespace-nowrap border border-white/10 shadow-lg transition-opacity ${copiedId === log.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                          >
                            {copiedId === log.id ? "Tersalin!" : "Salin"}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 p-3 bg-black/20 border border-white/10 rounded-xl">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 rounded-lg text-white text-sm font-bold transition-colors"
          >
            ← Sebelumnya
          </button>
          <span className="text-xs text-slate-400">
            Menampilkan halaman {pagination.page} dari {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 rounded-lg text-white text-sm font-bold transition-colors"
          >
            Selanjutnya →
          </button>
        </div>
      )}
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
              <span className="text-sm font-semibold text-slate-300">Akun Orang Tua</span>
              <Select
                value={form.parentUserId}
                onChange={e => setForm(current => ({ ...current, parentUserId: e.target.value }))}
                className="w-full professional-select"
                disabled={busy}
              >
                <option value="">Pilih Orang Tua...</option>
                {parentUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-300">Akun Siswa</span>
              <Select
                value={form.studentUserId}
                onChange={e => setForm(current => ({ ...current, studentUserId: e.target.value }))}
                className="w-full professional-select"
                disabled={busy}
              >
                <option value="">Pilih Siswa...</option>
                {studentUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-300">Hubungan</span>
              <input
                type="text"
                placeholder="Ayah / Ibu / Wali"
                value={form.relationship}
                onChange={e => setForm(current => ({ ...current, relationship: e.target.value }))}
                className="w-full px-3 py-2 bg-[#27272a] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={busy}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy || !form.parentUserId || !form.studentUserId || !form.relationship}
            className="mt-2 self-start rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
          >
            {busy ? "Menyimpan..." : "Tambahkan"}
          </button>
        </form>
      </Card>

      <Card className="professional-card p-5">
        <div className="professional-card__header mb-0">
          <div>
            <h2 className="professional-card__title">Daftar Relasi Orang Tua & Siswa</h2>
            <p className="professional-card__hint">Total {data.length} relasi yang terdaftar.</p>
          </div>
        </div>

        <div className="overflow-x-auto mt-6 rounded-xl border border-white/10">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#18181b] text-slate-400 text-[11px] uppercase">
                <th className="p-4 font-bold border-b border-white/10">Orang Tua</th>
                <th className="p-4 font-bold border-b border-white/10">Siswa</th>
                <th className="p-4 font-bold border-b border-white/10">Hubungan</th>
                <th className="p-4 font-bold border-b border-white/10 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-[#27272a]/50">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 italic">Belum ada data relasi.</td>
                </tr>
              ) : null}
              {data.map(item => {
                const pUser = parentUsers.find(u => u.id === item.parentId);
                const sUser = studentUsers.find(u => u.id === item.studentId);
                return (
                <tr key={item.id} className="border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-200">{pUser?.name || item.parentName}</div>
                    <div className="text-xs text-slate-400">{pUser?.email || item.parentEmail}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-200">{sUser?.name || item.studentName}</div>
                    <div className="text-xs text-slate-400">{sUser?.email || item.studentEmail}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-400 ring-1 ring-inset ring-blue-500/20">
                      {item.relationship}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={busy}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2 rounded-md transition-colors"
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
    <div className="bg-red-950/30 text-red-400 p-4 rounded-xl border border-red-500/30 text-sm mb-4 flex justify-between items-center shadow-sm">
      <span>{errorMsg}</span>
      <button type="button" onClick={() => setErrorMsg(null)} className="hover:bg-red-900/50 p-1 rounded-md transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  if (isFormOpen) {
    return (
      <div className="bg-black/20 border border-white/10 rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-200">Buat Artikel Blog</h3>
          <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-300">Kembali</button>
        </div>
        <ErrorAlert />
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Judul Artikel</label>
            <input required type="text" className="idetech-input w-full bg-white/5 border-white/10 text-white placeholder-slate-500" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Contoh: Pentingnya Gamifikasi" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kutipan Pendek (Excerpt)</label>
            <textarea className="idetech-input w-full bg-white/5 border-white/10 text-white placeholder-slate-500" rows={2} value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} placeholder="Ringkasan singkat untuk halaman depan..." />
          </div>

          <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-lg">
            <h4 className="font-semibold text-blue-400 flex items-center gap-2 mb-2"><Wand2 className="w-4 h-4"/> AI Writer</h4>
            <div className="flex gap-2">
              <input type="text" className="professional-input flex-1 bg-white/5 border-white/10 text-white placeholder-slate-500" placeholder="Ide tulisan: Manfaat teknologi di kelas..." value={form.prompt} onChange={e => setForm({...form, prompt: e.target.value})} />
              <button type="button" onClick={handleGenerateAI} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors whitespace-nowrap">
                {busy ? "Loading AI..." : "Generate Draft"}
              </button>
            </div>
            <p className="text-xs text-blue-400 mt-2">AI akan membantu menuliskan draf panjang untuk artikel Anda.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Konten (Markdown)</label>
            <textarea required className="idetech-input w-full font-mono text-sm bg-white/5 border-white/10 text-white placeholder-slate-500" rows={12} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="# Judul Besar&#10;&#10;Isi tulisan..." />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status Publikasi</label>
            <select className="idetech-input w-full bg-white/5 border-white/10 text-white" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="draft">Draf (Disembunyikan)</option>
              <option value="published">Publikasi Terbuka</option>
            </select>
          </div>

          <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full flex justify-center">Simpan Artikel</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/10 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-200">Daftar Artikel Blog</h3>
          <p className="text-sm text-slate-400">Kelola informasi publik dan pembaruan IdeTech.</p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"><Plus className="w-4 h-4"/> Buat Artikel Baru</button>
      </div>

      <ErrorAlert />

      {busy && blogs.length === 0 ? (
        <p className="text-center text-slate-500">Memuat data blog...</p>
      ) : blogs.length === 0 ? (
        <div className="text-center bg-black/20 p-8 rounded-xl border border-white/10 text-slate-400">
          Belum ada artikel. Klik "Buat Artikel Baru" untuk mulai.
        </div>
      ) : (
        <div className="grid gap-4">
          {blogs.map(blog => (
            <div key={blog.id} className="bg-black/20 p-4 rounded-xl border border-white/10 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-200">{blog.title}</h4>
                <div className="flex items-center gap-3 text-sm mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${blog.status === 'published' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {blog.status.toUpperCase()}
                  </span>
                  <span className="text-slate-400">{new Date(blog.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(blog.id)} disabled={busy} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg font-semibold transition-colors">Hapus</button>
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

registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload();
  }
});
