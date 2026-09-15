import { createHash, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

import { diagnose } from './diagnose';
import { fingerprintError, hashHost } from './fingerprint';
import type {
  BlastRadius,
  IncidentLayer,
  IncidentRecord,
  OccurrenceRecord,
  Severity,
} from './model';
import { knownIncidentPatchDefaults } from './patch-memory';
import { runbookRefFor } from './runbooks';
import { sanitizeErrorText } from './sanitize';
import type { IncidentId } from './types';

type StoreFile = {
  incidents: IncidentRecord[];
  occurrences: OccurrenceRecord[];
};

function defaultEnv(): string {
  return process.env.DEALERHUB_ENV || process.env.NODE_ENV || 'development';
}

function dataPath(): string {
  return (
    process.env.DEALERHUB_INCIDENT_STORE ||
    path.join(process.cwd(), '.data', 'incidents-store.json')
  );
}

function emptyStore(): StoreFile {
  return { incidents: [], occurrences: [] };
}

function readStore(): StoreFile {
  try {
    const p = dataPath();
    if (!fs.existsSync(p)) return emptyStore();
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as StoreFile;
    return {
      incidents: Array.isArray(raw.incidents) ? raw.incidents : [],
      occurrences: Array.isArray(raw.occurrences) ? raw.occurrences : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: StoreFile): void {
  const p = dataPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(store, null, 2), 'utf8');
}

function layerFor(incidentId: string): IncidentLayer {
  if (incidentId === 'INC-004') return 'BUILD';
  if (incidentId === 'INC-001' || incidentId === 'INC-002' || incidentId === 'INC-003')
    return 'ORACLE';
  return 'APP';
}

function severityFor(incidentId: string): Severity {
  if (incidentId === 'INC-001') return 'SEV-1';
  if (incidentId === 'INC-002' || incidentId === 'INC-003') return 'SEV-2';
  if (incidentId === 'INC-004') return 'SEV-3';
  return 'SEV-4';
}

function blastFor(incidentId: string): BlastRadius {
  if (incidentId === 'INC-001') return 'PLATFORM-WIDE';
  if (incidentId === 'INC-002') return 'TENANT';
  if (incidentId === 'INC-003') return 'ROUTE';
  return 'ONE REQUEST';
}

/**
 * Local persistent store (file JSON) mirroring DH_INCIDENTS model.
 * Oracle DDL ships as migration files only — this store does NOT apply SQL.
 * Dedup by fingerprint: bumps OCCURRENCE_COUNT / LAST_SEEN.
 */
export function recordIncidentOccurrence(input: {
  error: unknown;
  requestPath?: string | null;
  host?: string | null;
  env?: string;
  notes?: string | null;
  now?: Date;
}): { incident: IncidentRecord; occurrence: OccurrenceRecord; isNew: boolean } {
  const now = (input.now ?? new Date()).toISOString();
  const report = diagnose(input.error);
  const fingerprint =
    report.incidentId !== 'UNKNOWN'
      ? report.incidentId === 'INC-001'
        ? 'NJS-040'
        : report.incidentId === 'INC-002'
          ? 'ORA-20004'
          : report.incidentId === 'INC-003'
            ? 'ORA-20501'
            : report.incidentId === 'INC-004'
              ? 'NPM-ERESOLVE'
              : fingerprintError(input.error)
      : fingerprintError(input.error);

  const store = readStore();
  let incident = store.incidents.find((i) => i.fingerprint === fingerprint);
  let isNew = false;

  if (!incident) {
    isNew = true;
    const id =
      report.incidentId !== 'UNKNOWN'
        ? report.incidentId
        : `INC-UNK-${fingerprint.slice(0, 8)}`;
    const patch = knownIncidentPatchDefaults(id);
    incident = {
      incidentId: id,
      fingerprint,
      env: input.env || defaultEnv(),
      layer: layerFor(id),
      severity: severityFor(id),
      blastRadius: blastFor(id),
      symptom: report.sanitizedSummary,
      rootCause: report.rootCause,
      solution: report.provenSolution,
      fixType: patch?.fixType ?? null,
      status: 'OPEN',
      occurrenceCount: 0,
      firstSeenAt: now,
      lastSeenAt: now,
      resolvedAt: null,
      diagnosisDurationMs: null,
      repairDurationMs: null,
      totalDurationMs: null,
      diagnosedBy: 'diagnostics-engine',
      recommendedBy: 'diagnostics-engine',
      implementedBy: null,
      verifiedBy: null,
      qaResult: null,
      gitSha: patch?.gitSha ?? null,
      gitBranch: null,
      filesRef: patch?.files ?? [],
      dbObjectRef: patch?.dbObjectRef ?? null,
      configRef: patch?.configRef ?? null,
      networkRef: patch?.networkRef ?? null,
      rollbackRef: patch?.rollbackRef ?? null,
      runbookRef: runbookRefFor(id as IncidentId) ?? patch?.runbookRef ?? null,
      beforeEvidenceRef: null,
      afterEvidenceRef: null,
      confidence: report.incidentId === 'UNKNOWN' ? 0.2 : 0.9,
      autoRepairForbidden: true,
    };
    store.incidents.push(incident);
  }

  incident.occurrenceCount += 1;
  incident.lastSeenAt = now;
  if (!incident.firstSeenAt) incident.firstSeenAt = now;
  if (incident.status === 'RESOLVED') incident.status = 'REGRESSION';

  const occurrence: OccurrenceRecord = {
    occurrenceId: randomUUID(),
    incidentId: incident.incidentId,
    seenAt: now,
    env: input.env || defaultEnv(),
    layer: incident.layer,
    sanitizedSummary: sanitizeErrorText(input.error),
    hostHash: hashHost(input.host),
    requestPath: input.requestPath ?? null,
    notes: input.notes ?? null,
  };
  store.occurrences.push(occurrence);
  writeStore(store);
  return { incident, occurrence, isNew };
}

export function listIncidents(limit = 25): IncidentRecord[] {
  const store = readStore();
  return [...store.incidents]
    .sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)))
    .slice(0, limit);
}

export function getIncident(id: string): IncidentRecord | null {
  return readStore().incidents.find((i) => i.incidentId === id) ?? null;
}

export function listOccurrences(incidentId: string, limit = 20): OccurrenceRecord[] {
  return readStore()
    .occurrences.filter((o) => o.incidentId === incidentId)
    .sort((a, b) => b.seenAt.localeCompare(a.seenAt))
    .slice(0, limit);
}

export function attachEvidence(input: {
  incidentId: string;
  beforeRef?: string | null;
  afterRef?: string | null;
  diagnosisDurationMs?: number | null;
  repairDurationMs?: number | null;
  gitSha?: string | null;
  gitBranch?: string | null;
  files?: string[];
  implementedBy?: string | null;
  /** Do not set verifiedBy/qaResult to Chief QA until QA actually passes. */
  status?: IncidentRecord['status'];
}): IncidentRecord | null {
  const store = readStore();
  const incident = store.incidents.find((i) => i.incidentId === input.incidentId);
  if (!incident) return null;
  if (input.beforeRef) incident.beforeEvidenceRef = input.beforeRef;
  if (input.afterRef) incident.afterEvidenceRef = input.afterRef;
  if (input.diagnosisDurationMs != null)
    incident.diagnosisDurationMs = input.diagnosisDurationMs;
  if (input.repairDurationMs != null) incident.repairDurationMs = input.repairDurationMs;
  if (
    incident.diagnosisDurationMs != null &&
    incident.repairDurationMs != null
  ) {
    incident.totalDurationMs =
      incident.diagnosisDurationMs + incident.repairDurationMs;
  }
  if (input.gitSha) incident.gitSha = input.gitSha;
  if (input.gitBranch) incident.gitBranch = input.gitBranch;
  if (input.files) incident.filesRef = input.files.slice(0, 50);
  if (input.implementedBy) incident.implementedBy = input.implementedBy;
  if (input.status) incident.status = input.status;
  incident.autoRepairForbidden = true;
  writeStore(store);
  return incident;
}

export function resetIncidentStoreForTests(): void {
  writeStore(emptyStore());
}

export function storeFingerprintKey(error: unknown): string {
  return fingerprintError(error);
}

export function stableUnknownId(fingerprint: string): string {
  return `INC-UNK-${createHash('sha256').update(fingerprint).digest('hex').slice(0, 8)}`;
}
