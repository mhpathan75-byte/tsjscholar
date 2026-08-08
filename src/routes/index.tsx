import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { AshraMark } from "@/components/AshraMark";

export const Route = createFileRoute("/")({ component: Landing });

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const features = [
  { title: "Live Online Classes", desc: "Real-time classes with interactive whiteboards and rich formula rendering.", d: "M2 6a2 2 0 012-2h12a2 2 0 012 2v9H2V6zm5 13h8m-4-4v4M20 8h2v9h-2" },
  { title: "Smart Tests", desc: "MCQ tests crafted for JEE & NEET with topic-wise difficulty and instant scoring.", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { title: "Ashra Tutor", desc: "Your personal companion — remembers you, solves doubts and shows every step with clean math.", d: "M12 2a5 5 0 015 5v2h1a3 3 0 013 3v3a5 5 0 01-5 5h-1v3l-4-3H8a5 5 0 01-5-5v-3a3 3 0 013-3h1V7a5 5 0 015-5z" },
  { title: "Ranked Reports", desc: "Every test yields ranked PDFs & Excel sheets — track weakest topics, strongest chapters, growth.", d: "M3 3v18h18M7 15l4-6 4 3 5-8" },
  { title: "Tight Test Security", desc: "Fullscreen lockdown, no copy-paste, no inspect, no dev tools. Auto-submit on second breach.", d: "M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z M9 12l2 2 4-4" },
  { title: "Doubt Room", desc: "Post any question with photos — teachers reply with formulas and step-by-step working.", d: "M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" },
  { title: "Materials Library", desc: "Teachers upload notes, PDFs, worksheets and slides — students access everything in one place.", d: "M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5v15z" },
  { title: "Glimpect Vision", desc: "Snap a photo of any problem, diagram or equation and get an instant walkthrough.", d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zm10 3a3 3 0 100-6 3 3 0 000 6z" },
];

function Landing() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user && profile) {
      navigate({ to: "/dashboard" });
    }
  }, [loading, user, profile, navigate]);

  // Never flash the marketing page to a signed-in user — show a calm splash
  // until the session is resolved and the redirect happens.
  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <div className="animate-pulse text-sm text-muted-foreground">Opening your dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</a>
          <a href="#programs" className="text-sm font-medium text-muted-foreground hover:text-foreground">Programs</a>
          <a href="#faculty" className="text-sm font-medium text-muted-foreground hover:text-foreground">Faculty</a>
        </nav>
        <Link to="/auth" className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90">
          Sign in
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero" />
        <div className="absolute inset-0 -z-10 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M0 39.5H40M39.5 0V40' stroke='white' stroke-width='0.5'/></svg>\")" }} />
        <div className="mx-auto max-w-7xl px-6 py-24 text-ink md:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-ink/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> TSJ School · Science Dept · 11th–12th
            </span>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] text-ink md:text-7xl">
              A school that lives on your screen. <span className="text-gold italic">Beautifully.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink/80 md:text-xl">
              Live classes, smart tests, ranked reports, <em className="text-gold not-italic font-semibold">Ashra</em> tutor, and <em className="text-gold not-italic font-semibold">Glimpect</em> vision — the entire TSJ Science Department, on one calm screen.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-7 py-3.5 text-sm font-semibold text-ink shadow-elegant hover:brightness-105">
                Enter your dashboard
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 rounded-full border border-ink/25 bg-white/50 px-6 py-3.5 text-sm font-medium text-ink hover:bg-white/80">
                Explore features
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.2em] text-gold">The Platform</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">Everything a science student needs, refined.</h2>
          </div>
          <p className="max-w-md text-muted-foreground">
            No noise. No clutter. A study environment that respects your time and lifts your rank.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-border bg-card p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-elegant">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-soft-primary text-primary">
                {f.title === "Ashra Tutor" ? <AshraMark className="h-7 w-7" /> : <Icon d={f.d} />}
              </div>
              <h3 className="font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="bg-parchment">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-24 md:grid-cols-2">
          {[
              { tag: "Track I", title: "JEE Aspirants", body: "Physics · Chemistry · Mathematics. Precision problem-solving, adaptive drills, rich derivations.", color: "from-primary to-primary/70" },
            { tag: "Track II", title: "NEET Aspirants", body: "Physics · Chemistry · Biology. Diagram-heavy explanations, high-yield MCQs, retention analytics.", color: "from-emerald to-emerald/70" },
          ].map((p) => (
            <div key={p.title} className={`rounded-3xl bg-gradient-to-br ${p.color} p-10 text-white shadow-elegant`}>
              <div className="text-xs uppercase tracking-[0.2em] text-white/70">{p.tag}</div>
              <h3 className="mt-3 font-display text-4xl">{p.title}</h3>
              <p className="mt-4 max-w-md text-white/85">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Faculty */}
      <section id="faculty" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-xs uppercase tracking-[0.2em] text-gold">The Faculty</div>
        <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">Our Faculty. One mission.</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Rahil Sir", "Principal · Chemistry"],
            ["Fatima Mam", "English"],
            ["Akbar Sir", "Physics"],
            ["Saima Mam", "Chemistry"],
            ["Salman Sir", "Biology"],
            ["Shadab Sir", "Mathematics"],
          ].map(([n, r]) => (
            <div key={n} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold font-display text-lg text-ink">{n.charAt(0)}</div>
              <div>
                <div className="font-display text-lg">{n}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{r}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
