import type { ParseResult } from "@/types";
import { parseCsv } from "./parse";

/**
 * Seeded pseudo-random generator (mulberry32) so the demo dataset is identical
 * on every load and in tests.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const REGIONS = ["North", "South", "East", "West", "Central"] as const;
const ZONES = ["Urban", "Suburban", "Industrial", "Riverside"] as const;

function round(value: number, digits = 1): string {
  return value.toFixed(digits);
}

/**
 * Synthetic air-quality monitoring data for 720 fictional stations.
 *
 * Clearly labelled as demo data in the UI. It is generated as CSV text and fed
 * through the exact same parser and inference pipeline as an uploaded file.
 */
export function createDemoCsv(): string {
  const random = mulberry32(20261020);
  const header = [
    "Station",
    "Region",
    "Zone",
    "PM2.5",
    "NO2",
    "Green cover %",
    "Traffic index",
    "Temperature °C",
    "Humidity %",
    "Noise dB",
  ];
  const lines: string[] = [header.join(",")];

  for (let index = 0; index < 720; index += 1) {
    const region = REGIONS[Math.floor(random() * REGIONS.length)] ?? "North";
    const zone = ZONES[Math.floor(random() * ZONES.length)] ?? "Urban";
    const green = 4 + random() * 62;
    const traffic = 4 + random() * 96;
    const temperature = 8 + random() * 24;
    const humidity = 30 + random() * 60;
    const noise = 44 + random() * 38;
    const industrial = zone === "Industrial" ? 1 : 0;
    const riverside = zone === "Riverside" ? 1 : 0;

    let pm25 =
      5 +
      industrial * 26 +
      traffic * 0.2 -
      green * 0.14 +
      noise * 0.05 +
      (random() - 0.5) * 9;
    pm25 = Math.max(2.1, pm25);
    if (index === 137) pm25 = 148.6; // documented outlier for demonstration
    let no2 =
      7 +
      traffic * 0.42 +
      industrial * 7 -
      riverside * 3 -
      green * 0.06 +
      (random() - 0.5) * 7;
    no2 = Math.max(1.4, no2);

    let humidityCell = round(humidity);
    let pmCell = round(pm25);
    const no2Cell = round(no2);
    if (index % 97 === 5) pmCell = "";
    if (index % 89 === 7) humidityCell = "";
    const no2Out = index % 83 === 3 ? "" : no2Cell;

    const station = `AQ-${String(index + 1).padStart(3, "0")}`;
    lines.push(
      [
        station,
        region,
        zone,
        pmCell,
        no2Out,
        round(green),
        round(traffic),
        round(temperature),
        humidityCell,
        round(noise),
      ].join(","),
    );
  }

  return lines.join("\n");
}

export const DEMO_DATASET_NAME = "Urban air quality (demo)";

/** Parse the demo through the production pipeline and mark its source. */
export function loadDemoDataset(): ParseResult {
  const result = parseCsv(createDemoCsv(), "urban-air-quality-demo.csv", {
    name: DEMO_DATASET_NAME,
  });
  return { ...result, dataset: { ...result.dataset, source: "demo" } };
}
