import { useRef, useState, type DragEvent } from "react";
import { FileUp, Loader2, Lock, TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { WARN_FILE_BYTES } from "@/data/limits";
import { useDataStore } from "@/store/useDataStore";

export function UploadPanel({ compact = false, onImported }: { compact?: boolean; onImported?: () => void }) {
  const loadFile = useDataStore((state) => state.loadFile);
  const loadDemo = useDataStore((state) => state.loadDemo);
  const status = useDataStore((state) => state.status);
  const error = useDataStore((state) => state.error);
  const clearError = useDataStore((state) => state.clearError);
  const setToast = useDataStore((state) => state.setToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pendingLarge, setPendingLarge] = useState<File | null>(null);

  const parsing = status === "parsing";

  const processFile = async (file: File) => {
    clearError();
    await loadFile(file);
    const state = useDataStore.getState();
    if (state.status === "ready" && state.dataset) {
      setToast(`${state.dataset.rows.length.toLocaleString()} rows imported from ${state.dataset.name}.`);
      onImported?.();
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > WARN_FILE_BYTES) {
      setPendingLarge(file);
      return;
    }
    void processFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  const loadDemoDataset = () => {
    clearError();
    loadDemo();
    const state = useDataStore.getState();
    if (state.status === "ready") {
      setToast("Demo dataset loaded: 720 synthetic air-quality stations.");
      onImported?.();
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative rounded-md border border-dashed p-5 text-center transition-colors ${
          dragging ? "border-accent bg-accent-soft" : "border-border-strong bg-surface-2/50"
        } ${compact ? "" : "sm:p-6"}`}
      >
        {parsing ? (
          <div className="flex flex-col items-center gap-2 py-3" role="status" aria-live="polite">
            <Loader2 size={22} className="animate-spin text-accent" />
            <p className="text-[13px] font-medium text-ink">Parsing locally…</p>
            <p className="text-[11px] text-muted">Validation, type inference, and statistics run in your browser.</p>
          </div>
        ) : (
          <>
            <FileUp size={22} className="mx-auto mb-2 text-muted" aria-hidden />
            <p className="text-[13px] font-medium text-ink">Drop a CSV file here</p>
            <p className="mb-3 text-[11.5px] text-muted">
              First row used as headers · comma-separated · up to 25 MB / 100,000 rows
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="primary" size="sm" onClick={() => inputRef.current?.click()} disabled={parsing}>
                <Upload size={13} /> Choose CSV file
              </Button>
              <Button variant="outline" size="sm" onClick={loadDemoDataset} disabled={parsing}>
                Load demo dataset
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              aria-label="Choose a CSV file"
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger-soft px-3 py-2 text-[11.5px] leading-relaxed text-danger">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Import failed</p>
            <p className="break-words">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="flex items-start gap-2 rounded-sm border border-border bg-surface px-2.5 py-2 text-[10.5px] leading-relaxed text-muted">
        <Lock size={12} className="mt-0.5 shrink-0" aria-hidden />
        <p>
          Files are processed entirely in this tab and are never uploaded. Closing or refreshing the page discards the
          dataset unless you export it first.
        </p>
      </div>

      <Dialog
        open={pendingLarge !== null}
        onOpenChange={(open) => {
          if (!open) setPendingLarge(null);
        }}
        title="Large file warning"
        description="This file is above the recommended size. Import runs on the main browser thread, so the interface may pause briefly."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingLarge(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const file = pendingLarge;
                setPendingLarge(null);
                if (file) void processFile(file);
              }}
            >
              Import {pendingLarge ? (pendingLarge.size / (1024 * 1024)).toFixed(1) : "0"} MB file
            </Button>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-muted">
          Files up to 25 MB are accepted. Rendering is capped at 20,000 3D points and 4,000 2D points; statistics,
          filtering, search, and export still use every row.
        </p>
      </Dialog>
    </div>
  );
}
