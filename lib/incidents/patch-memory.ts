import type { FixType, PatchMemory } from './model';
import { runbookRefFor } from './runbooks';

/** Build patch/solution memory refs — never embeds secrets or full source. */
export function buildPatchMemory(input: {
  fixType: FixType;
  gitSha?: string | null;
  files?: string[];
  dbObjectRef?: string | null;
  migrationRef?: string | null;
  configRef?: string | null;
  networkRef?: string | null;
  rollbackRef?: string | null;
  runbookRef?: string | null;
  incidentId?: string | null;
}): PatchMemory {
  const runbook =
    input.incidentId ? runbookRefFor(input.incidentId) : null;

  return {
    fixType: input.fixType,
    gitSha: input.fixType === 'CODE' ? input.gitSha ?? null : input.gitSha ?? null,
    files: (input.files ?? []).map((f) => f.replace(/\\/g, '/')).slice(0, 50),
    dbObjectRef: input.dbObjectRef ?? null,
    migrationRef: input.migrationRef ?? null,
    configRef: input.configRef ?? null,
    networkRef: input.networkRef ?? null,
    runbookRef: input.runbookRef ?? runbook,
    rollbackRef: input.rollbackRef ?? null,
    autoExecuteAuthorized: false,
  };
}

export function knownIncidentPatchDefaults(incidentId: string): PatchMemory | null {
  switch (incidentId) {
    case 'INC-001':
      return buildPatchMemory({
        fixType: 'CONFIG',
        configRef: 'ORACLE pool / connectivity',
        runbookRef: 'docs/runbooks/INC-001.md',
        incidentId,
        rollbackRef: 'Revert pool env changes; recycle app process manually',
      });
    case 'INC-002':
      return buildPatchMemory({
        fixType: 'DATABASE',
        dbObjectRef: 'DEALERHUB_PLATFORM_PKG.CREATE_TENANT_WITH_DOMAIN_AND_SETTINGS / TENANT_DOMAINS',
        migrationRef: null,
        incidentId,
        rollbackRef: 'sql/migrations/20260915_01_incident_knowledge_v1_rollback.sql (KB only); domain row revert via platform pkg',
      });
    case 'INC-003':
      return buildPatchMemory({
        fixType: 'DATABASE',
        dbObjectRef: 'PLATFORM_ADMINS / DEALERHUB_SECURITY_PKG',
        incidentId,
        rollbackRef: 'Restore prior PLATFORM_ADMINS membership (manual)',
      });
    case 'INC-004':
      return buildPatchMemory({
        fixType: 'CONFIG',
        files: ['package.json', 'package-lock.json'],
        incidentId,
        rollbackRef: 'git checkout -- package.json package-lock.json',
      });
    default:
      return null;
  }
}
