# Build UbiquitousGuide — Interactive 3D Data Exploration Platform

## Role

Act as a senior frontend engineer, data visualization engineer, Three.js specialist, and product designer.

Build UbiquitousGuide, a polished, fully functional web application for exploring multidimensional datasets using interactive 3D visualizations and comparing them with conventional 2D visualizations.

This is a portfolio-quality software engineering project, not a static dashboard mockup.

The application should demonstrate React and TypeScript proficiency, interactive 3D graphics, data transformation, accessible visualization design, thoughtful UX, and software testing.

Inspect the existing repository and available skills before making changes. Preserve existing work and conventions. If the repository is empty, initialize the project.

Implement the application in coherent phases, verify functionality, and document limitations. Do not stop after creating a plan.

## 1. Product vision

Users should be able to upload a CSV file, inspect its structure, select numerical variables, and explore relationships between dimensions in an interactive 3D scatter plot.

Users must be able to:

- Map numeric variables to the X, Y, and Z axes.
- Color points by a numerical or categorical variable.
- Size points by a supported numerical variable.
- Filter records interactively.
- Select points to inspect individual records.
- Compare a 3D visualization with a linked 2D visualization.
- View summary statistics and the current filtered record count.
- Export filtered data and save visualization settings.

Design the experience around the question:

"Does viewing this dataset in three dimensions help me discover relationships that are harder to see in two dimensions?"

Do not claim that 3D is inherently superior. Make the comparison useful and allow users to choose the representation that best supports their task.

## 2. Technology stack

Use:

- React
- TypeScript with strict mode
- Vite
- Tailwind CSS
- shadcn/ui
- React Three Fiber
- Three.js
- Drei for appropriate 3D controls and helpers
- Recharts for 2D visualizations
- Papa Parse for CSV ingestion
- Zustand or a comparably lightweight state solution
- Vitest for unit tests
- React Testing Library for component tests
- Playwright for critical browser flows where available
- Lucide React for icons

Use maintained, compatible package versions. Follow the repository's existing package manager and lockfile.

Avoid unnecessary dependencies and keep 3D rendering, data processing, and interface components separated.

## 3. Application layout and design

Create a professional data exploration workspace.

### Main application shell

Include:

- A compact application sidebar or navigation rail.
- DataSpace branding.
- Current dataset name and row count.
- A primary visualization workspace.
- A contextual configuration panel.
- A dataset preview and summary area.
- Clear actions for importing, resetting, and exporting data.

The visualization workspace should have enough room for the 3D canvas without hiding essential controls.

### Visual direction

Use a refined, technical, editorial aesthetic:

- Neutral surfaces and restrained accent colors.
- Clear typographic hierarchy.
- Carefully spaced panels.
- Subtle borders and shadows.
- Consistent design tokens.
- Accessible contrast.
- Clean charts and unobtrusive controls.
- Responsive behavior for desktop, tablet, and mobile.

Use motion sparingly for meaningful interactions, such as selection feedback and panel transitions. Respect reduced-motion preferences.

Avoid excessive gradients, glassmorphism, distracting animations, and generic SaaS landing-page patterns inside the actual data workspace.

Support dark and light themes if they can be implemented consistently.

### Required interface states

Design functional:

- Initial empty state.
- CSV upload state.
- Parsing and validation state.
- Successful dataset import state.
- Invalid-file and parsing-error states.
- Empty-filter-results state.
- Visualization loading state where necessary.
- Large-dataset performance warnings.
- Mobile and narrow-screen layouts.

Use realistic sample data only for the clearly labeled demo dataset. Do not fabricate production statistics.

## 4. CSV import and data processing

Implement a working CSV import workflow.

Requirements:

- Support CSV file selection and drag-and-drop.
- Validate the file before processing.
- Detect column names and infer reasonable column types.
- Identify numeric, categorical, date-like, and empty columns where practical.
- Handle quoted fields, commas inside values, and newline conventions using a CSV parser.
- Report malformed rows and invalid numeric values clearly.
- Handle missing values without silently converting them into misleading zero values.
- Display row count, column count, and a data preview.
- Provide a way to inspect column types.
- Allow users to exclude unsuitable columns from visualization.

Do not assume every dataset has an ID column or that every row is valid.

Use stable row identifiers internally so selection and filtering remain consistent.

Prevent formula injection when exporting CSV values that spreadsheet applications may interpret as formulas.

### Data-processing architecture

Create reusable, independently tested utilities for:

- CSV parsing and normalization.
- Column-type inference.
- Numeric conversion.
- Missing-value handling.
- Numeric extent calculation.
- Data filtering.
- Axis normalization.
- Summary statistics.
- Exporting filtered rows.

Preserve original row values where practical. Keep normalized visualization coordinates separate from the original dataset.

Do not mutate the source dataset when filters or axis selections change.

Use stable data references and efficient selectors to avoid reparsing the CSV on every UI update.

## 5. Interactive 3D scatter plot

Build the primary visualization using React Three Fiber and Three.js.

### Axis mapping

Provide controls to map numeric columns to:

- X axis.
- Y axis.
- Z axis.

Recompute positions whenever the mapping changes.

Normalize numerical values into an appropriate spatial range while retaining the original values for tooltips and selection details.

Handle constant columns, missing values, negative numbers, and widely varying magnitudes correctly.

Provide a documented linear scaling strategy. Add alternative scaling only where it can be implemented correctly and explained to users.

### Point appearance

Support:

- Point colors by category.
- A continuous color scale for numeric variables.
- Optional point size mapping to a numeric variable.
- A neutral default appearance.
- A useful legend.
- Adjustable point size and opacity when appropriate.

Use color palettes that remain reasonably distinguishable for color-vision deficiencies. Do not rely on color alone to communicate selection or status.

### Interaction

Implement:

- Orbit controls for rotating the scene.
- Zoom and pan.
- Point selection.
- Hover feedback.
- Tooltips showing meaningful record information.
- A selected-record details panel.
- A way to clear the selection.
- Camera reset.
- A reset-to-default-view action.
- A helpful initial camera angle and appropriate scene bounds.

Make point picking reliable and avoid unnecessary full-scene rebuilds.

Ensure axis labels, legends, and instructions explain how to navigate the visualization.

Do not render a decorative 3D scene that merely resembles a scatter plot. Every point must correspond to a real row in the imported dataset.

## 6. Filtering and linked state

Implement functional filters that update the displayed data consistently.

Support:

- Numeric range filters.
- Categorical-value filters.
- Search across appropriate text fields.
- Clear-all-filters.
- Visible count versus total row count.
- Clear indication when filters are active.

Use a single coherent source of truth for dataset state, visualization settings, filters, and selection.

Ensure the following stay synchronized:

- 3D points.
- 2D visualization.
- Dataset preview.
- Selected-record panel.
- Filtered row count.
- Summary statistics.
- Exported dataset.

If a selected row is excluded by a filter, handle the selection state predictably and visibly.

Avoid unnecessary rerenders by deriving filtered data and visualization settings efficiently.

## 7. Linked 2D comparison

Implement a 2D scatter plot as a genuine comparison view.

Requirements:

- Select X and Y variables independently of the 3D Z axis.
- Reuse the same dataset, filters, and category-color mapping.
- Highlight the same selected row in both views.
- Display corresponding tooltips and record information.
- Allow the user to switch between 3D, 2D, and side-by-side comparison layouts.
- Provide a clear way to reset axis mappings.

Do not merely place an unrelated Recharts chart beside the 3D canvas.

Ensure axes, units, missing values, and color legends are interpreted consistently across both views.

Make the 2D view fully usable on its own.

## 8. Dataset preview and statistics

Create a dataset inspection panel with:

- Paginated or virtualized row preview where appropriate.
- Column names and inferred types.
- Total and filtered row counts.
- Missing-value counts.
- Minimum and maximum for numeric columns.
- Mean and median for numeric columns where meaningful.
- Category counts for categorical columns where practical.

Clearly distinguish statistics for the full dataset from statistics for the filtered subset.

Do not compute expensive summaries repeatedly during rendering.

Do not display NaN, Infinity, or misleading numeric results for invalid or empty data.

For large datasets, use sensible limits and document any sampling or approximation.

## 9. Sample dataset and onboarding

Include a built-in demo dataset with realistic, clearly identified sample data.

The sample dataset should contain:

- Multiple numerical dimensions.
- At least one categorical dimension.
- Enough records to demonstrate filtering and interaction.
- A meaningful but non-sensitive example domain.

Provide a "Load demo dataset" action and a short onboarding hint.

The demo must exercise the same data pipeline used by uploaded files.

Do not present sample metrics as if they came from a user's uploaded data.

## 10. Export and visualization settings

Implement:

- Export filtered rows as CSV.
- Reset filters.
- Reset the camera.
- Reset visualization settings.
- Save the current visualization configuration as downloadable JSON.
- Import a previously exported visualization configuration if feasible.

A saved configuration should capture relevant axis mappings, color and size variables, filters, and display settings.

Validate imported configuration files before applying them.

Do not store uploaded datasets or personal data on a server. The MVP should process data locally in the browser.

If persistence is added, keep it optional and clearly explain where the data is stored.

## 11. Performance and large datasets

Establish an explicit practical dataset limit based on testing rather than claiming unlimited scalability.

Requirements:

- Avoid unnecessary React state updates.
- Memoize derived data where appropriate.
- Avoid recreating the Three.js scene for unrelated UI changes.
- Use an appropriate point-rendering approach for larger datasets.
- Consider instanced rendering or efficient buffer geometry if the standard approach becomes too slow.
- Keep hover and selection interactions responsive.
- Display a warning before processing unusually large files.
- Provide a sensible strategy for sampling or reducing rendered points when needed.

If sampling is used, distinguish the rendered sample size from the total filtered record count. Preserve correct semantics for filtering, selection, statistics, and CSV export.

Do not introduce complex Web Workers or advanced rendering abstractions without a demonstrated need. If a worker materially improves parsing or transformation performance, implement it cleanly and test it.

## 12. Accessibility and responsive design

Ensure:

- Keyboard-accessible controls.
- Visible focus states.
- Accessible names and labels.
- Useful screen-reader descriptions for important controls.
- Adequate contrast.
- Reduced-motion support.
- Clear instructions for 3D navigation.
- A usable 2D alternative for users who cannot comfortably interact with the 3D scene.

Do not make essential dataset information available only through hovering over a 3D point.

On smaller screens, adapt the workspace into usable panels or tabs instead of squeezing a desktop layout into a narrow viewport.

## 13. Testing

Write meaningful tests.

### Unit tests

Test:

- CSV normalization.
- Column-type inference.
- Missing-value handling.
- Numeric scaling.
- Constant-column handling.
- Filters and category selections.
- Summary statistics.
- Export serialization and CSV formula-injection protection.
- Visualization configuration validation.
- Selection behavior after filtering.

### Component tests

Test:

- CSV upload and errors.
- Dataset preview.
- Axis-selection controls.
- Filter controls.
- Selected-record details.
- 2D visualization rendering.
- Empty states.

### End-to-end tests

Where browser tooling is available, verify:

1. Open the application.
2. Load the demo dataset.
3. Change X, Y, and Z mappings.
4. Apply a filter.
5. Select a data point.
6. Verify the selected record details.
7. Switch to the 2D view.
8. Export the filtered dataset.

Use deterministic test data. Do not rely on external APIs or arbitrary third-party datasets for test correctness.

If WebGL or browser graphics limitations prevent a test from running in the current environment, report the limitation accurately and test the underlying data logic separately.

## 14. Project structure and documentation

Use a maintainable structure that separates:

- Application shell and routes.
- Reusable UI components.
- Dataset ingestion and processing.
- Visualization components.
- State management.
- Filters and derived statistics.
- Export utilities.
- Shared types and schemas.
- Tests.

Avoid giant components and excessive abstractions.

Document:

- Installation and development.
- Available scripts.
- Dataset import behavior.
- Data processing and missing-value handling.
- Axis normalization.
- Rendering and performance limitations.
- Testing.
- Production build.
- Deployment to Vercel.
- Privacy characteristics and browser-side data processing.
- Known limitations.

Include `.env.example` only if environment variables are actually needed. Do not introduce a backend solely to support features that can be implemented safely in the browser.

## 15. Implementation workflow

Phase 1: Inspect the repository, available skills, and current implementation.

Phase 2: Establish the application shell, design tokens, demo dataset, types, and data-processing utilities.

Phase 3: Implement CSV ingestion, validation, preview, and summary statistics.

Phase 4: Build the 3D scatter plot, axis mappings, camera controls, tooltips, and selection.

Phase 5: Implement filtering, category colors, and synchronized state.

Phase 6: Build the linked 2D visualization and comparison layouts.

Phase 7: Add export, saved visualization settings, responsive layouts, and accessibility improvements.

Phase 8: Add tests, run type checks and production builds, and fix discovered issues.

Phase 9: Document the architecture, deployment, and remaining limitations.

After each phase, verify the core functionality before proceeding. Do not stop at an attractive mockup.

## 16. Definition of done

The application is ready for review when:

- The demo dataset loads and can be explored.
- A valid CSV can be uploaded and previewed.
- Invalid input produces helpful errors.
- Users can map three numeric variables to 3D axes.
- Every rendered point corresponds to a dataset row.
- Users can select points and inspect the original record.
- Numeric and categorical filters work.
- Filtering updates the 3D view, 2D view, preview, and statistics consistently.
- The linked 2D comparison is functional.
- Filtered rows can be exported correctly.
- Visualization settings can be exported and validated on import.
- Essential controls are keyboard-accessible.
- Tests, TypeScript checks, and production builds are run and their outcomes documented.
- The README explains how to run, test, and deploy the application.

Begin by inspecting the repository and then implement DataSpace in these phases. Report completed functionality, test results, known limitations, and the next steps for deployment.
