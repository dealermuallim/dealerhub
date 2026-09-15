import type { IncidentId } from './types';

const RUNBOOKS: Partial<Record<IncidentId, string>> = {
  'INC-001': 'docs/runbooks/INC-001.md',
  'INC-002': 'docs/runbooks/INC-002.md',
  'INC-003': 'docs/runbooks/INC-003.md',
  'INC-004': 'docs/runbooks/INC-004.md',
  'INC-005': 'docs/runbooks/INC-005.md',
  'INC-006': 'docs/runbooks/INC-006.md',
  'INC-007': 'docs/runbooks/INC-007.md',
  'INC-008': 'docs/runbooks/INC-008.md',
  'INC-009': 'docs/runbooks/INC-009.md',
};

export function runbookRefFor(incidentId: string): string | null {
  return RUNBOOKS[incidentId as IncidentId] ?? null;
}
