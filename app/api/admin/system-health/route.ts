import { NextResponse } from 'next/server';

import { requirePlatformAdminSession } from '@/lib/admin-auth';
import { getDeployInfo } from '@/lib/incidents/deploy-info';
import { runHealthChecks } from '@/lib/incidents/health';
import { getIncident, listIncidents, listOccurrences } from '@/lib/incidents/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Platform admin only — read-only system health + recent incidents. */
export async function GET(request: Request) {
  const session = await requirePlatformAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const detailId = url.searchParams.get('incidentId');

  if (detailId) {
    const incident = getIncident(detailId);
    if (!incident) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      incident: {
        ...incident,
        autoRepairForbidden: true,
        operatorNote: 'AUTO REPAIR FORBIDDEN — diagnosis/recommendation only',
      },
      occurrences: listOccurrences(detailId, 20),
      deploy: getDeployInfo(),
    });
  }

  const health = await runHealthChecks();
  return NextResponse.json({
    ok: true,
    systemStatus: health.overall,
    checks: health.checks,
    deploy: health.deploy,
    recentIncidents: listIncidents(25).map((i) => ({
      incidentId: i.incidentId,
      fingerprint: i.fingerprint,
      severity: i.severity,
      status: i.status,
      blastRadius: i.blastRadius,
      occurrenceCount: i.occurrenceCount,
      lastSeenAt: i.lastSeenAt,
      confidence: i.confidence,
      rootCause: i.rootCause,
      solution: i.solution,
      runbookRef: i.runbookRef,
      rollbackRef: i.rollbackRef,
      gitSha: i.gitSha,
      fixType: i.fixType,
      qaResult: i.qaResult,
      verifiedBy: i.verifiedBy,
      autoRepairForbidden: true as const,
    })),
  });
}
