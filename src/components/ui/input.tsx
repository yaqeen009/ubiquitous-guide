import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-sm border border-border bg-surface px-2.5 text-[13px] text-ink placeholder:text-faint transition-colors focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus/40 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-[12px] font-medium text-muted", className)} {...props} />;
}

interface SelectProps extends ComponentProps<"select"> {
  compact?: boolean;
}

export function Select({ className, compact, ...props }: SelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          "w-full appearance-none rounded-sm border border-border bg-surface pr-7 text-ink transition-colors hover:border-border-strong focus-visible:border-accent disabled:opacity-50",
          compact ? "h-7 pl-2 text-[12px]" : "h-8 pl-2.5 text-[13px]",
        )}
        {...props}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 10 6"
        className="pointer-events-none absolute right-2.5 top-1/2 h-[6px] w-[10px] -translate-y-1/2 text-muted"
      >
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? <span className="text-[11px] text-faint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
