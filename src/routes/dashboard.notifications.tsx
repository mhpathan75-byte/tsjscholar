import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listNotifications, markAllRead, markRead, deleteNotification } from "@/lib/notifications.functions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/notifications")({
  component: NotifPage,
  head: () => ({ meta: [{ title: "Notifications — TSJ Scholar Palanpur" }] }),
});

type N = { id: string; category: string; title: string; message: string | null; link: string | null; read_at: string | null; created_at: string; sender_name: string | null };

const CATS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "announcement", label: "Announcements" },
  { key: "doubt", label: "Doubts" },
  { key: "material", label: "Materials" },
  { key: "fees", label: "Fees" },
  { key: "gallery", label: "Gallery" },
];

function NotifPage() {
  const list = useServerFn(listNotifications);
  const readAll = useServerFn(markAllRead);
  const readOne = useServerFn(markRead);
  const del = useServerFn(deleteNotification);
  const [rows, setRows] = useState<N[]>([]);
  const [filter, setFilter] = useState("all");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [enabled, setEnabled] = useState(true);

  const refresh = () => list({}).then((r) => setRows(r as N[])).catch(() => {});
  useEffect(() => { refresh(); }, []); // eslint-disable-line
  useEffect(() => {
    setPermission("Notification" in window ? Notification.permission : "unsupported");
    setEnabled(localStorage.getItem("tsj:web-notifications") !== "disabled");
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) return setPermission("unsupported");
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") { localStorage.setItem("tsj:web-notifications", "enabled"); setEnabled(true); }
  };
  const toggleNotifications = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("tsj:web-notifications", next ? "enabled" : "disabled");
  };
  const testNotification = () => {
    if (permission === "granted" && enabled) new Notification("TSJ Scholar Palanpur", { body: "Web notifications are working correctly.", icon: "/favicon.png", tag: "tsj-notification-test" });
  };

  const filtered = rows.filter((n) => filter === "all" ? true : filter === "unread" ? !n.read_at : n.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Inbox</div>
          <h1 className="mt-2 font-display text-4xl text-foreground">Notifications</h1>
        </div>
        <button onClick={async () => { await readAll({}); refresh(); }}
          className="rounded-xl border border-border bg-card px-4 py-2 text-xs uppercase tracking-widest hover:bg-muted">Mark all read</button>
      </div>
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-soft md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary">Web notification settings</div>
          <h2 className="mt-1 font-display text-2xl">Browser alerts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Permission: <b className="text-foreground">{permission}</b> · Alerts are <b className="text-foreground">{enabled ? "enabled" : "disabled"}</b> for this device.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permission !== "granted" && permission !== "unsupported" && <Button onClick={requestPermission}>Allow notifications</Button>}
          {permission === "granted" && <Button variant="outline" onClick={toggleNotifications}>{enabled ? "Disable" : "Enable"}</Button>}
          {permission === "granted" && enabled && <Button onClick={testNotification}>Send test alert</Button>}
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest transition ${filter === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
            {c.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon="🌿" title="Nothing here" message="You're all caught up." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {filtered.map((n) => {
            const body = (
              <div className={`flex items-start gap-3 border-b border-border p-4 last:border-0 transition hover:bg-muted/50 ${!n.read_at ? "bg-soft-primary" : ""}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{n.title}</div>
                  {n.message && <div className="mt-0.5 text-sm text-muted-foreground">{n.message}</div>}
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}{n.sender_name ? ` · ${n.sender_name}` : ""}
                  </div>
                </div>
                <button onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await del({ data: { id: n.id } }); refresh(); }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 6l12 12M6 18L18 6"/></svg>
                </button>
              </div>
            );
            const onClick = async () => { if (!n.read_at) { await readOne({ data: { id: n.id } }); refresh(); } };
            return n.link
              ? <Link key={n.id} to={n.link} onClick={onClick} className="block">{body}</Link>
              : <button key={n.id} onClick={onClick} className="block w-full text-left">{body}</button>;
          })}
        </div>
      )}
    </div>
  );
}