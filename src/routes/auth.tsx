import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined,
  }),
  head: () => ({ meta: [{ title: "Sign in — TSJ Scholar Palanpur" }] }),
});

function AuthPage() {
  const { signIn, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      if (next) window.location.href = next;
      else navigate({ to: "/dashboard" });
    }
  }, [loading, user, profile, navigate, next]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) setErr("Invalid credentials. Only registered NTSJ members can sign in.");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/"><Logo /></Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl gap-10 md:grid-cols-2">
          <div className="hidden flex-col justify-between rounded-3xl bg-gradient-hero p-10 text-primary-foreground shadow-elegant md:flex">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-gold">Members Only</div>
              <h2 className="mt-3 font-display text-4xl leading-tight text-primary-foreground">Welcome back to <span className="text-gold italic">TSJ Scholar Palanpur</span>.</h2>
              <p className="mt-4 max-w-sm text-white/80">Sign in with your school-issued email. Only pre-registered TSJ students, teachers, and the principal have access.</p>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              <div>“The best way to predict your future is to <span className="text-gold">study for it</span>.”</div>
              <div className="text-xs uppercase tracking-widest text-white/50">— TSJ Science Dept</div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
            <h1 className="font-display text-3xl">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">Use the credentials given by the school.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">School Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
                  placeholder="you@ntsj.app"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Password</span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
                  placeholder="••••••"
                />
              </label>

              {err && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-6 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              No self-signup. Ask Rahil Sir if you're a new student and need credentials.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}