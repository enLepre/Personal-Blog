// Stable ordering for entries that share a publication date.
export function newestFirst(entries) {
  return [...entries].sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}
