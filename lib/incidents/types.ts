export type IncidentId =
  | 'INC-001'
  | 'INC-002'
  | 'INC-003'
  | 'INC-004'
  | 'INC-005'
  | 'INC-006'
  | 'INC-007'
  | 'INC-008'
  | 'INC-009';

export type KnownIncident = {
  id: IncidentId;
  /** Stable match tokens (error codes / distinctive phrases). */
  matchers: string[];
  title: string;
  rootCause: string;
  provenSolution: string;
  verification: string;
  /** Safe for public UI. Empty means use the shared unavailable copy. */
  publicSafeMessage: string | null;
};

export type DiagnosticReport = {
  incidentId: IncidentId | 'UNKNOWN';
  title: string;
  rootCause: string;
  provenSolution: string;
  verification: string;
  /** Never put secrets or tenant names here for public use. */
  publicSafeMessage: string;
  /** Sanitized one-line summary for operators / logs. */
  sanitizedSummary: string;
  matchedOn: string | null;
  /** Always true — diagnosis must not trigger autonomous repair. */
  autoRepairForbidden: true;
};
