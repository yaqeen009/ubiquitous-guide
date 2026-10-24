import { useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import type { DatasetView } from "@/hooks/useDatasetView";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";

export function DatasetNotice({ view }: { view: DatasetView }) {
  const dataset = view.dataset;
  const issues = useDataStore((state) => state.issues);
  const setDataTab = useUiStore((state) => state.setDataTab);
  const setDataPanelOpen = useUiStore((state) => state.setDataPanelOpen);
  const setMobilePanel = useUiStore((state) => state.setMobilePanel);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!dataset) return null;
  const count = dataset.warnings.length + issues.length;
  if (count === 0 || dismissedFor === dataset.importedAt) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-warning/25 bg-warning-soft px-3 py-1.5 text-[11px] text-warning" role="status">
        <TriangleAlert size={13} className="shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          Imported with {count} note{count === 1 ? "" : "s"} — missing values and malformed rows were handled rather
          than guessed.
        </p>
        <button type="button" onClick={() => setOpen(true)} className="font-medium underline-offset-2 hover:underline">
          Review
        </button>
        <button
          type="button"
          onClick={() => setDismissedFor(dataset.importedAt)}
          className="rounded-sm p-0.5 hover:bg-warning/10"
          aria-label="Dismiss import notes"
        >
          <X size={13} />
        </button>
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Import report"
        description="Notes from parsing and type inference. Original values are preserved in the table; invalid numeric cells are treated as missing only in charts."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDataTab("columns");
                setDataPanelOpen(true);
                setMobilePanel("data");
                setOpen(false);
              }}
            >
              Open column inspector
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {dataset.warnings.length > 0 ? (
            <section>
              <h3 className="panel-title mb-1.5">Dataset warnings</h3>
              <ul className="space-y-1 rounded-sm border border-warning/25 bg-warning-soft p-3 text-[11.5px] leading-relaxed text-warning">
                {dataset.warnings.map((warning) => (
                  <li key={warning} className="flex gap-2">
                    <span aria-hidden>·</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {issues.length > 0 ? (
            <section>
              <h3 className="panel-title mb-1.5">Row issues</h3>
              <ul className="space-y-1 rounded-sm border border-border bg-surface-2 p-3 text-[11.5px] leading-relaxed text-ink-soft">
                {issues.map((issue) => (
                  <li key={`${issue.row}-${issue.message}`} className="flex gap-2">
                    <span className="mono-num shrink-0 text-[10px] text-faint">
                      {issue.row > 0 ? `L${issue.row}` : "—"}
                    </span>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
