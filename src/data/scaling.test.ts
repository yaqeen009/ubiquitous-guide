import { describe, expect, it } from "vitest";
import { createLinearScale, scaleToRange } from "./scaling";

describe("createLinearScale", () => {
  it("maps the extent to unit and signed ranges", () => {
    const scale = createLinearScale(0, 10);
    expect(scale.constant).toBe(false);
    expect(scale.span).toBe(10);
    expect(scale.unit(0)).toBe(0);
    expect(scale.unit(5)).toBe(0.5);
    expect(scale.unit(10)).toBe(1);
    expect(scale.signed(0)).toBe(-1);
    expect(scale.signed(5)).toBe(0);
    expect(scale.signed(10)).toBe(1);
  });

  it("clamps values outside the extent", () => {
    const scale = createLinearScale(-10, 10);
    expect(scale.unit(-20)).toBe(0);
    expect(scale.unit(20)).toBe(1);
    expect(scale.signed(-20)).toBe(-1);
  });

  it("collapses constant columns to the center", () => {
    const scale = createLinearScale(7, 7);
    expect(scale.constant).toBe(true);
    expect(scale.span).toBe(0);
    expect(scale.unit(7)).toBe(0.5);
    expect(scale.unit(100)).toBe(0.5);
    expect(scale.signed(7)).toBe(0);
  });

  it("handles negative extents without losing direction", () => {
    const scale = createLinearScale(-30, -10);
    expect(scale.unit(-30)).toBe(0);
    expect(scale.unit(-20)).toBe(0.5);
    expect(scale.signed(-30)).toBe(-1);
    expect(scale.signed(-10)).toBe(1);
  });
});

describe("scaleToRange", () => {
  it("maps into an output range and clamps", () => {
    expect(scaleToRange(5, 0, 10, 2, 6)).toBe(4);
    expect(scaleToRange(-5, 0, 10, 2, 6)).toBe(2);
    expect(scaleToRange(50, 0, 10, 2, 6)).toBe(6);
  });

  it("returns the midpoint for a constant source", () => {
    expect(scaleToRange(5, 5, 5, 2, 6)).toBe(4);
  });

  it("falls back to the minimum for non-finite values", () => {
    expect(scaleToRange(Number.NaN, 0, 10, 2, 6)).toBe(2);
  });
});
