/** Normalize menu item IDs from DB / model output to canonical string form. */
export function normalizeMenuItemId(
  id: string | number | null | undefined
): string | null {
  if (id == null) return null;
  const normalized = String(id).trim();
  return normalized.length > 0 ? normalized : null;
}
