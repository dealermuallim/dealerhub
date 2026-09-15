import { createHash } from 'crypto';

import { sanitizeErrorText } from './sanitize';

/** Stable fingerprint from sanitized/normalized error class tokens. */
export function fingerprintError(error: unknown): string {
  const sanitized = sanitizeErrorText(error).toUpperCase();
  const code =
    sanitized.match(/\b(ORA-\d{5})\b/)?.[1] ||
    sanitized.match(/\b(NJS-\d{3})\b/)?.[1] ||
    sanitized.match(/\bERESOLVE\b/)?.[0] ||
    null;

  const base = code || sanitized.slice(0, 180);
  return createHash('sha256').update(base).digest('hex').slice(0, 32);
}

/** Hash host for blast-radius analytics without storing raw host in shared multi-tenant views. */
export function hashHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const normalized = String(host).trim().toLowerCase();
  if (!normalized) return null;
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
