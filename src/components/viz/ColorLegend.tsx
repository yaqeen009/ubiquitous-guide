import type { ScatterEncoding } from "@/viz/encoding";
import { SEQUENTIAL_GRADIENT } from "@/data/colors";
import { formatNumber } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";

export function ColorLegend({ encoding }: { encoding: ScatterEncoding }) {
  const config = useDataStore((state) => state.config);
  if (!config) return null;
  const { color, size } = config;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="panel-title shrink-0">Color</span>
        {color.mode === "none" ? (
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
            Single color
          </span>
        ) : color.mode === "numeric" && encoding.numericColorExtent ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="max-w-36 truncate text-[11.5px] text-ink-soft" title={encoding.colorColumn?.name}>
              {encoding.colorColumn?.name}
            </span>
            <span className="h-2 w-24 rounded-full" style={{ background: SEQUENTIAL_GRADIENT }} aria-hidden />
            <span className="mono-num text-[10.5px] text-muted">
              {formatNumber(encoding.numericColorExtent.min)} – {formatNumber(encoding.numericColorExtent.max)}
            </span>
          </div>
        ) : (
          <ul className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1" aria-label={`Color legend for ${encoding.colorColumn?.name ?? "category"}`}>
            {encoding.colorMap.entries.map((entry) => (
              <li key={entry.value} className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: entry.color }}
                  aria-hidden
                />
                <span className="max-w-28 truncate" title={`${entry.label} (${entry.count.toLocaleString()} rows)`}>
                  {entry.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {size.enabled && encoding.sizeExtent ? (
        <div className="flex items-center gap-2">
          <span className="panel-title shrink-0">Size</span>
          <span className="max-w-32 truncate text-[11.5px] text-ink-soft" title={encoding.sizeColumn?.name}>
            {encoding.sizeColumn?.name}
          </span>
          <span className="mono-num text-[10.5px] text-muted">
            {formatNumber(encoding.sizeExtent.min)} – {formatNumber(encoding.sizeExtent.max)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
