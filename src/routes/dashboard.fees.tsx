import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listFeesAll, getMyFees, upsertFee, addPayment } from "@/lib/fees.functions";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/dashboard/fees")({
  component: Page,
  head: () => ({ meta: [{ title: "Fees — TSJ Scholar Palanpur" }] }),
});

function Page() {
  const { profile } = useAuth();
  if (!profile) return null;
  const isStaff = profile.role === "teacher" || profile.role === "principal";
  return isStaff ? <StaffFees /> : <StudentFees />;
}

function StudentFees() {
  const get = useServerFn(getMyFees);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { get({}).then(setData).catch((e) => setErr(e?.message ?? "Could not load your fees.")); }, []); // eslint-disable-line
  if (err) return <ErrorBox message={err} />;
  if (!data) return <div className="animate-pulse text-muted-foreground">Loading…</div>;
  const pct = data.total > 0 ? Math.round((data.paid / data.total) * 100) : 0;
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Your account</div>
        <h1 className="mt-2 font-display text-4xl text-foreground">Fees</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatBig label="Total" value={`₹${data.total.toLocaleString()}`} tone="from-primary to-primary/70" />
        <StatBig label="Paid" value={`₹${data.paid.toLocaleString()}`} tone="from-emerald to-emerald/70" />
        <StatBig label="Remaining" value={`₹${data.remaining.toLocaleString()}`} tone="from-gold to-gold/70" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span><span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald" style={{ width: `${pct}%` }} />
        </div>
        {data.due_date && <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Due by {new Date(data.due_date).toLocaleDateString()}</div>}
        {data.remarks && <div className="mt-2 text-sm text-foreground/80">{data.remarks}</div>}
      </div>
      <div>
        <h2 className="mb-3 font-display text-xl text-foreground">Payment history</h2>
        {data.payments.length === 0 ? (
          <EmptyState icon="💰" title="No payments yet" message="Your paid amounts will appear here." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {data.payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between border-b border-border p-4 last:border-0">
                <div>
                  <div className="font-semibold text-foreground">₹{Number(p.amount).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{new Date(p.paid_on).toLocaleDateString()} · {p.method}</div>
                </div>
                {p.remarks && <div className="max-w-xs text-right text-xs text-muted-foreground">{p.remarks}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBig({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tone} p-5 text-primary-foreground shadow-soft`}>
      <div className="text-[11px] uppercase tracking-[0.18em] opacity-80">{label}</div>
      <div className="mt-2 font-display text-3xl">{value}</div>
    </div>
  );
}

function StaffFees() {
  const list = useServerFn(listFeesAll);
  const setFee = useServerFn(upsertFee);
  const pay = useServerFn(addPayment);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [feeForm, setFeeForm] = useState({ total_amount: 0, due_date: "", remarks: "" });
  const [payForm, setPayForm] = useState({ amount: 0, method: "cash", remarks: "" });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const refresh = () => {
    setLoading(true);
    return list({})
      .then((r: any) => { setRows(r ?? []); setErr(null); })
      .catch((e: any) => setErr(e?.message ?? "Could not load fees."))
      .finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  const totals = rows.reduce((a, r) => ({ total: a.total + r.total, paid: a.paid + r.paid, remaining: a.remaining + r.remaining }), { total: 0, paid: 0, remaining: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">School</div>
          <h1 className="mt-2 font-display text-4xl text-foreground">Fees management</h1>
        </div>
        <input placeholder="Search student…" value={q} onChange={(e) => setQ(e.target.value)}
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatBig label="Total billed" value={`₹${totals.total.toLocaleString()}`} tone="from-primary to-primary/70" />
        <StatBig label="Collected" value={`₹${totals.paid.toLocaleString()}`} tone="from-emerald to-emerald/70" />
        <StatBig label="Pending" value={`₹${totals.remaining.toLocaleString()}`} tone="from-rose-500 to-rose-400" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <div>Student</div><div>Total</div><div>Paid</div><div>Remaining</div><div>Actions</div>
        </div>
        {filtered.map((r) => (
          <div key={r.student_id} className="border-b border-border last:border-0">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center gap-2 px-4 py-3 text-sm">
              <div>
                <div className="font-medium text-foreground">{r.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{r.track ?? "—"}</div>
              </div>
              <div>₹{r.total.toLocaleString()}</div>
              <div className="text-emerald">₹{r.paid.toLocaleString()}</div>
              <div className={r.remaining > 0 ? "text-rose-600 font-semibold" : "text-muted-foreground"}>₹{r.remaining.toLocaleString()}</div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(editing === r.student_id ? null : r.student_id); setFeeForm({ total_amount: r.total, due_date: r.due_date ?? "", remarks: r.remarks ?? "" }); setPayForm({ amount: r.remaining, method: "cash", remarks: "" }); }}
                  className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted">{editing === r.student_id ? "Close" : "Manage"}</button>
              </div>
            </div>
            {editing === r.student_id && (
              <div className="grid gap-4 border-t border-border bg-muted/20 p-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Set total & due</div>
                  <input type="number" placeholder="Total ₹" value={feeForm.total_amount || ""}
                    onChange={(e) => setFeeForm({ ...feeForm, total_amount: Number(e.target.value) })}
                    className="mb-2 w-full rounded border border-border px-2 py-1 text-sm" />
                  <input type="date" value={feeForm.due_date}
                    onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })}
                    className="mb-2 w-full rounded border border-border px-2 py-1 text-sm" />
                  <input placeholder="Remarks" value={feeForm.remarks}
                    onChange={(e) => setFeeForm({ ...feeForm, remarks: e.target.value })}
                    className="mb-2 w-full rounded border border-border px-2 py-1 text-sm" />
                  <button onClick={async () => { await setFee({ data: { student_id: r.student_id, ...feeForm } }); setEditing(null); refresh(); }}
                    className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground">Save</button>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald">Record payment</div>
                  <input type="number" placeholder="Amount ₹" value={payForm.amount || ""}
                    onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                    className="mb-2 w-full rounded border border-border px-2 py-1 text-sm" />
                  <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                    className="mb-2 w-full rounded border border-border px-2 py-1 text-sm">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                  <input placeholder="Note" value={payForm.remarks}
                    onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })}
                    className="mb-2 w-full rounded border border-border px-2 py-1 text-sm" />
                  <button onClick={async () => { await pay({ data: { student_id: r.student_id, ...payForm } }); setEditing(null); refresh(); }}
                    className="rounded bg-emerald px-3 py-1 text-xs text-white">Record</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading fees…</div>}
        {!loading && err && <div className="p-8 text-center text-sm text-destructive">{err}</div>}
        {!loading && !err && filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No students found.</div>}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-card p-6 text-center shadow-soft">
      <div className="font-display text-xl text-foreground">Couldn&rsquo;t load fees</div>
      <div className="mt-1 text-sm text-muted-foreground">{message}</div>
      <button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Retry</button>
    </div>
  );
}
