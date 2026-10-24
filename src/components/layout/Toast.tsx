import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useDataStore } from "@/store/useDataStore";

export function Toast() {
  const toast = useDataStore((state) => state.toast);
  const setToast = useDataStore((state) => state.setToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast, setToast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,460px)] -translate-x-1/2 items-start gap-2 rounded-md border border-border-strong bg-surface px-3 py-2.5 shadow-panel"
    >
      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" aria-hidden />
      <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-ink">{toast}</p>
      <button
        type="button"
        onClick={() => setToast(null)}
        className="rounded-sm p-0.5 text-muted hover:text-ink"
        aria-label="Dismiss notification"
      >
        <X size={13} />
      </button>
    </div>
  );
}
