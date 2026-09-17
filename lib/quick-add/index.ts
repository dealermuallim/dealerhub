import { buildDraftFields } from './conflict';
import { deterministicExtract } from './deterministicParse';
import type { ParseQuickAddInput, VoiceDraftPatch } from './types';

export type {
  VoiceDraftPatch,
  DraftField,
  FieldState,
  ParseQuickAddInput,
  QuickAddFieldKey,
  QuickAddFormSnapshot,
} from './types';

/**
 * Deterministic Quick Add: text → VoiceDraftPatch.
 * Never persists. Never calls AI.
 */
export function parseQuickAdd(input: ParseQuickAddInput): VoiceDraftPatch {
  const vin = String(input.vin || '').trim().toUpperCase();
  const decoded = input.decoded || {};
  const current = input.current || {};

  const { proposals, unresolved } = deterministicExtract(input.text || '');
  const fields = buildDraftFields(proposals, decoded, current);

  return {
    vin,
    fields,
    unresolved,
  };
}
