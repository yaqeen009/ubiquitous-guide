import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function loadDemo(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByText("DataSpace", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load demo dataset" }).click();
  await expect(page.getByText("720 rows · 10 columns").first()).toBeVisible();
}

test.describe("DataSpace workspace", () => {
  test.beforeEach(async ({ page }) => {
    await loadDemo(page);
  });

  test("loads the synthetic demo with a 3D view and mapped axes", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "3D" })).toBeVisible();
    await expect(page.getByText("720 / 720 rows")).toBeVisible();
    await expect(page.getByLabel("X axis variable", { exact: true })).toHaveValue("PM2.5");
    await expect(page.getByLabel(/Export \d+ filtered rows as CSV/)).toBeEnabled();
    await expect(page.getByText(/Synthetic demo/i).first()).toBeVisible();
  });

  test("changes axis mappings and compares 3D with 2D", async ({ page }) => {
    await page.getByLabel("X axis variable", { exact: true }).selectOption("NO2");
    await page.getByLabel("Y axis variable", { exact: true }).selectOption("Humidity %");
    await page.getByLabel("Z axis variable", { exact: true }).selectOption("Noise dB");
    await expect(page.getByLabel("X axis variable", { exact: true })).toHaveValue("NO2");

    await page.getByRole("button", { name: "Compare" }).click();
    await expect(page.getByRole("heading", { name: "3D" })).toBeVisible();
    await expect(page.getByText(/^NO2 × Humidity % × Noise dB$/)).toBeVisible();

    await page.getByRole("button", { name: "2D" }).click();
    await expect(page.getByRole("heading", { name: "2D" })).toBeVisible();
    await expect(page.getByText("PM2.5 × Noise dB")).toBeVisible();
    await expect(page.locator(".recharts-surface")).toBeVisible();
  });

  test("filters records and keeps the dataset, stats, and export in sync", async ({ page }) => {
    await page.getByRole("tab", { name: /Filters/ }).click();
    await page.getByLabel("Search all dataset values").fill("Industrial");
    await expect(page.getByText(/^180 visible/).first()).toBeVisible();
    await expect(page.getByText("180 / 720").first()).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByLabel(/Export \d+ filtered rows as CSV/).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("urban-air-quality-demo-filtered.csv");
    const path = await download.path();
    if (!path) throw new Error("Download path unavailable");
    const csv = await readFile(path, "utf8");
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("Station,Region,Zone,PM2.5,NO2,Green cover %,Traffic index,Temperature °C,Humidity %,Noise dB");
    expect(lines).toHaveLength(181);
  });

  test("selects a row and inspects the original record", async ({ page }) => {
    await page.getByRole("cell", { name: "AQ-002", exact: true }).click();
    await expect(page.getByText("Stable record ID")).toBeVisible();
    await expect(page.getByText("Row 2")).toBeVisible();
    await expect(page.getByRole("tab", { name: /Record/ })).toHaveAttribute("data-state", "active");
  });

  test("imports a user CSV through the import dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Import", exact: true }).click();
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose CSV file" }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles(new URL("./fixtures/stations.csv", import.meta.url).pathname);

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("heading", { name: "stations" })).toBeVisible();
    await expect(page.getByText("10 rows · 5 columns").first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "AQ-01", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Review" }).click();
    await expect(page.getByRole("dialog")).toContainText("non-numeric value");
  });

  test("rejects an unsupported file with a helpful error", async ({ page }) => {
    await page.getByRole("button", { name: "Import", exact: true }).click();
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose CSV file" }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: "notes.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not a csv"),
    });

    await expect(page.getByRole("alert")).toContainText("Unsupported file type");
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("opens the import dialog without losing the current dataset", async ({ page }) => {
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("720 rows · 10 columns").first()).toBeVisible();
  });
});

test.describe("mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("switches between visualize, configure, and data panels", async ({ page }) => {
    await loadDemo(page);

    await expect(page.getByRole("heading", { name: "3D" })).toBeVisible();
    await page.getByRole("button", { name: "Configure" }).click();
    await expect(page.getByRole("heading", { name: "Axis mapping" })).toBeVisible();

    await page.getByRole("button", { name: "Data" }).click();
    await expect(page.getByRole("table", { name: "Dataset row preview" })).toBeVisible();

    await page.getByRole("button", { name: "Visualize" }).click();
    await expect(page.getByRole("heading", { name: "3D" })).toBeVisible();
  });
});
