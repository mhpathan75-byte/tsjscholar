import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/glimpect")({
  component: GlimpectPage,
  head: () => ({ meta: [{ title: "Glimpect — TSJ Scholar Palanpur" }] }),
});

const GLIMPECT_URL = "https://glimpectai.vercel.app";

function GlimpectPage() {
  const [failed, setFailed] = useState(false);
  const [info, setInfo] = useState(false);

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[640px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink shadow-soft">
            <img src="/brand/glimpect.png" alt="Glimpect" width={40} height={40} className="h-10 w-10 object-contain" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gold">Advanced Assistant</div>
            <h1 className="mt-1 font-display text-3xl text-foreground">Glimpect</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setInfo((v) => !v)}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs uppercase tracking-widest text-foreground shadow-soft hover:bg-muted"
          >{info ? "Hide info" : "What can it do?"}</button>
          <a
            href={GLIMPECT_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs uppercase tracking-widest text-foreground shadow-soft hover:bg-muted"
          >Open in new tab ↗</a>
        </div>
      </div>

      {info && (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground/80 shadow-soft">
          Glimpect is a powerful assistant that can generate PDFs, Word docs, Excel sheets, code files, QR codes
          and full web apps, while offering advanced reasoning, real-time search, image editing and multilingual support.
        </p>
      )}

      <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <iframe
          src={GLIMPECT_URL}
          title="Glimpect"
          className="h-full w-full"
          allow="camera; microphone; clipboard-write; fullscreen"
          onError={() => setFailed(true)}
        />
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-8 text-center">
            <div className="font-display text-xl text-foreground">Glimpect couldn&rsquo;t load in this frame.</div>
            <a href={GLIMPECT_URL} target="_blank" rel="noreferrer" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Open Glimpect ↗</a>
          </div>
        )}
      </div>
    </div>
  );
}
