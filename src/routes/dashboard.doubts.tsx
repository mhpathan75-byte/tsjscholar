import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { listDoubts, createDoubt, answerDoubt, listTeachers } from "@/lib/doubts.functions";
import { signDoubtUrls } from "@/lib/materials.functions";
import { Markdown } from "@/components/Markdown";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/doubts")({
  component: DoubtsPage,
  head: () => ({ meta: [{ title: "Doubt Room — TSJ Scholar Palanpur" }] }),
});

type Visibility = "all_teachers" | "specific_teacher" | "all_students" | "everyone";

type Doubt = {
  id: string;
  student_id: string;
  student_name: string;
  subject: string;
  question: string;
  answer: string | null;
  answered_by: string | null;
  answered_by_name: string | null;
  answered_at: string | null;
  created_at: string;
  visibility: Visibility;
  specific_teacher_id: string | null;
  image_urls: string[];
};

type Teacher = { id: string; full_name: string; subject: string | null; role: string };

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Other"];
const VIS_LABELS: Record<Visibility, string> = {
  all_teachers: "All teachers only",
  specific_teacher: "A specific teacher",
  all_students: "All students + teachers",
  everyone: "Everyone in school",
};

function DoubtsPage() {
  const { profile } = useAuth();
  const list = useServerFn(listDoubts);
  const create = useServerFn(createDoubt);
  const answer = useServerFn(answerDoubt);
  const teachersFn = useServerFn(listTeachers);
  const signUrls = useServerFn(signDoubtUrls);

  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subject, setSubject] = useState("Physics");
  const [question, setQuestion] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("all_teachers");
  const [teacherId, setTeacherId] = useState<string>("");
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});
  const [signedById, setSignedById] = useState<Record<string, string[]>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      const rows = (await list({})) as Doubt[];
      setDoubts(rows);
      // Sign image URLs for any doubts that have them
      const allPaths = rows.flatMap((d) => d.image_urls ?? []);
      if (allPaths.length > 0) {
        const res = await signUrls({ data: { paths: allPaths } }) as { urls: string[] };
        let cursor = 0;
        const next: Record<string, string[]> = {};
        for (const d of rows) {
          const n = d.image_urls?.length ?? 0;
          next[d.id] = res.urls.slice(cursor, cursor + n);
          cursor += n;
        }
        setSignedById(next);
      } else {
        setSignedById({});
      }
    } catch { /* ignore */ }
  };
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { teachersFn({}).then((t) => setTeachers(t as Teacher[])).catch(() => {}); }, [teachersFn]);

  const isStaff = profile?.role === "teacher" || profile?.role === "principal";

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 6 - images.length;
    const list = Array.from(files).slice(0, remaining).filter((f) => f.type.startsWith("image/") && f.size <= 6 * 1024 * 1024);
    setImages((p) => [...p, ...list]);
  };

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || busy) return;
    if (visibility === "specific_teacher" && !teacherId) { setErr("Pick a teacher."); return; }
    setBusy(true); setErr(null);
    try {
      // Upload images to storage first
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("Not signed in");
      const paths: string[] = [];
      for (const f of images) {
        const key = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${f.name.replace(/[^a-z0-9_.-]/gi, "_")}`;
        const { error: upErr } = await supabase.storage.from("doubts").upload(key, f, { upsert: false, contentType: f.type });
        if (upErr) throw upErr;
        paths.push(key);
      }
      await create({ data: {
        subject, question: question.trim(),
        visibility, specific_teacher_id: visibility === "specific_teacher" ? teacherId : null,
        image_urls: paths,
      }});
      setQuestion("");
      setImages([]);
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Failed to post."); }
    finally { setBusy(false); }
  };

  const submitAnswer = async (id: string) => {
    const a = answerDraft[id]?.trim();
    if (!a) return;
    try {
      await answer({ data: { id, answer: a } });
      setAnswerDraft((d) => ({ ...d, [id]: "" }));
      refresh();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Ask · Answer</div>
        <h1 className="mt-2 font-display text-4xl text-foreground">Doubt Room</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {isStaff
            ? "Every doubt visible to you lands here. Reply with rich text and formulas."
            : "Stuck? Post your doubt with photos if it helps. You choose who can see it — by default only teachers do."}
        </p>
      </div>

      {profile?.role === "student" && (
        <form onSubmit={post} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Subject</span>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none"
              >
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Your doubt</span>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="e.g. Why is centripetal acceleration v²/r and not v/r?"
                className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              />
            </label>
          </div>

          {/* Images */}
          <div className="mt-4">
            <div className="mb-1.5 text-xs uppercase tracking-widest text-muted-foreground">Attach images (optional · up to 6)</div>
            <div className="flex flex-wrap items-center gap-3">
              {images.map((f, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(f)} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" />
                  <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground shadow">×</button>
                </div>
              ))}
              {images.length < 6 && (
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-muted">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 5v14M5 12h14"/></svg>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          {/* Visibility */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Who can see this?</span>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none">
                {Object.entries(VIS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            {visibility === "specific_teacher" && (
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Choose teacher</span>
                <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none">
                  <option value="">— pick one —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}{t.subject ? ` · ${t.subject}` : ""}</option>)}
                </select>
              </label>
            )}
          </div>

          {err && <div className="mt-3 text-sm text-destructive">{err}</div>}
          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-50"
          >{busy ? "Posting…" : "Post doubt"}</button>
        </form>
      )}

      <div className="space-y-4">
        {doubts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            No doubts yet.
          </div>
        )}
        {doubts.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">{d.subject}</span>
              {isStaff && <span className="rounded-full bg-muted px-2 py-0.5 text-foreground">{d.student_name}</span>}
              <span className="rounded-full border border-border px-2 py-0.5">{VIS_LABELS[d.visibility]}</span>
              <span>{new Date(d.created_at).toLocaleString()}</span>
              {d.answer && <span className="rounded-full bg-emerald px-2 py-0.5 text-emerald-foreground">Answered</span>}
            </div>
            <div className="mt-3 whitespace-pre-wrap text-sm text-foreground">{d.question}</div>

            {(signedById[d.id]?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {signedById[d.id].map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt="" className="h-28 w-28 rounded-lg border border-border object-cover transition hover:opacity-80" />
                  </a>
                ))}
              </div>
            )}

            {d.answer && (
              <div className="mt-4 rounded-xl border-l-4 border-primary bg-muted/60 p-4">
                <div className="text-[10px] uppercase tracking-widest text-primary">Answered by {d.answered_by_name ?? "Teacher"}</div>
                <Markdown>{d.answer}</Markdown>
              </div>
            )}

            {isStaff && !d.answer && (
              <div className="mt-4">
                <textarea
                  value={answerDraft[d.id] ?? ""}
                  onChange={(e) => setAnswerDraft((s) => ({ ...s, [d.id]: e.target.value }))}
                  rows={3}
                  placeholder="Reply — supports **markdown** and $formulas$"
                  className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                />
                <button
                  onClick={() => submitAnswer(d.id)}
                  disabled={!answerDraft[d.id]?.trim()}
                  className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >Post answer</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}