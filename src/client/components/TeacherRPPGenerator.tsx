import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, BookOpen, Clock, Users, ChevronRight, FileText, Download, ChevronUp, ChevronDown, Share2, ArrowLeft, ArrowRight, CheckCircle, HelpCircle, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { CP_DATA, type Fase } from '../data/cpData';

type Step = 1 | 2 | 3;

interface FormData {
  subjectId: string;
  topic: string;
  grade: string;
  duration: string;
  model: string;
  mapel: string;
  fase: Fase;
  semester: 'ganjil' | 'genap';
  pertemuanKe: string;
}

const INITIAL_FORM: FormData = {
  subjectId: '',
  topic: '',
  grade: '7',
  duration: '2x45 Menit',
  model: 'Project Based Learning',
  mapel: '',
  fase: 'E',
  semester: 'ganjil',
  pertemuanKe: ''
};

const STEP_CONFIG = [
  { key: 1, label: 'Dasar', title: 'Informasi Dasar', desc: 'Isi minimal topik, kelas & durasi', icon: FileText },
  { key: 2, label: 'Lanjutan', title: 'Opsi Lanjutan', desc: 'Model pembelajaran & aksen materi resmi', icon: Sparkles },
  { key: 3, label: 'Konfirmasi', title: 'Konfirmasi & Generate', desc: 'Pratinjau prompt & hasilkan RPP', icon: CheckCircle }
] as const;

const GRADE_TO_FASE: Record<string, Fase> = {
  '10': 'E', '11': 'F', '12': 'F'
};

const DURATION_OPTIONS = [
  '1x45 Menit',
  '2x45 Menit',
  '3x45 Menit',
  '2 Kali Pertemuan'
];

const MODEL_OPTIONS = [
  { value: 'Project Based Learning', label: 'Project Based Learning (PjBL)' },
  { value: 'Problem Based Learning', label: 'Problem Based Learning (PBL)' },
  { value: 'Discovery Learning', label: 'Discovery Learning' },
  { value: 'Inquiry Learning', label: 'Inquiry Learning' },
  { value: 'Tatap Muka Biasa', label: 'Tatap Muka Konvensional' }
];

const SEMESTER_OPTIONS = [
  { value: 'ganjil', label: 'Ganjil' },
  { value: 'genap', label: 'Genap' }
] as const;

export function TeacherRPPGenerator({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [formMinimized, setFormMinimized] = useState(false);
  const [form, setForm] = useState<FormData>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rpp-generator-form');
      if (saved) {
        try {
          return { ...INITIAL_FORM, ...JSON.parse(saved) };
        } catch {}
      }
    }
    return INITIAL_FORM;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState('');
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [classes, setClasses] = useState<{id: string, name: string, grade?: string}[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMateriResmi, setShowMateriResmi] = useState(false);

  // Persist form to localStorage
  useEffect(() => {
    localStorage.setItem('rpp-generator-form', JSON.stringify(form));
  }, [form]);

  // Fetch subjects & classes
  useEffect(() => {
    fetch('/api/teacher/rpps', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.subjects) setSubjects(data.subjects);
        if (data.classes) setClasses(data.classes);
      })
      .catch(console.error);
  }, []);

  // Auto-set fase when grade changes
  useEffect(() => {
    const fase = GRADE_TO_FASE[form.grade];
    if (fase && fase !== form.fase) {
      setForm(prev => ({ ...prev, fase }));
    }
  }, [form.grade]);

  // Auto-set grade from single class
  useEffect(() => {
    if (classes.length === 1 && classes[0].grade && form.grade === '7') {
      setForm(prev => ({ ...prev, grade: classes[0].grade! }));
    }
  }, [classes]);

  // Auto-set subjectId from single subject
  useEffect(() => {
    if (subjects.length === 1 && !form.subjectId) {
      setForm(prev => ({ ...prev, subjectId: subjects[0].id }));
    }
  }, [subjects]);

  const updateForm = useCallback((patch: Partial<FormData>) => {
    setForm(prev => ({ ...prev, ...patch }));
  }, []);

  const goNext = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (step === 1 && !form.topic) return;
    setStep(prev => (prev < 3 ? (prev + 1 as Step) : prev));
  };

  const goBack = () => {
    setStep(prev => (prev > 1 ? (prev - 1 as Step) : prev));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic) return;
    
    setIsLoading(true);
    setError('');
    setFallbackNotice('');
    
    try {
      const prompt = `Bertindaklah sebagai Guru Profesional dan Ahli Kurikulum Merdeka. Buatkan Rencana Pelaksanaan Pembelajaran (RPP) / Modul Ajar lengkap untuk:
- Mata Pelajaran / Topik: ${form.topic}
- Kelas: ${form.grade}
- Alokasi Waktu: ${form.duration}
- Model Pembelajaran: ${form.model}

Formatlah menggunakan Markdown dengan struktur yang rapi (Informasi Umum, Komponen Inti, Langkah Pembelajaran, Asesmen).`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      const token = localStorage.getItem("token");
      if (token && token !== "null" && token !== "undefined") {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/teacher/generate-ai", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          prompt,
          mapel: form.mapel || null,
          fase: form.fase || null,
          semester: form.semester || null,
          pertemuanKe: form.pertemuanKe ? Number(form.pertemuanKe) : null
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || 'Gagal terhubung ke layanan AI.';
        const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('cybra') || msg.toLowerCase().includes('tidak tersedia');
        setError(isTimeout
          ? 'Layanan AI CYBRA sedang tidak tersedia. Silakan coba lagi nanti, atau aktifkan Aksen Materi Resmi untuk hasil fallback.'
          : msg);
        return;
      }
      if (data.reply) {
        setResult(data.reply);
        setFormMinimized(true);
        if (data.fallback) {
          setFallbackNotice(data.message || 'RPP ini dibuat otomatis dari materi resmi karena AI CYBRA sedang tidak tersedia.');
        }
      } else {
        setError('Gagal mendapatkan respon dari AI Dianyssa.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi saat menghubungi AI. Cek koneksi internet atau coba mode fallback dengan Aksen Materi Resmi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    alert('RPP disalin ke clipboard!');
  };

  const handleBankSubmit = async () => {
    setIsSubmittingBank(true);
    try {
      const res = await fetch("/api/teacher/rpps", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: form.subjectId || undefined,
          topic: form.topic,
          grade: form.grade,
          duration: form.duration,
          model: form.model,
          content: result,
          status: "published"
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        const submitRes = await fetch("/api/teacher/bank-submit", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "rpp", id: data.id })
        });
        
        if (submitRes.ok) {
          alert("RPP berhasil disimpan dan dikirim ke antrean kurasi Bank Ide!");
        } else {
          alert("RPP berhasil disimpan, tetapi gagal dikirim ke Bank Ide.");
        }
      } else {
        alert("Gagal menyimpan RPP.");
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmittingBank(false);
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setStep(1);
    setResult('');
    setError('');
    setFallbackNotice('');
    setFormMinimized(false);
  };

  // Build preview prompt for step 3
  const buildPreviewPrompt = () => {
    const lines = [
      `**Topik:** ${form.topic || '—'}`,
      `**Kelas:** ${form.grade}`,
      `**Durasi:** ${form.duration}`,
      `**Model:** ${form.model}`
    ];
    if (form.mapel) lines.push(`**Mapel (Aksen):** ${CP_DATA[form.fase]?.find(m => m.value === form.mapel)?.label || form.mapel}`);
    if (form.fase) lines.push(`**Fase:** ${form.fase} (Kelas ${form.fase === 'E' ? 'X' : 'XI-XII'})`);
    if (form.semester) lines.push(`**Semester:** ${form.semester.charAt(0).toUpperCase() + form.semester.slice(1)}`);
    if (form.pertemuanKe) lines.push(`**Pertemuan Ke:** ${form.pertemuanKe}`);
    return lines.join('\n');
  };

  const StepIcon = ({ icon: Icon, completed, active }: { icon: React.ComponentType<{className?: string}>; completed: boolean; active: boolean }) => (
    <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${completed ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
      {completed ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/50 dark:border-slate-700 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 z-10">
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-all shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-slate-700/50 shrink-0">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {STEP_CONFIG.map((s, idx) => {
              const isCompleted = step > s.key;
              const isActive = step === s.key;
              return (
                <React.Fragment key={s.key}>
                  <StepIcon icon={s.icon} completed={isCompleted} active={isActive} />
                  {idx < STEP_CONFIG.length - 1 && (
                    <div className="flex-1 h-1.5 mx-2 rounded transition-colors" style={{ backgroundColor: isCompleted ? '#22c55e' : '#e2e8f0' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 max-w-4xl mx-auto">
            {STEP_CONFIG.map(s => (
              <div key={s.key} className={`flex flex-col items-center w-1/3 transition-colors ${step === s.key ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>
                <span>{s.label}</span>
                <span className="hidden sm:block">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Sidebar / Form Area */}
          <div className={`w-full md:w-2/5 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 flex flex-col shrink-0 overflow-y-auto transition-all ${formMinimized && result && !isLoading ? 'hidden md:flex' : 'flex'}`}>
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="mb-6 md:mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 text-white w-fit text-sm font-bold mb-4 border border-white/20 shadow-sm">
                  <Sparkles className="w-4 h-4 text-amber-300" /> AI RPP Generator
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">Modul Ajar <br/><span className="text-blue-200">Instan</span></h2>
                <p className="text-blue-100 text-sm leading-relaxed">Buat RPP & Modul Ajar Kurikulum Merdeka dalam detik dengan Dianyssa AI.</p>
              </div>

              {/* Step Content */}
              <form onSubmit={step === 3 ? handleGenerate : goNext} className="flex-1 flex flex-col space-y-5">
                {/* STEP 1: Basic Info */}
                {step === 1 && (
                  <div className="space-y-5 animate-in slide-in-from-left-2 fade-in duration-300" role="tabpanel" aria-label="Langkah 1: Informasi Dasar">
                    <div className="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase tracking-wider mb-4">
                      <FileText className="w-4 h-4" />
                      <span>Informasi Wajib</span>
                    </div>

                    <div>
                      <label className="block text-blue-100 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                        Topik / Materi <span className="text-amber-300" aria-hidden="true">*</span>
                        <span className="relative inline-block" title="Topik pembelajaran yang akan diajarkan, mis: 'Sistem Tata Surya' atau 'Persamaan Linier'">
                          <HelpCircle className="w-3 h-3 opacity-60" />
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <BookOpen className="h-4 w-4 text-blue-300" />
                        </div>
                        <input 
                          type="text" 
                          required
                          autoFocus
                          placeholder="Cth: Sistem Tata Surya"
                          value={form.topic}
                          onChange={e => updateForm({ topic: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-blue-400/30 rounded-xl text-white placeholder-blue-300/50 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm font-medium"
                          aria-required="true"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-blue-100 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                          Kelas <span className="text-amber-300" aria-hidden="true">*</span>
                          <span className="relative inline-block" title="Kelas siswa (1-12). Fase otomatis menyesuaikan: Kelas 10=Fase E, 11-12=Fase F">
                            <HelpCircle className="w-3 h-3 opacity-60" />
                          </span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Users className="h-4 w-4 text-blue-300" />
                          </div>
                          <select 
                            value={form.grade}
                            onChange={e => updateForm({ grade: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-white/15 border border-blue-300/40 rounded-xl text-white focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm font-medium appearance-none"
                            aria-required="true"
                          >
                            {[...Array(12)].map((_, i) => (
                              <option key={i+1} value={i+1} className="text-slate-800 bg-white">Kelas {i+1}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-blue-100 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                          Durasi <span className="text-amber-300" aria-hidden="true">*</span>
                          <span className="relative inline-block" title="Alokasi waktu pembelajaran">
                            <HelpCircle className="w-3 h-3 opacity-60" />
                          </span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Clock className="h-4 w-4 text-blue-300" />
                          </div>
                          <select 
                            value={form.duration}
                            onChange={e => updateForm({ duration: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-white/15 border border-blue-300/40 rounded-xl text-white focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm font-medium appearance-none"
                            aria-required="true"
                          >
                            {DURATION_OPTIONS.map(d => (
                              <option key={d} value={d} className="text-slate-800 bg-white">{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">Mata Pelajaran (Opsional)</label>
                      <select 
                        value={form.subjectId}
                        onChange={e => updateForm({ subjectId: e.target.value })}
                        className="w-full px-4 py-3 bg-white/15 border border-blue-300/40 rounded-xl text-white focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm font-medium appearance-none"
                      >
                        <option value="" className="text-slate-800 bg-white">-- Pilih Mapel --</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id} className="text-slate-800 bg-white">{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Step 1 Footer */}
                    <div className="flex justify-end pt-4 border-t border-white/10 mt-auto">
                      <button 
                        type="submit" 
                        disabled={!form.topic || isLoading}
                        className="bg-white text-blue-700 hover:bg-blue-50 py-3 px-6 rounded-xl font-bold text-sm transition-all shadow-[0_8px_20px_rgba(255,255,255,0.2)] hover:shadow-[0_12px_25px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                      >
                        <span>Lanjutkan</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Advanced Options */}
                {step === 2 && (
                  <div className="space-y-5 animate-in slide-in-from-right-2 fade-in duration-300" role="tabpanel" aria-label="Langkah 2: Opsi Lanjutan">
                    <div className="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase tracking-wider mb-4">
                      <Sparkles className="w-4 h-4" />
                      <span>Opsi Lanjutan (Opsional)</span>
                    </div>

                    {/* Model Pembelajaran */}
                    <div className="p-4 rounded-xl bg-white/10 border border-white/10">
                      <label className="block text-blue-100 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1">
                        Model Pembelajaran
                        <span className="relative inline-block" title="Pendekatan pembelajaran yang akan digunakan. PjBL direkomendasikan untuk Kurikulum Merdeka">
                          <HelpCircle className="w-3 h-3 opacity-60" />
                        </span>
                      </label>
                      <select 
                        value={form.model}
                        onChange={e => updateForm({ model: e.target.value })}
                        className="w-full px-4 py-3 bg-white/15 border border-blue-300/40 rounded-xl text-white focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm font-medium appearance-none"
                      >
                        {MODEL_OPTIONS.map(m => (
                          <option key={m.value} value={m.value} className="text-slate-800 bg-white">{m.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Aksen Materi Resmi - Collapsible */}
                    <div className="p-4 rounded-xl bg-white/10 border border-white/10">
                      <button
                        type="button"
                        onClick={() => setShowMateriResmi(!showMateriResmi)}
                        className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                        aria-expanded={showMateriResmi}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-amber-300" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Aksen Materi Resmi (Opsional)</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-blue-200 transition-transform ${showMateriResmi ? 'rotate-180' : ''}`} />
                      </button>

                      {showMateriResmi && (
                        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                          <p className="text-[10px] text-blue-100/70 leading-relaxed">
                            Jika diisi, sistem akan menyisipkan outline materi resmi (BSKAP/ATP) sesuai mapel/fase/semester ke prompt AI agar RPP lebih sesuai kurikulum.
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                Mapel
                                <span className="relative inline-block" title="Mata pelajaran resmi dari BSKAP/ATP">
                                  <HelpCircle className="w-3 h-3 opacity-60" />
                                </span>
                              </label>
                              <select
                                value={form.mapel}
                                onChange={e => updateForm({ mapel: e.target.value })}
                                className="w-full px-3 py-2.5 bg-white/15 border border-blue-300/40 rounded-xl text-white focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-xs font-medium appearance-none"
                              >
                                <option value="" className="text-slate-800 bg-white">-- Tidak pakai --</option>
                                {CP_DATA[form.fase]?.map(m => (
                                  <option key={m.value} value={m.value} className="text-slate-800 bg-white">{m.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                Fase
                                <span className="relative inline-block" title="Fase E = Kelas X, Fase F = Kelas XI-XII. Otomatis mengikuti kelas di atas">
                                  <HelpCircle className="w-3 h-3 opacity-60" />
                                </span>
                              </label>
                              <select
                                value={form.fase}
                                onChange={e => updateForm({ fase: e.target.value as Fase, mapel: '' })}
                                className="w-full px-3 py-2.5 bg-white/15 border border-blue-300/40 rounded-xl text-white focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-xs font-medium appearance-none"
                              >
                                <option value="E" className="text-slate-800 bg-white">Fase E (Kelas X)</option>
                                <option value="F" className="text-slate-800 bg-white">Fase F (Kelas XI-XII)</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1.5">Semester</label>
                              <select
                                value={form.semester}
                                onChange={e => updateForm({ semester: e.target.value as 'ganjil' | 'genap' })}
                                className="w-full px-3 py-2.5 bg-white/15 border border-blue-300/40 rounded-xl text-white focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-xs font-medium appearance-none"
                              >
                                {SEMESTER_OPTIONS.map(s => (
                                  <option key={s.value} value={s.value} className="text-slate-800 bg-white">{s.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                Pertemuan Ke-
                                <span className="relative inline-block" title="Nomor pertemuan sesuai ATP (1-20). Akan mengambil outline materi pertemuan tersebut">
                                  <HelpCircle className="w-3 h-3 opacity-60" />
                                </span>
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={form.pertemuanKe}
                                onChange={e => updateForm({ pertemuanKe: e.target.value })}
                                placeholder="Cth: 3"
                                className="w-full px-3 py-2.5 bg-white/10 border border-blue-400/30 rounded-xl text-white placeholder-blue-300/50 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-xs font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Step 2 Footer */}
                    <div className="flex justify-between pt-4 border-t border-white/10 mt-auto">
                      <button 
                        type="button"
                        onClick={goBack}
                        className="px-4 py-3 bg-white/10 text-white hover:bg-white/20 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Kembali</span>
                      </button>
                      <button 
                        type="submit"
                        className="bg-white text-blue-700 hover:bg-blue-50 py-3 px-6 rounded-xl font-bold text-sm transition-all shadow-[0_8px_20px_rgba(255,255,255,0.2)] hover:shadow-[0_12px_25px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                      >
                        <span>Konfirmasi</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Confirmation */}
                {step === 3 && (
                  <div className="space-y-5 animate-in slide-in-from-right-2 fade-in duration-300" role="tabpanel" aria-label="Langkah 3: Konfirmasi & Generate">
                    <div className="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase tracking-wider mb-4">
                      <CheckCircle className="w-4 h-4" />
                      <span>Konfirmasi & Generate</span>
                    </div>

                    <div className="p-4 rounded-xl bg-white/10 border border-white/10 space-y-3">
                      <h4 className="text-white font-semibold text-sm">Pratinjau Prompt yang Akan Dikirim ke AI</h4>
                      <div className="bg-white/5 rounded-lg p-4 font-mono text-xs text-blue-100 whitespace-pre-line border border-white/10 max-h-60 overflow-y-auto">
                        {buildPreviewPrompt()}
                      </div>
                      <p className="text-[10px] text-blue-100/60">
                        AI akan menghasilkan RPP lengkap dengan struktur: Informasi Umum → Tujuan Pembelajaran (CP/ATP) → Langkah Pembelajaran → Asesmen.
                      </p>
                    </div>

                    {/* Estimated output info */}
                    <div className="p-4 rounded-xl bg-white/10 border border-white/10 space-y-2">
                      <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Estimasi Output
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs text-blue-100">
                        <div className="flex items-center gap-1"><FileText className="w-3 h-3" /> ~8-12 bagian markdown</div>
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> 15-30 detik generate</div>
                        <div className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Sesuai Kurikulum Merdeka</div>
                        <div className="flex items-center gap-1"><Users className="w-3 h-3" /> Siap pakai / edit</div>
                      </div>
                    </div>

                    {/* Step 3 Footer */}
                    <div className="flex justify-between pt-4 border-t border-white/10 mt-auto">
                      <button 
                        type="button"
                        onClick={goBack}
                        className="px-4 py-3 bg-white/10 text-white hover:bg-white/20 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Kembali</span>
                      </button>
                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className="bg-amber-400 text-slate-900 hover:bg-amber-300 py-3 px-6 rounded-xl font-bold text-sm transition-all shadow-[0_8px_20px_rgba(251,191,36,0.4)] hover:shadow-[0_12px_25px_rgba(251,191,36,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-slate-900/50 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                        {isLoading ? 'Menyusun RPP...' : 'Generate RPP Sekarang'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Mobile Toggle Button */}
          {result && !isLoading && (
            <button 
              onClick={() => setFormMinimized(!formMinimized)}
              className="md:hidden w-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center py-2 shadow-sm border-y border-slate-300 dark:border-slate-600 shrink-0 font-bold text-sm"
            >
              {formMinimized ? (
                <><ChevronDown className="w-5 h-5 mr-2" /> Buka Form</>
              ) : (
                <><ChevronUp className="w-5 h-5 mr-2" /> Sembunyikan Form</>
              )}
            </button>
          )}

          {/* Output Area */}
          <div className="w-full md:w-3/5 bg-slate-50 dark:bg-slate-900 flex flex-col relative overflow-hidden">
            {fallbackNotice && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-5 py-3 flex items-start gap-3 shrink-0">
                <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">!</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{fallbackNotice}</p>
              </div>
            )}
            {step === 1 || step === 2 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <FileText className="w-12 h-12 text-blue-400 dark:text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Belum ada hasil</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm">Lengkapi form di sebelah kiri dan klik <strong>Konfirmasi</strong> untuk membuat RPP berbasis AI.</p>
              </div>
            ) : isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-10 h-10 text-blue-500 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Dianyssa sedang berpikir...</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Menyusun tujuan pembelajaran, komponen inti, dan asesmen yang sesuai.</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mb-4"><X className="w-8 h-8" /></div>
                <p className="text-slate-700 dark:text-slate-300 font-medium mb-4">{error}</p>
                <button onClick={() => { setStep(1); setError(''); }} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">Coba Lagi</button>
              </div>
            ) : result ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Hasil RPP AI</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={handleBankSubmit} disabled={isSubmittingBank} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                      <Share2 className="w-4 h-4" /> {isSubmittingBank ? "Mengirim..." : "Ke Bank Ide"}
                    </button>
                    <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg text-sm font-bold transition-colors">
                      <Download className="w-4 h-4" /> Salin Teks
                    </button>
                    <button onClick={resetForm} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg text-sm font-bold transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Buat Baru
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm prose prose-sm md:prose-base prose-blue dark:prose-invert max-w-none prose-headings:font-black prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-li:text-slate-600 dark:prose-li:text-slate-300">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                      {result}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}