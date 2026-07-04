import React, { useState, useEffect } from "react";
import { UserCircle2, LogOut, CheckCircle2, User, FileText, Bell, Plus, Loader2, X, Info, Target, BookOpen, Activity } from "lucide-react";

async function parentApi<T>(path: string, init?: RequestInit): Promise<T> {
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
    throw new Error(payload.message ?? `HTTP ${response.status}`);
  }
  return payload as T;
}

export function ParentFriendlyDashboard({
  user,
  onLogout
}: {
  user: any;
  onLogout: () => void;
}) {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"anak" | "laporan" | "profil">("anak");
  const [busy, setBusy] = useState(true);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [connectEmail, setConnectEmail] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectMessage, setConnectMessage] = useState({ type: "", text: "" });
  const [studentSuggestions, setStudentSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (connectEmail.length >= 2) {
      const delayFn = setTimeout(() => {
        parentApi<{ students: any[] }>(`/api/parent/search-students?q=${encodeURIComponent(connectEmail)}`)
          .then(res => {
            setStudentSuggestions(res.students);
            setShowSuggestions(true);
          })
          .catch(err => {
            console.error("Gagal memuat saran siswa:", err);
            setStudentSuggestions([]);
          });
      }, 300);
      return () => clearTimeout(delayFn);
    } else {
      setStudentSuggestions([]);
      setShowSuggestions(false);
    }
  }, [connectEmail]);

  const loadChildren = () => {
    parentApi<{ children: any[] }>("/api/parent/reports")
      .then((res) => {
        setChildren(res.children);
        setSelectedChild(current => {
          if (current) {
            const updated = res.children.find(c => c.id === current.id);
            return updated || current;
          }
          return res.children[0] || null;
        });
      })
      .catch((err) => console.error("Gagal memuat laporan anak:", err))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    Promise.all([
      parentApi<{ children: any[] }>("/api/parent/reports"),
      parentApi<{ announcements: any[] }>("/api/admin/announcements").catch(() => ({ announcements: [] }))
    ])
      .then(([res, annRes]) => {
        setChildren(res.children);
        if (res.children.length > 0) {
          setSelectedChild(res.children[0]);
        }
        setAnnouncements(annRes.announcements.filter((a: any) => a.isActive));
      })
      .catch((err) => console.error("Gagal memuat data:", err))
      .finally(() => setBusy(false));

    // Polling setiap 10 detik untuk mendapatkan update real-time dari guru
    const pollInterval = setInterval(() => {
      parentApi<{ children: any[] }>("/api/parent/reports")
        .then((res) => {
          setChildren(res.children);
          setSelectedChild(current => {
            if (current) {
              const updated = res.children.find(c => c.id === current.id);
              return updated || current;
            }
            return res.children[0] || null;
          });
        })
        .catch(() => {});
    }, 10000);

    return () => clearInterval(pollInterval);
  }, []);

  const handleConnect = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!connectEmail.trim()) return;
    setConnectLoading(true);
    setConnectMessage({ type: "", text: "" });
    try {
      await parentApi("/api/parent/connect", {
        method: "POST",
        body: JSON.stringify({ studentEmail: connectEmail })
      });
      setConnectMessage({ type: "success", text: "Berhasil menautkan anak!" });
      setConnectEmail("");
      loadChildren();
    } catch (err: any) {
      setConnectMessage({ type: "error", text: err.message || "Gagal menautkan." });
    } finally {
      setConnectLoading(false);
    }
  };

  if (busy) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100 flex flex-col font-sans pb-24">
      <header className="pt-8 pb-4 mb-2 z-10 relative">
        <div className="max-w-md mx-auto px-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">Halo, Bapak/Ibu</h1>
            <h2 className="text-3xl font-black text-blue-600 tracking-tight">{user.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Bell size={24} />
              {announcements.length > 0 && (
                <span className="absolute top-1.5 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div 
              className="h-10 w-10 bg-slate-200 rounded-full overflow-hidden shadow-sm border-2 border-white cursor-pointer" 
              onClick={() => setActiveTab("profil")}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 max-w-md mx-auto w-full flex flex-col gap-6">
        {activeTab === "anak" && (
          <>
            {children.length > 0 ? (
              <>
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                  <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden">
                    {selectedChild?.avatarUrl ? (
                      <img src={selectedChild.avatarUrl} alt="Avatar Anak" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 size={32} />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest mb-1">Anak Saya</p>
                    <p className="text-xl font-extrabold text-slate-800 leading-tight">{selectedChild?.name}</p>
                    {selectedChild?.schoolName && (
                      <p className="text-xs font-semibold text-slate-400 mt-1">{selectedChild.schoolName}</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                  <h3 className="text-lg font-black text-slate-800 relative z-10 mb-4">Progres Belajar</h3>
                  
                  <div className="flex flex-col items-center justify-center py-6 relative z-10">
                    <div className="relative h-44 w-44 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="h-full w-full transform -rotate-90">
                        <circle cx="50" cy="50" r="40" className="text-slate-100 stroke-current" strokeWidth="12" fill="none" />
                        <circle cx="50" cy="50" r="40" className="text-blue-500 stroke-current" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (selectedChild?.progress || 0)) / 100} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-4xl font-black text-slate-800">{selectedChild?.progress || 0}%</span>
                        <span className="text-xs font-bold text-slate-500 uppercase mt-1">Selesai</span>
                      </div>
                    </div>
                    <p className="mt-8 text-center text-sm font-bold text-green-700 bg-green-50 px-5 py-3 rounded-2xl border border-green-100 w-full">
                      Hebat! {selectedChild?.name} terus berkembang.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="h-10 w-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800">Catatan Guru</h3>
                  </div>
                  <div className="relative z-10 flex flex-col gap-3">
                    {selectedChild?.teacherNotes && selectedChild.teacherNotes.length > 0 ? (
                      selectedChild.teacherNotes.map((noteItem: any) => (
                        <div key={noteItem.id} className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex flex-col gap-2">
                          <p className="text-slate-600 font-medium leading-relaxed text-sm">
                            {noteItem.note}
                          </p>
                          <div className="flex items-center justify-between text-[10px] font-bold text-orange-600/70 uppercase tracking-wider">
                            <span>{noteItem.teacherName}</span>
                            <span>{new Date(noteItem.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-600 font-medium leading-relaxed bg-orange-50/50 p-5 rounded-2xl border border-orange-100 text-sm">
                        Belum ada catatan khusus dari guru. Semua berjalan lancar!
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="h-20 w-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={32} />
                </div>
                <p className="text-slate-600 font-bold text-lg px-4 mb-2">Belum ada anak yang tertaut.</p>
                <form onSubmit={handleConnect} className="px-6 flex flex-col gap-3 mt-4 relative">
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Masukkan nama atau email siswa..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={connectEmail}
                      onChange={(e) => setConnectEmail(e.target.value)}
                      disabled={connectLoading}
                      autoComplete="off"
                    />
                    {showSuggestions && studentSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-48 overflow-y-auto">
                        {studentSuggestions.map((student) => (
                          <div
                            key={student.id}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-100 last:border-0"
                            onClick={() => {
                              setConnectEmail(student.email);
                              setShowSuggestions(false);
                            }}
                          >
                            <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                              {student.avatarUrl ? <img src={student.avatarUrl} className="h-full w-full object-cover" /> : <User size={16} />}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{student.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{student.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={connectLoading || !connectEmail.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {connectLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    {connectLoading ? "Menautkan..." : "Tautkan Anak"}
                  </button>
                  {connectMessage.text && (
                    <p className={`text-sm mt-1 ${connectMessage.type === "success" ? "text-green-600" : "text-red-500"}`}>
                      {connectMessage.text}
                    </p>
                  )}
                </form>
              </div>
            )}
          </>
        )}

        {activeTab === "laporan" && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 min-h-[60vh]">
            <h3 className="text-xl font-black text-slate-800 mb-6">Laporan & Aktivitas</h3>
            {children.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                  <div>
                    <p className="font-extrabold text-slate-700">Penyelesaian Tugas</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Total: {selectedChild?.progress || 0}%</p>
                  </div>
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="text-green-600 h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity size={16} /> Riwayat Aktivitas
                  </h4>
                  <div className="flex flex-col gap-3">
                    {selectedChild?.recentActivities && selectedChild.recentActivities.length > 0 ? (
                      selectedChild.recentActivities.map((activity: any) => (
                        <div key={`${activity.category}-${activity.id}`} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${activity.category === 'quest' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {activity.category === 'quest' ? <Target size={24} /> : <BookOpen size={24} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-extrabold text-slate-800 truncate mb-1.5">{activity.title}</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${activity.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, Math.max(0, activity.progress))}%` }}></div>
                              </div>
                              <span className={`text-[10px] font-black w-8 text-right ${activity.progress >= 100 ? 'text-green-600' : 'text-slate-500'}`}>{activity.progress}%</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-sm text-slate-400 py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed font-medium">Belum ada riwayat aktivitas yang tercatat.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400">Tidak ada data.</p>
            )}
          </div>
        )}

        {activeTab === "profil" && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 min-h-[60vh] flex flex-col">
             <h3 className="text-xl font-black text-slate-800 mb-8">Profil Pengguna</h3>
             <div className="flex flex-col items-center mb-10">
                <div className="h-24 w-24 bg-slate-200 rounded-full mb-4 flex items-center justify-center text-slate-500 overflow-hidden shadow-inner ring-4 ring-slate-50">
                   {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" /> : <User size={40} />}
                </div>
                <h3 className="text-2xl font-black text-slate-800">{user.name}</h3>
                <p className="text-sm font-bold text-slate-400 mt-1">{user.email}</p>
             </div>
             <div className="w-full mb-8 bg-slate-50 rounded-2xl p-5 border border-slate-100">
               <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Plus size={18} /> Tautkan Anak</h4>
               <form onSubmit={handleConnect} className="flex flex-col gap-3 relative">
                 <div className="relative">
                   <input
                     type="text"
                     required
                     placeholder="Masukkan nama atau email siswa..."
                     className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                     value={connectEmail}
                     onChange={(e) => setConnectEmail(e.target.value)}
                     disabled={connectLoading}
                     autoComplete="off"
                   />
                   {showSuggestions && studentSuggestions.length > 0 && (
                     <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-48 overflow-y-auto">
                       {studentSuggestions.map((student) => (
                         <div
                           key={student.id}
                           className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-100 last:border-0"
                           onClick={() => {
                             setConnectEmail(student.email);
                             setShowSuggestions(false);
                           }}
                         >
                           <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                             {student.avatarUrl ? <img src={student.avatarUrl} className="h-full w-full object-cover" /> : <User size={16} />}
                           </div>
                           <div className="flex-1 text-left min-w-0">
                             <p className="text-sm font-bold text-slate-800 truncate">{student.name}</p>
                             <p className="text-[10px] text-slate-500 truncate">{student.email}</p>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
                 <button
                   type="submit"
                   disabled={connectLoading || !connectEmail.trim()}
                   className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                 >
                   {connectLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                   {connectLoading ? "Menautkan..." : "Tautkan"}
                 </button>
                 {connectMessage.text && (
                   <p className={`text-sm text-center ${connectMessage.type === "success" ? "text-green-600" : "text-red-500"}`}>
                     {connectMessage.text}
                   </p>
                 )}
               </form>
             </div>

             <div className="mt-auto">
               <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 font-extrabold py-4 px-6 rounded-2xl transition-colors"
               >
                  <LogOut size={20} />
                  Keluar dari Aplikasi
               </button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.04)] z-50">
        <div className="flex justify-around items-center h-20 max-w-md mx-auto px-4">
          <button 
            onClick={() => setActiveTab("anak")}
            className={`flex flex-col items-center gap-1.5 w-24 py-2 transition-colors ${activeTab === "anak" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
          >
            <UserCircle2 size={26} className={activeTab === "anak" ? "stroke-[2.5px]" : "stroke-[2px]"} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Anak Saya</span>
          </button>
          <button 
            onClick={() => setActiveTab("laporan")}
            className={`flex flex-col items-center gap-1.5 w-24 py-2 transition-colors ${activeTab === "laporan" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
          >
            <FileText size={26} className={activeTab === "laporan" ? "stroke-[2.5px]" : "stroke-[2px]"} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Laporan</span>
          </button>
          <button 
            onClick={() => setActiveTab("profil")}
            className={`flex flex-col items-center gap-1.5 w-24 py-2 transition-colors ${activeTab === "profil" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
          >
            <User size={26} className={activeTab === "profil" ? "stroke-[2.5px]" : "stroke-[2px]"} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Profil</span>
          </button>
        </div>
      </nav>

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                <Bell size={20} className="text-blue-600" />
                Pengumuman
              </h3>
              <button 
                onClick={() => setShowNotifications(false)}
                className="p-2 bg-slate-200/50 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {announcements.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 ${ann.type === 'warning' ? 'text-orange-500' : ann.type === 'success' ? 'text-green-500' : 'text-blue-500'}`}>
                          <Info size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm mb-1">{ann.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-2">
                            {new Date(ann.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center flex flex-col items-center">
                  <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <Bell size={32} />
                  </div>
                  <p className="font-bold text-slate-500">Belum ada pengumuman.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setShowNotifications(false)}
                className="w-full py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
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
