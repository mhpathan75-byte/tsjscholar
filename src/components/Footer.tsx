export function Footer() {
  return (
    <footer className="border-t border-border bg-ink text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="text-sm opacity-80">
          © {new Date().getFullYear()} TSJ Scholar Palanpur · Learning Today, Leading Tomorrow
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-70">Powered By</span>
          <span className="font-display font-semibold text-gold">Dami Ai</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold" fill="currentColor" aria-hidden>
            <path d="M12 2l2.4 6.4L21 11l-6.6 2.6L12 20l-2.4-6.4L3 11l6.6-2.6L12 2z"/>
          </svg>
        </div>
      </div>
    </footer>
  );
}