import React, { useState, useEffect, useRef, useCallback } from "react";
import { UserCircle2, LogOut, CheckCircle2, User, FileText, Bell, Plus, Loader2, X, Info, Target, BookOpen, Activity, ChevronRight, MessageSquare, Send } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"anak" | "pesan" | "laporan" | "profil">("anak");
  const [busy, setBusy] = useState(true);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [connectEmail, setConnectEmail] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectMessage, setConnectMessage] = useState({ type: "", text: "" });
  const [studentSuggestions, setStudentSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Consultation state
  const [consultations, setConsultations] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageTopic, setNewMessageTopic] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [messagingBusy, setMessagingBusy] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<any>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState("");

  // Real-time state
  const [isTeacherOnline, setIsTeacherOnline] = useState(false);
  const [isTeacherTyping, setIsTeacherTyping] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingSentRef = useRef(false);

  // Auto-scroll on new messages / typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages, isTeacherTyping]);

  const loadConsultations = () => {
    parentApi<{ threads: any[] }>("/api/parent/consultations")
      .then(res => setConsultations(res.threads))
      .catch(() => {});
  };

  const loadTeachers = (studentId: string) => {
    parentApi<{ teachers: any[] }>(`/api/parent/teachers?studentId=${studentId}`)
      .then(res => {
        setTeachers(res.teachers);
        if (res.teachers.length > 0) setSelectedTeacherId(res.teachers[0].id);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (activeTab === "pesan") {
      loadConsultations();
      if (selectedChild) loadTeachers(selectedChild.id);
    }
  }, [activeTab, selectedChild]);

  // SSE connection when a thread is active
  useEffect(() => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    setIsTeacherOnline(false);
    setIsTeacherTyping(false);
    setOnlineUserIds([]);

    if (!activeThreadId) {
      setActiveThread(null);
      setThreadMessages([]);
      return;
    }

    // Load messages
    parentApi<{ thread: any; messages: any[] }>(`/api/parent/consultations/${activeThreadId}`)
      .then(res => { setActiveThread(res.thread); setThreadMessages(res.messages || []); })
      .catch(() => setActiveThreadId(null));

    // Open SSE
    const es = new EventSource(`/api/chat/events?threadId=${activeThreadId}`, { withCredentials: true });
    sseRef.current = es;

    es.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data);
        setThreadMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.senderUserId !== user.id) setIsTeacherTyping(false);
      } catch { /* ignore */ }
    });

    es.addEventListener("presence", (e) => {
      try {
        const { onlineUserIds: ids } = JSON.parse(e.data);
        setOnlineUserIds(ids);
      } catch { /* ignore */ }
    });

    es.addEventListener("typing", (e) => {
      try {
        const { userId, isTyping } = JSON.parse(e.data);
        if (userId !== user.id) setIsTeacherTyping(isTyping);
      } catch { /* ignore */ }
    });

    return () => { es.close(); sseRef.current = null; };
  }, [activeThreadId]);

  // Derive teacher online status
  useEffect(() => {
    if (!activeThread) return;
    const teacherId = activeThread.teacherId;
    if (teacherId) setIsTeacherOnline(onlineUserIds.includes(teacherId));
  }, [onlineUserIds, activeThread]);

  const sendTypingIndicator = useCallback((typing: boolean) => {
    if (!activeThreadId) return;
    fetch("/api/chat/typing", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: activeThreadId, isTyping: typing })
    }).catch(() => {});
  }, [activeThreadId]);

  const handleReplyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReplyContent(e.target.value);
    if (!isTypingSentRef.current) { sendTypingIndicator(true); isTypingSentRef.current = true; }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTypingIndicator(false);
      isTypingSentRef.current = false;
    }, 2500);
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !selectedTeacherId || !newMessageTopic || !newMessageContent) return;
    setMessagingBusy(true);
    try {
      await parentApi("/api/parent/consultations", {
        method: "POST",
        body: JSON.stringify({
          studentId: selectedChild.id,
          teacherId: selectedTeacherId,
          topic: newMessageTopic,
          content: newMessageContent
        })
      });
      setShowNewMessageModal(false);
      setNewMessageTopic("");
      setNewMessageContent("");
      loadConsultations();
    } catch (err) {
      console.error(err);
    } finally {
      setMessagingBusy(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThreadId || !replyContent.trim()) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    sendTypingIndicator(false);
    isTypingSentRef.current = false;
    setMessagingBusy(true);
    const content = replyContent;
    setReplyContent("");
    try {
      await parentApi(`/api/parent/consultations/${activeThreadId}/reply`, {
        method: "POST",
        body: JSON.stringify({ content })
      });
      // Message will arrive via SSE
    } catch (err) {
      console.error(err);
    } finally {
      setMessagingBusy(false);
    }
  };

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
        setSelectedChild((current: any) => {
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
          setSelectedChild((current: any) => {
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
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-300 flex flex-col font-sans pb-24 selection:bg-blue-500/30">
      <header className="pt-8 pb-4 mb-2 z-10 relative">
        <div className="max-w-md mx-auto px-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-extrabold text-slate-400">Halo, Bapak/Ibu</h1>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 tracking-tight drop-shadow-sm">{user.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative p-2 text-slate-400 hover:text-blue-400 transition-colors hover:bg-white/5 rounded-full"
            >
              <Bell size={24} />
              {announcements.length > 0 && (
                <span className="absolute top-1.5 right-2 h-2.5 w-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] border-2 border-[#09090b]"></span>
              )}
            </button>
            <div 
              className="h-10 w-10 bg-slate-800 rounded-full overflow-hidden shadow-sm border border-white/10 cursor-pointer hover:border-white/30 transition-colors" 
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

        {/* Child Selector (Horizontal Scroll) */}
        {children.length > 1 && activeTab !== "profil" && (
          <div className="max-w-md mx-auto mt-6 px-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">Pilih Anak</p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={`snap-start shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300 ${
                    selectedChild?.id === child.id 
                      ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                    {child.avatarUrl ? (
                      <img src={child.avatarUrl} alt="Avatar Anak" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 size={18} className="text-slate-400" />
                    )}
                  </div>
                  <span className={`text-sm font-bold whitespace-nowrap ${selectedChild?.id === child.id ? "text-blue-400" : "text-slate-300"}`}>
                    {child.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 max-w-md mx-auto w-full flex flex-col gap-5">
        {activeTab === "anak" && (
          <>
            {children.length > 0 ? (
              <>
                <div className="professional-card rounded-3xl p-5 flex items-center gap-4 transition-transform hover:scale-[1.01]">
                  <div className="h-16 w-16 bg-slate-800 text-blue-400 border border-white/10 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                    {selectedChild?.avatarUrl ? (
                      <img src={selectedChild.avatarUrl} alt="Avatar Anak" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 size={32} />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest mb-1 opacity-80">Profil Siswa</p>
                    <p className="text-xl font-extrabold text-slate-100 leading-tight drop-shadow-sm">{selectedChild?.name}</p>
                    {selectedChild?.schoolName && (
                      <p className="text-xs font-semibold text-slate-400 mt-1">{selectedChild.schoolName}</p>
                    )}
                  </div>
                </div>

                <div className="professional-card rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
                  <h3 className="text-lg font-black text-slate-100 relative z-10 mb-2">Progres Belajar</h3>
                  
                  <div className="flex flex-col items-center justify-center py-6 relative z-10">
                    <div className="relative h-44 w-44 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="h-full w-full transform -rotate-90 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                        <circle cx="50" cy="50" r="40" className="text-white/5 stroke-current" strokeWidth="10" fill="none" />
                        <circle 
                          cx="50" cy="50" r="40" 
                          className="text-blue-500 stroke-current transition-all duration-1000 ease-out" 
                          strokeWidth="10" fill="none" 
                          strokeDasharray="251.2" 
                          strokeDashoffset={251.2 - (251.2 * (selectedChild?.progress || 0)) / 100} 
                          strokeLinecap="round" 
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{selectedChild?.progress || 0}%</span>
                        <span className="text-xs font-bold text-blue-400/80 uppercase mt-1 tracking-wider">Selesai</span>
                      </div>
                    </div>
                    <p className="mt-8 text-center text-sm font-bold text-green-400 bg-green-500/10 px-5 py-3 rounded-2xl border border-green-500/20 w-full shadow-[0_0_15px_rgba(74,222,128,0.05)]">
                      Hebat! {selectedChild?.name.split(' ')[0]} terus berkembang.
                    </p>
                  </div>
                </div>

                <div className="professional-card rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-orange-500/20 transition-colors"></div>
                  <div className="flex items-center gap-3 mb-5 relative z-10">
                    <div className="h-10 w-10 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                      <FileText size={20} />
                    </div>
                    <h3 className="text-lg font-black text-slate-100">Catatan Guru</h3>
                  </div>
                  <div className="relative z-10 flex flex-col gap-3">
                    {selectedChild?.teacherNotes && selectedChild.teacherNotes.length > 0 ? (
                      selectedChild.teacherNotes.map((noteItem: any) => (
                        <div key={noteItem.id} className="bg-orange-950/20 p-5 rounded-2xl border border-orange-500/10 flex flex-col gap-3 hover:border-orange-500/30 transition-colors">
                          <p className="text-slate-300 font-medium leading-relaxed text-sm">
                            {noteItem.note}
                          </p>
                          <div className="flex items-center justify-between text-[10px] font-bold text-orange-400/70 uppercase tracking-wider pt-2 border-t border-white/5">
                            <span className="flex items-center gap-1.5"><User size={12} className="opacity-70"/> {noteItem.teacherName}</span>
                            <span>{new Date(noteItem.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 font-medium leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5 text-sm text-center">
                        Belum ada catatan khusus dari guru. Semua berjalan lancar!
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 professional-card rounded-3xl relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-50"></div>
                <div className="h-20 w-20 bg-slate-800 border border-white/10 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <User size={32} />
                </div>
                <p className="text-slate-200 font-bold text-lg px-4 mb-2">Belum ada anak yang tertaut.</p>
                <p className="text-slate-400 text-sm px-6 mb-6">Tautkan akun anak Anda untuk memantau progres belajar mereka.</p>
                <form onSubmit={handleConnect} className="px-6 flex flex-col gap-4 relative z-10">
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Nama atau email siswa..."
                      className="w-full bg-[#27272a] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
                      value={connectEmail}
                      onChange={(e) => setConnectEmail(e.target.value)}
                      disabled={connectLoading}
                      autoComplete="off"
                    />
                    {showSuggestions && studentSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                        {studentSuggestions.map((student) => (
                          <div
                            key={student.id}
                            className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-0"
                            onClick={() => {
                              setConnectEmail(student.email);
                              setShowSuggestions(false);
                            }}
                          >
                            <div className="h-8 w-8 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                              {student.avatarUrl ? <img src={student.avatarUrl} className="h-full w-full object-cover" /> : <User size={16} />}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-bold text-slate-200 truncate">{student.name}</p>
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
                    className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
                  >
                    {connectLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    {connectLoading ? "Menautkan..." : "Tautkan Anak"}
                  </button>
                  {connectMessage.text && (
                    <p className={`text-sm mt-1 font-semibold ${connectMessage.type === "success" ? "text-green-400" : "text-red-400"}`}>
                      {connectMessage.text}
                    </p>
                  )}
                </form>
              </div>
            )}
          </>
        )}
        {activeTab === "pesan" && (
          <div className="professional-card rounded-3xl p-6 min-h-[60vh] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full -mr-10 -mt-10 blur-3xl pointer-events-none"></div>
            
            {!activeThreadId ? (
              <>
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <h3 className="text-xl font-black text-slate-100">Konsultasi Guru</h3>
                  <button 
                    onClick={() => setShowNewMessageModal(true)}
                    disabled={!selectedChild}
                    className="h-10 w-10 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-colors disabled:opacity-50"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                
                {children.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-10">Tautkan anak untuk berkonsultasi dengan guru.</p>
                ) : consultations.length > 0 ? (
                  <div className="flex flex-col gap-3 relative z-10">
                    {consultations.map(thread => (
                      <button 
                        key={thread.id} 
                        onClick={() => setActiveThreadId(thread.id)}
                        className="text-left p-4 rounded-2xl bg-[#27272a] hover:bg-[#3f3f46] border border-white/5 transition-colors group/item shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-200 truncate pr-2 group-hover/item:text-blue-400 transition-colors text-base">{thread.topic}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${thread.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                            {thread.status === 'open' ? 'Buka' : 'Selesai'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 flex items-center gap-1.5">
                          <UserCircle2 size={14} className="opacity-70" /> {thread.teacherName}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 bg-[#18181b] rounded-2xl border border-white/10 border-dashed relative z-10 shadow-inner">
                    <MessageSquare size={32} className="text-slate-500 mb-3" />
                    <p className="text-sm text-slate-400 font-medium text-center px-6 mb-4">Belum ada percakapan konsultasi.</p>
                    <button 
                      onClick={() => setShowNewMessageModal(true)}
                      className="text-sm text-blue-400 font-bold hover:text-blue-300 bg-blue-500/10 px-4 py-2 rounded-lg"
                    >
                      Mulai percakapan baru
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col h-[65vh] relative z-10">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4 bg-[#09090b]/50 -mx-6 px-6 pt-2 sticky top-0 backdrop-blur-md">
                  <button
                    onClick={() => setActiveThreadId(null)}
                    className="p-2 -ml-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-full transition-colors"
                  >
                    <ChevronRight size={20} className="rotate-180" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-100 truncate text-base">{activeThread?.topic}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isTeacherOnline && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      )}
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                        <User size={12}/> {activeThread?.teacherName || "Guru"}
                        {isTeacherOnline && <span className="text-emerald-400 font-semibold">· online</span>}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4 px-2 scrollbar-thin scrollbar-thumb-white/10">
                  {threadMessages.map(msg => {
                    const isMine = (msg.senderUserId ?? msg.senderId) === user.id;
                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className={`p-3.5 shadow-md ${isMine ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' : 'bg-[#27272a] text-slate-200 border border-white/5 rounded-2xl rounded-bl-sm'}`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 mt-1.5 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}

                  {/* Teacher typing indicator */}
                  {isTeacherTyping && (
                    <div className="flex flex-col self-start items-start max-w-[85%]">
                      <div className="flex gap-1 bg-[#27272a] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1.5 px-1 italic">
                        {activeThread?.teacherName || "Guru"} sedang mengetik...
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {activeThread?.status === 'open' ? (
                  <form onSubmit={handleReply} className="pt-3 pb-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Tulis pesan Anda..."
                      className="flex-1 bg-[#27272a] border border-white/10 rounded-full px-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
                      value={replyContent}
                      onChange={handleReplyInputChange}
                      disabled={messagingBusy}
                    />
                    <button
                      type="submit"
                      disabled={messagingBusy || !replyContent.trim()}
                      className="h-11 w-11 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-full flex items-center justify-center transition-colors shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                    >
                      {messagingBusy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                    </button>
                  </form>
                ) : (
                  <div className="pt-3 pb-2 text-center">
                    <p className="text-xs text-slate-400 font-medium bg-[#18181b] border border-white/5 py-2.5 rounded-xl shadow-inner">Konsultasi ini telah ditutup.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "laporan" && (
          <div className="professional-card rounded-3xl p-6 min-h-[60vh] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-40 h-40 bg-purple-500/5 rounded-full -ml-10 -mt-10 blur-3xl group-hover:bg-purple-500/10 transition-colors pointer-events-none"></div>
            <h3 className="text-xl font-black text-slate-100 mb-6 relative z-10">Laporan & Aktivitas</h3>
            
            {children.length > 0 ? (
              <div className="flex flex-col gap-6 relative z-10">
                <div className="p-5 bg-gradient-to-r from-blue-900/20 to-transparent rounded-2xl flex items-center justify-between border border-blue-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <div>
                    <p className="font-extrabold text-slate-300">Penyelesaian Tugas</p>
                    <p className="text-2xl font-black text-blue-400 mt-1">{selectedChild?.progress || 0}%</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <CheckCircle2 className="text-blue-400 h-6 w-6" />
                  </div>
                </div>
                
                <div className="mt-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity size={14} /> Riwayat Aktivitas
                  </h4>
                  <div className="flex flex-col gap-4 relative">
                    {/* Timeline vertical line */}
                    {selectedChild?.recentActivities && selectedChild.recentActivities.length > 0 && (
                       <div className="absolute left-[1.375rem] top-2 bottom-2 w-px bg-white/5"></div>
                    )}
                    
                    {selectedChild?.recentActivities && selectedChild.recentActivities.length > 0 ? (
                      selectedChild.recentActivities.map((activity: any, idx: number) => (
                        <div key={`${activity.category}-${activity.id}-${idx}`} className="relative pl-12">
                          {/* Timeline dot */}
                          <div className={`absolute left-0 top-3 h-11 w-11 rounded-full flex items-center justify-center shrink-0 border ${
                            activity.category === 'quest' 
                              ? 'bg-[#18181b] border-orange-500/30 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]' 
                              : 'bg-[#18181b] border-blue-500/30 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                          } z-10`}>
                            {activity.category === 'quest' ? <Target size={18} /> : <BookOpen size={18} />}
                          </div>
                          
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 hover:bg-white/10 transition-colors">
                            <p className="text-sm font-extrabold text-slate-200">{activity.title}</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full rounded-full transition-all duration-500 relative overflow-hidden ${activity.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, Math.max(0, activity.progress))}%` }}>
                                   {/* Shiny effect on bar */}
                                   <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                                </div>
                              </div>
                              <span className={`text-[10px] font-black w-8 text-right ${activity.progress >= 100 ? 'text-green-400' : 'text-slate-400'}`}>{activity.progress}%</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                        <Activity size={32} className="text-slate-600 mb-3" />
                        <p className="text-sm text-slate-400 font-medium text-center px-6">Belum ada riwayat aktivitas yang tercatat bulan ini.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400 py-10">Tautkan anak untuk melihat laporan.</p>
            )}
          </div>
        )}

        {activeTab === "profil" && (
          <div className="professional-card rounded-3xl p-6 min-h-[60vh] flex flex-col relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
             
             <h3 className="text-xl font-black text-slate-100 mb-8 relative z-10">Profil Pengguna</h3>
             
             <div className="flex flex-col items-center mb-10 relative z-10">
                <div className="relative h-24 w-24 mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-full blur-xl"></div>
                  <div className="relative h-full w-full bg-slate-800 rounded-full flex items-center justify-center text-slate-500 overflow-hidden shadow-inner border-2 border-white/10">
                     {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" /> : <User size={40} />}
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-100 drop-shadow-sm">{user.name}</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">{user.email}</p>
             </div>
             
             <div className="w-full mb-8 bg-white/5 rounded-2xl p-5 border border-white/10 relative z-10">
               <h4 className="font-bold text-slate-300 mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-400"/> Tautkan Anak Baru</h4>
               <form onSubmit={handleConnect} className="flex flex-col gap-3 relative">
                 <div className="relative">
                   <input
                     type="text"
                     required
                     placeholder="Nama atau email siswa..."
                     className="w-full bg-[#27272a] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
                     value={connectEmail}
                     onChange={(e) => setConnectEmail(e.target.value)}
                     disabled={connectLoading}
                     autoComplete="off"
                   />
                   {showSuggestions && studentSuggestions.length > 0 && (
                     <div className="absolute top-full left-0 right-0 mt-2 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                       {studentSuggestions.map((student) => (
                         <div
                           key={student.id}
                           className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-0"
                           onClick={() => {
                             setConnectEmail(student.email);
                             setShowSuggestions(false);
                           }}
                         >
                           <div className="h-8 w-8 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                             {student.avatarUrl ? <img src={student.avatarUrl} className="h-full w-full object-cover" /> : <User size={16} />}
                           </div>
                           <div className="flex-1 text-left min-w-0">
                             <p className="text-sm font-bold text-slate-200 truncate">{student.name}</p>
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
                   className="w-full bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                 >
                   {connectLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                   {connectLoading ? "Menautkan..." : "Tautkan Akun"}
                 </button>
                 {connectMessage.text && (
                   <p className={`text-sm text-center font-semibold mt-1 ${connectMessage.type === "success" ? "text-green-400" : "text-red-400"}`}>
                     {connectMessage.text}
                   </p>
                 )}
               </form>
             </div>

             <div className="mt-auto relative z-10">
               <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-extrabold py-4 px-6 rounded-2xl transition-colors shadow-sm"
               >
                  <LogOut size={20} />
                  Keluar dari Aplikasi
               </button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#09090b]/80 backdrop-blur-xl border-t border-white/10 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50">
        <div className="flex justify-around items-center h-20 max-w-md mx-auto px-2">
          <button 
            onClick={() => setActiveTab("anak")}
            className={`flex flex-col items-center gap-1.5 w-16 py-2 transition-all duration-300 ${activeTab === "anak" ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] scale-105" : "text-slate-500 hover:text-slate-300"}`}
          >
            <UserCircle2 size={24} className={activeTab === "anak" ? "stroke-[2.5px]" : "stroke-[2px]"} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Anak</span>
          </button>
          <button 
            onClick={() => setActiveTab("pesan")}
            className={`flex flex-col items-center gap-1.5 w-16 py-2 transition-all duration-300 ${activeTab === "pesan" ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] scale-105" : "text-slate-500 hover:text-slate-300"}`}
          >
            <MessageSquare size={24} className={activeTab === "pesan" ? "stroke-[2.5px]" : "stroke-[2px]"} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Pesan</span>
          </button>
          <button 
            onClick={() => setActiveTab("laporan")}
            className={`flex flex-col items-center gap-1.5 w-16 py-2 transition-all duration-300 ${activeTab === "laporan" ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] scale-105" : "text-slate-500 hover:text-slate-300"}`}
          >
            <FileText size={24} className={activeTab === "laporan" ? "stroke-[2.5px]" : "stroke-[2px]"} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Laporan</span>
          </button>
          <button 
            onClick={() => setActiveTab("profil")}
            className={`flex flex-col items-center gap-1.5 w-16 py-2 transition-all duration-300 ${activeTab === "profil" ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] scale-105" : "text-slate-500 hover:text-slate-300"}`}
          >
            <User size={24} className={activeTab === "profil" ? "stroke-[2.5px]" : "stroke-[2px]"} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Profil</span>
          </button>
        </div>
      </nav>

      {/* New Consultation Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity">
          <div className="professional-card rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="font-extrabold text-slate-100 flex items-center gap-2">Konsultasi Baru</h3>
              <button onClick={() => setShowNewMessageModal(false)} className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-full transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateThread} className="p-5 flex flex-col gap-4 bg-[#18181b]">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pilih Guru</label>
                <select 
                  className="bg-[#27272a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  required
                >
                  <option value="" disabled>Pilih Guru Pengajar</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                  ))}
                </select>
                {teachers.length === 0 && <p className="text-xs text-red-400 mt-1">Anak Anda belum memiliki kelas yang aktif.</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Topik</label>
                <input 
                  type="text" 
                  className="bg-[#27272a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Misal: Penurunan nilai kuis Matematika"
                  value={newMessageTopic}
                  onChange={e => setNewMessageTopic(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pesan Anda</label>
                <textarea 
                  className="bg-[#27272a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px]"
                  placeholder="Tulis pesan lengkap di sini..."
                  value={newMessageContent}
                  onChange={e => setNewMessageContent(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={messagingBusy || !selectedTeacherId || !newMessageTopic || !newMessageContent}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {messagingBusy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {messagingBusy ? "Mengirim..." : "Kirim Pesan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity">
          <div className="professional-card rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh] border border-white/10">
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="font-extrabold text-slate-100 flex items-center gap-2">
                <Bell size={20} className="text-blue-400" />
                Pengumuman
              </h3>
              <button 
                onClick={() => setShowNotifications(false)}
                className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-3">
              {announcements.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 ${ann.type === 'warning' ? 'text-orange-400 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]' : ann.type === 'success' ? 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]'}`}>
                          <Info size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-200 text-sm mb-1">{ann.title}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">{ann.content}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-2">
                            {new Date(ann.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center flex flex-col items-center">
                  <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center text-slate-500 mb-4 shadow-inner">
                    <Bell size={32} />
                  </div>
                  <p className="font-bold text-slate-500">Belum ada pengumuman.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/10 bg-black/20">
              <button 
                onClick={() => setShowNotifications(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl font-bold text-slate-300 transition-colors shadow-sm"
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
