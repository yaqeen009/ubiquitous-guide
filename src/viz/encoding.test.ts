import { describe, expect, it } from "vitest";
import { encodeScatter } from "./encoding";
import { parseCsv } from "@/data/parse";
import { createDefaultConfig } from "@/data/configuration";
import { MIXED_CSV, SIMPLE_CSV } from "@/test/fixtures";

const { dataset } = parseCsv(MIXED_CSV, "mixed.csv");
const config = createDefaultConfig(dataset);

describe("encodeScatter", () => {
  it("drops rows with a missing mapped axis value", () => {
    const encoding = encodeScatter(dataset.rows, dataset, config, {
      dimensions: 3,
      cap: 100,
      selectedId: null,
      theme: "light",
    });
    expect(encoding.points).toHaveLength(4);
    expect(encoding.skipped).toBe(1);
    expect(encoding.total).toBe(5);
  });

  it("normalizes each axis independently to [-1, 1]", () => {
    const encoding = encodeScatter(dataset.rows, dataset, config, {
      dimensions: 3,
      cap: 100,
      selectedId: null,
      theme: "light",
    });
    const first = encoding.points[0];
    expect(first?.x).toBe(-1);
    expect(first?.y).toBe(-1);
    const last = encoding.points.at(-1);
    expect(last?.x).toBe(1);
    expect(last?.y).toBe(1);
  });

  it("keeps an unmapped 3D axis at the center", () => {
    const encoding = encodeScatter(dataset.rows, dataset, config, {
      dimensions: 3,
      cap: 100,
      selectedId: null,
      theme: "light",
    });
    expect(encoding.unmapped).toBe(false);
    expect(encoding.points.every((point) => point.z === 0)).toBe(true);
  });

  it("reports unmapped 2D axes instead of drawing points", () => {
    const encoding = encodeScatter(
      dataset.rows,
      dataset,
      { ...config, twoD: { x: null, y: null } },
      { dimensions: 2, cap: 100, selectedId: null, theme: "light" },
    );
    expect(encoding.unmapped).toBe(true);
    expect(encoding.points).toHaveLength(0);
  });

  it("maps categorical colors from the full dataset", () => {
    const encoding = encodeScatter(dataset.rows, dataset, config, {
      dimensions: 3,
      cap: 100,
      selectedId: null,
      theme: "light",
    });
    expect(encoding.colorMap.entries.length).toBeGreaterThan(0);
    const north = encoding.points.find((point) => point.category === "North");
    expect(north?.color).toBe(encoding.colorMap.colors.get("North"));
  });

  it("maps numeric color and size extents", () => {
    const numericConfig = {
      ...config,
      color: { mode: "numeric" as const, column: "PM2.5" },
      size: { enabled: true, column: "NO2" },
    };
    const encoding = encodeScatter(dataset.rows, dataset, numericConfig, {
      dimensions: 3,
      cap: 100,
      selectedId: null,
      theme: "light",
    });
    expect(encoding.numericColorExtent).toEqual({ min: 10, max: 40 });
    expect(encoding.sizeExtent).toEqual({ min: 1.5, max: 5 });
    expect(encoding.points[0]?.color).toBe("#440154");
    expect(encoding.points.at(-1)?.color).toBe("#fde725");
    expect(encoding.points[0]?.radius).toBeCloseTo(0.55, 5);
    expect(encoding.points.at(-1)?.radius).toBeCloseTo(2.2, 5);
  });

  it("samples deterministically and keeps the selected row", () => {
    const rows = parseCsv(SIMPLE_CSV, "simple.csv").dataset;
    const points = Array.from({ length: 100 }, (_, index) => ({
      id: index,
      raw: [index % 2 === 0 ? "A" : "B", String(index), String(index * 2)],
      numeric: [null, index, index * 2],
    }));
    const large = { ...rows, rows: points, searchIndex: points.map((row) => row.raw.join(" ")) };
    const largeConfig = createDefaultConfig(large);
    const encoding = encodeScatter(large.rows, large, largeConfig, {
      dimensions: 2,
      cap: 10,
      selectedId: 55,
      theme: "light",
    });
    expect(encoding.sampled).toBe(true);
    expect(encoding.points).toHaveLength(10);
    expect(encoding.points.some((point) => point.row.id === 55)).toBe(true);
  });

  it("uses the theme accent when no color mapping is active", () => {
    const plain = { ...config, color: { mode: "none" as const, column: null } };
    const light = encodeScatter(dataset.rows, dataset, plain, {
      dimensions: 3,
      cap: 100,
      selectedId: null,
      theme: "light",
    });
    const dark = encodeScatter(dataset.rows, dataset, plain, {
      dimensions: 3,
      cap: 100,
      selectedId: null,
      theme: "dark",
    });
    expect(light.points[0]?.color).toBe("#0d5c52");
    expect(dark.points[0]?.color).toBe("#63c9b8");
  });
});
