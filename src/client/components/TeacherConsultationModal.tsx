import React, { useState, useEffect } from "react";
import { MessageSquare, X, Send, ChevronRight, UserCircle2, Loader2, Info } from "lucide-react";

export function TeacherConsultationModal({ onClose }: { onClose: () => void }) {
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState("");
  const [busy, setBusy] = useState(true);
  const [replyBusy, setReplyBusy] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/consultations")
      .then(res => res.json())
      .then(data => {
        setThreads(data.threads || []);
        setBusy(false);
      });
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      fetch(`/api/teacher/consultations/${activeThreadId}`)
        .then(res => res.json())
        .then(data => {
          setActiveThread(data.thread);
          setMessages(data.messages || []);
        });
    } else {
      setActiveThread(null);
      setMessages([]);
    }
  }, [activeThreadId]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThreadId || !replyContent.trim()) return;
    setReplyBusy(true);
    await fetch(`/api/teacher/consultations/${activeThreadId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyContent })
    });
    setReplyContent("");
    
    // reload
    const data = await fetch(`/api/teacher/consultations/${activeThreadId}`).then(r => r.json());
    setActiveThread(data.thread);
    setMessages(data.messages || []);
    setReplyBusy(false);
  };

  const handleCloseThread = async () => {
    if (!activeThreadId) return;
    if (!confirm("Tutup konsultasi ini?")) return;
    await fetch(`/api/teacher/consultations/${activeThreadId}/close`, { method: "POST" });
    setActiveThread(prev => ({ ...prev, status: "closed" }));
    // reload list
    const data = await fetch("/api/teacher/consultations").then(r => r.json());
    setThreads(data.threads || []);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        {!activeThreadId ? (
          <>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                <MessageSquare size={20} className="text-blue-500" />
                Kotak Konsultasi Orang Tua
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 rounded-full transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              {busy ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : threads.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {threads.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => setActiveThreadId(t.id)}
                      className="text-left p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 truncate pr-2 group-hover:text-blue-600 transition-colors">{t.topic}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${t.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          {t.status === 'open' ? 'Buka' : 'Selesai'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 flex items-center gap-1.5">
                        <UserCircle2 size={14} className="opacity-70" /> {t.parentName}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 text-slate-400">
                  <MessageSquare size={32} className="mb-3 opacity-50" />
                  <p className="text-sm font-medium">Belum ada konsultasi.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white shadow-sm z-10">
              <button onClick={() => setActiveThreadId(null)} className="p-2 hover:bg-slate-100 text-slate-500 rounded-full">
                <ChevronRight size={20} className="rotate-180" />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 truncate text-sm">{activeThread?.topic}</h3>
                <p className="text-[11px] text-slate-500 truncate">Dengan: {activeThread?.parentName}</p>
              </div>
              {activeThread?.status === 'open' && (
                <button onClick={handleCloseThread} className="text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg shrink-0">
                  Tutup
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-3">
              {messages.map((m: any) => {
                const isMine = m.senderName !== activeThread?.parentName;
                return (
                  <div key={m.id} className={`flex flex-col max-w-[85%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className={`p-3 text-sm shadow-sm ${isMine ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' : 'bg-white text-slate-700 border border-slate-200 rounded-2xl rounded-bl-sm'}`}>
                      {m.content}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
                      {new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>

            {activeThread?.status === 'open' ? (
              <form onSubmit={handleReply} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 bg-slate-100 border-none rounded-full px-5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Ketik balasan..."
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  disabled={replyBusy}
                />
                <button 
                  type="submit" 
                  disabled={replyBusy || !replyContent.trim()}
                  className="h-11 w-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm"
                >
                  {replyBusy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                </button>
              </form>
            ) : (
              <div className="p-4 bg-slate-100 border-t border-slate-200 text-center">
                <p className="text-xs font-medium text-slate-500">Konsultasi ini telah diselesaikan.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
