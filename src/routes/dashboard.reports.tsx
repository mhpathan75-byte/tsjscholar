import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { performanceReport } from "@/lib/tests.functions";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/dashboard/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — TSJ Scholar Palanpur" }] }),
});

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-4xl text-foreground">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ReportsPage() {
  const { profile } = useAuth();
  const loadReport = useServerFn(performanceReport);
  const [report, setReport] = useState<any>(null);
  const [reportError, setReportError] = useState("");
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [stats, setStats] = useState({
    doubtsPosted: 0, doubtsAnswered: 0, materials: 0, chats: 0, students: 0, teachers: 0,
  });

  useEffect(() => {
    if (!profile) return;
    loadReport({}).then(setReport).catch((e) => setReportError(e instanceof Error ? e.message : "Could not load results"));
  }, [profile]); // eslint-disable-line

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [d1, d2, mats, chats, studs, teachs] = await Promise.all([
        profile.role === "student"
          ? supabase.from("doubts").select("id", { count: "exact", head: true }).eq("student_id", profile.id)
          : supabase.from("doubts").select("id", { count: "exact", head: true }),
        profile.role === "student"
          ? supabase.from("doubts").select("id", { count: "exact", head: true }).eq("student_id", profile.id).not("answer","is",null)
          : profile.role === "teacher" || profile.role === "principal"
            ? supabase.from("doubts").select("id", { count: "exact", head: true }).eq("answered_by", profile.id)
            : supabase.from("doubts").select("id", { count: "exact", head: true }).not("answer","is",null),
        supabase.from("materials").select("id", { count: "exact", head: true }),
        supabase.from("ashra_conversations").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["teacher","principal"]),
      ]);
      setStats({
        doubtsPosted: d1.count ?? 0,
        doubtsAnswered: d2.count ?? 0,
        materials: mats.count ?? 0,
        chats: chats.count ?? 0,
        students: studs.count ?? 0,
        teachers: teachs.count ?? 0,
      });
    })();
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gold">At a Glance</div>
        <h1 className="mt-2 font-display text-4xl text-foreground">Reports</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {profile.role === "student" && "Your activity across TSJ Scholar Palanpur."}
          {profile.role === "teacher" && "How the school is using your classroom right now."}
          {profile.role === "principal" && "A live snapshot of the whole science department."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {profile.role === "student" && (
          <>
            <Stat label="Doubts posted" value={stats.doubtsPosted} sub="Across every subject" />
            <Stat label="Doubts answered" value={stats.doubtsAnswered} sub="Replies from teachers" />
            <Stat label="Ashra chats" value={stats.chats} sub="Your personal history" />
            <Stat label="Materials available" value={stats.materials} sub="From all teachers" />
          </>
        )}
        {profile.role === "teacher" && (
          <>
            <Stat label="Doubts you answered" value={stats.doubtsAnswered} />
            <Stat label="Open doubts visible to you" value={stats.doubtsPosted} />
            <Stat label="Materials in library" value={stats.materials} />
            <Stat label="Students in school" value={stats.students} />
          </>
        )}
        {profile.role === "principal" && (
          <>
            <Stat label="Students" value={stats.students} />
            <Stat label="Faculty" value={stats.teachers} />
            <Stat label="Total doubts" value={stats.doubtsPosted} />
            <Stat label="Materials shared" value={stats.materials} />
          </>
        )}
      </div>

      <ExamResults report={report} error={reportError} openStudent={openStudent} setOpenStudent={setOpenStudent} />
    </div>
  );
}

function pct(n: unknown) {
  const v = Number(n ?? 0);
  return `${Number.isFinite(v) ? v.toFixed(1) : "0.0"}%`;
}

function exportCsv(rows: any[]) {
  const head = ["Student", "Class", "Test", "Exam", "Score", "Max", "Percentage", "Rank", "Correct", "Incorrect", "Unattempted", "Submitted"];
  const body = rows.map((a) => [
    a.profiles?.full_name ?? "", a.profiles?.class_level ?? "", a.tests?.title ?? "", a.tests?.exam_type ?? "",
    a.score ?? 0, a.max_score ?? 0, a.percentage ?? 0, a.rank ?? "", a.correct_count ?? 0, a.incorrect_count ?? 0,
    a.unattempted_count ?? 0, a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "",
  ]);
  const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `tsj-results-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function exportPdf(rows: any[], title: string) {
  const document = new jsPDF({ orientation: "landscape" });
  document.setFontSize(18); document.text("TSJ Scholar Palanpur", 14, 16);
  document.setFontSize(12); document.text(title, 14, 24);
  document.setFontSize(9); document.text(`Generated ${new Date().toLocaleString()}`, 14, 30);
  autoTable(document, {
    startY: 36,
    head: [["Student", "Class", "Paper", "Score", "%", "Rank", "Correct", "Incorrect", "Unattempted"]],
    body: rows.map((a) => [a.profiles?.full_name ?? "Student", a.profiles?.class_level ?? "", a.tests?.title ?? "Paper", `${Number(a.score ?? 0)} / ${Number(a.max_score ?? 0)}`, Number(a.percentage ?? 0).toFixed(1), a.rank ? `#${a.rank}` : "—", a.correct_count ?? 0, a.incorrect_count ?? 0, a.unattempted_count ?? 0]),
    styles: { fontSize: 8 }, headStyles: { fillColor: [25, 95, 75] },
  });
  document.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}

function ExamResults({ report, error, openStudent, setOpenStudent }: { report: any; error: string; openStudent: string | null; setOpenStudent: (v: string | null) => void }) {
  if (error) return <div role="alert" className="rounded-2xl bg-soft-rose p-6 text-sm text-destructive">{error}</div>;
  if (!report) return <div className="h-52 animate-pulse rounded-2xl bg-muted" />;

  const attempts: any[] = report.attempts ?? [];
  if (attempts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No submitted papers yet. Results appear here the moment a test is submitted.
      </div>
    );
  }

  const avg = attempts.reduce((a, x) => a + Number(x.percentage ?? 0), 0) / attempts.length;
  const best = attempts.reduce((a, x) => (Number(x.percentage ?? 0) > Number(a.percentage ?? 0) ? x : a), attempts[0]);

  // Staff: per-student roll-up, expandable into that student's paper-by-paper record.
  const byStudent = new Map<string, any[]>();
  for (const a of attempts) {
    const list = byStudent.get(a.student_id) ?? [];
    list.push(a);
    byStudent.set(a.student_id, list);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Examination performance</div>
          <h2 className="mt-1 font-display text-3xl text-foreground">{report.staff ? "Every submitted paper" : "Your results"}</h2>
        </div>
        <div className="flex flex-wrap gap-2"><button onClick={() => exportCsv(attempts)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">Download Excel (CSV)</button><button onClick={() => exportPdf(attempts, report.staff ? "Class performance report" : "My performance report")} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Download class PDF</button></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Papers submitted" value={attempts.length} />
        <Stat label="Average score" value={pct(avg)} />
        <Stat label="Best performance" value={pct(best.percentage)} sub={report.staff ? best.profiles?.full_name : best.tests?.title} />
      </div>

      {report.staff ? (
        <div className="space-y-3">
          {[...byStudent.entries()].map(([studentId, rows]) => {
            const name = rows[0]?.profiles?.full_name ?? "Student";
            const average = rows.reduce((a, x) => a + Number(x.percentage ?? 0), 0) / rows.length;
            const open = openStudent === studentId;
            return (
              <div key={studentId} className="rounded-2xl border border-border bg-card shadow-soft">
                <button onClick={() => setOpenStudent(open ? null : studentId)} className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left">
                  <div>
                    <div className="font-display text-xl text-foreground">{name}</div>
                    <div className="text-xs text-muted-foreground">Class {rows[0]?.profiles?.class_level ?? 11} · {rows.length} paper{rows.length > 1 ? "s" : ""}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Average</div>
                      <div className="font-display text-2xl text-primary">{pct(average)}</div>
                    </div>
                    <span className="text-xs uppercase tracking-widest text-primary">{open ? "Hide" : "View"}</span>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border p-5 pt-4"><div className="mb-3 flex justify-end"><button onClick={() => exportPdf(rows, `${name} performance report`)} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-primary">Download student PDF</button></div>
                    <AttemptTable rows={rows} showTest />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <AttemptTable rows={attempts} showTest />
        </div>
      )}
    </section>
  );
}

function AttemptTable({ rows, showTest }: { rows: any[]; showTest?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
            {showTest && <th className="pb-2 pr-4">Paper</th>}
            <th className="pb-2 pr-4">Score</th>
            <th className="pb-2 pr-4">Percentage</th>
            <th className="pb-2 pr-4">Rank</th>
            <th className="pb-2 pr-4">Correct</th>
            <th className="pb-2 pr-4">Incorrect</th>
            <th className="pb-2">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-t border-border">
              {showTest && (
                <td className="py-3 pr-4">
                  <div className="font-semibold text-foreground">{a.tests?.title ?? "Paper"}</div>
                  <div className="text-xs text-muted-foreground">{a.tests?.exam_type} · Class {a.tests?.class_level}</div>
                </td>
              )}
              <td className="py-3 pr-4 font-semibold">{Number(a.score ?? 0)} / {Number(a.max_score ?? 0)}</td>
              <td className="py-3 pr-4">{pct(a.percentage)}</td>
              <td className="py-3 pr-4">{a.rank ? `#${a.rank}` : "—"}</td>
              <td className="py-3 pr-4 text-emerald">{a.correct_count ?? 0}</td>
              <td className="py-3 pr-4 text-destructive">{a.incorrect_count ?? 0}</td>
              <td className="py-3 text-xs text-muted-foreground">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}