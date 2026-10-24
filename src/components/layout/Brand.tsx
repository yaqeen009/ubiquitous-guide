import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-ink text-surface",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
        <circle cx="6" cy="16" r="1.5" fill="currentColor" opacity="0.55" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.8" />
        <circle cx="18" cy="7" r="1.5" fill="currentColor" />
        <circle cx="7" cy="8" r="1" fill="currentColor" opacity="0.35" />
        <circle cx="17" cy="17" r="1" fill="currentColor" opacity="0.35" />
      </svg>
    </span>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <BrandMark />
      <div className="leading-tight">
        <p className="text-[14px] font-medium tracking-[-0.02em] text-ink">DataSpace</p>
        {compact ? null : <p className="text-[9.5px] uppercase tracking-[0.14em] text-faint">by UbiquitousGuide</p>}
      </div>
    </div>
  );
}
