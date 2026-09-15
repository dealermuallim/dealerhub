import { NextResponse } from 'next/server';

import { requirePlatformAdminSession } from '@/lib/admin-auth';
import { diagnose } from '@/lib/incidents';
import { runHealthChecks } from '@/lib/incidents/health';
import { runPostDeploySmoke } from '@/lib/incidents/smoke';
import { recordIncidentOccurrence } from '@/lib/incidents/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * READ-ONLY diagnostics refresh.
 * No AUTO FIX / REPAIR / RESTART / ACL / TENANT / DEPLOY actions.
 */
export async function POST(request: Request) {
  const session = await requirePlatformAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { sampleError?: string } = {};
  try {
    body = (await request.json()) as { sampleError?: string };
  } catch {
    body = {};
  }

  const health = await runHealthChecks();
  const smoke = await runPostDeploySmoke();

  let sampleDiagnosis = null;
  if (body.sampleError && String(body.sampleError).trim()) {
    const errText = String(body.sampleError).slice(0, 500);
    const report = diagnose(errText);
    const recorded = recordIncidentOccurrence({
      error: errText,
      requestPath: '/admin/system-health/diagnostics',
      notes: 'operator-triggered read-only diagnose',
    });
    sampleDiagnosis = {
      report: {
        incidentId: report.incidentId,
        title: report.title,
        rootCause: report.rootCause,
        provenSolution: report.provenSolution,
        verification: report.verification,
        confidence:
          report.incidentId === 'UNKNOWN' ? 0.2 : 0.9,
        autoRepairForbidden: true as const,
        runbookHint: report.incidentId,
      },
      occurrenceCount: recorded.incident.occurrenceCount,
    };
  }

  return NextResponse.json({
    ok: true,
    mode: 'READ_ONLY',
    autoRepair: 'FORBIDDEN',
    health,
    smoke,
    sampleDiagnosis,
  });
}
