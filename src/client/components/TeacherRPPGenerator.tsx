import React, { useState } from 'react';
import { X, Sparkles, BookOpen, Clock, Users, ChevronRight, FileText, Download, ChevronUp, ChevronDown, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

export function TeacherRPPGenerator({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formMinimized, setFormMinimized] = useState(false);
  const [form, setForm] = useState({
    subjectId: '',
    topic: '',
    grade: '7',
    duration: '2x45 Menit',
    model: 'Project Based Learning'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);

  React.useEffect(() => {
    fetch('/api/teacher/rpps')
      .then(res => res.json())
      .then(data => {
        if (data.subjects) setSubjects(data.subjects);
        if (data.classes) setClasses(data.classes);
      })
      .catch(console.error);
  }, []);

  async function handleBankSubmit() {
    setIsSubmittingBank(true);
    try {
      // 1. Save RPP as published
      const res = await fetch("/api/teacher/rpps", {
        method: "POST",
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
        // 2. Submit to Bank Ide
        const submitRes = await fetch("/api/teacher/bank-submit", {
          method: "POST",
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
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.topic) return;
    
    setIsLoading(true);
    setStep(2);
    setError('');
    
    try {
      const prompt = `Bertindaklah sebagai Guru Profesional dan Ahli Kurikulum Merdeka. Buatkan Rencana Pelaksanaan Pembelajaran (RPP) / Modul Ajar lengkap untuk:
- Mata Pelajaran / Topik: ${form.topic}
- Kelas: ${form.grade}
- Alokasi Waktu: ${form.duration}
- Model Pembelajaran: ${form.model}

Formatlah menggunakan Markdown dengan struktur yang rapi (Informasi Umum, Komponen Inti, Langkah Pembelajaran, Asesmen).`;

      const res = await fetch("/api/teacher/generate-ai", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify({ prompt })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal terhubung ke layanan AI.');
        return;
      }
      if (data.reply) {
        setResult(data.reply);
        setFormMinimized(true);
      } else {
        setError('Gagal mendapatkan respon dari AI Dianyssa.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi saat men-generate RPP.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result);
    alert('RPP disalin ke clipboard!');
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/50 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 z-10">
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100/80 backdrop-blur text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-all shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Sidebar / Header Form */}
          <div className={`w-full md:w-2/5 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 flex-col shrink-0 overflow-y-auto transition-all ${formMinimized && result && !isLoading ? 'hidden md:flex' : 'flex'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 text-white w-fit text-sm font-bold mb-6 border border-white/20 shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-300" /> AI RPP Generator
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Modul Ajar <br/><span className="text-blue-200">Instan</span></h2>
            <p className="text-blue-100 text-sm mb-8 leading-relaxed">Buat RPP dan Modul Ajar Kurikulum Merdeka hanya dalam hitungan detik dengan bantuan Dianyssa AI.</p>
            
            <form onSubmit={handleGenerate} className="space-y-5 mt-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">Mata Pelajaran (Opsional)</label>
                  <select 
                    value={form.subjectId}
                    onChange={e => setForm({...form, subjectId: e.target.value})}
                    className="w-full px-4 py-3 bg-white/15 border border-blue-300/40 rounded-xl text-white focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm font-medium appearance-none"
                  >
                    <option value="" className="text-slate-800 bg-white">-- Pilih Mapel --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id} className="text-slate-800 bg-white">{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">Topik / Materi</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BookOpen className="h-4 w-4 text-blue-300" />
                    </div>
                    <input 
                      type="text" 
                      required
                      placeholder="Cth: Sistem Tata Surya"
                      value={form.topic}
                      onChange={e => setForm({...form, topic: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-blue-400/30 rounded-xl text-white placeholder-blue-300/50 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm font-medium"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">Kelas</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users className="h-4 w-4 text-blue-300" />
                    </div>
                    <select 
                      value={form.grade}
                      onChange={e => setForm({...form, grade: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-white/15 border border-blue-300/40 rounded-xl text-white focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm font-medium appearance-none"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i+1} value={i+1} className="text-slate-800 bg-white">Kelas {i+1}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">Durasi</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-4 w-4 text-blue-300" />
                    </div>
                    <select 
                      value={form.duration}
                      onChange={e => setForm({...form, duration: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-white/15 border border-blue-300/40 rounded-xl text-white focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm font-medium appearance-none"
                    >
                      <option value="1x45 Menit" className="text-slate-800 bg-white">1x45 Menit</option>
                      <option value="2x45 Menit" className="text-slate-800 bg-white">2x45 Menit</option>
                      <option value="3x45 Menit" className="text-slate-800 bg-white">3x45 Menit</option>
                      <option value="2 Kali Pertemuan" className="text-slate-800 bg-white">2 Pertemuan</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">Model Pembelajaran</label>
                <select 
                  value={form.model}
                  onChange={e => setForm({...form, model: e.target.value})}
                  className="w-full px-4 py-3 bg-white/15 border border-blue-300/40 rounded-xl text-white focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm font-medium appearance-none"
                >
                  <option value="Project Based Learning" className="text-slate-800 bg-white">Project Based Learning (PjBL)</option>
                  <option value="Problem Based Learning" className="text-slate-800 bg-white">Problem Based Learning (PBL)</option>
                  <option value="Discovery Learning" className="text-slate-800 bg-white">Discovery Learning</option>
                  <option value="Inquiry Learning" className="text-slate-800 bg-white">Inquiry Learning</option>
                  <option value="Tatap Muka Biasa" className="text-slate-800 bg-white">Tatap Muka Konvensional</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={isLoading || !form.topic}
                className="w-full mt-4 bg-white text-blue-700 hover:bg-blue-50 py-3.5 px-4 rounded-xl font-bold text-sm transition-all shadow-[0_8px_20px_rgba(255,255,255,0.2)] hover:shadow-[0_12px_25px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {isLoading ? 'Menyusun RPP...' : 'Generate RPP Sekarang'}
              </button>
            </form>
          </div>
          
          {/* Toggle Button for Mobile */}
          {result && !isLoading && (
            <button 
              onClick={() => setFormMinimized(!formMinimized)}
              className="md:hidden w-full bg-slate-200 text-slate-700 flex items-center justify-center py-2 shadow-sm border-y border-slate-300 shrink-0 font-bold text-sm"
            >
              {formMinimized ? (
                <><ChevronDown className="w-5 h-5 mr-2" /> Buka Form</>
              ) : (
                <><ChevronUp className="w-5 h-5 mr-2" /> Sembunyikan Form</>
              )}
            </button>
          )}

          {/* Output Area */}
          <div className="w-full md:w-3/5 bg-slate-50 flex flex-col relative overflow-hidden">
            {step === 1 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <FileText className="w-12 h-12 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Belum ada hasil</h3>
                <p className="text-slate-500 max-w-sm text-sm">Isi form di sebelah kiri dan klik Generate untuk membuat RPP berbasis AI yang sesuai dengan Kurikulum Merdeka.</p>
              </div>
            ) : isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-10 h-10 text-blue-500 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Dianyssa sedang berpikir...</h3>
                <p className="text-slate-500 text-sm">Menyusun tujuan pembelajaran, komponen inti, dan asesmen yang sesuai.</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4"><X className="w-8 h-8" /></div>
                <p className="text-slate-700 font-medium">{error}</p>
                <button onClick={() => setStep(1)} className="mt-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-bold text-slate-700 transition-colors">Coba Lagi</button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-white border-b border-slate-200 shrink-0">
                  <h3 className="font-bold text-slate-800">Hasil RPP AI</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={handleBankSubmit} disabled={isSubmittingBank} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                      <Share2 className="w-4 h-4" /> {isSubmittingBank ? "Mengirim..." : "Ke Bank Ide"}
                    </button>
                    <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-sm font-bold transition-colors">
                      <Download className="w-4 h-4" /> Salin Teks
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm prose prose-sm md:prose-base prose-blue max-w-none prose-headings:font-black prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-600 prose-li:text-slate-600">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                      {result}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

