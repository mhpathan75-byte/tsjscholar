import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ashraSend,
  ashraListConversations,
  ashraLoadMessages,
  ashraNewConversation,
  ashraDeleteConversation,
} from "@/lib/ashra.functions";
import { Markdown } from "@/components/Markdown";
import { useAuth } from "@/lib/auth";
import { AshraMark } from "@/components/AshraMark";

export const Route = createFileRoute("/dashboard/ashra")({
  component: AshraPage,
  head: () => ({ meta: [{ title: "Ashra — TSJ Scholar Palanpur" }] }),
});

type Msg = { id?: string; role: "user" | "assistant"; content: string };
type Conv = { id: string; title: string; updated_at: string };

function AshraPage() {
  const { profile } = useAuth();
  const send = useServerFn(ashraSend);
  const listConvs = useServerFn(ashraListConversations);
  const loadMsgs = useServerFn(ashraLoadMessages);
  const newConv = useServerFn(ashraNewConversation);
  const delConv = useServerFn(ashraDeleteConversation);

  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 4 - images.length;
    Array.from(files).slice(0, remaining).forEach((f) => {
      if (!f.type.startsWith("image/")) return;
      if (f.size > 5 * 1024 * 1024) { setErr("Each image must be under 5 MB."); return; }
      const r = new FileReader();
      r.onload = () => setImages((prev) => [...prev, r.result as string]);
      r.readAsDataURL(f);
    });
  };

  const suggestions = useMemo(() => {
    const track = profile?.exam_track;
    if (track === "NEET") return [
      "Explain photosynthesis light reactions with a labelled step-by-step",
      "Difference between mitosis and meiosis — quick table",
      "Balance: KMnO4 + FeSO4 + H2SO4 →",
      "Solve: pH of 0.01 M HCl and why",
    ];
    return [
      "Solve: ∫ x·e^x dx step by step",
      "Derive v² = u² + 2as using calculus",
      "Difference between SN1 and SN2 with an example",
      "Explain de Broglie wavelength in one paragraph",
    ];
  }, [profile?.exam_track]);

  useEffect(() => {
    listConvs({}).then((rows) => setConvs(rows as Conv[])).catch(() => {});
  }, [listConvs]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    loadMsgs({ data: { conversationId: activeId } })
      .then((rows) => setMessages((rows as Msg[]).map((r) => ({ id: r.id, role: r.role as "user" | "assistant", content: r.content }))))
      .catch(() => {});
  }, [activeId, loadMsgs]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setErr(null);
    setInput("");
    const previewImgs = images;
    setMessages((m) => [...m, { role: "user", content: text + (previewImgs.length ? "\n\n" + previewImgs.map(() => "🖼️ image").join(" ") : "") }]);
    setBusy(true);
    try {
      const res = await send({ data: { conversationId: activeId, text, imageDataUrls: previewImgs } });
      const r = res as { conversationId: string; reply: string };
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
      setImages([]);
      if (fileRef.current) fileRef.current.value = "";
      if (!activeId) {
        setActiveId(r.conversationId);
        const fresh = await listConvs({});
        setConvs(fresh as Conv[]);
      } else {
        setConvs((cs) => cs.map((c) => c.id === activeId ? { ...c, updated_at: new Date().toISOString() } : c));
      }
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : "Something went wrong.";
      setErr(msg);
      setMessages((m) => m.slice(0, -1));
      setInput(text);
    } finally {
      setBusy(false);
    }
  };

  const startNew = async () => {
    try {
      const { id } = await newConv({}) as { id: string };
      setActiveId(id);
      setMessages([]);
      const fresh = await listConvs({});
      setConvs(fresh as Conv[]);
    } catch { /* ignore */ }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this chat?")) return;
    try {
      await delConv({ data: { conversationId: id } });
      if (activeId === id) { setActiveId(null); setMessages([]); }
      setConvs((cs) => cs.filter((c) => c.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className="grid h-[calc(100vh-8.5rem)] min-h-[620px] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      {/* Chat history */}
      <aside className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft lg:flex lg:flex-col">
        <div className="border-b border-border p-3">
          <button
            onClick={startNew}
            className="w-full rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            + New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {convs.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">Your chats will appear here.</div>
          )}
          {convs.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${activeId === c.id ? "bg-muted text-primary" : "hover:bg-muted"}`}
            >
              <button
                onClick={() => setActiveId(c.id)}
                className="flex-1 truncate text-left"
              >{c.title}</button>
              <button
                onClick={() => remove(c.id)}
                className="opacity-0 transition group-hover:opacity-70 hover:!opacity-100"
                aria-label="Delete chat"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat panel */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft-gold ring-1 ring-gold/40 shadow-soft">
               <AshraMark className="h-7 w-7" />
            </div>
            <div>
              <div className="font-display text-lg text-foreground">Ashra</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Your personal tutor · remembers you · renders formulas</div>
            </div>
          </div>
          <button onClick={startNew} className="rounded-lg border border-border px-3 py-1.5 text-xs uppercase tracking-widest text-foreground hover:bg-muted lg:hidden">
            + New
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && !busy && (
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-soft-gold ring-1 ring-gold/40 shadow-elegant">
                 <AshraMark className="h-14 w-14" />
              </div>
              <h2 className="mt-4 font-display text-3xl text-foreground">Hi {profile?.full_name.split(" ")[0]} — ask me anything.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Physics · Chemistry · Maths · Biology · English. I remember our past chats, render formulas beautifully, and can look at your photos.</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-xl border border-border bg-background px-4 py-3 text-left text-sm text-foreground shadow-soft transition hover:-translate-y-0.5 hover:bg-muted"
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft-gold">
                     <AshraMark className="h-6 w-6" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-soft ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}>
                  {m.role === "user"
                    ? <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                    : <Markdown>{m.content}</Markdown>}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-3">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-soft-gold animate-pulse">
                   <AshraMark className="h-6 w-6" />
                </div>
                <div className="rounded-2xl bg-background px-4 py-3 text-sm text-muted-foreground shadow-soft">
                  Ashra is thinking<span className="inline-flex ml-1"><span className="animate-bounce">.</span><span className="animate-bounce [animation-delay:0.15s]">.</span><span className="animate-bounce [animation-delay:0.3s]">.</span></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {err && (
          <div className="mx-4 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>
        )}

        <form onSubmit={submit} className="border-t border-border p-3">
          {images.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 px-1">
              {images.map((src, idx) => (
                <div key={idx} className="relative">
                  <img src={src} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((_, i) => i !== idx))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground shadow"
                    aria-label="Remove"
                  >×</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-primary/30">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted"
              aria-label="Attach image"
              title="Attach image (up to 4)"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.5V17a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4h6"/><path d="M17 3v6h6"/><path d="M8 13l2 2 5-5"/></svg>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); }}
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e as unknown as React.FormEvent); }}
              placeholder="Ask Ashra anything — attach a photo of your problem if it helps."
              rows={2}
              className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <div className="mt-1 px-2 text-[10px] uppercase tracking-widest text-muted-foreground">Formulas · tables · lists · photos supported</div>
        </form>
      </div>
    </div>
  );
}