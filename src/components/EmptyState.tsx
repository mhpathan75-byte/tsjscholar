export function EmptyState({
  icon = "✨",
  title,
  message,
  action,
}: {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <div className="font-display text-lg text-foreground">{title}</div>
      {message && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}