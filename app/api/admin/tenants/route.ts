import { NextResponse } from 'next/server';
import oracledb from 'oracledb';

import { requireAdminSession } from '@/lib/admin-auth';
import { getOracleConnection } from '@/lib/db';
import { getPlatformActorUserId } from '@/lib/platform-actor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POST_ALLOWED = [
  'dealerName',
  'legalName',
  'tenantCode',
  'dealerLicenseNo',
  'phone',
  'textPhone',
  'email',
  'addressLine1',
  'addressLine2',
  'city',
  'stateCode',
  'zipCode',
  'logoUrl',
  'primaryColor',
  'secondaryColor',
  'timezoneName',
  'activeYn',
  'domainName',
  'domainType',
  'isPrimary',
  'websiteTitle',
  'websiteTagline',
  'heroHeadline',
  'heroSubheadline',
  'heroImageUrl',
  'settingsPrimaryColor',
  'settingsSecondaryColor',
  'primaryCtaText',
  'templateCode',
  'showFeaturedYn',
  'showFinancingYn',
  'showReviewsYn',
] as const;

type PostKey = (typeof POST_ALLOWED)[number];

const FORBIDDEN_AUTHORITY = [
  'ADMIN_ACTOR_USER_ID',
  'adminActorUserId',
  'actorUserId',
  'actor_user_id',
  'TENANT_ID',
  'tenantId',
  'tenant_id',
  'platformRole',
  'oracleUser',
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function trimStr(value: unknown): string {
  return String(value ?? '').trim();
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}

function mapOracleError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  const m = raw.match(/ORA-(\d+)/);
  const code = m ? Number(m[1]) : null;

  switch (code) {
    case 20100:
      return { status: 403, message: 'Platform admin entitlement failed.' };
    case 20101:
      return { status: 400, message: 'Invalid or missing required field.' };
    case 20102:
      return { status: 409, message: 'Tenant code already exists.' };
    case 20103:
      return { status: 409, message: 'Domain name already exists.' };
    case 20104:
      return { status: 400, message: 'Invalid field value (type, flag, color, template, or state).' };
    case 20105:
      return { status: 404, message: 'Tenant not found.' };
    case 20106:
    case 20107:
      return { status: 500, message: 'Dealer provisioning failed.' };
    default:
      return { status: 500, message: 'Unable to complete tenant operation.' };
  }
}

function actorConfigErrorResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('ADMIN_ACTOR_USER_ID')) {
    return NextResponse.json(
      { error: 'Server configuration error: platform actor is not configured.' },
      { status: 500 }
    );
  }
  return null;
}

export async function GET(req: Request) {
  const session = await requireAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let actorUserId: number;
  try {
    actorUserId = getPlatformActorUserId();
  } catch (error) {
    const cfg = actorConfigErrorResponse(error);
    if (cfg) return cfg;
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  let connection: oracledb.Connection | undefined;
  let resultSet: oracledb.ResultSet<Record<string, unknown>> | undefined;

  try {
    connection = await getOracleConnection();

    const result = await connection.execute(
      `BEGIN
         DEALERHUB_PLATFORM_PKG.LIST_TENANTS(
           p_actor_user_id => :actor,
           p_result        => :rc
         );
       END;`,
      {
        actor: actorUserId,
        rc: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: false,
      }
    );

    resultSet = (result.outBinds as { rc: oracledb.ResultSet<Record<string, unknown>> }).rc;
    const rows = (await resultSet.getRows(500)) as Record<string, unknown>[];
    await resultSet.close();
    resultSet = undefined;

    const tenants = rows.map((row) => ({
      tenantId: Number(row.TENANT_ID),
      tenantCode: row.TENANT_CODE == null ? null : String(row.TENANT_CODE),
      dealerName: row.DEALER_NAME == null ? null : String(row.DEALER_NAME),
      activeYn: row.ACTIVE_YN == null ? null : String(row.ACTIVE_YN),
      domainName: row.DOMAIN_NAME == null ? null : String(row.DOMAIN_NAME),
      domainType: row.DOMAIN_TYPE == null ? null : String(row.DOMAIN_TYPE),
      templateCode: row.TEMPLATE_CODE == null ? null : String(row.TEMPLATE_CODE),
      createdAt: row.CREATED_AT == null ? null : row.CREATED_AT,
    }));

    return NextResponse.json({ ok: true, tenants });
  } catch (error) {
    console.error('[api/admin/tenants] GET failed');
    const mapped = mapOracleError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  } finally {
    if (resultSet) {
      try {
        await resultSet.close();
      } catch {
        /* ignore */
      }
    }
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('[api/admin/tenants] close failed');
      }
    }
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let actorUserId: number;
  try {
    actorUserId = getPlatformActorUserId();
  } catch (error) {
    const cfg = actorConfigErrorResponse(error);
    if (cfg) return cfg;
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
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

  for (const key of Object.keys(body)) {
    if (FORBIDDEN_AUTHORITY.includes(key)) {
      return NextResponse.json(
        { error: `Authority field is not allowed: ${key}` },
        { status: 400 }
      );
    }
    if (!(POST_ALLOWED as readonly string[]).includes(key)) {
      return NextResponse.json(
        { error: `Unknown or non-editable property: ${key}` },
        { status: 400 }
      );
    }
  }

  const get = (key: PostKey) =>
    key in body ? trimStr((body as Record<string, unknown>)[key]) : '';

  const dealerName = get('dealerName');
  const tenantCode = get('tenantCode').toUpperCase();
  const domainName = get('domainName').toLowerCase();

  if (!dealerName || !tenantCode || !domainName) {
    return NextResponse.json(
      { error: 'Dealer name, tenant code, and domain name are required.' },
      { status: 400 }
    );
  }

  if (!/^[A-Z0-9_]+$/.test(tenantCode) || tenantCode.length > 30) {
    return NextResponse.json({ error: 'Invalid tenant code.' }, { status: 400 });
  }

  const templateCode = (get('templateCode') || 'TEMPLATE_02').toUpperCase();
  if (!['TEMPLATE_01', 'TEMPLATE_02'].includes(templateCode)) {
    return NextResponse.json({ error: 'Invalid template code.' }, { status: 400 });
  }

  const domainType = (get('domainType') || 'PUBLIC').toUpperCase();
  if (!['PUBLIC', 'ERP', 'ALIAS'].includes(domainType)) {
    return NextResponse.json({ error: 'Invalid domain type.' }, { status: 400 });
  }

  const yn = (raw: string, fallback: string) => {
    const v = (raw || fallback).toUpperCase();
    return v === 'Y' || v === 'N' ? v : null;
  };

  const activeYn = yn(get('activeYn'), 'Y');
  const isPrimary = yn(get('isPrimary'), 'Y');
  const showFeaturedYn = yn(get('showFeaturedYn'), 'Y');
  const showFinancingYn = yn(get('showFinancingYn'), 'Y');
  const showReviewsYn = yn(get('showReviewsYn'), 'N');
  if (!activeYn || !isPrimary || !showFeaturedYn || !showFinancingYn || !showReviewsYn) {
    return NextResponse.json({ error: 'Invalid Y/N flag.' }, { status: 400 });
  }

  const colorOk = (c: string) =>
    !c || /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c);
  const primaryColor = get('primaryColor');
  const secondaryColor = get('secondaryColor');
  const settingsPrimaryColor = get('settingsPrimaryColor');
  const settingsSecondaryColor = get('settingsSecondaryColor');
  if (
    !colorOk(primaryColor) ||
    !colorOk(secondaryColor) ||
    !colorOk(settingsPrimaryColor) ||
    !colorOk(settingsSecondaryColor)
  ) {
    return NextResponse.json({ error: 'Invalid color value.' }, { status: 400 });
  }

  const stateCode = get('stateCode').toUpperCase();
  if (stateCode && stateCode.length !== 2) {
    return NextResponse.json({ error: 'State must be 2 characters.' }, { status: 400 });
  }

  let connection: oracledb.Connection | undefined;

  try {
    connection = await getOracleConnection();

    const result = await connection.execute(
      `BEGIN
         DEALERHUB_PLATFORM_PKG.CREATE_TENANT_WITH_DOMAIN_AND_SETTINGS(
           p_actor_user_id            => :actor,
           p_tenant_code              => :tenantCode,
           p_dealer_name              => :dealerName,
           p_legal_name               => :legalName,
           p_dealer_license_no        => :dealerLicenseNo,
           p_phone                    => :phone,
           p_text_phone               => :textPhone,
           p_email                    => :email,
           p_address_line1            => :addressLine1,
           p_address_line2            => :addressLine2,
           p_city                     => :city,
           p_state_code               => :stateCode,
           p_zip_code                 => :zipCode,
           p_logo_url                 => :logoUrl,
           p_primary_color            => :primaryColor,
           p_secondary_color          => :secondaryColor,
           p_timezone_name            => :timezoneName,
           p_active_yn                => :activeYn,
           p_domain_name              => :domainName,
           p_domain_type              => :domainType,
           p_is_primary               => :isPrimary,
           p_website_title            => :websiteTitle,
           p_website_tagline          => :websiteTagline,
           p_hero_headline            => :heroHeadline,
           p_hero_subheadline         => :heroSubheadline,
           p_hero_image_url           => :heroImageUrl,
           p_settings_primary_color   => :settingsPrimaryColor,
           p_settings_secondary_color => :settingsSecondaryColor,
           p_primary_cta_text         => :primaryCtaText,
           p_template_code            => :templateCode,
           p_show_featured_yn         => :showFeaturedYn,
           p_show_financing_yn        => :showFinancingYn,
           p_show_reviews_yn          => :showReviewsYn,
           p_tenant_id                => :tenantId
         );
       END;`,
      {
        actor: actorUserId,
        tenantCode,
        dealerName,
        legalName: emptyToNull(get('legalName')),
        dealerLicenseNo: emptyToNull(get('dealerLicenseNo')),
        phone: emptyToNull(get('phone')),
        textPhone: emptyToNull(get('textPhone')),
        email: emptyToNull(get('email')),
        addressLine1: emptyToNull(get('addressLine1')),
        addressLine2: emptyToNull(get('addressLine2')),
        city: emptyToNull(get('city')),
        stateCode: emptyToNull(stateCode),
        zipCode: emptyToNull(get('zipCode')),
        logoUrl: emptyToNull(get('logoUrl')),
        primaryColor: emptyToNull(primaryColor),
        secondaryColor: emptyToNull(secondaryColor),
        timezoneName: emptyToNull(get('timezoneName')) || 'America/New_York',
        activeYn,
        domainName,
        domainType,
        isPrimary,
        websiteTitle: emptyToNull(get('websiteTitle')) || dealerName,
        websiteTagline: emptyToNull(get('websiteTagline')),
        heroHeadline: emptyToNull(get('heroHeadline')),
        heroSubheadline: emptyToNull(get('heroSubheadline')),
        heroImageUrl: emptyToNull(get('heroImageUrl')),
        settingsPrimaryColor: emptyToNull(settingsPrimaryColor),
        settingsSecondaryColor: emptyToNull(settingsSecondaryColor),
        primaryCtaText: emptyToNull(get('primaryCtaText')),
        templateCode,
        showFeaturedYn,
        showFinancingYn,
        showReviewsYn,
        tenantId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );

    const outTid = (result.outBinds as { tenantId?: number | number[] } | undefined)?.tenantId;
    const tenantId = Number(Array.isArray(outTid) ? outTid[0] : outTid);
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Dealer provisioning failed.' }, { status: 500 });
    }

    await connection.commit();

    return NextResponse.json({
      ok: true,
      tenantId,
      tenantCode,
      domainName,
    });
  } catch (error) {
    console.error('[api/admin/tenants] POST failed');
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* ignore */
      }
    }
    const mapped = mapOracleError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {
        console.error('[api/admin/tenants] close failed');
      }
    }
  }
}
