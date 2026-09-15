export type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';
export type BlastRadius =
  | 'ONE REQUEST'
  | 'ROUTE'
  | 'TENANT'
  | 'MULTIPLE TENANTS'
  | 'PLATFORM-WIDE';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'REGRESSION';
export type FixType = 'CODE' | 'DATABASE' | 'CONFIG' | 'NETWORK' | 'DEPLOYMENT';
export type IncidentLayer =
  | 'APP'
  | 'ORACLE'
  | 'NETWORK'
  | 'CONFIG'
  | 'DEPLOY'
  | 'BUILD';

export type IncidentRecord = {
  incidentId: string;
  fingerprint: string;
  env: string;
  layer: IncidentLayer;
  severity: Severity;
  blastRadius: BlastRadius;
  symptom: string;
  rootCause: string;
  solution: string;
  fixType: FixType | null;
  status: IncidentStatus;
  occurrenceCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  resolvedAt: string | null;
  diagnosisDurationMs: number | null;
  repairDurationMs: number | null;
  totalDurationMs: number | null;
  diagnosedBy: string | null;
  recommendedBy: string | null;
  implementedBy: string | null;
  verifiedBy: string | null;
  qaResult: string | null;
  gitSha: string | null;
  gitBranch: string | null;
  filesRef: string[];
  dbObjectRef: string | null;
  configRef: string | null;
  networkRef: string | null;
  rollbackRef: string | null;
  runbookRef: string | null;
  beforeEvidenceRef: string | null;
  afterEvidenceRef: string | null;
  confidence: number | null;
  autoRepairForbidden: true;
};

export type OccurrenceRecord = {
  occurrenceId: string;
  incidentId: string;
  seenAt: string;
  env: string;
  layer: IncidentLayer;
  sanitizedSummary: string;
  hostHash: string | null;
  requestPath: string | null;
  notes: string | null;
};

export type PatchMemory = {
  fixType: FixType;
  /** CODE: commit SHA; never full source dump */
  gitSha?: string | null;
  files?: string[];
  /** DATABASE */
  dbObjectRef?: string | null;
  migrationRef?: string | null;
  /** CONFIG / NETWORK / DEPLOYMENT */
  runbookRef?: string | null;
  configRef?: string | null;
  networkRef?: string | null;
  rollbackRef?: string | null;
  /** Historical patch is NOT auto-execute authority */
  autoExecuteAuthorized: false;
};
