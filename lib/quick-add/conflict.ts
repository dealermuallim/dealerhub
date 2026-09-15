import { normalizeComparable } from './normalize.ts';
import {
  type DraftField,
  type FieldValue,
  type QuickAddFieldKey,
  type QuickAddFormSnapshot,
} from './types.ts';
import type { Proposal as DetProposal } from './deterministicParse.ts';

function isEmpty(v: FieldValue | undefined): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

function baseline(
  key: QuickAddFieldKey,
  decoded: QuickAddFormSnapshot,
  current: QuickAddFormSnapshot
): FieldValue {
  const d = decoded[key];
  if (!isEmpty(d as FieldValue)) return d as FieldValue;
  const c = current[key];
  if (!isEmpty(c as FieldValue)) return c as FieldValue;
  return null;
}

export function buildDraftFields(
  proposals: DetProposal[],
  decoded: QuickAddFormSnapshot,
  current: QuickAddFormSnapshot
): DraftField[] {
  const out: DraftField[] = [];

  for (const p of proposals) {
    const dec = (decoded[p.key] ?? null) as FieldValue;
    const cur = (current[p.key] ?? null) as FieldValue;
    const base = baseline(p.key, decoded, current);
    const proposed = p.proposed;

    let state: DraftField['state'];
    if (isEmpty(base)) state = 'VOICE_ADDED';
    else if (normalizeComparable(base) === normalizeComparable(proposed)) state = 'CONFIRMED';
    else state = 'CONFLICT';

    out.push({
      key: p.key,
      decoded: dec,
      current: cur,
      proposed,
      state,
      evidence: p.evidence,
      source: 'deterministic',
    });
  }

  return out;
}