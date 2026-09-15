import { requireAdminSession } from '@/lib/admin-auth';
import { denyIfDealerBillingBlocked } from '@/lib/billing/http-guard';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import oracledb from 'oracledb';
import { getOracleConnection } from '@/lib/db';

function normalizeHost(host: string) {
  return host.split(':')[0].toLowerCase();
}

export async function POST(req: Request) {
  const billingBlock = await denyIfDealerBillingBlocked(req, new URL(req.url).pathname);
  if (billingBlock) return billingBlock;

  const adminSession = await requireAdminSession(req);
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let connection;

  try {
    // ---------------------------------------------------------
    // 1. DETERMINE CURRENT TENANT FROM HOSTNAME
    // ---------------------------------------------------------

    const requestHeaders = await headers();

    const host = normalizeHost(
      requestHeaders.get('host') || 'localhost'
    );

    // ---------------------------------------------------------
    // 2. READ VEHICLE DATA FROM REQUEST
    // ---------------------------------------------------------

    const body = await req.json();

    const vin = String(body.vin || '')
      .trim()
      .toUpperCase();

    // ---------------------------------------------------------
    // 3. BASIC VIN VALIDATION
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 4. OPEN ORACLE CONNECTION
    // ---------------------------------------------------------

    connection = await getOracleConnection();

    // ---------------------------------------------------------
    // 5. SET TENANT CONTEXT
    //
    // Hostname -> TENANT_DOMAINS -> TENANT_ID
    //
    // IMPORTANT:
    // This context is established on the SAME Oracle
    // connection used for the INSERT below.
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 6. GENERATE STOCK NUMBER IF DEALER LEFT IT BLANK
    // ---------------------------------------------------------

    const stockNumber =
      String(body.stockNumber || '').trim() ||
      `DH-${Date.now()}`;

    const ALLOWED_STATUSES = new Set([
      'AVAILABLE',
      'RESERVED',
      'PENDING',
      'SOLD',
      'WHOLESALE',
      'HOLD',
      'ARCHIVED',
    ]);

    const vehicleStatusRaw = String(body.vehicleStatus || 'AVAILABLE')
      .trim()
      .toUpperCase();

    if (!ALLOWED_STATUSES.has(vehicleStatusRaw)) {
      return NextResponse.json(
        {
          error:
            'Invalid vehicle status.',
        },
        {
          status: 400,
        }
      );
    }

    // Missing public on older clients defaults to Y (show on website).
    const publicYn = body.public === false ? 'N' : 'Y';

    // ---------------------------------------------------------
    // 7. INSERT VEHICLE
    //
    // Browser never chooses TENANT_ID.
    //
    // We pass 0 and the Oracle tenant-security trigger
    // replaces it using the current tenant context.
    // ---------------------------------------------------------

    const result = await connection.execute(
      `
      INSERT INTO VEHICLES
      (
        TENANT_ID,
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
        VEHICLE_STATUS,
        DESCRIPTION,
        ASKING_PRICE,
        CASH_PRICE,
        FINANCING_PRICE,
        PUBLIC_YN,
        FEATURED_YN
      )
      VALUES
      (
        0,
        :stockNumber,
        :vin,
        :year,
        :make,
        :model,
        :trim,
        :mileage,
        :exteriorColor,
        :interiorColor,
        :transmission,
        :engine,
        :fuelType,
        :bodyStyle,
        :driveType,
        :vehicleStatus,
        :description,
        :askingPrice,
        :cashPrice,
        :financingPrice,
        :publicYn,
        :featuredYn
      )
      RETURNING VEHICLE_ID INTO :vehicleId
      `,
      {
        stockNumber,
        vin,

        year:
          body.year === '' ||
          body.year === null ||
          body.year === undefined
            ? null
            : Number(body.year),

        make:
          body.make || null,

        model:
          body.model || null,

        trim:
          body.trim || null,

        mileage:
          body.mileage === '' ||
          body.mileage === null ||
          body.mileage === undefined
            ? null
            : Number(body.mileage),

        exteriorColor:
          body.exteriorColor || null,

        interiorColor:
          body.interiorColor || null,

        transmission:
          body.transmission || null,

        engine:
          body.engine || null,

        fuelType:
          body.fuelType || null,

        bodyStyle:
          body.bodyStyle || null,

        driveType:
          body.driveType || null,

        description:
          body.description || null,

        askingPrice:
          body.askingPrice === '' ||
          body.askingPrice === null ||
          body.askingPrice === undefined
            ? null
            : Number(body.askingPrice),

        cashPrice:
          body.cashPrice === '' ||
          body.cashPrice === null ||
          body.cashPrice === undefined
            ? null
            : Number(body.cashPrice),

        financingPrice:
          body.financingPrice === '' ||
          body.financingPrice === null ||
          body.financingPrice === undefined
            ? null
            : Number(body.financingPrice),

        vehicleStatus: vehicleStatusRaw,

        publicYn,

        featuredYn:
          body.featured ? 'Y' : 'N',

        vehicleId: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER,
        },
      },
      {
        autoCommit: true,
      }
    );

    // ---------------------------------------------------------
    // 8. GET NEW VEHICLE ID
    // ---------------------------------------------------------

    const outBinds = result.outBinds as {
      vehicleId: number[];
    };

    const vehicleId =
      outBinds.vehicleId[0];

    // ---------------------------------------------------------
    // 9. SUCCESS
    // ---------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        vehicleId,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      'Vehicle save failed:',
      error
    );

    const message = String(
      error?.message || ''
    );

    // ---------------------------------------------------------
    // FRIENDLY DUPLICATE VIN ERROR
    // ---------------------------------------------------------

    if (
      message.includes('ORA-00001') &&
      message.includes(
        'UK_VEHICLE_TENANT_VIN'
      )
    ) {
      return NextResponse.json(
        {
          error:
            'This VIN already exists in this dealership inventory.',
        },
        {
          status: 409,
        }
      );
    }

    // ---------------------------------------------------------
    // FRIENDLY DUPLICATE STOCK NUMBER ERROR
    // if your database has a unique stock-number constraint
    // ---------------------------------------------------------

    if (
      message.includes('ORA-00001') &&
      message
        .toUpperCase()
        .includes('STOCK')
    ) {
      return NextResponse.json(
        {
          error:
            'This stock number already exists. Please use a different stock number.',
        },
        {
          status: 409,
        }
      );
    }

    // ---------------------------------------------------------
    // OTHER DATABASE / SERVER ERROR
    // ---------------------------------------------------------

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to save vehicle.',
      },
      {
        status: 500,
      }
    );
  } finally {
    // ---------------------------------------------------------
    // ALWAYS CLEAR TENANT CONTEXT BEFORE RETURNING
    // CONNECTION TO POOL
    // ---------------------------------------------------------

    if (connection) {
      try {
        await connection.execute(
          `
          BEGIN
            DEALERHUB_SECURITY_PKG.CLEAR_CONTEXT;
          END;
          `
        );
      } catch (clearError) {
        console.error(
          'Unable to clear tenant context:',
          clearError
        );
      }

      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          'Unable to close Oracle connection:',
          closeError
        );
      }
    }
  }
}