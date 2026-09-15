/** Lowercase, unify punctuation, collapse whitespace. */
export function normalizeQuickAddText(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function normalizeComparable(value: FieldValueLike): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return String(value)
    .toLowerCase()
    .replace(/[$,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type FieldValueLike = string | number | boolean | null | undefined;

export function titleCaseColor(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}