import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DOUBT_BUCKET, LIVE_REACTIONS } from "@/lib/live";
import { useAuth } from "@/lib/auth";

export interface LiveMessage {
  id: string;
  class_id: string;
  user_id: string;
  author_name: string;
  author_role: string;
  kind: "chat" | "doubt" | string;
  body: string;
  image_path: string | null;
  hidden: boolean;
  resolved: boolean;
  created_at: string;
}

/** Chat + photo doubts + floating reactions for a live class. */
export function LiveChatPanel({
  classId,
  isHost,
  chatEnabled,
  doubtsEnabled,
  reactionsEnabled,
}: {
  classId: string;
  isHost: boolean;
  chatEnabled: boolean;
  doubtsEnabled: boolean;
  reactionsEnabled: boolean;
}) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"chat" | "doubt">("chat");
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [floaters, setFloaters] = useState<{ id: string; emoji: string }[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("live_messages")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: true })
      .limit(400)
      .then(({ data }) => {
        if (alive) setMessages((data as any[]) ?? []);
      });

    const channel = supabase
      .channel(`live-chat:${classId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_messages", filter: `class_id=eq.${classId}` }, (p) => {
        setMessages((prev) => {
          if (p.eventType === "INSERT") return [...prev, p.new as LiveMessage];
          if (p.eventType === "UPDATE") return prev.map((m) => (m.id === (p.new as any).id ? (p.new as LiveMessage) : m));
          return prev.filter((m) => m.id !== (p.old as any).id);
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_reactions", filter: `class_id=eq.${classId}` }, (p) => {
        const emoji = (p.new as any).emoji as string;
        const id = crypto.randomUUID();
        setFloaters((f) => [...f, { id, emoji }]);
        setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2600);
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [classId]);

  /* sign doubt images as they arrive */
  useEffect(() => {
    const missing = messages.map((m) => m.image_path).filter((p): p is string => !!p && !urls[p]);
    if (!missing.length) return;
    supabase.storage
      .from(DOUBT_BUCKET)
      .createSignedUrls(missing, 60 * 60 * 4)
      .then(({ data }) => {
        if (!data) return;
        setUrls((prev) => {
          const next = { ...prev };
          missing.forEach((p, i) => {
            const u = data[i]?.signedUrl;
            if (u) next[p] = u;
          });
          return next;
        });
      });
  }, [messages, urls]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, tab]);

  const shown = useMemo(
    () => messages.filter((m) => m.kind === tab && (isHost || !m.hidden || m.user_id === profile?.id)),
    [messages, tab, isHost, profile?.id],
  );

  const locked = tab === "chat" ? !chatEnabled : !doubtsEnabled;

  const send = async () => {
    if (!profile || sending) return;
    const body = text.trim();
    if (!body && !file) return;
    setSending(true);
    try {
      let imagePath: string | null = null;
      if (file) {
        if (file.size > 10 * 1024 * 1024) throw new Error("Image must be under 10MB");
        const path = `${classId}/${profile.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from(DOUBT_BUCKET).upload(path, file, { contentType: file.type });
        if (error) throw error;
        imagePath = path;
      }
      const { error } = await supabase.from("live_messages").insert({
        class_id: classId,
        user_id: profile.id,
        author_name: profile.full_name,
        author_role: profile.role,
        kind: tab,
        body,
        image_path: imagePath,
      });
      if (error) throw error;
      setText("");
      setFile(null);
    } catch (e: any) {
      alert(e?.message ?? "Could not send");
    } finally {
      setSending(false);
    }
  };

  const react = async (emoji: string) => {
    if (!profile || !reactionsEnabled) return;
    await supabase.from("live_reactions").insert({ class_id: classId, user_id: profile.id, emoji });
  };

  const hostAction = async (m: LiveMessage, action: "hide" | "show" | "delete" | "resolve") => {
    if (action === "delete") await supabase.from("live_messages").delete().eq("id", m.id);
    else if (action === "resolve") await supabase.from("live_messages").update({ resolved: true }).eq("id", m.id);
    else await supabase.from("live_messages").update({ hidden: action === "hide" }).eq("id", m.id);
  };

  return (
    <div className="relative flex h-[26rem] flex-col overflow-hidden rounded-2xl border border-border bg-card lg:h-[34rem]">
      <div className="grid grid-cols-2 border-b border-border text-sm">
        {(["chat", "doubt"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2.5 font-semibold ${tab === t ? "bg-muted text-primary" : "text-muted-foreground"}`}
          >
            {t === "chat" ? "💬 Live chat" : "❓ Doubts"}
          </button>
        ))}
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {shown.length === 0 && (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            {tab === "chat" ? "Say hello to the class 👋" : "Stuck somewhere? Send a photo of your question."}
          </p>
        )}
        {shown.map((m) => (
          <div key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.hidden ? "opacity-50" : ""} ${m.author_role === "student" ? "bg-muted" : "bg-soft-primary"}`}>
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-foreground">{m.author_name}</span>
              {m.author_role !== "student" && (
                <span className="rounded-full bg-gradient-gold px-1.5 py-0.5 text-[9px] font-bold uppercase text-ink">Teacher</span>
              )}
              {m.resolved && <span className="text-[10px] text-emerald">✓ solved</span>}
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {m.body && <p className="mt-1 whitespace-pre-wrap break-words text-foreground">{m.body}</p>}
            {m.image_path && urls[m.image_path] && (
              <a href={urls[m.image_path]} target="_blank" rel="noreferrer">
                <img src={urls[m.image_path]} alt="Doubt attachment" className="mt-2 max-h-56 w-full rounded-lg object-contain" />
              </a>
            )}
            {isHost && (
              <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                <button onClick={() => hostAction(m, m.hidden ? "show" : "hide")}>{m.hidden ? "Unhide" : "Hide"}</button>
                {m.kind === "doubt" && !m.resolved && <button onClick={() => hostAction(m, "resolve")}>Mark solved</button>}
                <button onClick={() => hostAction(m, "delete")} className="text-destructive">Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {reactionsEnabled && (
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-2">
          {LIVE_REACTIONS.map((e) => (
            <button key={e} onClick={() => react(e)} className="rounded-full px-2 py-1 text-lg hover:bg-muted" aria-label={`React ${e}`}>
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-border p-2.5">
        {locked ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            {tab === "chat" ? "Chat is turned off by the teacher." : "Doubts are turned off right now."}
          </p>
        ) : (
          <div className="flex items-end gap-2">
            {tab === "doubt" && (
              <label className="shrink-0 cursor-pointer rounded-xl border border-border px-3 py-2 text-lg" title="Attach a photo">
                📷
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={tab === "chat" ? "Type a message…" : "Describe your doubt…"}
              className="exam-input min-h-[42px] resize-none py-2.5"
            />
            <button onClick={send} disabled={sending} className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {sending ? "…" : "Send"}
            </button>
          </div>
        )}
        {file && <div className="mt-1 truncate text-[11px] text-muted-foreground">📎 {file.name}</div>}
      </div>

      {/* floating reactions */}
      <div className="pointer-events-none absolute bottom-24 right-4 flex flex-col-reverse items-center">
        {floaters.map((f) => (
          <span key={f.id} className="animate-bounce text-2xl">{f.emoji}</span>
        ))}
      </div>
    </div>
  );
}
