# DataSpace by UbiquitousGuide

A browser-side workspace for exploring multidimensional CSV datasets with linked 3D and 2D scatter plots. Upload a file (or load the synthetic demo), map numeric columns to axes, filter records, select points, and compare what each representation makes visible.

All parsing, statistics, filtering, visualization, and export run in the browser. There is no backend and no upload endpoint.

**Live demo:** deploy this repository to Vercel (see [Deployment](#deployment)) and open the root URL.

---

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Using the workspace](#using-the-workspace)
- [Demo dataset](#demo-dataset)
- [Data processing](#data-processing)
- [Axis normalization](#axis-normalization)
- [Filtering and linked state](#filtering-and-linked-state)
- [Performance and limits](#performance-and-limits)
- [Export and configuration](#export-and-configuration)
- [Accessibility and responsive behavior](#accessibility-and-responsive-behavior)
- [Testing](#testing)
- [Production build](#production-build)
- [Deployment](#deployment)
- [Privacy](#privacy)
- [Project structure](#project-structure)
- [Known limitations](#known-limitations)

---

## Features

- **CSV import** with file picker and drag-and-drop, pre-flight validation, malformed-row reporting, and a large-file warning.
- **Column type inference** for numeric, categorical, date-like, text, and empty columns.
- **Interactive 3D scatter plot** built with React Three Fiber, Three.js, and Drei: orbit, zoom, pan, point picking, hover tooltip, selection marker, camera reset, and an axis gizmo.
- **Linked 2D scatter plot** built with Recharts, with independent X/Y mappings and the same colors, filters, selection, and missing-value semantics.
- **Three layouts**: 3D, 2D, and side-by-side comparison.
- **Filters**: numeric ranges, categorical values (including a synthetic “Missing” category), and case-insensitive full-row search.
- **Dataset inspection**: paginated preview, original cell values, inferred column types, missing/invalid counts, and full-vs-filtered summary statistics.
- **Selection inspector** that keeps a filtered-out selection visible and explains when a record cannot be plotted.
- **Column exclusion** that removes a column from axis, color, size, and filter choices without deleting its data.
- **Export** of filtered rows to CSV with spreadsheet formula-injection protection.
- **Configuration snapshots**: download the current view as JSON and re-import it with validation against the current dataset.
- **Light and dark themes**, persisted locally.
- **Responsive shell** with dedicated mobile tabs for visualization, configuration, and data.
- **Tests** across data utilities, state, components, and critical browser flows.

## Quick start

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`). Choose **Load demo dataset**, or drag a CSV onto the import panel.

No environment variables are required, so this repository intentionally does not include `.env.example`.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server with HMR. |
| `npm run build` | Type-check the project and create an optimized production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run typecheck` | Run TypeScript in strict mode without emitting files. |
| `npm test` | Run Vitest unit and component tests once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:e2e` | Run Playwright browser tests. |
| `npm run lint` | Alias for the strict TypeScript check; there is no separate ESLint configuration. |

Install Playwright browsers once before running end-to-end tests:

```bash
npx playwright install chromium
```

## Using the workspace

1. **Import** a CSV with the file picker, drag-and-drop, or **Load demo dataset**.
2. **Map axes** in the style panel. X, Y, and Z accept numeric columns. The 2D X/Y pair is independent and may repeat a 3D axis.
3. **Encode appearance** with a categorical or numeric color column, an optional numeric size column, and point size/opacity controls.
4. **Filter** by numeric range, category checkbox, or search terms. Every whitespace-separated search term must appear in the row.
5. **Select** a point in either plot or a row in the dataset preview. The record inspector shows original values, parsed numeric values, and each column’s visual role.
6. **Compare** 3D and 2D side by side. The question is not whether 3D is better, but which view exposes the relationship you need.
7. **Export** the filtered rows as CSV or save the view configuration as JSON.

Keyboard and screen-reader users can perform all non-canvas tasks through standard controls. The 2D view is a complete alternative when WebGL is unavailable or difficult to use. Escape clears a selection while the 3D canvas has focus; the skip link jumps to the main content.

## Demo dataset

The demo is **synthetic air-quality monitoring data** for 720 fictional stations. It is labelled “Synthetic demo” in the UI and must not be read as real-world measurements.

- 10 columns: station, region, zone, PM2.5, NO2, green cover, traffic index, temperature, humidity, and noise.
- Five regions and four zone types for categorical filtering and coloring.
- Numeric relationships that make correlation-aware axis defaults meaningful.
- Missing cells, one deliberately extreme PM2.5 outlier, and enough rows to exercise filtering and sampling.

The demo is generated as CSV text with a seeded pseudo-random generator and then passed through the **same parser and inference pipeline** as an uploaded file. It is deterministic across reloads and tests.

## Data processing

The ingestion pipeline lives in `src/data/` and is independent of React.

### Parsing

- Papa Parse handles quoted fields, commas inside values, and mixed newline conventions.
- The first parsed row is the header. Blank header cells become `Column N`; duplicate names become `Value (2)`, `Value (3)`, and so on.
- Completely blank lines are skipped. Rows with **more** fields than the header are rejected and reported. Rows with **fewer** fields are padded with missing values and reported.
- File types other than `.csv` and `.txt` are rejected before reading. Empty files and files above 25 MB are rejected.
- Import is capped at 100,000 data rows. Files above 8 MB or 20,000 rows show a warning.
- Stable row IDs are assigned at import time (`0..n-1`) and never change. Selection, search, and sampling refer to these IDs.

Original cell strings are preserved in `row.raw`. Parsed numbers are stored separately in `row.numeric`. Filters, axis mappings, color, and size never mutate the source arrays.

### Type inference

Inference considers every cell in a column rather than a sample.

| Type | Rule |
| --- | --- |
| `empty` | No non-empty cells. |
| `numeric` | At least 90% of non-empty cells parse as finite numbers. |
| `date` | At least 90% parse as conservative year-first dates (`YYYY-MM-DD`, ISO timestamps, `YYYY/M/D`). |
| `categorical` | Distinct non-empty values ≤ max(12, 5% of non-empty cells). |
| `text` | Everything else. |

A mostly numeric column with a few `N/A` cells stays numeric; those cells are counted as **invalid numeric** values and treated as missing in plots and statistics. Dates are available for categorical filters and color, but are not plotted on numeric axes.

### Missing and invalid values

- An empty or whitespace-only cell is **missing** (`null`), never zero.
- A non-empty cell that fails strict numeric parsing is **invalid** for a numeric column and also treated as missing in charts.
- Numeric parsing accepts standard JavaScript decimal and exponent notation. It deliberately rejects thousands separators, currency symbols, percent signs, and localized decimal commas instead of guessing.
- Rows missing a value on a **2D** axis are not plotted and are counted below the chart.
- In 3D, an unmapped axis places every point at the centre; a mapped axis with a missing value removes that row from the plot and counts it.
- Statistics report missing and invalid counts separately.
- Numeric filters exclude rows with a missing value on the filtered column.

## Axis normalization

Each mapped numeric axis uses an independent **linear min–max scale** over the full column, not the filtered subset. This keeps point positions stable while filters change.

```
unit(value)   = (value - columnMin) / (columnMax - columnMin)   // clamped to 0..1
signed(value) = unit(value) * 2 - 1                             // -1..1
```

- Valid values map to `[-1, 1]`; the scene centre is `0`.
- Negative values and widely varying magnitudes are handled by per-axis scaling.
- A constant column collapses to the centre (`signed = 0`) instead of dividing by zero.
- The 2D chart uses the original values with the column’s true extent as its domain, so axis ticks remain meaningful.
- Tooltips and the record inspector always show original values, never normalized coordinates.

There is currently no logarithmic scaling option. Adding one would require a documented policy for zero and negative values, so it is intentionally out of scope.

### Initial axis selection

For a new dataset, X is the first varying numeric column. Y is the numeric column least correlated with X; Z is the column least correlated with both. Pearson correlation is computed over at most 800 evenly spaced rows. This avoids opening on a degenerate view where every point lies on a diagonal because two columns are near-duplicates. **Reset** restores these defaults.

## Filtering and linked state

`useDataStore` (Zustand) is the single source of truth for the dataset, configuration, filters, selection, theme, and transient UI messages. `useDatasetView` derives the filtered rows, full and filtered statistics, visible numeric/category columns, and the selected record with `useMemo`.

The following always use the same filtered row set:

- 3D and 2D points
- Dataset preview
- Selected-record panel
- Filtered record count
- Filtered statistics
- CSV export

A selected record is **not** cleared when a filter excludes it. The inspector shows a “Hidden by filters” notice, and the table can still reveal the row. If a mapped axis value is missing, the inspector shows “Not plotted” while retaining the original values.

Hiding a column removes it from axis, color, size, and filter choices and clears any mapping or filter that used it. The column remains in the dataset, preview, statistics, and export.

## Performance and limits

| Limit | Value | Behavior |
| --- | --- | --- |
| Maximum file size | 25 MB | Rejected before reading. |
| Warning file size | 8 MB | Confirmation dialog before reading. |
| Maximum rows | 100,000 | Rejected with a clear message. |
| Warning rows | 20,000 | Warning in the import report. |
| 3D rendered points | 20,000 | Deterministic even-stride sample. |
| 2D rendered points | 4,000 | Deterministic even-stride sample. |
| Preview page | 25 rows | Pagination. |

Rendering uses a single `THREE.Points` object with buffer geometry and a custom shader, not one React component per point. Hover and click picking use GPU picking against a dedicated picking scene. Sampling happens **after** filtering and after rows with missing mapped values are removed; a selected row outside the sample is appended so its highlight remains visible. Statistics, filtering, and export always use every filtered row.

The production bundle is dominated by Three.js and Recharts. Vite currently reports a chunk larger than 500 kB; this is expected for a WebGL application and is documented rather than hidden by raising the warning threshold. If initial load becomes a priority, lazy-loading the 3D renderer is the next optimization.

## Export and configuration

### CSV export

Filtered rows are serialized with original headers and original cell strings. Exports are preceded by a strict check for spreadsheet formula injection: a text cell beginning with `=`, `+`, `-`, `@`, tab, or carriage return is prefixed with an apostrophe. Valid numbers in numeric columns, including negative numbers, are left unchanged so the file remains machine-readable. Filenames are slugged from the dataset name and suffixed with `-filtered` when filters are active.

### Configuration JSON

**Save visualization configuration** downloads a JSON snapshot containing:

- axis mappings (3D and 2D)
- color and size mappings
- point size and opacity
- filters
- layout
- excluded columns
- dataset name, column names, and a timestamp

**Load visualization configuration** validates the file before changing any state. It checks the version, required objects, value ranges, column existence and type, excluded-column consistency, and filter references. Invalid files produce a list of errors and apply nothing. Applying a configuration saved for a different dataset produces a warning.

Only the theme preference is persisted in `localStorage`. Uploaded datasets and configurations are never stored automatically.

## Accessibility and responsive behavior

- Semantic landmarks, labelled controls, and visible focus rings throughout.
- Upload errors use `role="alert"`; status messages use polite live regions.
- Selection is communicated by shape/size and panel content, not color alone.
- The category palette is derived from Okabe–Ito for color-vision-deficiency differentiation.
- Reduced-motion preferences disable non-essential transitions.
- The 2D view is a complete alternative to the 3D canvas, and a WebGL failure offers a one-click switch.
- On screens below `lg`, the workspace becomes three tabs: **Visualize**, **Configure**, and **Data**.
- 3D navigation instructions are shown below the plot and in the built-in guide.

## Testing

### Unit and component tests

```bash
npm test
```

Vitest runs in jsdom with React Testing Library. The suite covers:

- numeric parsing, missing-value semantics, and conservative date detection
- column inference for every type, including mostly-numeric columns
- CSV parsing, duplicate headers, padding, rejected rows, limits, and validation
- linear scaling, constant columns, and size ranges
- filters, category matching, search, and filter helpers
- summary statistics over full and filtered rows
- CSV export serialization and formula-injection protection
- configuration round-trips and validation failures
- deterministic sampling and selected-row preservation
- category color assignment, grouping, and numeric color mapping
- scatter encoding, missing-axis handling, and structural sharing of positions
- store behavior for axes, filters, selection, exclusion, themes, and resets
- component behavior for upload/errors, preview, axis controls, filters, record details, and empty states

Current result: **148 tests across 18 files pass.**

### End-to-end tests

```bash
npx playwright install chromium
npm run test:e2e
```

The Playwright suite starts (or reuses) the Vite server and verifies:

1. The demo loads with 3D rendering, mapped axes, and an enabled export.
2. X, Y, and Z mappings change; Compare and 2D layouts render; Recharts draws a real SVG surface.
3. Search reduces the dataset to 180 rows and the filtered CSV download contains 180 data rows plus the header.
4. Selecting a table row opens the record inspector.
5. A valid user CSV imports through the dialog and surfaces its invalid-numeric warning.
6. An unsupported file produces a helpful error without replacing the dataset.
7. The import dialog opens and closes without discarding the dataset.
8. The mobile panel tabs work at 390 × 844.

Current result: **8 Playwright tests pass in Chromium.** Test data lives in `e2e/fixtures/` and is deterministic.

A deliberate limitation: the browser suite does not click an arbitrary WebGL point. GPU picking depends on the software renderer available in headless Chromium and would make the test flaky. Picking logic is exercised manually and the same selection path is covered by row selection; the encoding and selection state are unit tested. This is an honest gap, not a claim of full canvas automation.

### Type check

```bash
npm run typecheck
```

Strict TypeScript with `noUncheckedIndexedAccess`, `noUnusedLocals`, and `noUnusedParameters` passes.

## Production build

```bash
npm run build
npm run preview
```

The build type-checks first, then emits static assets to `dist/`. Expect a warning about a JavaScript chunk over 500 kB because of Three.js; the build still completes successfully.

## Deployment

### Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Deploy. No environment variables or server configuration are needed.
5. Optional: add a custom domain and update the meta description/URL if you fork the project.

Because the application uses client-side routing only at the root path, no rewrite rules are required. If routes are added later, configure a SPA fallback to `index.html`.

### Other static hosts

Any static host that serves the contents of `dist/` works (Netlify, Cloudflare Pages, GitHub Pages with a base path adjustment). No API, database, or runtime secrets are involved.

## Privacy

- CSV parsing, filtering, statistics, and export happen in the browser tab.
- Files are never uploaded. There is no analytics, tracking script, or backend endpoint.
- Uploaded datasets are not written to `localStorage`, IndexedDB, or cookies.
- Refreshing or closing the tab discards the dataset unless it has been exported.
- Only the theme preference (`light`/`dark`) is stored in `localStorage`.
- Fonts are bundled locally, so the application does not call a font CDN.

## Project structure

```
src/
  components/
    data/          preview, column inspector, statistics, notices
    dialogs/       help and import dialogs
    inspector/     axis, style, filter, and record panels
    layout/        shell, sidebar, top bar, onboarding, toast
    ui/            small shadcn-style primitives (Radix based)
    upload/        import panel and drag-and-drop
    viz/           3D canvas, 2D chart, stage, legend, WebGL boundary
  data/            parsing, inference, scaling, filters, stats, export, demo
  hooks/           derived dataset view
  store/           Zustand data and UI stores
  test/            jsdom setup and fixtures
  viz/             scatter encoding (pure functions)
  types.ts         shared domain types
e2e/               Playwright critical flows
```

The data layer has no React imports except the `useScatterEncoding` memo hook, so most logic is directly unit-testable. Rendering components consume an already-encoded, immutable point array.

## Known limitations

- **3D point picking in automated tests** is intentionally not covered; see [Testing](#testing).
- **Date columns are not plotted.** They can be used for filters, color, and search, but not as numeric axes.
- **No logarithmic or robust (percentile) scaling.** Linear min–max is the only documented axis scale. Outliers expand the domain, which is visible in the 2D chart and can compress the rest of the data.
- **Rendered-point caps** are fixed at 20,000 (3D) and 4,000 (2D). The UI reports when a sample is shown, but there is no user-adjustable cap.
- **No dataset persistence or multi-dataset sessions.** Refreshing discards the upload.
- **No server-side collaboration, sharing links, or saved views.** Configuration JSON is the sharing mechanism.
- **Export re-serializes original cell values.** Numeric formatting is preserved as entered; computed statistics are not added as columns.
- **Configuration import requires the same columns** (by name and type) for mapped roles. Applying a snapshot to a structurally different dataset is rejected instead of guessed.
- **Large-file parsing is synchronous.** Files are capped at 100,000 rows / 25 MB to keep the tab responsive; a Web Worker was not justified at that limit.
- **The production bundle exceeds Vite’s default 500 kB warning threshold.** Three.js is the main contributor; lazy-loading the 3D renderer is the planned optimization.
- **Browser support:** current Chrome, Edge, Firefox, and Safari. WebGL is required for the 3D pane; the 2D pane works without it.

## Next steps

- Lazy-load the 3D renderer and split vendor chunks to improve first load.
- Offer optional log/robust axis scaling with a clear explanation of zero and negative handling.
- Add a worker-based parser for datasets near the row limit.
- Add shareable, URL-encoded view configurations for datasets with stable column schemas.
- Add a Playwright GPU-picking test that runs only in an environment with a reliable WebGL renderer.

---

Built as the UbiquitousGuide portfolio project. The product name in the interface is **DataSpace**.
