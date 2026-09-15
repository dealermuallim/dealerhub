import { requireAdminSession } from '@/lib/admin-auth';
import { denyIfDealerBillingBlocked } from '@/lib/billing/http-guard';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import oracledb from 'oracledb';

import { getOracleConnection } from '@/lib/db';

import {
  deleteCloudinaryImage,
  deleteOracleObjectStorageImage,
} from '@/lib/storage/images';

type RouteParams = {
  params: Promise<{
    id: string;
    photoId: string;
  }>;
};

function normalizeHost(
  hostHeader: string | null
): string | null {
  if (!hostHeader) {
    return null;
  }

  return hostHeader
    .split(':')[0]
    .toLowerCase();
}

function parseId(
  value: string
): number | null {
  const id =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

async function clearContextAndClose(
  connection:
    | oracledb.Connection
    | undefined
) {
  if (!connection) {
    return;
  }

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

/* ============================================================
   PATCH
   MAKE PHOTO PRIMARY
   ============================================================ */

export async function PATCH(req: Request,
  { params }: RouteParams
) {
  const billingBlock = await denyIfDealerBillingBlocked(req, new URL(req.url).pathname);
  if (billingBlock) return billingBlock;

  const adminSession = await requireAdminSession(req);
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let connection:
    | oracledb.Connection
    | undefined;

  try {
    const {
      id: rawVehicleId,
      photoId: rawPhotoId,
    } = await params;

    const vehicleId =
      parseId(rawVehicleId);

    const photoId =
      parseId(rawPhotoId);

    if (
      vehicleId === null ||
      photoId === null
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid vehicle or photo ID.',
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await req.json();

    if (
      body.action !==
      'setPrimary'
    ) {
      return NextResponse.json(
        {
          error:
            'Unsupported photo action.',
        },
        {
          status: 400,
        }
      );
    }

    const headerStore =
      await headers();

    const host =
      normalizeHost(
        headerStore.get('host')
      );

    if (!host) {
      return NextResponse.json(
        {
          error:
            'Missing Host header.',
        },
        {
          status: 400,
        }
      );
    }

    connection =
      await getOracleConnection();

    // ---------------------------------------------------------
    // SET TENANT CONTEXT
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
    // VERIFY PHOTO BELONGS TO THIS VEHICLE AND TENANT
    //
    // VPD protects VEHICLE_PHOTOS automatically.
    // ---------------------------------------------------------

    const photoResult =
      await connection.execute(
        `
        SELECT
          VEHICLE_PHOTO_ID,
          VEHICLE_ID
        FROM VEHICLE_PHOTOS
        WHERE VEHICLE_PHOTO_ID = :photoId
          AND VEHICLE_ID = :vehicleId
        `,
        {
          photoId,
          vehicleId,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );

    if (
      !photoResult.rows ||
      photoResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'Photo not found for this vehicle.',
        },
        {
          status: 404,
        }
      );
    }

    // ---------------------------------------------------------
    // REMOVE CURRENT PRIMARY
    // ---------------------------------------------------------

    await connection.execute(
      `
      UPDATE VEHICLE_PHOTOS
      SET PRIMARY_YN = 'N'
      WHERE VEHICLE_ID = :vehicleId
      `,
      {
        vehicleId,
      }
    );

    // ---------------------------------------------------------
    // SET SELECTED PHOTO PRIMARY
    // ---------------------------------------------------------

    await connection.execute(
      `
      UPDATE VEHICLE_PHOTOS
      SET PRIMARY_YN = 'Y'
      WHERE VEHICLE_PHOTO_ID = :photoId
        AND VEHICLE_ID = :vehicleId
      `,
      {
        photoId,
        vehicleId,
      }
    );

    await connection.commit();

    revalidatePath(
      '/inventory'
    );

    revalidatePath(
      `/vehicle/${vehicleId}`
    );

    revalidatePath(
      `/admin/inventory/${vehicleId}/edit`
    );

    return NextResponse.json({
      success: true,
      vehicleId,
      photoId,
    });
  } catch (error: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    console.error(
      'Set primary photo failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to set primary photo.',
      },
      {
        status: 500,
      }
    );
  } finally {
    await clearContextAndClose(
      connection
    );
  }
}

/* ============================================================
   DELETE
   REMOVE PHOTO FROM STORAGE + ORACLE
   ============================================================ */

export async function DELETE(
  _request: Request,
  { params }: RouteParams
) {
  const billingBlock = await denyIfDealerBillingBlocked(_request, new URL(_request.url).pathname);
  if (billingBlock) return billingBlock;

  const adminSession = await requireAdminSession(_request);
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let connection:
    | oracledb.Connection
    | undefined;

  try {
    const {
      id: rawVehicleId,
      photoId: rawPhotoId,
    } = await params;

    const vehicleId =
      parseId(rawVehicleId);

    const photoId =
      parseId(rawPhotoId);

    if (
      vehicleId === null ||
      photoId === null
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid vehicle or photo ID.',
        },
        {
          status: 400,
        }
      );
    }

    const headerStore =
      await headers();

    const host =
      normalizeHost(
        headerStore.get('host')
      );

    if (!host) {
      return NextResponse.json(
        {
          error:
            'Missing Host header.',
        },
        {
          status: 400,
        }
      );
    }

    connection =
      await getOracleConnection();

    // ---------------------------------------------------------
    // SET TENANT CONTEXT
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
    // LOAD PHOTO METADATA
    //
    // VPD ensures another tenant cannot access this row.
    // ---------------------------------------------------------

    const photoResult =
      await connection.execute(
        `
        SELECT
          VEHICLE_PHOTO_ID,
          VEHICLE_ID,
          STORAGE_PROVIDER,
          STORAGE_OBJECT_KEY,
          PRIMARY_YN
        FROM VEHICLE_PHOTOS
        WHERE VEHICLE_PHOTO_ID = :photoId
          AND VEHICLE_ID = :vehicleId
        `,
        {
          photoId,
          vehicleId,
        },
        {
          outFormat:
            oracledb.OUT_FORMAT_OBJECT,
        }
      );

    if (
      !photoResult.rows ||
      photoResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'Photo not found for this vehicle.',
        },
        {
          status: 404,
        }
      );
    }

    const photo =
      photoResult.rows[0] as {
        STORAGE_PROVIDER:
          | string
          | null;

        STORAGE_OBJECT_KEY:
          | string
          | null;

        PRIMARY_YN:
          string;
      };

    const provider =
      String(
        photo.STORAGE_PROVIDER ||
        ''
      ).toUpperCase();

    const objectKey =
      String(
        photo.STORAGE_OBJECT_KEY ||
        ''
      );

    const wasPrimary =
      photo.PRIMARY_YN === 'Y';

    // ---------------------------------------------------------
    // DELETE FROM EXTERNAL STORAGE FIRST
    // ---------------------------------------------------------

    if (
      provider ===
        'CLOUDINARY' &&
      objectKey
    ) {
      await deleteCloudinaryImage(
        objectKey
      );
    }

    if (
      provider === 'OCI' &&
      objectKey
    ) {
      await deleteOracleObjectStorageImage(
        objectKey
      );
    }

    // ---------------------------------------------------------
    // DELETE ORACLE METADATA
    // ---------------------------------------------------------

    await connection.execute(
      `
      DELETE FROM VEHICLE_PHOTOS
      WHERE VEHICLE_PHOTO_ID = :photoId
        AND VEHICLE_ID = :vehicleId
      `,
      {
        photoId,
        vehicleId,
      }
    );

    // ---------------------------------------------------------
    // IF PRIMARY WAS REMOVED,
    // PROMOTE NEXT AVAILABLE PHOTO
    // ---------------------------------------------------------

    if (wasPrimary) {
      await connection.execute(
        `
        UPDATE VEHICLE_PHOTOS
        SET PRIMARY_YN = 'Y'
        WHERE VEHICLE_PHOTO_ID =
        (
          SELECT VEHICLE_PHOTO_ID
          FROM VEHICLE_PHOTOS
          WHERE VEHICLE_ID = :vehicleId
          ORDER BY
            DISPLAY_ORDER,
            VEHICLE_PHOTO_ID
          FETCH FIRST 1 ROW ONLY
        )
        `,
        {
          vehicleId,
        }
      );
    }

    await connection.commit();

    revalidatePath(
      '/inventory'
    );

    revalidatePath(
      `/vehicle/${vehicleId}`
    );

    revalidatePath(
      `/admin/inventory/${vehicleId}/edit`
    );

    return NextResponse.json({
      success: true,
      vehicleId,
      photoId,
    });
  } catch (error: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    console.error(
      'Delete vehicle photo failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to delete photo.',
      },
      {
        status: 500,
      }
    );
  } finally {
    await clearContextAndClose(
      connection
    );
  }
}