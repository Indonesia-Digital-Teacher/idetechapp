import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Save,
  Users,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Step = 1 | 2 | 3;

interface FormData {
  subjectId: string;
  topic: string;
  grade: string;
  semester: "ganjil" | "genap";
  duration: string;
  model: string;
  objectives: string;
  material: string;
  preparation: string;
  activities: string;
  assessment: string;
  reflection: string;
  resources: string;
}

const INITIAL_FORM: FormData = {
  subjectId: "",
  topic: "",
  grade: "7",
  semester: "ganjil",
  duration: "2 x 45 menit",
  model: "Pembelajaran tatap muka",
  objectives: "",
  material: "",
  preparation: "",
  activities: "",
  assessment: "",
  reflection: "",
  resources: ""
};

const STEP_CONFIG = [
  { key: 1, label: "Dasar", title: "Identitas RPP", icon: FileText },
  { key: 2, label: "Rancangan", title: "Pembelajaran", icon: BookOpen },
  { key: 3, label: "Simpan", title: "Asesmen & Simpan", icon: CheckCircle }
] as const;

const DURATION_OPTIONS = ["1 x 45 menit", "2 x 45 menit", "3 x 45 menit", "2 kali pertemuan"];
const MODEL_OPTIONS = [
  "Pembelajaran tatap muka",
  "Project Based Learning (PjBL)",
  "Problem Based Learning (PBL)",
  "Discovery Learning",
  "Inquiry Learning"
];

const section = (title: string, value: string, emptyText = "Belum diisi.") =>
  `## ${title}\n${value.trim() || emptyText}`;

function buildRppContent(form: FormData, subjectName?: string) {
  return [
    "# Rencana Pelaksanaan Pembelajaran (RPP)",
    "## Identitas Pembelajaran",
    `- **Mata pelajaran:** ${subjectName || "Belum dipilih"}`,
    `- **Topik / materi:** ${form.topic || "Belum diisi"}`,
    `- **Kelas:** ${form.grade}`,
    `- **Semester:** ${form.semester === "ganjil" ? "Ganjil" : "Genap"}`,
    `- **Alokasi waktu:** ${form.duration}`,
    `- **Model pembelajaran:** ${form.model}`,
    section("Tujuan Pembelajaran", form.objectives),
    section("Materi Pembelajaran", form.material),
    section("Persiapan Pembelajaran", form.preparation),
    section("Langkah-Langkah Pembelajaran", form.activities),
    section("Asesmen", form.assessment),
    section("Refleksi", form.reflection),
    section("Sumber dan Media Belajar", form.resources)
  ].join("\n\n");
}

export function TeacherRPPGenerator({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rpp-manual-form");
      if (saved) {
        try {
          return { ...INITIAL_FORM, ...JSON.parse(saved) };
        } catch {
          // Use the clean form when an older local draft cannot be parsed.
        }
      }
    }
    return INITIAL_FORM;
  });
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem("rpp-manual-form", JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    fetch("/api/teacher/rpps", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.subjects) setSubjects(data.subjects);
      })
      .catch(() => setError("Daftar mata pelajaran belum dapat dimuat."));
  }, []);

  const updateForm = useCallback((patch: Partial<FormData>) => {
    setForm((current) => ({ ...current, ...patch }));
    setSaveMessage("");
  }, []);

  const selectedSubject = subjects.find((subject) => subject.id === form.subjectId)?.name;
  const preview = useMemo(() => buildRppContent(form, selectedSubject), [form, selectedSubject]);

  const goNext = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (step === 1 && !form.topic.trim()) {
      setError("Topik atau materi perlu diisi terlebih dahulu.");
      return;
    }
    setError("");
    setStep((current) => (current < 3 ? ((current + 1) as Step) : current));
  };

  const goBack = () => setStep((current) => (current > 1 ? ((current - 1) as Step) : current));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.topic.trim()) {
      setStep(1);
      setError("Topik atau materi perlu diisi terlebih dahulu.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSaveMessage("");
    const payload = {
      subjectId: form.subjectId || undefined,
      topic: form.topic.trim(),
      grade: form.grade,
      duration: form.duration,
      model: form.model,
      content: preview,
      status: "draft"
    };

    try {
      const response = await fetch(savedId ? `/api/teacher/rpps/${savedId}` : "/api/teacher/rpps", {
        method: savedId ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "RPP belum dapat disimpan.");
      if (data.id) setSavedId(data.id);
      setSaveMessage(savedId ? "Perubahan RPP berhasil disimpan." : "RPP berhasil disimpan sebagai draf.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Terjadi kesalahan saat menyimpan RPP.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(preview);
    setSaveMessage("Teks RPP disalin ke clipboard.");
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setSavedId(null);
    setSaveMessage("");
    setError("");
    setStep(1);
    localStorage.removeItem("rpp-manual-form");
  };

  const StepIcon = ({ icon: Icon, completed, active }: { icon: React.ComponentType<{ className?: string }>; completed: boolean; active: boolean }) => (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${completed ? "bg-emerald-500 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400 dark:bg-slate-700"}`}>
      {completed ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
    </div>
  );

  const Field = ({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; rows?: number }) => (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-blue-100">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={placeholder} className="w-full resize-y rounded-xl border border-blue-300/40 bg-white/15 px-3 py-2.5 text-sm text-white placeholder:text-blue-200/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <button onClick={onClose} className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-700" aria-label="Tutup form RPP">
          <X className="h-5 w-5" />
        </button>

        <div className="shrink-0 border-b border-slate-200/50 bg-slate-50 px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900/50">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            {STEP_CONFIG.map((item, index) => {
              const completed = step > item.key;
              return <React.Fragment key={item.key}>
                <StepIcon icon={item.icon} completed={completed} active={step === item.key} />
                {index < STEP_CONFIG.length - 1 && <div className="mx-2 h-1.5 flex-1 rounded bg-slate-200" style={{ backgroundColor: completed ? "#22c55e" : undefined }} />}
              </React.Fragment>;
            })}
          </div>
          <div className="mx-auto mt-3 flex max-w-4xl justify-between text-xs text-slate-500 dark:text-slate-400">
            {STEP_CONFIG.map((item) => <div className={`w-1/3 text-center ${step === item.key ? "font-semibold text-blue-600 dark:text-blue-400" : ""}`} key={item.key}><span>{item.label}</span><span className="hidden sm:inline"> · {item.title}</span></div>)}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <div className="w-full shrink-0 overflow-y-auto bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:w-[44%] md:p-8">
            <div className="mb-6">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3 py-1.5 text-sm font-bold text-white"><FileText className="h-4 w-4 text-amber-300" /> Form RPP Manual</div>
              <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">Susun RPP<br /><span className="text-blue-200">sesuai kelas Anda</span></h2>
              <p className="mt-2 text-sm leading-relaxed text-blue-100">Isi komponen RPP sendiri, lihat pratinjau, lalu simpan sebagai draf. Tidak menggunakan Dianyssa AI.</p>
            </div>

            <form onSubmit={step === 3 ? handleSave : goNext} className="space-y-5">
              {step === 1 && <div className="space-y-5">
                <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-blue-100">Topik / Materi <span className="text-amber-300">*</span></span><div className="relative"><BookOpen className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-blue-200" /><input autoFocus required value={form.topic} onChange={(event) => updateForm({ topic: event.target.value })} placeholder="Contoh: Barisan dan Deret Aritmetika" className="w-full rounded-xl border border-blue-300/40 bg-white/15 py-3 pl-10 pr-3 text-sm font-medium text-white placeholder:text-blue-200/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50" /></div></label>
                <div className="grid grid-cols-2 gap-4">
                  <label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-blue-100">Kelas</span><select value={form.grade} onChange={(event) => updateForm({ grade: event.target.value })} className="w-full rounded-xl border border-blue-300/40 bg-white/15 px-3 py-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/50">{Array.from({ length: 12 }, (_, index) => <option className="bg-white text-slate-800" key={index + 1} value={index + 1}>Kelas {index + 1}</option>)}</select></label>
                  <label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-blue-100">Semester</span><select value={form.semester} onChange={(event) => updateForm({ semester: event.target.value as FormData["semester"] })} className="w-full rounded-xl border border-blue-300/40 bg-white/15 px-3 py-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/50"><option className="bg-white text-slate-800" value="ganjil">Ganjil</option><option className="bg-white text-slate-800" value="genap">Genap</option></select></label>
                </div>
                <label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-blue-100">Mata Pelajaran</span><select value={form.subjectId} onChange={(event) => updateForm({ subjectId: event.target.value })} className="w-full rounded-xl border border-blue-300/40 bg-white/15 px-3 py-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/50"><option className="bg-white text-slate-800" value="">Pilih mata pelajaran</option>{subjects.map((subject) => <option className="bg-white text-slate-800" key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                <div className="grid grid-cols-2 gap-4"><label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-blue-100">Alokasi Waktu</span><select value={form.duration} onChange={(event) => updateForm({ duration: event.target.value })} className="w-full rounded-xl border border-blue-300/40 bg-white/15 px-3 py-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/50">{DURATION_OPTIONS.map((duration) => <option className="bg-white text-slate-800" key={duration}>{duration}</option>)}</select></label><label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-blue-100">Model</span><select value={form.model} onChange={(event) => updateForm({ model: event.target.value })} className="w-full rounded-xl border border-blue-300/40 bg-white/15 px-3 py-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/50">{MODEL_OPTIONS.map((model) => <option className="bg-white text-slate-800" key={model}>{model}</option>)}</select></label></div>
              </div>}

              {step === 2 && <div className="space-y-5">
                <Field label="Tujuan Pembelajaran" value={form.objectives} onChange={(objectives) => updateForm({ objectives })} placeholder="Tuliskan kompetensi yang diharapkan dikuasai peserta didik." />
                <Field label="Materi Pembelajaran" value={form.material} onChange={(material) => updateForm({ material })} placeholder="Tuliskan pokok materi, konsep, atau keterampilan yang dipelajari." />
                <Field label="Persiapan Pembelajaran" value={form.preparation} onChange={(preparation) => updateForm({ preparation })} placeholder="Contoh: menyiapkan LKPD, proyektor, kelompok belajar." rows={3} />
                <Field label="Langkah-Langkah Pembelajaran" value={form.activities} onChange={(activities) => updateForm({ activities })} placeholder="Tuliskan kegiatan pendahuluan, inti, dan penutup. Gunakan baris baru atau daftar agar mudah dibaca." rows={6} />
              </div>}

              {step === 3 && <div className="space-y-5">
                <Field label="Asesmen" value={form.assessment} onChange={(assessment) => updateForm({ assessment })} placeholder="Contoh: observasi diskusi, kuis, penilaian produk, dan rubrik." />
                <Field label="Refleksi dan Tindak Lanjut" value={form.reflection} onChange={(reflection) => updateForm({ reflection })} placeholder="Tuliskan refleksi guru/peserta didik serta rencana tindak lanjut." rows={3} />
                <Field label="Sumber dan Media Belajar" value={form.resources} onChange={(resources) => updateForm({ resources })} placeholder="Contoh: buku paket, LKPD, video, lingkungan sekitar." rows={3} />
              </div>}

              <div className="flex justify-between border-t border-white/15 pt-4">
                {step > 1 ? <button type="button" onClick={goBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20"><ArrowLeft className="h-4 w-4" /> Kembali</button> : <span />}
                {step < 3 ? <button type="submit" className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"><span>Lanjutkan</span><ArrowRight className="h-4 w-4" /></button> : <button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-amber-300 disabled:opacity-50"><Save className="h-4 w-4" />{isSaving ? "Menyimpan..." : "Simpan RPP"}</button>}
              </div>
            </form>
          </div>

          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800"><div><h3 className="font-bold text-slate-800 dark:text-slate-200">Pratinjau RPP</h3><p className="text-xs text-slate-500 dark:text-slate-400">Pratinjau diperbarui dari isian formulir Anda.</p></div><div className="flex gap-2"><button type="button" onClick={handleCopy} className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"><Download className="h-4 w-4" /> Salin</button><button type="button" onClick={resetForm} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">Buat Baru</button></div></div>
            {(error || saveMessage) && <div className={`mx-6 mt-4 rounded-xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"}`}>{error || saveMessage}</div>}
            <div className="flex-1 overflow-y-auto p-6"><div className="prose prose-sm max-w-none rounded-2xl border border-slate-200 bg-white p-6 shadow-sm prose-headings:font-black prose-h1:text-2xl prose-h2:text-xl prose-p:text-slate-600 prose-li:text-slate-600 dark:prose-invert dark:border-slate-700 dark:bg-slate-800 dark:prose-p:text-slate-300 dark:prose-li:text-slate-300"><ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
