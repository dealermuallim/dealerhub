export { INCIDENT_CATALOG, PUBLIC_UNAVAILABLE_MESSAGE } from './catalog';
export { sanitizeErrorText } from './sanitize';
export {
  diagnose,
  isKnownIncident,
  isUnresolvedPublicHostError,
} from './diagnose';
export { fingerprintError, hashHost } from './fingerprint';
export {
  recordIncidentOccurrence,
  listIncidents,
  getIncident,
  listOccurrences,
  attachEvidence,
  resetIncidentStoreForTests,
} from './store';
export { runHealthChecks } from './health';
export { runPostDeploySmoke } from './smoke';
export { getDeployInfo } from './deploy-info';
export { runbookRefFor } from './runbooks';
export { buildPatchMemory, knownIncidentPatchDefaults } from './patch-memory';
export type { DiagnosticReport, IncidentId, KnownIncident } from './types';
export type {
  IncidentRecord,
  OccurrenceRecord,
  PatchMemory,
  Severity,
  BlastRadius,
  FixType,
} from './model';
