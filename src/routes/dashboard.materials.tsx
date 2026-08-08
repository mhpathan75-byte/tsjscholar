import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { listMaterials, createMaterial, deleteMaterial, signMaterialUrl } from "@/lib/materials.functions";

export const Route = createFileRoute("/dashboard/materials")({
  component: MaterialsPage,
  head: () => ({ meta: [{ title: "Materials — TSJ Scholar Palanpur" }] }),
});

type Mat = {
  id: string; title: string; description: string | null; subject: string | null;
  file_path: string; file_name: string; mime_type: string | null; size_bytes: number;
  created_at: string; uploader_name: string; uploader_role: string;
};
const SUBJECTS = ["Physics","Chemistry","Mathematics","Biology","English","General"];

function fmtSize(n: number) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(1)} MB`;
}

function MaterialsPage() {
  const { profile } = useAuth();
  const list = useServerFn(listMaterials);
  const create = useServerFn(createMaterial);
  const del = useServerFn(deleteMaterial);
  const sign = useServerFn(signMaterialUrl);

  const [rows, setRows] = useState<Mat[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [viewer, setViewer] = useState<{ mat: Mat; url: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isStaff = profile?.role === "teacher" || profile?.role === "principal";

  const refresh = () => list({}).then((r) => setRows(r as Mat[])).catch(() => {});
  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || busy) return;
    if (file.size > 50 * 1024 * 1024) { setErr("File too large (max 50 MB)."); return; }
    setBusy(true); setErr(null);
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("Not signed in");
      const safe = file.name.replace(/[^a-z0-9_.-]/gi, "_");
      const key = `${uid}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("materials").upload(key, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      await create({ data: {
        title: title.trim(), description: desc.trim(), subject,
        file_path: key, file_name: file.name, mime_type: file.type, size_bytes: file.size,
      }});
      setTitle(""); setDesc(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      refresh();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Upload failed."); }
    finally { setBusy(false); }
  };

  const preview = async (m: Mat) => {
    setViewer({ mat: m, url: "" });
    try {
      const { url } = await sign({ data: { file_path: m.file_path } }) as { url: string };
      setViewer({ mat: m, url });
    } catch { setViewer({ mat: m, url: "error" }); }
  };

  const download = async (m: Mat) => {
    try {
      const { url } = await sign({ data: { file_path: m.file_path } }) as { url: string };
      const blob = await (await fetch(url)).blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl; a.download = m.file_name; a.click();
      URL.revokeObjectURL(objectUrl);
    } catch { /* ignore */ }
  };

  const remove = async (m: Mat) => {
    if (!confirm(`Delete "${m.title}"?`)) return;
    try { await del({ data: { id: m.id, file_path: m.file_path } }); refresh(); } catch { /* ignore */ }
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.subject === filter);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Study Library</div>
        <h1 className="mt-2 font-display text-4xl text-foreground">Materials</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {isStaff ? "Upload notes, PDFs, worksheets, slides or any resource. Students will see them instantly."
                   : "Notes and resources shared by your teachers. Tap to open or download."}
        </p>
      </div>

      {isStaff && (
        <form onSubmit={upload} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none" placeholder="e.g. Rotational Motion — Class Notes" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Subject</span>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Description (optional)</span>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
              className="w-full resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none" />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">File (any type · up to 50 MB)</span>
            <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground" />
          </label>
          {err && <div className="mt-3 text-sm text-destructive">{err}</div>}
          <button type="submit" disabled={busy || !file || !title.trim()}
            className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? "Uploading…" : "Upload"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {["all", ...SUBJECTS].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest ${filter===s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">No materials yet.</div>
        )}
        {filtered.map((m) => (
          <div key={m.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elegant">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soft-primary text-primary">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5v15z"/></svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg text-foreground">{m.title}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {m.subject ?? "General"} · {fmtSize(m.size_bytes)} · {new Date(m.created_at).toLocaleDateString()}
                </div>
                {m.description && <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">{m.description}</div>}
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">by {m.uploader_name}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => preview(m)} className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90">Preview</button>
              <button onClick={() => download(m)} className="rounded-lg border border-primary px-3 py-2 text-xs font-semibold uppercase tracking-widest text-primary hover:bg-soft-primary">Download</button>
              {(profile?.id === m.id || profile?.role === "principal" || (isStaff && m.uploader_name === profile?.full_name)) && (
                <button onClick={() => remove(m)} className="rounded-lg border border-border px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:border-destructive hover:text-destructive">Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-3" onClick={() => setViewer(null)}>
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elegant" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <div className="min-w-0">
                <div className="truncate font-display text-xl text-foreground">{viewer.mat.title}</div>
                <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{viewer.mat.file_name} · {fmtSize(viewer.mat.size_bytes)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => download(viewer.mat)} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground">Download</button>
                <button onClick={() => setViewer(null)} className="rounded-lg border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground">Close</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-muted">
              {!viewer.url && <div className="flex h-full items-center justify-center text-muted-foreground">Preparing preview…</div>}
              {viewer.url === "error" && <div className="flex h-full items-center justify-center text-destructive">Could not open this file. Try downloading it.</div>}
              {viewer.url && viewer.url !== "error" && (
                (viewer.mat.mime_type ?? "").startsWith("image/")
                  ? <img src={viewer.url} alt={viewer.mat.title} className="mx-auto max-h-full" />
                  : (viewer.mat.mime_type ?? "").startsWith("video/")
                    ? <video src={viewer.url} controls className="mx-auto max-h-full w-full" />
                    : (viewer.mat.mime_type ?? "").startsWith("audio/")
                      ? <div className="p-8"><audio src={viewer.url} controls className="w-full" /></div>
                      : /pdf|text|html/.test(viewer.mat.mime_type ?? "")
                        ? <iframe title={viewer.mat.title} src={viewer.url} className="h-full w-full bg-card" />
                        : <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground"><p>This file type can’t be previewed in the browser.</p><button onClick={() => download(viewer.mat)} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground">Download instead</button></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}