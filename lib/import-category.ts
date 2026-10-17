export const MAX_COLUMN_NAME_LENGTH = 6

export type ImportCategoryResolution =
  | { ok: true; name: string | null }
  | { ok: false; code: "category_too_long"; category: string; maxLength: number }

/**
 * Resolves the `category` metadata of an imported Markdown file into a column
 * name. Overlong names are rejected instead of being silently truncated, so
 * distinct long categories can never collapse into the same column by accident.
 * The length check matches app/api/columns/route.ts (UTF-16 code units).
 */
export function resolveImportCategory(raw: string | undefined | null): ImportCategoryResolution {
  const name = (raw ?? "").trim()
  if (!name) return { ok: true, name: null }
  if (name.length > MAX_COLUMN_NAME_LENGTH) {
    return {
      ok: false,
      code: "category_too_long",
      category: name,
      maxLength: MAX_COLUMN_NAME_LENGTH,
    }
  }
  return { ok: true, name }
}
