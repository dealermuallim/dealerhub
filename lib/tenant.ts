import oracledb from 'oracledb';

import { getOracleConnection } from '@/lib/db';

export type PublicTenant = {
  TENANT_ID: number;
  TENANT_CODE: string;
  DEALER_NAME: string;
  TIMEZONE_NAME: string | null;

  PHONE: string | null;
  EMAIL: string | null;
  CITY: string | null;
  STATE_CODE: string | null;

  WEBSITE_TITLE: string | null;
  WEBSITE_TAGLINE: string | null;

  HERO_HEADLINE: string | null;
  HERO_SUBHEADLINE: string | null;
  HERO_IMAGE_URL: string | null;

  PRIMARY_COLOR: string | null;
  SECONDARY_COLOR: string | null;

  PRIMARY_CTA_TEXT: string | null;

  TEMPLATE_CODE: string | null;
};

export async function getPublicTenantByHost(
  host: string
): Promise<PublicTenant | null> {
  const connection =
    await getOracleConnection();

  try {
    /*
      IMPORTANT

      Hostname determines tenant.

      Example:
      localhost
      shelbymotors.com
      anotherdealer.com

      Browser never supplies TENANT_ID directly.

      Oracle resolves:

      HOST
        ->
      TENANT_DOMAINS
        ->
      TENANT_ID
        ->
      DEALERHUB_CTX
        ->
      VPD
    */

    await connection.execute(
      `
      BEGIN
        DEALERHUB_SECURITY_PKG.SET_PUBLIC_TENANT_BY_HOST(
          :host
        );
      END;
      `,
      {
        host,
      }
    );

    /*
      TENANTS stores dealership identity.

      TENANT_SETTINGS stores:
      - website branding
      - homepage text
      - colors
      - selected website template
    */

    const result =
      await connection.execute<PublicTenant>(
        `
        SELECT

          T.TENANT_ID,
          T.TENANT_CODE,
          T.DEALER_NAME,
          T.TIMEZONE_NAME,

          T.PHONE,
          T.EMAIL,
          T.CITY,
          T.STATE_CODE,

          S.WEBSITE_TITLE,
          S.WEBSITE_TAGLINE,

          S.HERO_HEADLINE,
          S.HERO_SUBHEADLINE,
          S.HERO_IMAGE_URL,

          COALESCE(
            S.PRIMARY_COLOR,
            T.PRIMARY_COLOR
          ) AS PRIMARY_COLOR,

          COALESCE(
            S.SECONDARY_COLOR,
            T.SECONDARY_COLOR
          ) AS SECONDARY_COLOR,

          S.PRIMARY_CTA_TEXT,

          S.TEMPLATE_CODE

        FROM TENANTS T

        LEFT JOIN TENANT_SETTINGS S
          ON S.TENANT_ID =
             T.TENANT_ID

        WHERE T.TENANT_ID =
          TO_NUMBER(
            SYS_CONTEXT(
              'DEALERHUB_CTX',
              'TENANT_ID'
            )
          )

          AND T.ACTIVE_YN = 'Y'
        `,
        {},
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );

    if (
      !result.rows ||
      result.rows.length === 0
    ) {
      return null;
    }

    const tenant =
      result.rows[0];

    /*
      Safety default.

      If an older dealer does not yet have
      TEMPLATE_CODE configured, DealerHub
      can still render using TEMPLATE_01.
    */

    return {
      ...tenant,

      TEMPLATE_CODE:
        tenant.TEMPLATE_CODE ||
        'TEMPLATE_01',
    };
  } finally {
    /*
      CRITICAL FOR MULTI-TENANCY

      Oracle connections come from a pool.

      Never return a connection to the pool
      while another dealer's tenant context
      remains attached to the session.
    */

    try {
      await connection.execute(
        `
        BEGIN
          DEALERHUB_SECURITY_PKG.CLEAR_CONTEXT;
        END;
        `
      );
    } catch (error) {
      console.error(
        'Unable to clear public tenant context:',
        error
      );
    }

    try {
      await connection.close();
    } catch (error) {
      console.error(
        'Unable to close Oracle connection:',
        error
      );
    }
  }
}
