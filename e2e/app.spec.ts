import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function loadDemo(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByText("DataSpace", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load demo dataset" }).click();
  await expect(page.getByText("720 rows · 11 columns").first()).toBeVisible();
}

async function addView(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Add view" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await dialog.getByRole("button", { name: /Add to workspace/ }).click();
  await expect(dialog).toBeHidden();
}

test.describe("DataSpace workspace", () => {
  test.beforeEach(async ({ page }) => {
    await loadDemo(page);
  });

  test("opens the linked 3D and 2D default workspace", async ({ page }) => {
    await expect(page.getByText("2 VIEWS")).toBeVisible();
    await expect(page.locator('section[aria-label="3D scatter plot view"]')).toBeVisible();
    await expect(page.locator('section[aria-label="2D scatter plot view"]')).toBeVisible();
    await expect(page.getByText("720 / 720 rows")).toBeVisible();
    await expect(page.getByLabel("X axis", { exact: true })).toHaveValue("PM2.5");
    await expect(page.getByLabel("Y axis", { exact: true })).toHaveValue("Noise dB");
    await expect(page.getByRole("button", { name: /Export 720 filtered rows as CSV/ })).toBeEnabled();
    await expect(page.getByText(/Synthetic demo/i).first()).toBeVisible();
  });

  test("changes axis mappings and keeps both linked views in sync", async ({ page }) => {
    await page.getByLabel("X axis", { exact: true }).selectOption("NO2");
    await page.getByLabel("Y axis", { exact: true }).selectOption("Humidity %");
    await page.getByLabel("Z axis", { exact: true }).selectOption("Noise dB");
    const threeD = page.locator('section[aria-label="3D scatter plot view"]');
    await expect(threeD.getByText("NO2 × Humidity % × Noise dB")).toBeVisible();

    await page.getByLabel("Active view").selectOption({ label: "2D scatter" });
    await page.getByLabel("X axis", { exact: true }).selectOption("NO2");
    await page.getByLabel("Y axis", { exact: true }).selectOption("Humidity %");
    const twoD = page.locator('section[aria-label="2D scatter plot view"]');
    await expect(twoD.getByText("NO2 × Humidity %")).toBeVisible();
    await expect(twoD.locator(".recharts-surface")).toBeVisible();
  });

  test("adds a table, sorts it, and selects a record across views", async ({ page }) => {
    await addView(page, "Data table");
    const table = page.locator('section[aria-label="Data table view"]');
    await expect(table).toBeVisible();
    await expect(table.getByText("1 / 15")).toBeVisible();

    await table.getByRole("cell", { name: "AQ-002", exact: true }).click();
    await expect(page.getByText("1 record selected · primary row 2")).toBeVisible();
    await expect(page.getByRole("tab", { name: /Record/ })).toHaveAttribute("data-state", "active");

    await table.getByRole("button", { name: /^PM2\.5/ }).click();
    await expect(table.locator('th[aria-sort="ascending"]')).toContainText("PM2.5");
    await table.getByRole("button", { name: /^PM2\.5/ }).click();
    await expect(table.locator('th[aria-sort="descending"]')).toContainText("PM2.5");
  });

  test("applies a histogram bar as a shared range filter, never a selection", async ({ page }) => {
    await addView(page, "Histogram");
    const histogram = page.locator('section[aria-label="Histogram view"]');
    await expect(histogram).toBeVisible();
    await histogram.locator(".recharts-bar-rectangle path").first().click();
    await expect(page.getByText("1 filter", { exact: true })).toBeVisible();
    await expect(page.getByText("103 / 720 rows")).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear selection" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clear all filters" })).toBeVisible();
    await page.getByRole("button", { name: "Clear all filters" }).click();
    await expect(page.getByText("720 / 720 rows")).toBeVisible();
  });

  test("adds a time series and renders one point per valid timestamp", async ({ page }) => {
    await addView(page, "Time series");
    const view = page.locator('section[aria-label="Time series view"]');
    await expect(view.getByText(/No implicit aggregation/)).toBeVisible();
    await expect(view.locator(".recharts-scatter-symbol")).toHaveCount(712);
    await expect(view.getByText(/Observed at × PM2\.5/)).toBeVisible();
  });

  test("brushes a parallel-coordinate axis and applies it as filters", async ({ page }) => {
    await addView(page, "Parallel coordinates");
    const view = page.locator('section[aria-label="Parallel coordinates view"]');
    const axis = view.locator('[data-brush-axis="0"]');
    await axis.scrollIntoViewIfNeeded();
    const box = await axis.boundingBox();
    if (!box) throw new Error("Parallel axis has no box");
    const x = box.x + box.width / 2;
    await page.mouse.move(x, box.y + box.height * 0.2);
    await page.mouse.down();
    await page.mouse.move(x, box.y + box.height * 0.45, { steps: 6 });
    await page.mouse.up();

    await expect(view.getByText(/\d+ match brush/)).toBeVisible();
    await expect(view.getByText("0 match brush")).toHaveCount(0);
    await view.getByRole("button", { name: "Select brushed" }).click();
    await expect(page.getByText(/records selected/)).toBeVisible();

    await view.getByRole("button", { name: "Filter to brush" }).click();
    await expect(page.getByText("1 filter", { exact: true })).toBeVisible();
    await expect(view.getByRole("button", { name: "Clear brush" })).toBeVisible();
  });

  test("filters records and keeps dataset, stats, and export in sync", async ({ page }) => {
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
    expect(lines[0]).toBe(
      "Station,Region,Zone,Observed at,PM2.5,NO2,Green cover %,Traffic index,Temperature °C,Humidity %,Noise dB",
    );
    expect(lines).toHaveLength(181);
  });

  test("saves and re-imports a version 2 workspace without embedding the dataset", async ({ page }) => {
    await page.getByLabel("X axis", { exact: true }).selectOption("NO2");
    const layoutGroup = page.getByRole("group", { name: "Workspace layout" });
    await layoutGroup.getByRole("button", { name: "Grid" }).click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByLabel("Save workspace configuration").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("urban-air-quality-demo-workspace.json");
    const path = await download.path();
    if (!path) throw new Error("Download path unavailable");
    const raw = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    expect(raw.kind).toBe("dataspace-workspace");
    expect(raw.version).toBe(2);
    expect(raw.layout).toBe("grid");
    expect(JSON.stringify(raw)).not.toContain('"rows"');
    expect(JSON.stringify(raw)).not.toContain("AQ-001,South");

    await page.getByRole("button", { name: "Reset workspace layout" }).click();
    await page.getByLabel("Choose a workspace configuration JSON file").setInputFiles({
      name: "workspace.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(raw)),
    });
    await expect(page.getByText(/Workspace configuration applied/)).toBeVisible();
    await expect(layoutGroup.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("X axis", { exact: true })).toHaveValue("NO2");
  });

  test("rejects an invalid workspace version without changing the view", async ({ page }) => {
    await page.getByLabel("Choose a workspace configuration JSON file").setInputFiles({
      name: "future.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ kind: "dataspace-workspace", version: 99 })),
    });
    const dialog = page.getByRole("dialog", { name: /Configuration could not be applied/ });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Unsupported workspace version 99");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator('section[aria-label="3D scatter plot view"]')).toBeVisible();
    await expect(page.getByLabel("X axis", { exact: true })).toHaveValue("PM2.5");
  });

  test("imports a user CSV and explains unavailable view requirements", async ({ page }) => {
    await page.getByRole("button", { name: "Import", exact: true }).click();
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose CSV file" }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles("e2e/fixtures/stations.csv");

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("10 rows · 5 columns").first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "AQ-01", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Add view" }).click();
    const gallery = page.getByRole("dialog");
    await gallery.getByRole("button", { name: /^Time series/ }).click();
    await expect(gallery).toContainText("1 date column required; 0 are available");
    await expect(gallery.getByRole("button", { name: /Add to workspace/ })).toBeDisabled();
    await expect(gallery.getByRole("button", { name: /Add Table instead/ })).toBeVisible();
    await gallery.getByRole("button", { name: "Close", exact: true }).click();

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

  test("opens the clearly marked experimental spatial workspace and returns", async ({ page }) => {
    await page.getByRole("button", { name: "Toggle experimental spatial workspace" }).click();
    const spatial = page.getByRole("region", { name: "Experimental spatial workspace" });
    await expect(spatial).toBeVisible();
    await expect(spatial.getByText("Experimental spatial workspace").first()).toBeVisible();
    await expect(spatial.getByText(/not yet verified/)).toBeVisible();
    await spatial.getByRole("button", { name: "Standard workspace" }).click();
    await expect(spatial).toBeHidden();
    await expect(page.locator('section[aria-label="3D scatter plot view"]')).toBeVisible();
  });

  test("opens the import dialog without losing the current dataset", async ({ page }) => {
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("720 rows · 11 columns").first()).toBeVisible();
  });
});

test.describe("mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("switches between visualize, configure, and data panels", async ({ page }) => {
    await loadDemo(page);

    await expect(page.locator('section[aria-label="3D scatter plot view"]')).toBeVisible();
    await page.getByRole("button", { name: "Configure", exact: true }).click();
    await expect(page.getByRole("heading", { name: "3D scatter plot" })).toBeVisible();

    await page.getByRole("button", { name: "Data", exact: true }).click();
    await expect(page.getByRole("table", { name: "Dataset row preview" })).toBeVisible();

    await page.getByRole("button", { name: "Visualize", exact: true }).click();
    await expect(page.locator('section[aria-label="3D scatter plot view"]')).toBeVisible();
  });
});
