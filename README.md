# DataSpace by UbiquitousGuide

A browser-side visual analytics workspace for multidimensional CSV datasets. Import a file (or load the synthetic demo), open several coordinated views, filter and select records once, and compare what each representation makes visible.

All parsing, statistics, filtering, visualization, export, and workspace validation run in the browser. There is no backend and no upload endpoint.

**Live demo:** deploy this repository to Vercel (see [Deployment](#deployment)) and open the root URL.

---

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Using the workspace](#using-the-workspace)
- [Visualization registry](#visualization-registry)
- [Demo dataset](#demo-dataset)
- [Data processing](#data-processing)
- [Linked state](#linked-state)
- [Workspace persistence and export](#workspace-persistence-and-export)
- [Architecture](#architecture)
- [Performance and limits](#performance-and-limits)
- [Accessibility and responsive behavior](#accessibility-and-responsive-behavior)
- [Testing](#testing)
- [Production build](#production-build)
- [Deployment](#deployment)
- [Privacy](#privacy)
- [Project structure](#project-structure)
- [Known limitations](#known-limitations)
- [Next steps](#next-steps)

---

## Features

- **CSV import** with file picker and drag-and-drop, pre-flight validation, malformed-row reporting, and a large-file warning.
- **Column type inference** for numeric, categorical, date/timestamp, text, and empty columns.
- **Seven registered visualizations**: linked 3D scatter, 2D scatter, data table, time series, histogram, Pearson correlation heatmap, and parallel coordinates.
- **View gallery** that explains each view's purpose, required fields, selection semantics, and why a view is unavailable. Unavailable views are never shown as working and suggest a compatible alternative.
- **Multiview workspace**: up to eight open views, single/columns/grid layouts, a two-view splitter, maximize/restore, close, and reorder controls.
- **Linked exploration**: one shared dataset, filter set, category-color mapping, time range, and selection across every open view.
- **Explicit selection semantics**: charts that select records, the histogram that applies range filters, the correlation heatmap that selects nothing, and parallel coordinates that publish brushed records.
- **Table** with local search, column sorting, pagination, missing/invalid rendering, row selection, and page-level multi-selection.
- **Workspace JSON (version 2)** containing open views, layout, mappings, encodings, filters, time ranges, and view options. Uploaded data is not embedded.
- **Automatic local workspace restore** for the same dataset signature (name, row count, column names and types). Datasets themselves are never persisted.
- **Filtered CSV export** with spreadsheet formula-injection protection.
- **Light and dark themes**, persisted locally.
- **Responsive shell** with dedicated mobile tabs for visualization, configuration, and data.
- **Optional experimental spatial mode** that places live panel cards in a navigable Three.js scene. It is clearly labelled and not required for any analysis.
- **Tests** across data utilities, analytics, the registry, workspace validation, stores, components, and critical browser flows.

The conventional 2D workspace is the primary interface. 3D adds a third dimension and spatial depth, but also occlusion and perspective distortion; the product does not claim that 3D is inherently better.

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

### 1. Import and inspect

Use the file picker, drag-and-drop, or **Load demo dataset**. The import dialog validates the file and then reports row/column counts, inferred types, missing or invalid values, and malformed rows. **Review** opens the full import report.

The data panel provides a paginated preview, a column inspector, and full-versus-filtered summary statistics. Columns can be excluded from mapping and filter choices without being removed from the data.

### 2. Open views

Choose **Add view** to open the gallery. Each card explains:

- what the view is useful for;
- which fields and data kinds it requires;
- how selection works;
- why it is unavailable when requirements are missing;
- which compatible view to add instead.

A new workspace opens with linked 3D and 2D scatter plots when the dataset has at least two numeric columns. Otherwise it opens one compatible view, or the table. A workspace holds at most eight views.

### 3. Arrange the workspace

- **Single** shows one view with tabs for the others.
- **Columns** places views side by side. With two views, drag the splitter to resize them. With more than two, panels scroll horizontally at a practical minimum width.
- **Grid** wraps panels into two columns on desktop. Adding a third view while in single or columns switches to grid so the new view is visible.
- Each panel can be maximized, restored, moved earlier or later, or closed.
- **Reset workspace layout** restores the default arrangement.

The active panel is outlined. Its mappings and options appear in the inspector/Configure panel; shared filters are one tab away, so neither replaces visualization space.

### 4. Filter, select, and compare

Shared filters apply to every view, the visible row count, the record inspector, statistics, and CSV export. Shared selection highlights the same record wherever it can be drawn.

- **Click a point or row** to select one record.
- **Use table checkboxes** to add records to the shared multi-selection.
- **Click a histogram bar** to apply that bin's numeric range as a filter. It never pretends to select records.
- **Drag on a parallel-coordinate axis** to brush in original units, then use **Select brushed** or **Filter to brush**.
- **Clear selection** keeps filters; **Clear filters** keeps the selection and reports any selected records hidden by the new filter set.

Filtering does not clear a selected record. The workspace banner reports hidden selected records and offers to restore the filter or clear the selection.

### 5. Export

**Export CSV** downloads the current filtered rows with original headers and cell strings. **Save workspace configuration** downloads a version 2 JSON snapshot; **Load workspace configuration** validates a file before applying anything.

## Visualization registry

Every view is registered in [`src/viz/registry.ts`](src/viz/registry.ts). A definition contains a stable id, name and description, category, supported field kinds, required data kinds, default mappings/options, the React component, capabilities, and a selection note.

| View | Requirements | Selection semantics | Rendering / aggregation notes |
| --- | --- | --- | --- |
| 3D scatter | 2 numeric columns; optional Z | record | 20,000-point deterministic render cap; missing mapped values are not plotted |
| 2D scatter | 2 numeric columns | record | 4,000-point deterministic render cap; missing axis values are not plotted |
| Data table | any tabular dataset | record + multi-select | 50 rows per page by default; local search and sorting; page count from the filtered set |
| Time series | 1 date and 1 numeric column | record | One point per valid record; optional split by category; no timestamp bucketing or averaging |
| Histogram | 1 numeric column | filter | Aggregate bins; clicking applies a numeric range filter |
| Correlation heatmap | 2 numeric columns | none | Pairwise-complete Pearson; null/insufficient pairs are visually distinct from zero |
| Parallel coordinates | 2 numeric columns | multiple | Min–max normalized axes; 2,000-line render sample; brushing uses all complete filtered records |

### Adding a visualization

1. Implement a component with the `VisualizationProps` contract (`view`, `instance`) in `src/components/views/`.
2. Add a `VisualizationDefinition` to `VISUALIZATIONS` with unique id, metadata, field definitions, `requires`, component, defaults, capabilities, and selection note.
3. Add a thumbnail branch in `ViewGallery` if the generic thumbnail is not descriptive.
4. Normalize any new field or option in `normalizeViewInstance` and, if needed, the view itself.
5. Add unit tests for compatibility/defaults/normalization and a browser test for the rendering or interaction path.

The app shell, gallery, workspace panes, CSV pipeline, and shared filters do not need per-view edits. The registry drives compatibility checks, mappings, add-view behavior, and workspace validation.

Deferred: network and geospatial views. Relationship fields are not inferred or invented. Those would require an explicit data model rather than a guess.

## Demo dataset

The demo is **synthetic air-quality monitoring data** for 720 fictional stations. It is labelled "Synthetic demo" in the UI and must not be read as real-world measurements.

- 11 columns: station, region, zone, observation timestamp, PM2.5, NO2, green cover, traffic index, temperature, humidity, and noise.
- 30 days of hourly timestamps, five regions, and four zone types.
- Numeric relationships that make correlation-aware axis defaults meaningful.
- Missing cells, invalid cells, and a deliberate extreme PM2.5 outlier.
- Enough rows to exercise filtering, time ranges, correlation sampling, and render sampling.

The demo is generated as CSV text with a seeded pseudo-random generator and then passed through the **same parser and inference pipeline** as an uploaded file. It is deterministic across reloads and tests.

## Data processing

The ingestion and analytics pipeline lives in `src/data/` and is independent of React except for memoized hooks.

### Parsing

- Papa Parse handles quoted fields, commas inside values, and mixed newline conventions.
- The first parsed row is the header. Blank header cells become `Column N`; duplicate names become `Value (2)`, `Value (3)`, and so on.
- Completely blank lines are skipped. Rows with **more** fields than the header are rejected and reported. Rows with **fewer** fields are padded with missing values and reported.
- File types other than `.csv` and `.txt` are rejected before reading. Empty files and files above 25 MB are rejected.
- Import is capped at 100,000 data rows. Files above 8 MB or 20,000 rows show a warning.
- Stable row IDs are assigned at import time (`0..n-1`) and never change. Selection, search, sampling, and brushing refer to these IDs.

Original cell strings are preserved in `row.raw`. Parsed numbers and timestamps are stored separately in `row.numeric` and `row.dates`. Filters, mappings, color, and size never mutate the source arrays.

### Type inference

Inference considers every cell in a column rather than a sample.

| Type | Rule |
| --- | --- |
| `empty` | No non-empty cells. |
| `numeric` | At least 90% of non-empty cells parse as finite numbers. |
| `date` | At least 90% parse as conservative year-first dates or timestamps (`YYYY-MM-DD`, ISO timestamps, `YYYY/M/D`). |
| `categorical` | Distinct non-empty values ≤ max(12, 5% of non-empty cells). |
| `text` | Everything else. |

A mostly numeric column with a few `N/A` cells stays numeric; those cells are counted as **invalid numeric** values and treated as missing in plots and statistics. Date columns can be used for time series, categorical filters, and search. They are not numeric axes.

### Missing and invalid values

- An empty or whitespace-only cell is **missing** (`null`), never zero.
- A non-empty cell that fails strict numeric parsing is **invalid** for a numeric column and is also treated as missing in charts.
- Numeric parsing accepts standard JavaScript decimal and exponent notation. It deliberately rejects thousands separators, currency symbols, percent signs, and localized decimal commas instead of guessing.
- Rows missing a value on a 2D axis are not plotted and are counted below the chart.
- In 3D, an unmapped axis places points at the centre; a mapped axis with a missing value removes that row from the plot and counts it.
- Statistics report missing and invalid counts separately.
- Numeric and time filters exclude rows with a missing/invalid value on the filtered column.
- Missing is always distinct from zero in summaries, histogram bins, correlation pairs, and time-series counts.

## Linked state

`useDataStore` (Zustand) owns the dataset, configuration, shared filters, multi-selection, theme, and transient messages. `useWorkspaceStore` owns open panels, layout, active/maximized panel, split ratio, warnings, and the experimental-mode flag. Derived rows, statistics, visible columns, selected records, and counts are memoized in `useDatasetView`.

The following always use the same filtered row set:

- every open view
- the visible record count
- the record inspector
- full-versus-filtered statistics
- CSV export
- workspace selection state

The following stay separate:

- view-specific mappings and options (axis fields, bins, page size, series limit)
- shared visualization mappings (category color, size, and 3D/2D axis defaults)
- transient hover and table-local search

Filters do not clear selection. A selection outside the current filter set stays selected, is reported as hidden, and remains inspectable.

### Analytics details

- **Time series** uses sorted record timestamps and does not bucket or average. Duplicate timestamps are separate points; per-series connecting lines are omitted when duplicates exist. Invalid dates and missing measures are counted separately. The default split is none; up to six categories are drawn, with omitted categories disclosed. Rendering samples at most 4,000 points, preserving the selected record.
- **Correlation** is Pearson over pairwise-complete observations. A pair with fewer than three observations or no variation returns `null` ("n/a"), not zero. Up to eight columns are shown by default; at most twelve are allowed. Calculations use at most 2,000 evenly spaced filtered rows and disclose sampling.
- **Histograms** use explicit or automatic bin counts, inclusive start/exclusive end bins (final bin inclusive), and report valid, missing, and invalid counts plus quantiles. Filtering a column recomputes its distribution from the filtered rows.
- **Parallel coordinates** normalizes each axis from the full column extent, so positions stay stable while filters change. Constant axes centre at 0.5. Brushing uses original units. Up to 2,000 lines are drawn, but brushing and selection use every complete filtered record.
- **Tables** sort missing/invalid values last in either direction and render missing as a dash and invalid numeric cells as `value (invalid)`. Local search filters only that table; shared filters still apply to it.

## Workspace persistence and export

### Version 2 workspace JSON

The saved file has `kind: "dataspace-workspace"` and `version: 2`. It includes:

- all open view definitions: type, title, field mappings, and options
- layout, active/maximized panel, and split ratio
- shared axis defaults, color and size mappings, display settings
- shared numeric, categorical, time, and search filters
- excluded columns
- experimental spatial-mode flag
- dataset name, column names, and timestamp

The dataset rows are never embedded. Import validation checks the kind, version, panel shape, unique ids, known view types, field existence/type/exclusion, option values, layout consistency, and active/maximized references. Invalid files apply nothing and list errors. Unknown view types and unfulfillable required fields are dropped with warnings. A file saved for a different dataset name produces a warning. Version 1 visualization-only configurations are upgraded to a workspace.

### Local persistence

The current open-view arrangement and view mappings/options are stored under the `dataspace-workspace-v2` local key, tagged with a dataset signature (name, row count, column names and types). A workspace is restored only when that signature matches. Shared filters are not persisted locally; save a workspace JSON to keep them. Uploaded datasets are never stored.

Only the theme preference and this local workspace record are written to `localStorage`.

### CSV export

Filtered rows are serialized with original headers and original cell strings. A strict check prevents spreadsheet formula injection: text beginning with `=`, `+`, `-`, `@`, tab, or carriage return is prefixed with an apostrophe. Valid numbers, including negative numbers, stay unchanged. The filename is slugged from the dataset name and suffixed with `-filtered` when filters are active.

## Architecture

```
src/
  components/
    data/          preview, column inspector, statistics, notices
    dialogs/       help and import dialogs
    inspector/     active-view settings, filters, record details
    layout/        shell, sidebar, top bar, onboarding, toast
    spatial/       experimental Three.js card workspace
    ui/            small shadcn-style Radix primitives
    upload/        import panel and drag-and-drop
    views/         seven registered visualization implementations
    viz/           legacy/low-level 3D canvas, 2D chart, WebGL boundary
    workspace/     multiview stage and view gallery
  data/            parsing, inference, filters, stats, export, demo,
                   correlation, distribution, time series, parallel coords
  hooks/           derived dataset view
  store/           Zustand data, workspace, and UI stores
  test/            jsdom setup and fixtures
  viz/             registry and scatter encoding
  workspace/       version 2 serialization/validation, defaults, local storage
  types.ts         shared domain types
e2e/               Playwright critical flows and CSV fixtures
```

The registry is the single list of available views. Compatibility, default mappings, import normalization, gallery availability, panel rendering, and workspace validation all derive from it. The data layer has no React imports except the scatter-encoding memo hook, so analytics and validation are directly unit-testable.

## Performance and limits

| Limit | Value | Behavior |
| --- | --- | --- |
| Maximum file size | 25 MB | Rejected before reading. |
| Warning file size | 8 MB | Confirmation dialog before reading. |
| Maximum rows | 100,000 | Rejected with a clear message. |
| Warning rows | 20,000 | Warning in the import report. |
| 3D rendered points | 20,000 | Deterministic even-stride sample. |
| 2D rendered points | 4,000 | Deterministic even-stride sample. |
| Parallel rendered lines | 2,000 | Deterministic even-stride sample; brushing uses all records. |
| Time-series rendered points | 4,000 | Per-series sample; selected record preserved. |
| Time-series categories | 6 by default | Omitted categories are counted and disclosed. |
| Correlation columns | 12 maximum | Eight by default. |
| Correlation calculation rows | 2,000 | Deterministic even-stride sample. |
| Open views | 8 | Add-view action disabled when full. |
| Dataset preview | 25 rows | Pagination. |
| Table page | 50 rows default | Configurable within 10–500 through imported options. |

Rendering uses a single `THREE.Points` object with buffer geometry and a custom shader, not one React component per point. Hover and click picking use GPU picking against a dedicated picking scene. Sampling happens after filtering and after rows with missing mapped values are removed; the selected row is preserved. Statistics, filtering, selection sets, brushing, and export always use every filtered row.

The production bundle is dominated by Three.js, React Three Fiber, and Recharts. Vite currently reports a JavaScript chunk above 500 kB. This is documented rather than hidden by raising the warning threshold. Lazy-loading view implementations and splitting vendor chunks is the next performance step, not a claim already delivered.

## Accessibility and responsive behavior

- Semantic landmarks, labelled controls, and visible focus rings throughout.
- Upload errors use `role="alert"`; status messages use polite live regions.
- Selection is communicated by shape/marker and panel content, not color alone.
- The category palette is derived from Okabe–Ito for color-vision-deficiency differentiation.
- Reduced-motion preferences disable non-essential transitions.
- Every conventional view is usable without WebGL; the 2D scatter is a complete alternative to the 3D canvas.
- Escape clears the shared selection when focus is not inside an input or select.
- On screens below `lg`, the workspace becomes three tabs: **Visualize**, **Configure**, and **Data**.
- 3D navigation instructions appear below the plot and in the built-in guide.
- The experimental spatial workspace is explicitly labelled, explains its non-interactive previews, and has a direct route back.

## Testing

### Unit and component tests

```bash
npm test
```

Vitest runs in jsdom with React Testing Library. The suite covers:

- numeric parsing, missing-value semantics, conservative date/timestamp detection, and time filters
- column inference for every type, including mostly-numeric columns and dates
- CSV parsing, duplicate headers, padding, rejected rows, limits, and validation
- linear scaling, constant columns, and size ranges
- filters, category matching, search, and filter helpers
- summary statistics over full and filtered rows
- CSV export serialization and formula-injection protection
- visualization configuration round-trips and validation failures
- visualization registry coverage, compatibility, alternatives, defaults, and normalization
- workspace normalization, duplicate ids, open-view limit, layout repair, split clamping, and local persistence
- version 2 workspace serialization/import, version 1 upgrade, unknown views, invalid fields, and dataset-name warnings
- deterministic sampling and selected-row preservation
- category color assignment, grouping, and numeric color mapping
- scatter encoding, missing-axis handling, and structural sharing of positions
- Pearson correlation, pairwise missing values, constant pairs, diagonal counts, and sampling
- histogram bins, summaries, missing/invalid separation, constant and empty columns
- time-series timestamp handling, grouping, sampling, duplicate and invalid dates
- parallel-coordinate normalization, brushing, record matching, and full/sample semantics
- store behavior for axes, filters, time ranges, multi-selection, hidden selection, exclusions, themes, and resets
- workspace store behavior for defaults, adding/removing/moving/maximizing, layout transitions, limits, and persistence
- component behavior for upload/errors, preview, axis controls, filters, record details, and empty states

Current result: **206 tests across 26 files pass.**

### End-to-end tests

```bash
npx playwright install chromium
npm run test:e2e
```

The Playwright suite starts (or reuses) the Vite server and verifies:

1. The demo opens the linked 3D + 2D default workspace with mapped axes and an enabled export.
2. Axis mappings change in both linked views; Recharts draws a real SVG surface.
3. A time series renders one point per valid timestamp and discloses its aggregation policy.
4. A table can be added, sorted, paginated, and used to select a record across views.
5. Histogram bar clicks apply a shared range filter and do not select records.
6. Parallel-coordinate brushing matches records, publishes a multi-selection, and applies filters.
7. Search reduces the demo to 180 rows and the filtered CSV has 180 data rows plus the header.
8. A version 2 workspace saves without embedding rows and re-imports; an invalid version applies nothing.
9. A valid user CSV imports, the unavailable time-series view explains its missing date field, and import notes are reviewable.
10. Unsupported files produce a helpful error without replacing the dataset.
11. The import dialog opens and closes without discarding the dataset.
12. The experimental spatial workspace opens with its warning and returns to the standard workspace.
13. The mobile **Visualize / Configure / Data** tabs work at 390 × 844.

Current result: **14 Playwright tests pass in Chromium.**

A deliberate limitation: the browser suite does not click an arbitrary WebGL point. GPU picking depends on the renderer available in headless Chromium and would make the test flaky. Picking logic is exercised manually; the same selection path is covered by row selection and unit tests. This is an honest gap, not a claim of full canvas automation.

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

The build type-checks first, then emits static assets to `dist/`. The current build succeeds and reports a JavaScript chunk of about 1.9 MB (540 kB gzip) plus a 51 kB stylesheet. Vite warns that the JS chunk exceeds 500 kB because of Three.js, React Three Fiber, and Recharts.

## Deployment

### Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Deploy. No environment variables or server configuration are needed.
5. Optional: add a custom domain and update the meta description/URL if you fork the project.

The application uses client-side state only at the root path, so no rewrite rules are required. If routes are added later, configure a SPA fallback to `index.html`.

### Other static hosts

Any static host that serves the contents of `dist/` works (Netlify, Cloudflare Pages, GitHub Pages with a base-path adjustment). No API, database, or runtime secrets are involved.

## Privacy

- CSV parsing, filtering, analytics, visualization, and export happen in the browser tab.
- Files are never uploaded. There is no analytics, tracking script, or backend endpoint.
- Uploaded datasets are not written to `localStorage`, IndexedDB, or cookies.
- Refreshing or closing the tab discards the dataset unless it has been exported.
- Theme preference and the matching dataset's workspace arrangement/mappings are stored in `localStorage`; filters are not.
- Fonts are bundled locally, so the application does not call a font CDN.

## Known limitations

- **3D point picking in automated tests** is intentionally not covered; see [Testing](#testing).
- **Network and geospatial views are deferred.** Relationship fields are not inferred, and no fake relationship model is created.
- **No logarithmic or robust axis scaling.** Linear min–max is the only documented axis scale. Outliers expand the domain and can compress the rest of the data.
- **Fixed render caps** for 3D (20,000), 2D (4,000), parallel lines (2,000), and time-series points (4,000). The UI discloses when a sample is shown; caps are not user-adjustable.
- **No dataset persistence or multi-dataset sessions.** Refreshing discards the upload. Local workspace state is only restored for a matching dataset signature.
- **No server-side collaboration or shareable URLs.** Version 2 workspace JSON is the sharing mechanism.
- **Table local search is separate from global filters.** It narrows only that table; the shared filtered set is unchanged.
- **Table uses pagination, not virtualization.** A 100,000-row dataset remains paginated rather than fully virtualized.
- **Export re-serializes original cell values.** Numeric formatting is preserved as entered; computed statistics are not added as columns.
- **Workspace import requires the same columns** by name and compatible type for mapped roles. Structurally different datasets produce warnings and dropped views, not guessed mappings.
- **Large-file parsing is synchronous.** Files are capped at 100,000 rows / 25 MB to keep the tab responsive; a Web Worker was not justified at that limit.
- **The production bundle exceeds Vite's 500 kB warning threshold.** Lazy loading is the planned optimization.
- **Experimental spatial mode is a prototype.** Live previews are non-interactive, 3D scatter is not embedded, and interaction performance at higher view counts is not verified.
- **Browser support:** current Chrome, Edge, Firefox, and Safari. WebGL is required for 3D; conventional 2D views work without it.

## Next steps

- Lazy-load view implementations and split vendor chunks to improve first load.
- Add optional log/robust axis scaling with a clear explanation of zero and negative handling.
- Add a worker-based parser for datasets near the row limit.
- Add shareable, URL-encoded workspace configurations for datasets with stable column schemas.
- Add a Playwright GPU-picking test that runs only where a reliable WebGL renderer is available.
- Evaluate network and geospatial views only after defining explicit relationship/geometry fields.

---

Built as the UbiquitousGuide portfolio project. The product name in the interface is **DataSpace**.
