export function Logo({ className = "h-10 w-10", withText = true }: { className?: string; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/brand/tsj.png"
        alt="TSJ Scholar Palanpur"
        width={40}
        height={40}
        className={`${className} shrink-0 rounded-full object-contain shadow-soft ring-1 ring-gold/40`}
      />
      {withText && (
        <div className="leading-tight">
          <div className="font-display text-lg font-bold tracking-tight text-foreground">TSJ Scholar Palanpur</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Learning Today, Leading Tomorrow</div>
        </div>
      )}
    </div>
  );
}
