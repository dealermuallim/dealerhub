import type { IncidentId } from './types';

const RUNBOOKS: Record<IncidentId, string> = {
  'INC-001': 'docs/runbooks/INC-001.md',
  'INC-002': 'docs/runbooks/INC-002.md',
  'INC-003': 'docs/runbooks/INC-003.md',
  'INC-004': 'docs/runbooks/INC-004.md',
};

export function runbookRefFor(incidentId: string): string | null {
  return (RUNBOOKS as Record<string, string>)[incidentId] ?? null;
}
