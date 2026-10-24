/** Explicit, tested processing limits. Documented in the README. */

/** Hard refusal above this row count. */
export const MAX_ROWS = 100_000;

/** Soft warning above this row count. */
export const WARN_ROWS = 20_000;

/** Hard refusal above this file size. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Soft warning above this file size. */
export const WARN_FILE_BYTES = 8 * 1024 * 1024;

/** Maximum number of points drawn in one canvas (sampled deterministically). */
export const RENDER_CAP = 20_000;

/** Row page size in the dataset preview. */
export const PREVIEW_PAGE_SIZE = 25;

/** Maximum categorical legend entries before values are grouped into "Other". */
export const MAX_LEGEND_CATEGORIES = 11;
