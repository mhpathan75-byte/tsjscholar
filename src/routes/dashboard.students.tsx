import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { createStudentAccounts, listStudentAccounts, parseStudentList } from "@/lib/students.functions";

export const Route = createFileRoute("/dashboard/students")({
  component: StudentsPage,
  head: () => ({ meta: [
    { title: "Add students — TSJ Scholar Palanpur" },
    { name: "description", content: "Create student logins one by one or in bulk from a CSV list." },
    { property: "og:title", content: "Add students — TSJ Scholar Palanpur" },
    { property: "og:description", content: "Create student logins one by one or in bulk from a CSV list." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

type Draft = { full_name: string; class_level: number; exam_track: "JEE" | "NEET"; note?: string };
type Created = { full_name: string; email: string; username: string; password: string; class_level: number; exam_track: string; status: string };

function StudentsPage() {
  const { profile } = useAuth();
  const isStaff = profile?.role === "teacher" || profile?.role === "principal";
  const list = useServerFn(listStudentAccounts);
  const parse = useServerFn(parseStudentList);
  const create = useServerFn(createStudentAccounts);

  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [classLevel, setClassLevel] = useState(11);
  const [track, setTrack] = useState<"JEE" | "NEET">("JEE");
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [created, setCreated] = useState<Created[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const refresh = () => list({}).then((r: any) => setRows(r)).catch(() => {});
  useEffect(() => { if (isStaff) refresh(); }, [isStaff]); // eslint-disable-line

  if (!isStaff) return <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">Only teachers and the principal can add students.</div>;

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setErr("");
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); }
    setBusy("");
  };

  const addOne = () => run("one", async () => {
    if (!name.trim()) throw new Error("Enter the student's name.");
    const result = await create({ data: { students: [{ full_name: name, class_level: classLevel, exam_track: track }] } }) as any;
    setCreated(result.created); setName(""); refresh();
  });

  const readFile = async (file: File) => {
    const content = await file.text();
    setText(content.slice(0, 20000));
  };

  const analyse = () => run("parse", async () => {
    const result = await parse({ data: { text } }) as any;
    setDrafts(result.students); setQuestions(result.questions);
    if (!result.students.length) throw new Error("No students could be read from that list.");
  });

  const createBulk = () => run("bulk", async () => {
    const result = await create({ data: { students: drafts } }) as any;
    setCreated(result.created); setDrafts([]); setQuestions([]); setText(""); refresh();
  });

  const downloadCsv = () => {
    const csv = ["Name,Class,Track,Login email,Username,Password,Status", ...created.map((c) => `"${c.full_name}",${c.class_level},${c.exam_track},${c.email},${c.username},${c.password},"${c.status}"`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "TSJ_new_student_logins.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Admissions</div>
        <h1 className="mt-2 font-display text-4xl text-foreground">Add students</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Enter only the name, class and JEE/NEET track — the login id and password are generated for you. You can also upload a CSV or paste a list and let the assistant read it.</p>
      </div>

      {err && <div role="alert" className="rounded-xl bg-soft-rose p-4 text-sm text-destructive">{err}</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-2xl text-foreground">One student</h2>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground" placeholder="e.g. Ayesha Shaikh" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Class</span>
                <select value={classLevel} onChange={(e) => setClassLevel(Number(e.target.value))} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                  <option value={11}>Class 11</option><option value={12}>Class 12</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Track</span>
                <select value={track} onChange={(e) => setTrack(e.target.value as "JEE" | "NEET")} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                  <option>JEE</option><option>NEET</option>
                </select>
              </label>
            </div>
            <button onClick={addOne} disabled={busy !== ""} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy === "one" ? "Creating…" : "Create login"}</button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-2xl text-foreground">Bulk from a file or list</h2>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Upload CSV / TXT</span>
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground" />
          </label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={"Or paste, e.g.\nAyesha Shaikh, 11, NEET\nZaid Khan, 12, JEE"} className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground" />
          <button onClick={analyse} disabled={busy !== "" || !text.trim()} className="mt-3 rounded-xl border border-primary px-5 py-2.5 text-sm font-semibold text-primary disabled:opacity-50">{busy === "parse" ? "Reading list…" : "Read list"}</button>
        </section>
      </div>

      {questions.length > 0 && (
        <section className="rounded-2xl border border-gold bg-soft-gold p-5">
          <h3 className="font-display text-xl text-gold">A few things to confirm</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gold">{questions.map((q) => <li key={q}>{q}</li>)}</ul>
          <p className="mt-2 text-xs text-gold">Correct the rows below before creating the logins.</p>
        </section>
      )}

      {drafts.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-display text-2xl text-foreground">{drafts.length} students ready</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground"><th className="p-2">Name</th><th className="p-2">Class</th><th className="p-2">Track</th><th className="p-2">Note</th><th /></tr></thead>
              <tbody>
                {drafts.map((d, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2"><input value={d.full_name} onChange={(e) => setDrafts((list) => list.map((x, j) => j === i ? { ...x, full_name: e.target.value } : x))} className="w-full rounded-lg border border-input bg-background px-2 py-1.5" /></td>
                    <td className="p-2"><select value={d.class_level} onChange={(e) => setDrafts((list) => list.map((x, j) => j === i ? { ...x, class_level: Number(e.target.value) } : x))} className="rounded-lg border border-input bg-background px-2 py-1.5"><option value={11}>11</option><option value={12}>12</option></select></td>
                    <td className="p-2"><select value={d.exam_track} onChange={(e) => setDrafts((list) => list.map((x, j) => j === i ? { ...x, exam_track: e.target.value as "JEE" | "NEET" } : x))} className="rounded-lg border border-input bg-background px-2 py-1.5"><option>JEE</option><option>NEET</option></select></td>
                    <td className="p-2 text-xs text-muted-foreground">{d.note}</td>
                    <td className="p-2"><button onClick={() => setDrafts((list) => list.filter((_, j) => j !== i))} className="text-xs uppercase tracking-widest text-destructive">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={createBulk} disabled={busy !== ""} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy === "bulk" ? "Creating logins…" : `Create ${drafts.length} logins`}</button>
        </section>
      )}

      {created.length > 0 && (
        <section className="rounded-2xl border border-emerald bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-foreground">New logins</h3>
            <button onClick={downloadCsv} className="rounded-xl border border-border px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary">Download CSV</button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Save these now — passwords are shown only once.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground"><th className="p-2">Name</th><th className="p-2">Login email</th><th className="p-2">Password</th><th className="p-2">Class</th><th className="p-2">Track</th><th className="p-2">Status</th></tr></thead>
              <tbody>{created.map((c) => <tr key={c.email} className="border-t border-border"><td className="p-2">{c.full_name}</td><td className="p-2 font-mono text-xs">{c.email}</td><td className="p-2 font-mono text-xs">{c.password}</td><td className="p-2">{c.class_level}</td><td className="p-2">{c.exam_track}</td><td className={`p-2 text-xs ${c.status === "Created" ? "text-emerald" : "text-destructive"}`}>{c.status}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-display text-2xl text-foreground">All students ({rows.length})</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-muted p-3">
              <div className="font-semibold text-foreground">{r.full_name}</div>
              <div className="text-xs text-muted-foreground">Class {r.class_level ?? "—"} · {r.exam_track ?? "—"} · {r.username ? `${r.username}@ntsj.app` : "no login id"}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="col-span-full text-sm text-muted-foreground">No students yet.</div>}
        </div>
      </section>
    </div>
  );
}
