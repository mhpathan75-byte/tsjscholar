import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MENTORS, mentorOfTheDayIndex, quoteOfTheDay } from "@/lib/mentors";
import { getQuoteExplanation } from "@/lib/inspiration.functions";

export function Inspiration() {
  const explain = useServerFn(getQuoteExplanation);
  const [idx, setIdx] = useState(() => mentorOfTheDayIndex());
  const [text, setText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const mentor = MENTORS[idx];
  const quote = useMemo(() => quoteOfTheDay(mentor, idx), [mentor, idx]);
  const cacheKey = `${mentor.id}::${quote}`;
  const explanation = text[cacheKey];

  useEffect(() => {
    if (explanation !== undefined) return;
    let cancelled = false;
    setBusy(true);
    explain({ data: { name: mentor.name, quote } })
      .then((r: any) => {
        if (!cancelled) setText((t) => ({ ...t, [cacheKey]: r?.explanation ?? "" }));
      })
      .catch(() => { if (!cancelled) setText((t) => ({ ...t, [cacheKey]: "" })); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [cacheKey]); // eslint-disable-line

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <div className="flex items-center justify-center bg-soft-gold p-4 md:p-3">
          <img
            src={mentor.image}
            alt={mentor.name}
            loading="lazy"
            width={512}
            height={512}
            className="max-h-44 w-auto max-w-full rounded-2xl object-contain sm:max-h-52 md:max-h-64"
          />
        </div>
        <div className="flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-gold">Today&rsquo;s inspiration</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {idx + 1} / {MENTORS.length}
            </div>
          </div>

          <blockquote className="mt-3 font-display text-lg leading-snug text-foreground sm:text-xl md:text-2xl">
            &ldquo;{quote}&rdquo;
          </blockquote>

          <div className="mt-2 text-sm font-semibold text-foreground">{mentor.name}</div>
          <div className="text-xs text-muted-foreground">{mentor.role}</div>

          <div className="mt-4 min-h-[68px] text-sm leading-relaxed text-foreground/80">
            {busy && !explanation ? (
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
                <div className="h-3 w-8/12 animate-pulse rounded bg-muted" />
              </div>
            ) : explanation ? (
              explanation.split("\n").filter(Boolean).map((p, i) => (
                <p key={i} className={i ? "mt-2" : ""}>{p}</p>
              ))
            ) : (
              <p className="text-muted-foreground">Take a minute with this thought before you start studying today.</p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setIdx((i) => (i + 1) % MENTORS.length)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
            >
              Next quote →
            </button>
            <button
              onClick={() => setIdx(mentorOfTheDayIndex())}
              className="rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              Today&rsquo;s pick
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
