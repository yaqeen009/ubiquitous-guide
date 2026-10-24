import { SearchX, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FilteredEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <SearchX size={20} className="text-faint" aria-hidden />
      <div className="space-y-1">
        <p className="text-[13px] font-medium text-ink">No records match the active filters</p>
        <p className="max-w-xs text-[11.5px] leading-relaxed text-muted">
          This view uses the shared filtered set. Clear or widen the filters to bring records back.
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onClear}>
        Clear all filters
      </Button>
    </div>
  );
}

export function ViewNotice({
  title,
  detail,
  tone = "neutral",
}: {
  title: string;
  detail: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <TriangleAlert size={19} className={tone === "warning" ? "text-warning" : "text-faint"} aria-hidden />
      <p className="text-[13px] font-medium text-ink">{title}</p>
      <p className="max-w-sm text-[11.5px] leading-relaxed text-muted">{detail}</p>
    </div>
  );
}

export function ViewFootnote({ children }: { children: React.ReactNode }) {
  return <p className="border-t border-border px-3 py-1.5 text-[10.5px] leading-relaxed text-faint">{children}</p>;
}
