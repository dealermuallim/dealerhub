const ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/**
 * Bounded English number phrase → integer.
 * Supports dealer-realistic mileage/price/stock cues (1–999999), not general math.
 */
export function parseNumberWords(phrase: string): number | null {
  const raw = phrase
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return null;

  const tokens = raw.split(' ').filter(Boolean);
  if (tokens.length === 0 || tokens.length > 12) return null;

  let total = 0;
  let current = 0;
  let saw = false;

  for (const t of tokens) {
    if (ONES[t] !== undefined) {
      current += ONES[t];
      saw = true;
      continue;
    }
    if (TENS[t] !== undefined) {
      current += TENS[t];
      saw = true;
      continue;
    }
    if (t === 'hundred') {
      if (!saw && current === 0) return null;
      current = (current || 1) * 100;
      saw = true;
      continue;
    }
    if (t === 'thousand') {
      if (!saw && current === 0) return null;
      total += (current || 1) * 1000;
      current = 0;
      saw = true;
      continue;
    }
    return null;
  }

  if (!saw) return null;
  const n = total + current;
  if (!Number.isFinite(n) || n < 0 || n > 999999) return null;
  return n;
}

export function parseDigits(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}
/** Concatenate spoken digit groups: "twelve thirty four" → "1234". */
export function parseSpokenDigitGroups(phrase: string): string | null {
  const tokens = phrase
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  if (tokens.length === 0 || tokens.length > 10) return null;

  let out = '';
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (TENS[t] !== undefined) {
      let v = TENS[t];
      if (
        i + 1 < tokens.length &&
        ONES[tokens[i + 1]] !== undefined &&
        ONES[tokens[i + 1]] < 10
      ) {
        v += ONES[tokens[i + 1]];
        i += 2;
      } else {
        i += 1;
      }
      out += String(v);
      continue;
    }
    if (ONES[t] !== undefined) {
      out += String(ONES[t]);
      i += 1;
      continue;
    }
    return null;
  }
  return out || null;
}