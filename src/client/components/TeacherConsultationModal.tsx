import React, { useState, useEffect } from "react";
import { MessageSquare, X, Send, ChevronRight, UserCircle2, Loader2 } from "lucide-react";

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
    setActiveThread((prev: any) => ({ ...prev, status: "closed" }));
    // reload list
    const data = await fetch("/api/teacher/consultations").then(r => r.json());
    setThreads(data.threads || []);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="bg-[#0b1b4f]/95 border border-[rgba(125,211,252,0.25)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-blue-950/40 flex flex-col h-[80vh] text-white">
        {!activeThreadId ? (
          <>
            <div className="px-6 py-5 border-b border-[rgba(125,211,252,0.15)] flex items-center justify-between">
              <h3 className="font-extrabold text-white flex items-center gap-2">
                <MessageSquare size={20} className="text-amber-400" />
                Kotak Konsultasi Orang Tua
              </h3>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-[rgba(5,29,83,0.6)] text-[rgba(226,245,255,0.76)] hover:text-white border border-transparent hover:border-[rgba(125,211,252,0.22)] rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-[#07133b]/40">
              {busy ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="animate-spin text-amber-400" />
                </div>
              ) : threads.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {threads.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => setActiveThreadId(t.id)}
                      className="text-left p-4 bg-[rgba(5,29,83,0.42)] rounded-2xl border border-[rgba(125,211,252,0.15)] shadow-sm hover:border-amber-400/50 hover:bg-[rgba(5,29,83,0.6)] transition-all group w-full"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white truncate pr-2 group-hover:text-amber-300 transition-colors">
                          {t.topic}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap border ${
                          t.status === 'open' 
                            ? 'bg-amber-400/10 text-amber-300 border-amber-400/30' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {t.status === 'open' ? 'Buka' : 'Selesai'}
                        </span>
                      </div>
                      <p className="text-xs text-[rgba(226,245,255,0.7)] flex items-center gap-1.5">
                        <UserCircle2 size={14} className="opacity-70 text-amber-400" /> {t.parentName}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 text-[rgba(226,245,255,0.6)] h-full">
                  <MessageSquare size={32} className="mb-3 text-amber-400/50" />
                  <p className="text-sm font-medium">Belum ada konsultasi.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-[rgba(125,211,252,0.15)] flex items-center gap-3 bg-[#0b1b4f] shadow-sm z-10">
              <button 
                onClick={() => setActiveThreadId(null)} 
                className="p-2 hover:bg-[rgba(5,29,83,0.6)] text-[rgba(226,245,255,0.76)] hover:text-white border border-transparent hover:border-[rgba(125,211,252,0.22)] rounded-full transition-colors"
              >
                <ChevronRight size={20} className="rotate-180" />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate text-sm">{activeThread?.topic}</h3>
                <p className="text-[11px] text-[rgba(226,245,255,0.7)] truncate">Dengan: {activeThread?.parentName}</p>
              </div>
              {activeThread?.status === 'open' && (
                <button 
                  onClick={handleCloseThread} 
                  className="text-[10px] font-bold bg-[rgba(5,29,83,0.42)] text-amber-300 border border-amber-400/30 hover:bg-amber-400/20 px-3 py-1.5 rounded-lg shrink-0 transition-colors"
                >
                  Tutup
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-[#07133b]/40 flex flex-col gap-3">
              {messages.map((m: any) => {
                const isMine = m.senderName !== activeThread?.parentName;
                return (
                  <div key={m.id} className={`flex flex-col max-w-[85%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className={`p-3 text-sm shadow-sm ${
                      isMine 
                        ? 'bg-amber-500 text-[#07133b] font-semibold rounded-2xl rounded-br-sm' 
                        : 'bg-[rgba(5,29,83,0.6)] text-white border border-[rgba(125,211,252,0.15)] rounded-2xl rounded-bl-sm'
                    }`}>
                      {m.content}
                    </div>
                    <span className="text-[10px] text-[rgba(226,245,255,0.5)] mt-1 px-1 font-medium">
                      {new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>

            {activeThread?.status === 'open' ? (
              <form onSubmit={handleReply} className="p-3 bg-[#0b1b4f] border-t border-[rgba(125,211,252,0.15)] flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 bg-[rgba(5,29,83,0.6)] border border-[rgba(125,211,252,0.22)] rounded-full px-5 py-2.5 text-sm text-white placeholder-[rgba(226,245,255,0.4)] focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  placeholder="Ketik balasan..."
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  disabled={replyBusy}
                />
                <button 
                  type="submit" 
                  disabled={replyBusy || !replyContent.trim()}
                  className="h-11 w-11 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-[#0b1b4f] rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm"
                >
                  {replyBusy ? <Loader2 size={18} className="animate-spin text-[#0b1b4f]" /> : <Send size={18} className="ml-0.5" />}
                </button>
              </form>
            ) : (
              <div className="p-4 bg-[rgba(5,29,83,0.6)] border-t border-[rgba(125,211,252,0.15)] text-center">
                <p className="text-xs font-medium text-[rgba(226,245,255,0.5)]">Konsultasi ini telah diselesaikan.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
