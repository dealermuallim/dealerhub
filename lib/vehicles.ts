import oracledb from 'oracledb';
import { getOracleConnection } from '@/lib/db';

export type PublicVehicle = {
  VEHICLE_ID: number;
  STOCK_NUMBER: string;
  VIN: string;
  YEAR: number | null;
  MAKE: string | null;
  MODEL: string | null;
  TRIM: string | null;
  MILEAGE: number | null;
  EXTERIOR_COLOR: string | null;
  TRANSMISSION: string | null;
  ENGINE: string | null;
  FUEL_TYPE: string | null;
  BODY_STYLE: string | null;
  DRIVE_TYPE: string | null;
  ASKING_PRICE: number | null;
  CASH_PRICE: number | null;
  FINANCING_PRICE: number | null;
  FEATURED_YN: string;
  PRIMARY_IMAGE_URL: string | null;
};

export type PublicVehicleDetail = PublicVehicle & {
  INTERIOR_COLOR: string | null;
  DESCRIPTION: string | null;
  VEHICLE_STATUS: string;
  PUBLIC_YN: string;
};

export type PublicVehiclePhoto = {
  VEHICLE_PHOTO_ID: number;
  IMAGE_URL: string;
  THUMBNAIL_URL: string | null;
  DISPLAY_ORDER: number;
  PRIMARY_YN: string;
  ALT_TEXT: string | null;
};

async function withPublicTenantContext<T>(
  host: string,
  run: (connection: oracledb.Connection) => Promise<T>
): Promise<T> {
  const connection = await getOracleConnection();

  try {
    await connection.execute(
      `
      BEGIN
        DEALERHUB_SECURITY_PKG.SET_PUBLIC_TENANT_BY_HOST(:host);
      END;
      `,
      { host }
    );

    return await run(connection);
  } finally {
    try {
      await connection.execute(`
        BEGIN
          DEALERHUB_SECURITY_PKG.CLEAR_CONTEXT;
        END;
      `);
    } finally {
      await connection.close();
    }
  }
}

export type PublicVehicleFilters = {
  make?: string;
  model?: string;
  q?: string;
  maxPrice?: number;
};

export async function getPublicVehiclesByHost(
  host: string,
  filters: PublicVehicleFilters = {}
): Promise<PublicVehicle[]> {
  return withPublicTenantContext(host, async (connection) => {
    const make = filters.make?.trim() ? filters.make.trim() : null;
    const model = filters.model?.trim() ? filters.model.trim() : null;
    const q = filters.q?.trim() ? filters.q.trim() : null;
    const maxPrice =
      filters.maxPrice != null && Number.isFinite(filters.maxPrice)
        ? filters.maxPrice
        : null;

    const result = await connection.execute<PublicVehicle>(
      `
      SELECT
        V.VEHICLE_ID,
        V.STOCK_NUMBER,
        V.VIN,
        V.YEAR,
        V.MAKE,
        V.MODEL,
        V.TRIM,
        V.MILEAGE,
        V.EXTERIOR_COLOR,
        V.TRANSMISSION,
        V.ENGINE,
        V.FUEL_TYPE,
        V.BODY_STYLE,
        V.DRIVE_TYPE,
        V.ASKING_PRICE,
        V.CASH_PRICE,
        V.FINANCING_PRICE,
        V.FEATURED_YN,
        (
          SELECT P.IMAGE_URL
          FROM VEHICLE_PHOTOS P
          WHERE P.VEHICLE_ID = V.VEHICLE_ID
            AND P.PRIMARY_YN = 'Y'
            AND ROWNUM = 1
        ) AS PRIMARY_IMAGE_URL
      FROM VEHICLES V
      WHERE V.PUBLIC_YN = 'Y'
        AND V.VEHICLE_STATUS = 'AVAILABLE'
        AND (:make IS NULL OR UPPER(V.MAKE) LIKE '%' || UPPER(:make) || '%')
        AND (:model IS NULL OR UPPER(V.MODEL) LIKE '%' || UPPER(:model) || '%')
        AND (
          :q IS NULL
          OR UPPER(V.STOCK_NUMBER) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NVL(V.MAKE, '')) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NVL(V.MODEL, '')) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NVL(V.TRIM, '')) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NVL(V.BODY_STYLE, '')) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NVL(V.VIN, '')) LIKE '%' || UPPER(:q) || '%'
        )
        AND (:maxPrice IS NULL OR V.ASKING_PRICE <= :maxPrice)
      ORDER BY
        V.FEATURED_YN DESC,
        V.CREATED_AT DESC
      `,
      { make, model, q, maxPrice },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return (result.rows ?? []) as PublicVehicle[];
  });
}

export async function getPublicVehicleByHostAndId(
  host: string,
  vehicleId: number
): Promise<PublicVehicleDetail | null> {
  return withPublicTenantContext(host, async (connection) => {
    const result = await connection.execute<PublicVehicleDetail>(
      `
      SELECT
        V.VEHICLE_ID,
        V.STOCK_NUMBER,
        V.VIN,
        V.YEAR,
        V.MAKE,
        V.MODEL,
        V.TRIM,
        V.MILEAGE,
        V.EXTERIOR_COLOR,
        V.INTERIOR_COLOR,
        V.TRANSMISSION,
        V.ENGINE,
        V.FUEL_TYPE,
        V.BODY_STYLE,
        V.DRIVE_TYPE,
        V.ASKING_PRICE,
        V.CASH_PRICE,
        V.FINANCING_PRICE,
        V.FEATURED_YN,
        DBMS_LOB.SUBSTR(V.DESCRIPTION, 4000, 1) AS DESCRIPTION,
        /*--V.DESCRIPTION,*/

        
        
        V.VEHICLE_STATUS,
        V.PUBLIC_YN,
        (
          SELECT P.IMAGE_URL
          FROM VEHICLE_PHOTOS P
          WHERE P.VEHICLE_ID = V.VEHICLE_ID
            AND P.PRIMARY_YN = 'Y'
            AND ROWNUM = 1
        ) AS PRIMARY_IMAGE_URL
      FROM VEHICLES V
      WHERE V.VEHICLE_ID = :vehicleId
        AND V.PUBLIC_YN = 'Y'
        AND V.VEHICLE_STATUS = 'AVAILABLE'
      `,
      { vehicleId },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as PublicVehicleDetail;
  });
}

export async function getPublicVehiclePhotosByHostAndId(
  host: string,
  vehicleId: number
): Promise<PublicVehiclePhoto[]> {
  return withPublicTenantContext(host, async (connection) => {
    const result = await connection.execute<PublicVehiclePhoto>(
      `
      SELECT
        VEHICLE_PHOTO_ID,
        IMAGE_URL,
        THUMBNAIL_URL,
        DISPLAY_ORDER,
        PRIMARY_YN,
        ALT_TEXT
      FROM VEHICLE_PHOTOS
      WHERE VEHICLE_ID = :vehicleId
      ORDER BY
        CASE WHEN PRIMARY_YN = 'Y' THEN 0 ELSE 1 END,
        DISPLAY_ORDER,
        VEHICLE_PHOTO_ID
      `,
      { vehicleId },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return (result.rows ?? []) as PublicVehiclePhoto[];
  });
}

export type AdminVehicle = PublicVehicle & {
  VEHICLE_STATUS: string;
  PUBLIC_YN: string;
  CREATED_AT: Date | string | null;
  UPDATED_AT: Date | string | null;
  PHOTO_COUNT: number;
  SOLD_AT: Date | string | null;
};

/** All vehicles for current Host tenant (admin). Uses public host context + VPD; no browser TENANT_ID. */
export async function getAdminVehiclesByHost(
  host: string
): Promise<AdminVehicle[]> {
  return withPublicTenantContext(host, async (connection) => {
    const result = await connection.execute<AdminVehicle>(
      `
      SELECT
        V.VEHICLE_ID,
        V.STOCK_NUMBER,
        V.VIN,
        V.YEAR,
        V.MAKE,
        V.MODEL,
        V.TRIM,
        V.MILEAGE,
        V.EXTERIOR_COLOR,
        V.TRANSMISSION,
        V.ENGINE,
        V.FUEL_TYPE,
        V.BODY_STYLE,
        V.DRIVE_TYPE,
        V.ASKING_PRICE,
        V.CASH_PRICE,
        V.FINANCING_PRICE,
        V.FEATURED_YN,
        V.VEHICLE_STATUS,
        V.PUBLIC_YN,
        V.CREATED_AT,
        V.UPDATED_AT,
        (SELECT COUNT(*) FROM VEHICLE_PHOTOS P
         WHERE P.VEHICLE_ID = V.VEHICLE_ID AND P.TENANT_ID = V.TENANT_ID) AS PHOTO_COUNT,
        (SELECT MAX(H.CHANGED_AT) FROM VEHICLE_STATUS_HISTORY H
         WHERE H.VEHICLE_ID = V.VEHICLE_ID AND H.TENANT_ID = V.TENANT_ID
           AND H.NEW_STATUS = 'SOLD'
           AND (H.OLD_STATUS IS NULL OR H.OLD_STATUS <> 'SOLD')
           AND V.VEHICLE_STATUS = 'SOLD') AS SOLD_AT,
        (
          SELECT P.IMAGE_URL
          FROM VEHICLE_PHOTOS P
          WHERE P.VEHICLE_ID = V.VEHICLE_ID
            AND P.PRIMARY_YN = 'Y'
            AND ROWNUM = 1
        ) AS PRIMARY_IMAGE_URL
      FROM VEHICLES V
      ORDER BY V.CREATED_AT DESC
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return (result.rows ?? []) as AdminVehicle[];
  });
}

export type AdminVinLookupHit = {
  VEHICLE_ID: number;
  STOCK_NUMBER: string | null;
  YEAR: number | string | null;
  MAKE: string | null;
  MODEL: string | null;
  TRIM: string | null;
  VIN: string;
};

/**
 * Tenant-safe exact VIN lookup for admin Add Vehicle.
 * Uses Host VPD context only — other-tenant VINs return null (no leak).
 */
export async function findAdminVehicleByVinForHost(
  host: string,
  vin: string
): Promise<AdminVinLookupHit | null> {
  const normalized = String(vin || '')
    .trim()
    .toUpperCase();
  if (normalized.length !== 17) return null;

  return withPublicTenantContext(host, async (connection) => {
    const result = await connection.execute<AdminVinLookupHit>(
      `
      SELECT
        V.VEHICLE_ID,
        V.STOCK_NUMBER,
        V.YEAR,
        V.MAKE,
        V.MODEL,
        V.TRIM,
        V.VIN
      FROM VEHICLES V
      WHERE UPPER(TRIM(V.VIN)) = :vin
        AND ROWNUM = 1
      `,
      { vin: normalized },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const row = (result.rows ?? [])[0] as AdminVinLookupHit | undefined;
    return row || null;
  });
}

