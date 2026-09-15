import { requireAdminSession } from '@/lib/admin-auth';
import { denyIfDealerBillingBlocked } from '@/lib/billing/http-guard';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import oracledb from 'oracledb';
import { getOracleConnection } from '@/lib/db';

function normalizeHost(host: string) {
  return host.split(':')[0].toLowerCase();
}

async function setTenantContext(
  connection: oracledb.Connection,
  host: string
) {
  await connection.execute(
    `
    BEGIN
      DEALERHUB_SECURITY_PKG.SET_PUBLIC_TENANT_BY_HOST(:host);
    END;
    `,
    { host }
  );
}

async function clearAndClose(
  connection: oracledb.Connection | undefined
) {
  if (!connection) return;

  try {
    await connection.execute(`
      BEGIN
        DEALERHUB_SECURITY_PKG.CLEAR_CONTEXT;
      END;
    `);
  } catch (error) {
    console.error(
      'Unable to clear tenant context:',
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

function textOrNull(value: any) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

function numberOrNull(value: any) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

/* ============================================================
   GET ONE VEHICLE
   ============================================================ */

export async function GET(
  req: Request,
  context: {
    params: Promise<{ vehicleId: string }>;
  }
) {
  let connection: oracledb.Connection | undefined;

  try {
    const { vehicleId: vehicleIdText } =
      await context.params;

    const vehicleId = Number(vehicleIdText);

    if (
      !Number.isInteger(vehicleId) ||
      vehicleId <= 0
    ) {
      return NextResponse.json(
        {
          error: 'Invalid vehicle ID.',
        },
        {
          status: 400,
        }
      );
    }

    const requestHeaders = await headers();

    const host = normalizeHost(
      requestHeaders.get('host') || 'localhost'
    );

    connection =
      await getOracleConnection();

    await setTenantContext(
      connection,
      host
    );

    const result =
      await connection.execute(
        `
        SELECT
          VEHICLE_ID,
          STOCK_NUMBER,
          VIN,
          YEAR,
          MAKE,
          MODEL,
          TRIM,
          MILEAGE,
          EXTERIOR_COLOR,
          INTERIOR_COLOR,
          TRANSMISSION,
          ENGINE,
          FUEL_TYPE,
          BODY_STYLE,
          DRIVE_TYPE,
          TITLE_STATUS,
          VEHICLE_STATUS,
          DESCRIPTION,
          ASKING_PRICE,
          MIN_ACCEPTABLE_PRICE,
          CASH_PRICE,
          FINANCING_PRICE,
          PUBLIC_YN,
          FEATURED_YN
        FROM VEHICLES
        WHERE VEHICLE_ID = :vehicleId
        `,
        {
          vehicleId,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );

    if (
      !result.rows ||
      result.rows.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'Vehicle not found for this dealership.',
        },
        {
          status: 404,
        }
      );
    }

    const row = result.rows[0] as Record<string, unknown>;
    // Force primitives — thick-mode Oracle values can embed circular ConnectDescription refs.
    const n = (v: unknown): number | null =>
      v == null || v === '' ? null : Number(v);
    const s = (v: unknown): string | null =>
      v == null ? null : String(v);

    const vehicle = {
      VEHICLE_ID: n(row.VEHICLE_ID),
      STOCK_NUMBER: s(row.STOCK_NUMBER),
      VIN: s(row.VIN),
      YEAR: n(row.YEAR),
      MAKE: s(row.MAKE),
      MODEL: s(row.MODEL),
      TRIM: s(row.TRIM),
      MILEAGE: n(row.MILEAGE),
      EXTERIOR_COLOR: s(row.EXTERIOR_COLOR),
      INTERIOR_COLOR: s(row.INTERIOR_COLOR),
      TRANSMISSION: s(row.TRANSMISSION),
      ENGINE: s(row.ENGINE),
      FUEL_TYPE: s(row.FUEL_TYPE),
      BODY_STYLE: s(row.BODY_STYLE),
      DRIVE_TYPE: s(row.DRIVE_TYPE),
      TITLE_STATUS: s(row.TITLE_STATUS),
      VEHICLE_STATUS: s(row.VEHICLE_STATUS),
      DESCRIPTION: s(row.DESCRIPTION),
      ASKING_PRICE: n(row.ASKING_PRICE),
      MIN_ACCEPTABLE_PRICE: n(row.MIN_ACCEPTABLE_PRICE),
      CASH_PRICE: n(row.CASH_PRICE),
      FINANCING_PRICE: n(row.FINANCING_PRICE),
      PUBLIC_YN: s(row.PUBLIC_YN),
      FEATURED_YN: s(row.FEATURED_YN),
    };

    return NextResponse.json({
      success: true,
      vehicle,
    });
  } catch (error: any) {
    console.error(
      'Vehicle load failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to load vehicle.',
      },
      {
        status: 500,
      }
    );
  } finally {
    await clearAndClose(connection);
  }
}

/* ============================================================
   PATCH / UPDATE VEHICLE
   ============================================================ */

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{ vehicleId: string }>;
  }
) {
  const billingBlock = await denyIfDealerBillingBlocked(req, new URL(req.url).pathname);
  if (billingBlock) return billingBlock;

  const adminSession = await requireAdminSession(req);
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let connection: oracledb.Connection | undefined;

  try {
    const { vehicleId: vehicleIdText } =
      await context.params;

    const vehicleId = Number(vehicleIdText);

    if (
      !Number.isInteger(vehicleId) ||
      vehicleId <= 0
    ) {
      return NextResponse.json(
        {
          error: 'Invalid vehicle ID.',
        },
        {
          status: 400,
        }
      );
    }

    const requestHeaders = await headers();

    const host = normalizeHost(
      requestHeaders.get('host') || 'localhost'
    );

    const body = await req.json();

    const vin = String(
      body.vin || ''
    )
      .trim()
      .toUpperCase();

    if (vin.length !== 17) {
      return NextResponse.json(
        {
          error:
            'A valid 17-character VIN is required.',
        },
        {
          status: 400,
        }
      );
    }

    connection =
      await getOracleConnection();

    await setTenantContext(
      connection,
      host
    );

    const result =
      await connection.execute(
        `
        UPDATE VEHICLES
        SET
          STOCK_NUMBER         = :stockNumber,
          VIN                  = :vin,
          YEAR                 = :year,
          MAKE                 = :make,
          MODEL                = :model,
          TRIM                 = :trim,
          MILEAGE              = :mileage,
          EXTERIOR_COLOR       = :exteriorColor,
          INTERIOR_COLOR       = :interiorColor,
          TRANSMISSION         = :transmission,
          ENGINE               = :engine,
          FUEL_TYPE            = :fuelType,
          BODY_STYLE           = :bodyStyle,
          DRIVE_TYPE           = :driveType,
          TITLE_STATUS         = :titleStatus,
          VEHICLE_STATUS       = :vehicleStatus,
          DESCRIPTION          = :description,
          ASKING_PRICE         = :askingPrice,
          MIN_ACCEPTABLE_PRICE = :minAcceptablePrice,
          CASH_PRICE           = :cashPrice,
          FINANCING_PRICE      = :financingPrice,
          PUBLIC_YN            = :publicYn,
          FEATURED_YN          = :featuredYn
        WHERE VEHICLE_ID = :vehicleId
        `,
        {
          vehicleId,

          stockNumber:
            String(
              body.stockNumber || ''
            ).trim(),

          vin,

          year:
            numberOrNull(
              body.year
            ),

          make:
            textOrNull(
              body.make
            ),

          model:
            textOrNull(
              body.model
            ),

          trim:
            textOrNull(
              body.trim
            ),

          mileage:
            numberOrNull(
              body.mileage
            ),

          exteriorColor:
            textOrNull(
              body.exteriorColor
            ),

          interiorColor:
            textOrNull(
              body.interiorColor
            ),

          transmission:
            textOrNull(
              body.transmission
            ),

          engine:
            textOrNull(
              body.engine
            ),

          fuelType:
            textOrNull(
              body.fuelType
            ),

          bodyStyle:
            textOrNull(
              body.bodyStyle
            ),

          driveType:
            textOrNull(
              body.driveType
            ),

          titleStatus:
            textOrNull(
              body.titleStatus
            ),

          vehicleStatus:
            body.vehicleStatus ||
            'AVAILABLE',

          description:
            textOrNull(
              body.description
            ),

          askingPrice:
            numberOrNull(
              body.askingPrice
            ),

          minAcceptablePrice:
            numberOrNull(
              body.minAcceptablePrice
            ),

          cashPrice:
            numberOrNull(
              body.cashPrice
            ),

          financingPrice:
            numberOrNull(
              body.financingPrice
            ),

          publicYn:
            body.public === false
              ? 'N'
              : 'Y',

          featuredYn:
            body.featured
              ? 'Y'
              : 'N',
        },
        {
          autoCommit: true,
        }
      );

    if (result.rowsAffected !== 1) {
      return NextResponse.json(
        {
          error:
            'Vehicle not found for this dealership.',
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      vehicleId,
      message:
        'Vehicle updated successfully.',
    });
  } catch (error: any) {
    console.error(
      'Vehicle update failed:',
      error
    );

    const message = String(
      error?.message || ''
    );

    if (
      message.includes('ORA-00001') &&
      message.includes(
        'UK_VEHICLE_TENANT_VIN'
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Another vehicle in this dealership already uses this VIN.',
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to update vehicle.',
      },
      {
        status: 500,
      }
    );
  } finally {
    await clearAndClose(connection);
  }
}