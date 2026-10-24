import { useMemo, useState } from "react";
import { Check, Plus, Sparkles, TriangleAlert } from "lucide-react";
import type { Dataset, VisualizationId } from "@/types";
import {
  VISUALIZATIONS,
  evaluateCompatibility,
  visualizationById,
} from "@/viz/registry";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";

function ViewThumbnail({ type }: { type: VisualizationId }) {
  return (
    <svg viewBox="0 0 120 72" className="h-full w-full" aria-hidden>
      <rect x="0.5" y="0.5" width="119" height="71" rx="3" fill="var(--ds-surface-2)" stroke="var(--ds-border)" />
      {type === "scatter3d" ? (
        <g stroke="var(--ds-border-strong)" fill="none" opacity="0.8">
          <path d="M24 54 L90 54 L104 42 L38 42 Z" />
          <path d="M24 54 L24 18 L38 8 L38 42" />
          <path d="M38 42 L104 42 L104 8 L38 8 Z" opacity="0.45" />
          {[
            [50, 46],
            [62, 36],
            [76, 44],
            [86, 26],
            [58, 22],
            [74, 16],
          ].map(([x, y], index) => (
            <circle key={index} cx={x} cy={y} r={2.6} fill="var(--ds-accent)" stroke="none" />
          ))}
        </g>
      ) : null}
      {type === "scatter2d" ? (
        <g>
          <path d="M18 12 L18 58 L108 58" fill="none" stroke="var(--ds-border-strong)" />
          {[
            [30, 48],
            [42, 40],
            [54, 44],
            [64, 30],
            [78, 34],
            [86, 20],
            [96, 26],
          ].map(([x, y], index) => (
            <circle key={index} cx={x} cy={y} r={2.4} fill="var(--ds-accent)" />
          ))}
        </g>
      ) : null}
      {type === "table" ? (
        <g stroke="var(--ds-border-strong)" strokeWidth="1">
          <rect x="12" y="11" width="96" height="50" fill="var(--ds-surface)" />
          {[20, 29, 38, 47, 56].map((y) => (
            <line key={y} x1="12" x2="108" y1={y} y2={y} />
          ))}
          <line x1="32" x2="32" y1="11" y2="61" />
          <line x1="66" x2="66" y1="11" y2="61" />
          <rect x="12" y="11" width="96" height="9" fill="var(--ds-accent-soft)" stroke="none" />
        </g>
      ) : null}
      {type === "timeseries" ? (
        <g>
          <path d="M14 58 L14 55 M14 58 L108 58 M14 12 L14 58" stroke="var(--ds-border-strong)" fill="none" />
          <path d="M18 46 L30 40 L42 43 L54 28 L66 34 L78 20 L90 25 L104 14" fill="none" stroke="var(--ds-accent)" strokeWidth="1.8" />
          {[
            [18, 46],
            [42, 43],
            [66, 34],
            [90, 25],
          ].map(([x, y], index) => (
            <circle key={index} cx={x} cy={y} r={2} fill="var(--ds-accent)" />
          ))}
        </g>
      ) : null}
      {type === "histogram" ? (
        <g>
          <path d="M16 58 L16 10 M16 58 L106 58" stroke="var(--ds-border-strong)" fill="none" />
          {([
            [22, 30],
            [36, 18],
            [50, 26],
            [64, 40],
            [78, 34],
            [92, 44],
          ] as Array<[number, number]>).map(([x, h], index) => (
            <rect key={index} x={x} y={58 - (58 - h)} width="10" height={58 - h} fill="var(--ds-accent)" opacity={0.85} />
          ))}
        </g>
      ) : null}
      {type === "correlation" ? (
        <g>
          {Array.from({ length: 5 }, (_, row) =>
            Array.from({ length: 5 }, (_, column) => {
              const symmetrical = row === column;
              const strength = symmetrical ? 1 : Math.abs(((row * 3 + column * 2) % 5) / 5);
              return (
                <rect
                  key={`${row}-${column}`}
                  x={24 + column * 15}
                  y={8 + row * 11}
                  width={13}
                  height={9}
                  rx={1}
                  fill={strength > 0.55 ? "var(--ds-accent)" : "var(--ds-accent-soft)"}
                  opacity={0.35 + strength * 0.65}
                />
              );
            }),
          )}
        </g>
      ) : null}
      {type === "parallel" ? (
        <g>
          {[26, 48, 70, 92].map((x) => (
            <line key={x} x1={x} x2={x} y1="10" y2="60" stroke="var(--ds-border-strong)" />
          ))}
          {[
            [18, 34, 22, 44],
            [40, 20, 36, 26],
            [28, 46, 16, 38],
            [46, 30, 42, 20],
          ].map((points, index) => (
            <polyline
              key={index}
              points={points.map((value, pointIndex) => `${[26, 48, 70, 92][pointIndex]},${value}`).join(" ")}
              fill="none"
              stroke="var(--ds-accent)"
              strokeWidth="1.2"
              opacity={0.35 + index * 0.12}
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}

export function ViewGallery({
  open,
  onOpenChange,
  dataset,
  hidden,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: Dataset;
  hidden: string[];
}) {
  const addView = useWorkspaceStore((state) => state.addView);
  const panelCount = useWorkspaceStore((state) => state.panels.length);
  const [selected, setSelected] = useState<VisualizationId>("scatter3d");
  const [error, setError] = useState<string | null>(null);

  const compatibility = useMemo(
    () => new Map(VISUALIZATIONS.map((definition) => [definition.id, evaluateCompatibility(definition, dataset, hidden)])),
    [dataset, hidden],
  );
  const definition = visualizationById(selected) ?? VISUALIZATIONS[0];
  if (!definition) return null;
  const detailCompatibility = compatibility.get(definition.id);

  const add = (type: VisualizationId) => {
    const result = addView(type, dataset, hidden);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onOpenChange(false);
  };

  const alternate = detailCompatibility?.alternative ? visualizationById(detailCompatibility.alternative) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setError(null);
        onOpenChange(next);
      }}
      title="View gallery"
      description="Add a registered visualization to the workspace. Unavailable views state the fields they need; nothing is shown as working when its requirements are missing."
      className="w-[min(94vw,880px)]"
      footer={
        <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="max-h-[52vh] space-y-1.5 overflow-y-auto pr-1 thin-scroll" aria-label="Available view types">
          {VISUALIZATIONS.map((candidate) => {
            const status = compatibility.get(candidate.id);
            const active = selected === candidate.id;
            return (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelected(candidate.id);
                  setError(null);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-sm border px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
                  active ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                <span className="h-11 w-[70px] shrink-0 overflow-hidden rounded-xs">
                  <ViewThumbnail type={candidate.id} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12px] font-medium text-ink">{candidate.name}</span>
                    {status?.available ? (
                      <Check size={11} className="shrink-0 text-success" aria-label="Available" />
                    ) : (
                      <TriangleAlert size={11} className="shrink-0 text-warning" aria-label="Unavailable" />
                    )}
                  </span>
                  <span className="block truncate text-[10.5px] text-muted">{candidate.category}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-col rounded-sm border border-border bg-surface-2/50 p-3">
          <div className="mb-2 h-24 shrink-0 overflow-hidden rounded-sm border border-border">
            <ViewThumbnail type={definition.id} />
          </div>
          <h3 className="text-[14px] font-medium text-ink">{definition.name}</h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{definition.description}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
            <span className="font-medium">Useful for:</span> {definition.usefulFor}
          </p>

          <div className="mt-3 space-y-1.5 border-t border-border pt-2.5">
            <p className="panel-title">Requirements</p>
            {definition.fields.filter((field) => field.required).length > 0 ? (
              <p className="text-[11px] text-muted">
                Fields: {definition.fields.filter((field) => field.required).map((field) => field.label).join(", ")}
              </p>
            ) : null}
            <p className="text-[11px] text-muted">
              Data: {definition.requires.length === 0 ? "Any tabular dataset" : definition.requires.map((requirement) => `${requirement.count} ${requirement.label}`).join(" + ")}
            </p>
            <p className="text-[10.5px] leading-relaxed text-faint">{definition.selectionNote}</p>
          </div>

          {detailCompatibility && !detailCompatibility.available ? (
            <div className="mt-3 rounded-sm border border-warning/30 bg-warning-soft p-2.5 text-[11px] leading-relaxed text-warning" role="status">
              <p className="flex items-start gap-1.5">
                <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                <span>{detailCompatibility.message}</span>
              </p>
              {alternate ? (
                <Button variant="secondary" size="xs" className="mt-2" onClick={() => add(alternate.id)}>
                  <Plus size={11} /> Add {alternate.shortName} instead
                </Button>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="mt-2 rounded-sm border border-danger/25 bg-danger-soft px-2 py-1.5 text-[11px] text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
            <span className="text-[10.5px] text-faint">
              {panelCount} open {panelCount === 1 ? "view" : "views"} ·{" "}
              {panelCount >= 8 ? "workspace full" : "up to 8"}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => add(definition.id)}
              disabled={!detailCompatibility?.available || panelCount >= 8}
            >
              <Sparkles size={13} /> Add to workspace
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
