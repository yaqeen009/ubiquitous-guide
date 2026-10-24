import { useMemo, useRef, useState } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import type { DataColumn } from "@/types";
import type { ScatterEncoding, ScatterPoint } from "@/viz/encoding";
import { OTHER_CATEGORY, categoryColor } from "@/data/colors";
import { formatAxisValue } from "@/data/numeric";
import { formatNumber } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";

interface ChartPoint {
  id: number;
  xValue: number;
  yValue: number;
  r: number;
  color: string;
  category: string;
  point: ScatterPoint;
}

interface DotShapeProps {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}

interface HoverInfo {
  point: ScatterPoint;
  x: number;
  y: number;
}

function domainFor(column: DataColumn | null | undefined): [number, number] {
  if (!column || column.min === null || column.max === null) return [-1, 1];
  if (column.min === column.max) return [column.min - 1, column.max + 1];
  return [column.min, column.max];
}

const tickStyle = { fill: "var(--ds-muted)", fontSize: 10.5, fontFamily: "var(--font-mono)" };

function DotShape({
  cx,
  cy,
  payload,
  selectedId,
  onSelect,
  onHover,
}: DotShapeProps & {
  selectedId: number | null;
  onSelect: (id: number) => void;
  onHover: (hover: HoverInfo | null) => void;
}) {
  if (!payload || cx === undefined || cy === undefined) return <g />;
  const selected = payload.id === selectedId;
  const radius = selected ? payload.r + 1.5 : payload.r;
  return (
    <g>
      {selected ? (
        <circle
          cx={cx}
          cy={cy}
          r={radius + 3.5}
          fill="none"
          stroke="var(--ds-ink)"
          strokeWidth={1.4}
          strokeDasharray="3 2"
          pointerEvents="none"
        />
      ) : null}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={payload.color}
        fillOpacity={selected ? 1 : 0.82}
        stroke={selected ? "var(--ds-surface)" : "none"}
        strokeWidth={1}
        style={{ cursor: "pointer" }}
        onMouseEnter={(event) => {
          const bounds = (event.currentTarget.ownerSVGElement as SVGSVGElement | null)?.getBoundingClientRect();
          onHover({
            point: payload.point,
            x: bounds ? event.clientX - bounds.left : event.clientX,
            y: bounds ? event.clientY - bounds.top : event.clientY,
          });
        }}
        onMouseLeave={() => onHover(null)}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(payload.id);
        }}
      />
    </g>
  );
}

export function Scatter2D({ encoding }: { encoding: ScatterEncoding }) {
  const dataset = useDataStore((state) => state.dataset);
  const config = useDataStore((state) => state.config);
  const selectedRowId = useDataStore((state) => state.selectedRowId);
  const selectRow = useDataStore((state) => state.selectRow);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const xColumn = config?.twoD.x ? dataset?.columns.find((column) => column.name === config.twoD.x) ?? null : null;
  const yColumn = config?.twoD.y ? dataset?.columns.find((column) => column.name === config.twoD.y) ?? null : null;
  const baseSize = (config?.display.pointSize ?? 4.5) * 1.05;

  const series = useMemo(() => {
    const grouped = new Map<string, ChartPoint[]>();
    for (const point of encoding.points) {
      if (point.xValue === null || point.yValue === null) continue;
      const key =
        config?.color.mode === "categorical"
          ? encoding.colorMap.colors.has(point.category)
            ? point.category
            : OTHER_CATEGORY
          : "__all__";
      const chartPoint: ChartPoint = {
        id: point.row.id,
        xValue: point.xValue,
        yValue: point.yValue,
        r: Math.max(2, baseSize * point.radius),
        color: point.color,
        category: point.category,
        point,
      };
      const bucket = grouped.get(key);
      if (bucket) bucket.push(chartPoint);
      else grouped.set(key, [chartPoint]);
    }
    return [...grouped.entries()].map(([key, data]) => ({
      key,
      data,
      color:
        key === "__all__"
          ? data[0]?.color ?? "var(--ds-accent)"
          : categoryColor(encoding.colorMap, key),
    }));
  }, [encoding, config?.color.mode, baseSize]);

  if (!config || !xColumn || !yColumn) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="max-w-xs text-[12.5px] leading-relaxed text-muted">
          Map two numeric variables to the 2D X and Y axes to use this view. Open the Configure panel to choose them.
        </p>
      </div>
    );
  }

  const totalPoints = series.reduce((total, entry) => total + entry.data.length, 0);
  const description = `2D scatter plot of ${xColumn.name} against ${yColumn.name}. ${totalPoints} points. Selection is linked with the 3D view.`;

  return (
    <div ref={containerRef} className="relative h-full w-full" aria-label={description}>
      <p className="sr-only">{description}</p>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 22, bottom: 26, left: 14 }}>
          <CartesianGrid stroke="var(--ds-border)" strokeDasharray="2 4" />
          <XAxis
            type="number"
            dataKey="xValue"
            name={xColumn.name}
            domain={domainFor(xColumn)}
            tick={tickStyle}
            tickFormatter={(value: number) => formatAxisValue(value)}
            tickLine={{ stroke: "var(--ds-border-strong)" }}
            axisLine={{ stroke: "var(--ds-border-strong)" }}
            height={38}
            tickCount={5}
            label={{
              value: xColumn.name,
              position: "insideBottom",
              offset: -18,
              fill: "var(--ds-ink-soft)",
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="yValue"
            name={yColumn.name}
            domain={domainFor(yColumn)}
            tick={tickStyle}
            tickFormatter={(value: number) => formatAxisValue(value)}
            tickLine={{ stroke: "var(--ds-border-strong)" }}
            axisLine={{ stroke: "var(--ds-border-strong)" }}
            width={54}
            tickCount={5}
            label={{
              value: yColumn.name,
              angle: -90,
              position: "insideLeft",
              offset: 8,
              fill: "var(--ds-ink-soft)",
              fontSize: 11,
              style: { textAnchor: "middle" },
            }}
          />
          {series.map((entry) => (
            <Scatter
              key={entry.key}
              name={entry.key === "__all__" ? "All records" : entry.key}
              data={entry.data}
              fill={entry.color}
              isAnimationActive={false}
              shape={
                <DotShape
                  selectedId={selectedRowId}
                  onSelect={(id) => {
                    selectRow(id);
                    setInspectorTab("record");
                  }}
                  onHover={setHover}
                />
              }
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {hover ? (
        <div
          className="pointer-events-none absolute z-20 w-56 rounded-sm border border-border-strong bg-surface/95 p-2.5 shadow-panel backdrop-blur-sm"
          style={{
            left: Math.min(Math.max(hover.x + 14, 8), Math.max(8, (containerRef.current?.clientWidth ?? 240) - 232)),
            top: Math.min(Math.max(hover.y + 14, 8), Math.max(8, (containerRef.current?.clientHeight ?? 200) - 120)),
          }}
          role="tooltip"
        >
          <div className="space-y-1.5 text-[11.5px]">
            <p className="mono-num text-[10px] uppercase tracking-wider text-muted">Row {hover.point.row.id + 1}</p>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-muted">{xColumn.name}</span>
              <span className="mono-num shrink-0 text-ink">{formatAxisValue(hover.point.xValue ?? 0)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-muted">{yColumn.name}</span>
              <span className="mono-num shrink-0 text-ink">{formatAxisValue(hover.point.yValue ?? 0)}</span>
            </div>
            {config.color.mode === "categorical" && hover.point.category ? (
              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
                <span className="truncate text-muted">{encoding.colorColumn?.name ?? "Category"}</span>
                <span className="shrink-0 text-ink">{hover.point.category}</span>
              </div>
            ) : null}
            {config.color.mode === "numeric" && hover.point.colorValue !== null ? (
              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
                <span className="truncate text-muted">{encoding.colorColumn?.name ?? "Color"}</span>
                <span className="mono-num shrink-0 text-ink">{formatNumber(hover.point.colorValue)}</span>
              </div>
            ) : null}
            <p className="pt-0.5 text-[10.5px] text-faint">Click to inspect this record</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
