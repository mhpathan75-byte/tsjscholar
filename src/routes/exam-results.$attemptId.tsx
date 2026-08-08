import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getAttemptResult } from "@/lib/tests.functions";
import { Markdown } from "@/components/Markdown";

export const Route = createFileRoute("/exam-results/$attemptId")({
  component: AttemptResultPage,
  head: () => ({ meta: [{ title: "Examination result — TSJ Scholar Palanpur" }, { name: "description", content: "Your score and question-level examination performance." }, { property: "og:title", content: "Examination result — TSJ Scholar Palanpur" }, { property: "og:description", content: "Secure examination performance result." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

function AttemptResultPage() {
  const { attemptId } = Route.useParams();
  const load = useServerFn(getAttemptResult);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "skipped">("all");
  useEffect(() => { load({ data: { attemptId } }).then(setResult).catch((e) => setError(e instanceof Error ? e.message : "Could not load result")); }, [attemptId]); // eslint-disable-line
  if (error) return <ResultShell><div role="alert" className="rounded-xl bg-soft-rose p-5 text-destructive">{error}</div></ResultShell>;
  if (!result) return <ResultShell><div className="h-72 animate-pulse rounded-xl bg-muted" /></ResultShell>;
  const test = result.tests;
  const review: any[] = Array.isArray(result.review) ? result.review : [];
  const visible = review.filter((r) => filter === "all" ? true : filter === "correct" ? r.attempted && r.is_correct : filter === "incorrect" ? r.attempted && !r.is_correct : !r.attempted);
  const percentage = Number(result.percentage ?? 0);
  const reviewRows: any[] = Array.isArray(result.review) ? result.review : [];
  const correctCount = reviewRows.length ? reviewRows.filter((r) => r.attempted && r.is_correct).length : Number(result.correct_count ?? 0);
  const incorrectCount = reviewRows.length ? reviewRows.filter((r) => r.attempted && !r.is_correct).length : Number(result.incorrect_count ?? 0);
  const skippedCount = reviewRows.length ? reviewRows.filter((r) => !r.attempted).length : Number(result.unattempted_count ?? 0);
  const total = correctCount + incorrectCount + skippedCount;
  return <ResultShell>
    <header className="border-b border-border bg-card px-5 py-5 sm:px-8"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><div><div className="text-xs uppercase tracking-widest text-primary">Performance report</div><h1 className="mt-1 font-display text-3xl">{test?.title ?? "Examination result"}</h1><p className="mt-1 text-sm text-muted-foreground">{test?.exam_type} · Class {test?.class_level} · Submitted {new Date(result.submitted_at).toLocaleString()}</p></div><Link to="/dashboard/tests" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary">Back to tests</Link></div></header>
    <main className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
      <section className="grid gap-5 rounded-xl border border-border bg-card p-6 shadow-soft md:grid-cols-[220px_1fr] md:items-center">
        <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${Math.max(0, percentage) * 3.6}deg, var(--muted) 0)` }}><div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-card"><span className="font-display text-4xl text-primary">{percentage.toFixed(1)}%</span><span className="text-xs uppercase tracking-widest text-muted-foreground">Performance</span></div></div>
        <div><div className="grid gap-3 sm:grid-cols-3"><ResultStat label="Score" value={`${Number(result.score ?? 0)} / ${Number(result.max_score ?? 0)}`} /><ResultStat label="Questions" value={total} /><ResultStat label="Rank" value={result.rank ? `#${result.rank}` : "Pending"} /></div><p className="mt-5 text-sm leading-6 text-muted-foreground">Your result is calculated from saved answers, including negative marking. Use the subject and topic reports in the dashboard to track performance across multiple papers.</p></div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3"><Outcome tone="emerald" label="Correct" value={correctCount} total={total} /><Outcome tone="rose" label="Incorrect" value={incorrectCount} total={total} /><Outcome tone="gold" label="Unattempted" value={skippedCount} total={total} /></section>
      {Array.isArray(result.subjects) && result.subjects.length > 0 && <section className="rounded-xl border border-border bg-card p-6 shadow-soft"><div className="text-xs uppercase tracking-widest text-primary">Subject-wise</div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{result.subjects.map((s: any) => <div key={s.subject} className="rounded-xl bg-muted p-4"><div className="font-display text-xl">{s.subject}</div><div className="mt-1 text-sm text-muted-foreground">{s.score} / {s.max} marks</div><div className="mt-2 text-xs text-muted-foreground">✓ {s.correct} correct · ✗ {s.incorrect} wrong · − {s.unattempted} skipped</div></div>)}</div></section>}

      <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-widest text-primary">Answer sheet</div><h2 className="mt-1 font-display text-2xl">Every question, your answer and the correct one</h2></div><div className="flex gap-2">{(["all","correct","incorrect","skipped"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{f}</button>)}</div></div>
        <div className="mt-5 space-y-4">
          {visible.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">Nothing in this filter.</div>}
          {visible.map((r: any) => {
            const opts = Array.isArray(r.options) ? r.options : [];
            const correctIds = Array.isArray(r.correct_answer) ? r.correct_answer.map(String) : [String(r.correct_answer ?? "")];
            const given = r.given_answer === null || r.given_answer === undefined ? "" : String(r.given_answer);
            const tone = !r.attempted ? "border-border" : r.is_correct ? "border-emerald" : "border-destructive";
            return <article key={r.id} className={`rounded-xl border-2 bg-card p-5 ${tone}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-widest text-muted-foreground"><span>Q{r.number} · {r.subject} · {r.chapter}</span><span className={!r.attempted ? "text-gold" : r.is_correct ? "text-emerald" : "text-destructive"}>{!r.attempted ? "Not attempted" : r.is_correct ? "Correct" : "Incorrect"} · {r.marks_awarded > 0 ? `+${r.marks_awarded}` : r.marks_awarded} marks</span></div>
              {r.passage && <div className="mt-3 rounded-xl border-l-4 border-primary bg-muted p-4 text-sm"><Markdown>{r.passage}</Markdown></div>}
              <div className="mt-3 font-medium leading-7"><Markdown>{r.stem}</Markdown></div>
              {r.diagrams?.map((d: any, i: number) => d?.type === "svg" ? <div key={i} className="mt-4 overflow-auto rounded-xl border border-border bg-card p-3" dangerouslySetInnerHTML={{ __html: d.content }} /> : null)}
              {opts.length > 0 ? <div className="mt-4 space-y-2">{opts.map((o: any) => { const isRight = correctIds.includes(String(o.id)); const isMine = given === String(o.id); return <div key={o.id} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${isRight ? "border-emerald bg-soft-emerald" : isMine ? "border-destructive bg-soft-rose" : "border-border"}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-xs font-semibold">{o.id}</span><span className="pt-0.5"><Markdown>{o.text}</Markdown></span><span className="ml-auto whitespace-nowrap text-[10px] uppercase tracking-widest">{isRight ? "Correct" : isMine ? "Your answer" : ""}</span></div>; })}</div>
                : <div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-border p-3 text-sm"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Your answer</div><div className="mt-1 font-mono">{given || "—"}</div></div><div className="rounded-xl border border-emerald bg-soft-emerald p-3 text-sm"><div className="text-[10px] uppercase tracking-widest">Correct answer</div><div className="mt-1 font-mono">{correctIds.join(", ")}</div></div></div>}
              {r.solution && <details className="mt-4 rounded-xl bg-muted p-4 text-sm"><summary className="cursor-pointer font-semibold text-primary">Show solution</summary><div className="mt-2"><Markdown>{r.solution}</Markdown></div></details>}
            </article>;
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-soft"><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-widest text-primary">Next step</div><h2 className="mt-1 font-display text-2xl">Your broader progress</h2></div><Link to="/dashboard/reports" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open full report</Link></div></section>
    </main>
  </ResultShell>;
}

function ResultShell({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-background text-foreground">{children}</div>; }
function ResultStat({ label, value }: { label: string; value: React.ReactNode }) { return <div className="rounded-xl bg-muted p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="mt-1 font-display text-2xl">{value}</div></div>; }
function Outcome({ tone, label, value, total }: { tone: "emerald" | "rose" | "gold"; label: string; value: number; total: number }) { const cls = tone === "emerald" ? "bg-soft-emerald text-emerald" : tone === "rose" ? "bg-soft-rose text-destructive" : "bg-soft-gold text-gold"; return <div className={`rounded-xl p-5 ${cls}`}><div className="text-xs uppercase tracking-widest">{label}</div><div className="mt-2 font-display text-4xl">{value}</div><div className="mt-1 text-xs">{total ? Math.round((Number(value) / total) * 100) : 0}% of paper</div></div>; }