/**
 * Deterministic form snapshots used by the admin unsaved-changes guard.
 * Key order and `undefined` fields must never make an untouched form dirty.
 */

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) result[key] = normalize(source[key])
    }
    return result
  }
  return value
}

export function stableSnapshot(value: unknown): string {
  return JSON.stringify(normalize(value))
}

export function hasUnsavedChanges(current: unknown, initial: unknown): boolean {
  return stableSnapshot(current) !== stableSnapshot(initial)
}
