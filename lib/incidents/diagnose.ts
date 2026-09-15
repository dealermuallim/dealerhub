import { INCIDENT_CATALOG, PUBLIC_UNAVAILABLE_MESSAGE } from './catalog';
import { sanitizeErrorText } from './sanitize';
import type { DiagnosticReport, IncidentId } from './types';

function normalize(text: string): string {
  return text.toUpperCase();
}

function extractErrorText(error: unknown): string {
  if (error instanceof Error) {
    const anyErr = error as Error & { errorNum?: number; code?: string };
    const parts = [error.message];
    if (anyErr.code) parts.push(String(anyErr.code));
    if (anyErr.errorNum != null) parts.push(`ORA-${anyErr.errorNum}`);
    return parts.join(' ');
  }
  return String(error ?? '');
}

/**
 * ERROR → SANITIZE → NORMALIZE → MATCH → ROOT CAUSE → SOLUTION → VERIFICATION
 * Automates diagnosis only — never production repair.
 */
export function diagnose(error: unknown): DiagnosticReport {
  const sanitizedSummary = sanitizeErrorText(extractErrorText(error));
  const haystack = normalize(sanitizedSummary);

  for (const incident of INCIDENT_CATALOG) {
    for (const token of incident.matchers) {
      if (haystack.includes(normalize(token))) {
        return {
          incidentId: incident.id,
          title: incident.title,
          rootCause: incident.rootCause,
          provenSolution: incident.provenSolution,
          verification: incident.verification,
          publicSafeMessage:
            incident.publicSafeMessage ?? PUBLIC_UNAVAILABLE_MESSAGE,
          sanitizedSummary,
          matchedOn: token,
          autoRepairForbidden: true,
        };
      }
    }
  }

  return {
    incidentId: 'UNKNOWN',
    title: 'Unrecognized error',
    rootCause:
      'No seeded incident matched after sanitize/normalize. Treat as unexpected until classified.',
    provenSolution:
      'Capture sanitized logs, reproduce, and add a new INC seed if this becomes a known class. Do not auto-repair production.',
    verification: 'Confirm the failure mode is understood before applying any manual fix.',
    publicSafeMessage: PUBLIC_UNAVAILABLE_MESSAGE,
    sanitizedSummary,
    matchedOn: null,
    autoRepairForbidden: true,
  };
}

export function isKnownIncident(
  error: unknown,
  id: IncidentId
): boolean {
  return diagnose(error).incidentId === id;
}

/** Expected public-host config miss — fail closed to unavailable page. */
export function isUnresolvedPublicHostError(error: unknown): boolean {
  return diagnose(error).incidentId === 'INC-002';
}
