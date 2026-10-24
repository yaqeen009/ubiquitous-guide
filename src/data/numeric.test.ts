import { describe, expect, it } from "vitest";
import { formatAxisValue, isDateLike, isMissingCell, parseNumericValue } from "./numeric";

describe("parseNumericValue", () => {
  it("parses plain numbers and exponent notation", () => {
    expect(parseNumericValue("42")).toBe(42);
    expect(parseNumericValue("-3.5")).toBe(-3.5);
    expect(parseNumericValue("1.5e3")).toBe(1500);
    expect(parseNumericValue(" 7 ")).toBe(7);
  });

  it("treats empty cells as missing, never zero", () => {
    expect(parseNumericValue("")).toBeNull();
    expect(parseNumericValue("   ")).toBeNull();
    expect(parseNumericValue(null)).toBeNull();
    expect(parseNumericValue(undefined)).toBeNull();
  });

  it("rejects formatted values instead of guessing", () => {
    expect(parseNumericValue("1,000")).toBeNull();
    expect(parseNumericValue("12%")).toBeNull();
    expect(parseNumericValue("$12")).toBeNull();
    expect(parseNumericValue("N/A")).toBeNull();
    expect(parseNumericValue("Infinity")).toBeNull();
    expect(parseNumericValue("NaN")).toBeNull();
  });
});

describe("isMissingCell", () => {
  it("only reports blank cells", () => {
    expect(isMissingCell("")).toBe(true);
    expect(isMissingCell("  \t ")).toBe(true);
    expect(isMissingCell("0")).toBe(false);
    expect(isMissingCell("N/A")).toBe(false);
  });
});

describe("isDateLike", () => {
  it("accepts conservative year-first formats", () => {
    expect(isDateLike("2024-01-02")).toBe(true);
    expect(isDateLike("2024-01-02T10:30:00Z")).toBe(true);
    expect(isDateLike("2024/1/2")).toBe(true);
  });

  it("does not guess ambiguous formats", () => {
    expect(isDateLike("03/04/2025")).toBe(false);
    expect(isDateLike("Jan 2, 2024")).toBe(false);
    expect(isDateLike("2024-13-45")).toBe(false);
  });
});

describe("formatAxisValue", () => {
  it("uses compact notation at the extremes and keeps small decimals", () => {
    expect(formatAxisValue(12.3456)).toBe("12.3");
    expect(formatAxisValue(1500)).toMatch(/1,500|1500/);
    expect(formatAxisValue(2_000_000)).toBe("2.0e+6");
    expect(formatAxisValue(0.0004)).toBe("4.0e-4");
    expect(formatAxisValue(Number.NaN)).toBe("—");
  });
});
