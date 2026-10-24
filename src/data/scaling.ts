/**
 * Axis normalization.
 *
 * Documented strategy: each axis uses an independent linear min–max scale over
 * the full dataset (not the filtered subset, so points do not jump when a filter
 * changes). Valid values map to [-1, 1], the center of the scene to 0.
 *
 * - Constant columns collapse to 0 (the center) because no spread exists.
 * - Missing/invalid values are not plotted on that axis and those rows are
 *   skipped by the renderer and counted in the UI.
 * - Negative values and widely varying magnitudes are handled by the per-axis
 *   scale; each dimension is normalized independently.
 */
export interface LinearScale {
  min: number;
  max: number;
  span: number;
  constant: boolean;
  /** Map a value to 0..1 across the extent. Constant columns return 0.5. */
  unit: (value: number) => number;
  /** Map a value to -1..1. Constant columns return 0. */
  signed: (value: number) => number;
}

export function createLinearScale(min: number, max: number): LinearScale {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : 0;
  const constant = safeMax === safeMin;
  const span = constant ? 0 : safeMax - safeMin;
  const unit = (value: number): number => {
    if (constant || !Number.isFinite(value)) return 0.5;
    return Math.min(1, Math.max(0, (value - safeMin) / span));
  };
  return {
    min: safeMin,
    max: safeMax,
    span,
    constant,
    unit,
    signed: (value: number): number => unit(value) * 2 - 1,
  };
}

/** Scale a raw value into a target range, used for point sizes. */
export function scaleToRange(value: number, min: number, max: number, outputMin: number, outputMax: number): number {
  if (!Number.isFinite(value)) return outputMin;
  if (max === min) return (outputMin + outputMax) / 2;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return outputMin + t * (outputMax - outputMin);
}
