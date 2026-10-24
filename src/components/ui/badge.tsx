import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-[1px] text-[10.5px] font-medium uppercase tracking-[0.06em]",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-2 text-muted",
        accent: "border-accent/25 bg-accent-soft text-accent",
        warning: "border-warning/30 bg-warning-soft text-warning",
        danger: "border-danger/30 bg-danger-soft text-danger",
        success: "border-success/30 bg-success/10 text-success",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Array<{ value: T; label: string; icon?: React.ReactNode; title?: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex rounded-sm border border-border bg-surface-2 p-0.5", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[3px] px-2 text-[11.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
              selected ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
