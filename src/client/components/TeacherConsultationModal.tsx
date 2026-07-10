import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, X, Send, ChevronRight, UserCircle2, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  senderUserId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface Thread {
  id: string;
  topic: string;
  status: "open" | "closed";
  parentName: string;
  parentId?: string;
}

// ─── Typing Indicator Component ───────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 self-start">
      <div className="flex gap-1 bg-[rgba(5,29,83,0.6)] border border-[rgba(125,211,252,0.15)] rounded-2xl rounded-bl-sm px-4 py-3">
        <span className="w-1.5 h-1.5 bg-[rgba(226,245,255,0.6)] rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-[rgba(226,245,255,0.6)] rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-[rgba(226,245,255,0.6)] rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

// ─── Online Dot Component ─────────────────────────────────────────────────────
function OnlineDot({ isOnline }: { isOnline: boolean }) {
  if (!isOnline) return null;
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TeacherConsultationModal({
  onClose,
  currentUserId
}: {
  onClose: () => void;
  currentUserId?: string;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyContent, setReplyContent] = useState("");
  const [busy, setBusy] = useState(true);
  const [replyBusy, setReplyBusy] = useState(false);

  // Real-time state
  const [isParentOnline, setIsParentOnline] = useState(false);
  const [isParentTyping, setIsParentTyping] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingSentRef = useRef(false);

  // Load threads
  useEffect(() => {
    fetch("/api/teacher/consultations")
      .then(res => res.json())
      .then(data => {
        setThreads(data.threads || []);
        setBusy(false);
      });
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isParentTyping]);

  // SSE connection for active thread
  useEffect(() => {
    // Cleanup previous SSE connection
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    setIsParentOnline(false);
    setIsParentTyping(false);
    setOnlineUserIds([]);

    if (!activeThreadId) return;

    // Fetch thread data
    fetch(`/api/teacher/consultations/${activeThreadId}`)
      .then(res => res.json())
      .then(data => {
        setActiveThread(data.thread);
        setMessages(data.messages || []);
      });

    // Connect SSE
    const es = new EventSource(`/api/chat/events?threadId=${activeThreadId}`, { withCredentials: true });
    sseRef.current = es;

    es.addEventListener("message", (e) => {
      try {
        const msg: ChatMessage = JSON.parse(e.data);
        setMessages(prev => {
          // Deduplicate by id
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Clear typing when message arrives from parent
        if (msg.senderUserId !== currentUserId) {
          setIsParentTyping(false);
        }
      } catch { /* ignore */ }
    });

    es.addEventListener("presence", (e) => {
      try {
        const { onlineUserIds: ids }: { onlineUserIds: string[] } = JSON.parse(e.data);
        setOnlineUserIds(ids);
      } catch { /* ignore */ }
    });

    es.addEventListener("typing", (e) => {
      try {
        const { userId, isTyping }: { userId: string; isTyping: boolean } = JSON.parse(e.data);
        // Show typing indicator only for the other participant (parent)
        if (userId !== currentUserId) {
          setIsParentTyping(isTyping);
        }
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      // Will auto-reconnect via browser
    };

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [activeThreadId, currentUserId]);

  // Derive parent online status from onlineUserIds
  useEffect(() => {
    if (!activeThread) return;
    const parentId = (activeThread as any).parentId;
    if (parentId) {
      setIsParentOnline(onlineUserIds.includes(parentId));
    }
  }, [onlineUserIds, activeThread]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((typing: boolean) => {
    if (!activeThreadId) return;
    fetch("/api/chat/typing", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: activeThreadId, isTyping: typing })
    }).catch(() => {});
  }, [activeThreadId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReplyContent(e.target.value);

    if (!isTypingSentRef.current) {
      sendTypingIndicator(true);
      isTypingSentRef.current = true;
    }

    // Reset auto-stop timer
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTypingIndicator(false);
      isTypingSentRef.current = false;
    }, 2500);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThreadId || !replyContent.trim()) return;

    // Stop typing indicator
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    sendTypingIndicator(false);
    isTypingSentRef.current = false;

    setReplyBusy(true);
    const content = replyContent;
    setReplyContent("");

    await fetch(`/api/teacher/consultations/${activeThreadId}/reply`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });

    setReplyBusy(false);
    // Note: the new message will arrive via SSE, no need to manually fetch
  };

  const handleCloseThread = async () => {
    if (!activeThreadId) return;
    if (!confirm("Tutup konsultasi ini?")) return;
    await fetch(`/api/teacher/consultations/${activeThreadId}/close`, {
      method: "POST",
      credentials: "include"
    });
    setActiveThread(prev => prev ? { ...prev, status: "closed" } : null);
    const data = await fetch("/api/teacher/consultations").then(r => r.json());
    setThreads(data.threads || []);
  };

  const handleOpenThread = (threadId: string) => {
    setActiveThreadId(threadId);
  };

  const handleBackToList = () => {
    // Stop typing before leaving
    if (isTypingSentRef.current) {
      sendTypingIndicator(false);
      isTypingSentRef.current = false;
    }
    setActiveThreadId(null);
    setActiveThread(null);
    setMessages([]);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="bg-[#0b1b4f]/95 border border-[rgba(125,211,252,0.25)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-blue-950/40 flex flex-col h-[80vh] text-white">

        {!activeThreadId ? (
          /* ── Thread List View ───────────────────────────────────────── */
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
                      onClick={() => handleOpenThread(t.id)}
                      className="text-left p-4 bg-[rgba(5,29,83,0.42)] rounded-2xl border border-[rgba(125,211,252,0.15)] shadow-sm hover:border-amber-400/50 hover:bg-[rgba(5,29,83,0.6)] transition-all group w-full"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white truncate pr-2 group-hover:text-amber-300 transition-colors">
                          {t.topic}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap border ${
                          t.status === "open"
                            ? "bg-amber-400/10 text-amber-300 border-amber-400/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          {t.status === "open" ? "Buka" : "Selesai"}
                        </span>
                      </div>
                      <p className="text-xs text-[rgba(226,245,255,0.7)] flex items-center gap-1.5">
                        <UserCircle2 size={14} className="opacity-70 text-amber-400" />
                        {t.parentName}
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
          /* ── Active Thread Chat View ─────────────────────────────────── */
          <>
            <div className="px-4 py-3 border-b border-[rgba(125,211,252,0.15)] flex items-center gap-3 bg-[#0b1b4f] shadow-sm z-10">
              <button
                onClick={handleBackToList}
                className="p-2 hover:bg-[rgba(5,29,83,0.6)] text-[rgba(226,245,255,0.76)] hover:text-white border border-transparent hover:border-[rgba(125,211,252,0.22)] rounded-full transition-colors"
              >
                <ChevronRight size={20} className="rotate-180" />
              </button>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate text-sm">{activeThread?.topic}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <OnlineDot isOnline={isParentOnline} />
                  <p className="text-[11px] text-[rgba(226,245,255,0.7)] truncate">
                    {activeThread?.parentName}
                    {isParentOnline && (
                      <span className="text-emerald-400 font-semibold ml-1">· online</span>
                    )}
                  </p>
                </div>
              </div>

              {activeThread?.status === "open" && (
                <button
                  onClick={handleCloseThread}
                  className="text-[10px] font-bold bg-[rgba(5,29,83,0.42)] text-amber-300 border border-amber-400/30 hover:bg-amber-400/20 px-3 py-1.5 rounded-lg shrink-0 transition-colors"
                >
                  Tutup
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#07133b]/40 flex flex-col gap-3">
              {messages.map((m) => {
                const isMine = m.senderUserId === currentUserId;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] ${isMine ? "self-end items-end" : "self-start items-start"}`}
                  >
                    <div className={`p-3 text-sm shadow-sm ${
                      isMine
                        ? "bg-amber-500 text-[#07133b] font-semibold rounded-2xl rounded-br-sm"
                        : "bg-[rgba(5,29,83,0.6)] text-white border border-[rgba(125,211,252,0.15)] rounded-2xl rounded-bl-sm"
                    }`}>
                      {m.content}
                    </div>
                    <span className="text-[10px] text-[rgba(226,245,255,0.5)] mt-1 px-1 font-medium">
                      {new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isParentTyping && (
                <div className="flex flex-col self-start items-start max-w-[85%]">
                  <TypingIndicator />
                  <span className="text-[10px] text-[rgba(226,245,255,0.4)] mt-1 px-1 font-medium italic">
                    {activeThread?.parentName} sedang mengetik...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {activeThread?.status === "open" ? (
              <form onSubmit={handleReply} className="p-3 bg-[#0b1b4f] border-t border-[rgba(125,211,252,0.15)] flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-[rgba(5,29,83,0.6)] border border-[rgba(125,211,252,0.22)] rounded-full px-5 py-2.5 text-sm text-white placeholder-[rgba(226,245,255,0.4)] focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  placeholder="Ketik balasan..."
                  value={replyContent}
                  onChange={handleInputChange}
                  disabled={replyBusy}
                />
                <button
                  type="submit"
                  disabled={replyBusy || !replyContent.trim()}
                  className="h-11 w-11 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-[#0b1b4f] rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm"
                >
                  {replyBusy ? (
                    <Loader2 size={18} className="animate-spin text-[#0b1b4f]" />
                  ) : (
                    <Send size={18} className="ml-0.5" />
                  )}
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
