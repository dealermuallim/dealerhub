import { normalizeQuickAddText, titleCaseColor, collapseSpaces } from './normalize';
import { parseDigits, parseNumberWords, parseSpokenDigitGroups } from './numberWords';
import {
  ALLOWED_STATUSES,
  type FieldValue,
  type QuickAddFieldKey,
  type UnresolvedSpan,
} from './types';

export type Proposal = {
  key: QuickAddFieldKey;
  proposed: FieldValue;
  evidence: string;
};

type Work = {
  text: string;
  proposals: Proposal[];
  unresolved: UnresolvedSpan[];
};

function cut(work: Work, start: number, end: number) {
  work.text = collapseSpaces(
    (work.text.slice(0, start) + ' ' + work.text.slice(end)).replace(/\s+/g, ' ')
  );
}

function add(work: Work, key: QuickAddFieldKey, proposed: FieldValue, evidence: string) {
  // Later rules overwrite earlier for same key (more specific usually later).
  const idx = work.proposals.findIndex((p) => p.key === key);
  const row = { key, proposed, evidence };
  if (idx >= 0) work.proposals[idx] = row;
  else work.proposals.push(row);
}

const COLOR_WORDS =
  'black|white|silver|gray|grey|blue|red|green|brown|beige|tan|gold|orange|yellow|pearl\\s+white|midnight\\s+black|dark\\s+blue|light\\s+blue|dark\\s+gray|light\\s+gray';

function matchColor(raw: string): string | null {
  const m = raw.match(new RegExp(`^(?:${COLOR_WORDS})$`, 'i'));
  if (!m) return null;
  return titleCaseColor(m[0].replace(/\s+/g, ' '));
}

function extractMileage(work: Work) {
  // 78k miles / 78k
  let re = /\b(\d[\d,]*)\s*k\s*(?:miles?|mi)?\b/i;
  let m = work.text.match(re);
  if (m && m.index !== undefined) {
    const n = parseDigits(m[1]);
    if (n !== null) {
      add(work, 'mileage', n * 1000, m[0]);
      cut(work, m.index, m.index + m[0].length);
    }
  }

  // 78,000 miles
  re = /\b(\d[\d,]*)\s*(?:miles?|mi)\b/i;
  m = work.text.match(re);
  if (m && m.index !== undefined) {
    const n = parseDigits(m[1]);
    if (n !== null) {
      add(work, 'mileage', n, m[0]);
      cut(work, m.index, m.index + m[0].length);
    }
  }

  // seventy eight thousand miles
  re =
    /\b((?:fourteen|thirteen|eighteen|nineteen|seventeen|sixteen|fifteen|eleven|twelve|thousand|hundred|seventy|eighty|ninety|thirty|twenty|forty|fifty|sixty|zero|one|two|three|four|five|six|seven|eight|nine|ten|and|[\s-])+)\s+(?:miles?|mi)\b/i;
  m = work.text.match(re);
  if (m && m.index !== undefined) {
    const n = parseNumberWords(m[1]);
    if (n !== null) {
      add(work, 'mileage', n, m[0]);
      cut(work, m.index, m.index + m[0].length);
    }
  }
}

function extractStock(work: Work) {
  const re =
    /\bstock(?:\s+number)?\s+([a-z0-9]+(?:\s+(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety))+|[a-z0-9-]+)\b/i;
  const m = work.text.match(re);
  if (!m || m.index === undefined) return;

  const raw = m[1].trim();
  let stock: string | null = null;
  const parts = raw.split(/\s+/);

  if (parts.length > 1 && /^[a-z]+$/i.test(parts[0]) && parts[0].length <= 3) {
    const digits = parseSpokenDigitGroups(parts.slice(1).join(' '));
    if (digits) stock = (parts[0] + digits).toUpperCase();
  }

  if (!stock && parts.length >= 1 && /(?:zero|one|two|twelve|thirty)/i.test(raw) && !/^[a-z0-9-]+$/i.test(raw)) {
    const digits = parseSpokenDigitGroups(raw);
    if (digits) stock = digits;
  }

  if (!stock && /^[a-z0-9-]+$/i.test(raw)) {
    stock = raw.toUpperCase();
  }

  if (stock) {
    add(work, 'stockNumber', stock, m[0]);
    cut(work, m.index, m.index + m[0].length);
  } else {
    work.unresolved.push({ span: m[0], reason: 'stock cue present but value not understood' });
    cut(work, m.index, m.index + m[0].length);
  }
}

function extractPrice(work: Work) {
  // $14,995 / $14995
  let re = /\$\s*(\d[\d,]*)\b/;
  let m = work.text.match(re);
  if (m && m.index !== undefined) {
    const n = parseDigits(m[1]);
    if (n !== null) {
      add(work, 'askingPrice', n, m[0]);
      cut(work, m.index, m.index + m[0].length);
    }
  }

  // price/asking 14995 or price $14995
  re = /\b(?:price|asking)\s*\$?\s*(\d[\d,]*)\b/i;
  m = work.text.match(re);
  if (m && m.index !== undefined) {
    const n = parseDigits(m[1]);
    if (n !== null) {
      add(work, 'askingPrice', n, m[0]);
      cut(work, m.index, m.index + m[0].length);
    }
  }

  // price|asking + number words (token walk; long words first)
  const cue = work.text.match(/\b(?:price|asking)\b/i);
  if (cue && cue.index !== undefined) {
    const afterStart = cue.index + cue[0].length;
    let pos = afterStart;
    while (pos < work.text.length && /\s/.test(work.text[pos])) pos++;
    const wordRe =
      /^(fourteen|thirteen|eighteen|nineteen|seventeen|sixteen|fifteen|eleven|twelve|thousand|hundred|seventy|eighty|ninety|thirty|twenty|forty|fifty|sixty|zero|one|two|three|four|five|six|seven|eight|nine|ten|and)(?=\s|$)/i;
    const words: string[] = [];
    let cursor = work.text.slice(pos);
    while (true) {
      const wm = cursor.match(wordRe);
      if (!wm) break;
      words.push(wm[1].toLowerCase());
      cursor = cursor.slice(wm[0].length).replace(/^\s+/, '');
    }
    if (words.length > 0) {
      const phrase = words.join(' ');
      const n = parseNumberWords(phrase);
      if (n !== null) {
        const consumedLen = work.text.length - afterStart - cursor.length;
        // recompute end from original
        const end = work.text.length - cursor.length;
        const evidence = work.text.slice(cue.index, end).trim();
        add(work, 'askingPrice', n, evidence);
        cut(work, cue.index, end);
      }
    }
  }
}

function extractFeatured(work: Work) {
  let re = /\bnot\s+featured\b/i;
  let m = work.text.match(re);
  if (m && m.index !== undefined) {
    add(work, 'featured', false, m[0]);
    cut(work, m.index, m.index + m[0].length);
  }
  re = /\bfeatured\b/i;
  m = work.text.match(re);
  if (m && m.index !== undefined) {
    add(work, 'featured', true, m[0]);
    cut(work, m.index, m.index + m[0].length);
  }
}

function extractStatus(work: Work) {
  const map: Record<string, string> = {
    available: 'AVAILABLE',
    reserved: 'RESERVED',
    pending: 'PENDING',
    sold: 'SOLD',
    wholesale: 'WHOLESALE',
    hold: 'HOLD',
    archived: 'ARCHIVED',
  };

  // Negated statuses: consume as UNRESOLVED — never propose the positive status.
  for (const word of Object.keys(map)) {
    const negRe = new RegExp(`\\bnot\\s+${word}\\b`, 'i');
    const nm = work.text.match(negRe);
    if (nm && nm.index !== undefined) {
      work.unresolved.push({
        span: nm[0],
        reason: 'negated status has no safe mapped value',
      });
      cut(work, nm.index, nm.index + nm[0].length);
      return;
    }
  }

  for (const [word, status] of Object.entries(map)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    const m = work.text.match(re);
    if (m && m.index !== undefined) {
      // Guard: if immediately preceded by "not ", skip (should already be handled).
      const before = work.text.slice(Math.max(0, m.index - 4), m.index);
      if (/\bnot\s*$/i.test(before)) {
        continue;
      }
      if ((ALLOWED_STATUSES as readonly string[]).includes(status)) {
        add(work, 'vehicleStatus', status, m[0]);
        cut(work, m.index, m.index + m[0].length);
      }
      return;
    }
  }
}

function extractPublic(work: Work) {
  // Negation first — never let "don't show…" fall through to positive "show…".
  const offline =
    /\b(?:don't|dont|do\s+not)\s+(?:put|show)\s+(?:it\s+)?(?:online|on\s+the\s+website)(?:\s+yet)?\b|\bkeep\s+(?:it\s+)?offline\b/i;
  let m = work.text.match(offline);
  if (m && m.index !== undefined) {
    add(work, 'public', false, m[0]);
    cut(work, m.index, m.index + m[0].length);
  }

  const online =
    /\bshow\s+(?:it\s+)?(?:online|on\s+the\s+website)\b|\bput\s+(?:it\s+)?online\b/i;
  m = work.text.match(online);
  if (m && m.index !== undefined) {
    add(work, 'public', true, m[0]);
    cut(work, m.index, m.index + m[0].length);
  }
}

function extractColors(work: Work) {
  // black on black
  let re = new RegExp(`\\b(${COLOR_WORDS})\\s+on\\s+(${COLOR_WORDS})\\b`, 'i');
  let m = work.text.match(re);
  if (m && m.index !== undefined) {
    const ext = matchColor(m[1]);
    const int = matchColor(m[2]);
    if (ext && int) {
      add(work, 'exteriorColor', ext, m[0]);
      add(work, 'interiorColor', int, m[0]);
      cut(work, m.index, m.index + m[0].length);
    }
  }

  // pearl white with tan leather
  re = new RegExp(
    `\\b(${COLOR_WORDS})\\s+with\\s+(${COLOR_WORDS})(?:\\s+leather)?\\b`,
    'i'
  );
  m = work.text.match(re);
  if (m && m.index !== undefined) {
    const ext = matchColor(m[1]);
    const int = matchColor(m[2]);
    if (ext && int) {
      add(work, 'exteriorColor', ext, m[0]);
      add(work, 'interiorColor', int, m[0]);
      cut(work, m.index, m.index + m[0].length);
    }
  }

  // white exterior black interior
  re = new RegExp(
    `\\b(${COLOR_WORDS})\\s+exterior\\s+(${COLOR_WORDS})\\s+interior\\b`,
    'i'
  );
  m = work.text.match(re);
  if (m && m.index !== undefined) {
    const ext = matchColor(m[1]);
    const int = matchColor(m[2]);
    if (ext && int) {
      add(work, 'exteriorColor', ext, m[0]);
      add(work, 'interiorColor', int, m[0]);
      cut(work, m.index, m.index + m[0].length);
    }
  }

  re = new RegExp(`\\bexterior\\s+(${COLOR_WORDS})\\b`, 'i');
  m = work.text.match(re);
  if (m && m.index !== undefined) {
    const ext = matchColor(m[1]);
    if (ext) {
      add(work, 'exteriorColor', ext, m[0]);
      cut(work, m.index, m.index + m[0].length);
    }
  }

  re = new RegExp(`\\binterior\\s+(${COLOR_WORDS})\\b`, 'i');
  m = work.text.match(re);
  if (m && m.index !== undefined) {
    const int = matchColor(m[1]);
    if (int) {
      add(work, 'interiorColor', int, m[0]);
      cut(work, m.index, m.index + m[0].length);
    }
  }
}

function extractCorrections(work: Work) {
  // white actually, not black
  let re = new RegExp(
    `\\b(${COLOR_WORDS})\\s+actually,?\\s+not\\s+(${COLOR_WORDS})\\b`,
    'i'
  );
  let m = work.text.match(re);
  if (m && m.index !== undefined) {
    const neu = matchColor(m[1]);
    if (neu) {
      add(work, 'exteriorColor', neu, m[0]);
      cut(work, m.index, m.index + m[0].length);
    }
    return;
  }

  // EX-L not EX  (trim-like tokens: letters/digits/dashes, not colors-only handled above)
  re = /\b([a-z0-9][a-z0-9-]{0,20})\s+not\s+([a-z0-9][a-z0-9-]{0,20})\b/i;
  m = work.text.match(re);
  if (m && m.index !== undefined) {
    const neu = m[1];
    const old = m[2];
    // skip if either side is a status/featured word
    const skip = /^(featured|available|pending|reserved|sold|hold|archived|wholesale|miles?|mi|stock|price|asking|online|website)$/i;
    if (skip.test(neu) || skip.test(old)) return;

    const neuColor = matchColor(neu.replace(/-/g, ' '));
    const oldColor = matchColor(old.replace(/-/g, ' '));
    if (neuColor && oldColor) {
      add(work, 'exteriorColor', neuColor, m[0]);
      cut(work, m.index, m.index + m[0].length);
      return;
    }

    // treat as trim correction when both look like trim tokens
    if (/^[a-z0-9][a-z0-9-]*$/i.test(neu) && /^[a-z0-9][a-z0-9-]*$/i.test(old)) {
      add(work, 'trim', neu.toUpperCase(), m[0]);
      cut(work, m.index, m.index + m[0].length);
      return;
    }

    work.unresolved.push({
      span: m[0],
      reason: 'correction present but target field unclear',
    });
    cut(work, m.index, m.index + m[0].length);
  }
}

function collectBareNumbers(work: Work) {
  const re = /\b\d[\d,]*\b/g;
  let m: RegExpExecArray | null;
  const spans: { start: number; end: number; text: string }[] = [];
  while ((m = re.exec(work.text)) !== null) {
    spans.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  // remove from end so indexes stay valid
  for (let i = spans.length - 1; i >= 0; i--) {
    const s = spans[i];
    work.unresolved.push({
      span: s.text,
      reason: 'bare number without mileage/price/stock cue',
    });
    cut(work, s.start, s.end);
  }
}

function collectResidue(work: Work) {
  const leftovers = work.text
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^(and|with|the|a|an|it|yet|on|to)$/i.test(s));

  for (const span of leftovers) {
    if (span.length < 2) continue;
    work.unresolved.push({ span, reason: 'unrecognized phrase' });
  }
  work.text = '';
}

export function deterministicExtract(text: string): {
  proposals: Proposal[];
  unresolved: UnresolvedSpan[];
} {
  const work: Work = {
    text: normalizeQuickAddText(text),
    proposals: [],
    unresolved: [],
  };

  if (!work.text) return { proposals: [], unresolved: [] };

  // Order matters: multi-word phrases before single tokens; stock/price before bare numbers.
  extractPublic(work);
  extractFeatured(work);
  extractMileage(work);
  extractStock(work);
  extractPrice(work);
  extractColors(work);
  extractCorrections(work);
  extractStatus(work);
  collectBareNumbers(work);
  collectResidue(work);

  return { proposals: work.proposals, unresolved: work.unresolved };
}