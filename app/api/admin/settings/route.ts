import { headers } from 'next/headers';
import { denyIfDealerBillingBlocked } from '@/lib/billing/http-guard';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import oracledb from 'oracledb';

import { requireAdminSession } from '@/lib/admin-auth';
import { getOracleConnection } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/vehicle-photos';

const ALLOWED_KEYS = [
  'websiteTitle',
  'websiteTagline',
  'heroHeadline',
  'heroSubheadline',
  'heroImageUrl',
  'primaryColor',
  'secondaryColor',
  'primaryCtaText',
  'templateCode',
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

const COLUMN_BY_KEY: Record<AllowedKey, string> = {
  websiteTitle: 'WEBSITE_TITLE',
  websiteTagline: 'WEBSITE_TAGLINE',
  heroHeadline: 'HERO_HEADLINE',
  heroSubheadline: 'HERO_SUBHEADLINE',
  heroImageUrl: 'HERO_IMAGE_URL',
  primaryColor: 'PRIMARY_COLOR',
  secondaryColor: 'SECONDARY_COLOR',
  primaryCtaText: 'PRIMARY_CTA_TEXT',
  templateCode: 'TEMPLATE_CODE',
};

const MAX_LEN: Record<AllowedKey, number> = {
  websiteTitle: 200,
  websiteTagline: 500,
  heroHeadline: 500,
  heroSubheadline: 1000,
  heroImageUrl: 2000,
  primaryColor: 32,
  secondaryColor: 32,
  primaryCtaText: 100,
  templateCode: 32,
};

const COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const TEMPLATE_RE = /^TEMPLATE_0[12]$/;

function normalizeHost(host: string): string {
  return host.split(':')[0].toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function PATCH(req: Request) {
  const billingBlock = await denyIfDealerBillingBlocked(req, new URL(req.url).pathname);
  if (billingBlock) return billingBlock;

  const adminSession = await requireAdminSession(req);
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON body.' }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  if ('TENANT_ID' in body || 'tenantId' in body || 'tenant_id' in body) {
    return NextResponse.json(
      { error: 'TENANT_ID is not allowed in the request.' },
      { status: 400 }
    );
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return NextResponse.json({ error: 'No settings provided.' }, { status: 400 });
  }

  for (const key of keys) {
    if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
      return NextResponse.json(
        { error: `Unknown or non-editable property: ${key}` },
        { status: 400 }
      );
    }
  }

  const binds: Record<string, string | number | null> = {};
  const setClauses: string[] = [];

  for (const key of ALLOWED_KEYS) {
    if (!(key in body)) continue;

    const raw = body[key];
    if (raw !== null && typeof raw !== 'string') {
      return NextResponse.json(
        { error: `Invalid type for ${key}.` },
        { status: 400 }
      );
    }

    let value = raw === null ? '' : String(raw).trim();
    if (value.length > MAX_LEN[key]) {
      return NextResponse.json(
        { error: `${key} exceeds maximum length.` },
        { status: 400 }
      );
    }

    if (key === 'primaryColor' || key === 'secondaryColor') {
      if (value && !COLOR_RE.test(value)) {
        return NextResponse.json(
          { error: `Invalid color for ${key}.` },
          { status: 400 }
        );
      }
    }

    if (key === 'templateCode') {
      if (value && !TEMPLATE_RE.test(value)) {
        return NextResponse.json(
          { error: 'Invalid templateCode.' },
          { status: 400 }
        );
      }
    }

    const bindName = key;
    setClauses.push(`${COLUMN_BY_KEY[key]} = :${bindName}`);
    binds[bindName] = value === '' ? null : value;
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: 'No settings provided.' }, { status: 400 });
  }

  const requestHeaders = await headers();
  const host = normalizeHost(requestHeaders.get('host') || 'localhost');

  let connection: oracledb.Connection | undefined;

  try {
    connection = await getOracleConnection();

    await connection.execute(
      `BEGIN
         DEALERHUB_SECURITY_PKG.SET_PUBLIC_TENANT_BY_HOST(:host);
       END;`,
      { host }
    );

    const tenantId = await getCurrentTenantId(connection);
    if (!tenantId || tenantId <= 0) {
      return NextResponse.json(
        { error: 'Unable to resolve tenant for this host.' },
        { status: 404 }
      );
    }

    binds.tenantId = tenantId;

    const sql = `
      UPDATE TENANT_SETTINGS
         SET ${setClauses.join(',\n             ')}
       WHERE TENANT_ID = :tenantId
    `;

    const result = await connection.execute(sql, binds, {
      autoCommit: false,
    });

    const rows = result.rowsAffected ?? 0;
    if (rows < 1) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'No TENANT_SETTINGS row found for this tenant.' },
        { status: 404 }
      );
    }

    await connection.commit();

    revalidatePath('/');
    revalidatePath('/admin/settings');

    return NextResponse.json({
      ok: true,
      updated: setClauses.length,
    });
  } catch (error) {
    console.error('[api/admin/settings] PATCH failed:', error);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[api/admin/settings] rollback failed:', rollbackError);
      }
    }
    return NextResponse.json(
      { error: 'Unable to save settings.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.execute(`
          BEGIN
            DEALERHUB_SECURITY_PKG.CLEAR_CONTEXT;
          END;
        `);
      } catch (clearError) {
        console.error('[api/admin/settings] clear context failed:', clearError);
      }
      try {
        await connection.close();
      } catch (closeError) {
        console.error('[api/admin/settings] close failed:', closeError);
      }
    }
  }
}