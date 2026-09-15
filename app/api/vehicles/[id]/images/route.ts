import { requireAdminSession } from '@/lib/admin-auth';
import { denyIfDealerBillingBlocked } from '@/lib/billing/http-guard';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { Connection } from 'oracledb';

import { getOracleConnection } from '@/lib/db';
import { uploadVehicleImage } from '@/lib/storage/images';

import {
  assertVehicleExistsForTenant,
  getCurrentTenantId,
  getVehiclePhotoCount,
  insertVehiclePhoto,
  listVehiclePhotos,
} from '@/lib/vehicle-photos';

export const runtime = 'nodejs';

const MAX_FILES = 20;
const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

type UploadedPhotoResponse = {
  imageUrl: string;
  thumbnailUrl: string;
  primary: boolean;
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

function parseVehicleId(
  raw: string
): number | null {
  const id = Number.parseInt(raw, 10);

  if (
    !Number.isFinite(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

async function collectUploadFiles(
  formData: FormData
): Promise<File[]> {
  const files: File[] = [];

  const photos =
    formData.getAll('photos');

  for (const entry of photos) {
    if (
      entry instanceof File &&
      entry.size > 0
    ) {
      files.push(entry);
    }
  }

  if (files.length === 0) {
    const single =
      formData.get('photo') ??
      formData.get('file');

    if (
      single instanceof File &&
      single.size > 0
    ) {
      files.push(single);
    }
  }

  return files;
}

async function clearContextAndClose(
  connection: Connection
): Promise<void> {
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
   GET VEHICLE PHOTOS
   ============================================================ */

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id: rawId } =
    await params;

  const vehicleId =
    parseVehicleId(rawId);

  if (vehicleId === null) {
    return NextResponse.json(
      {
        error:
          'Invalid vehicle id.',
      },
      {
        status: 400,
      }
    );
  }

  const headerStore =
    await headers();

  const host = normalizeHost(
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

  const connection =
    await getOracleConnection();

  try {
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
      Oracle VPD protects this lookup.
      A tenant cannot see another tenant's vehicle.
    */
    const exists =
      await assertVehicleExistsForTenant(
        connection,
        vehicleId
      );

    if (!exists) {
      return NextResponse.json(
        {
          error:
            'Vehicle not found.',
        },
        {
          status: 404,
        }
      );
    }

    const photos =
      await listVehiclePhotos(
        connection,
        vehicleId
      );

    return NextResponse.json({
      success: true,
      photos,
    });
  } catch (error) {
    console.error(
      '[vehicles/[id]/images] GET failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Failed to list vehicle photos.',
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
   POST / UPLOAD VEHICLE PHOTOS
   ============================================================ */

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const billingBlock = await denyIfDealerBillingBlocked(request, new URL(request.url).pathname);
  if (billingBlock) return billingBlock;

  const adminSession = await requireAdminSession(request);
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: rawId } =
    await params;

  const vehicleId =
    parseVehicleId(rawId);

  if (vehicleId === null) {
    return NextResponse.json(
      {
        error:
          'Invalid vehicle id.',
      },
      {
        status: 400,
      }
    );
  }

  const headerStore =
    await headers();

  const host = normalizeHost(
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

  let formData: FormData;

  try {
    formData =
      await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          'Expected multipart form data.',
      },
      {
        status: 400,
      }
    );
  }

  const files =
    await collectUploadFiles(
      formData
    );

  if (files.length === 0) {
    return NextResponse.json(
      {
        error:
          'No photos provided.',
      },
      {
        status: 400,
      }
    );
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      {
        error:
          `Too many files. Maximum is ${MAX_FILES}.`,
      },
      {
        status: 400,
      }
    );
  }

  for (const file of files) {
    const contentType =
      (file.type || '')
        .toLowerCase();

    if (
      !ALLOWED_TYPES.has(
        contentType
      )
    ) {
      return NextResponse.json(
        {
          error:
            `${file.name}: only JPG, PNG, and WebP are allowed.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.size >
      MAX_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            `${file.name}: maximum size is 8 MB.`,
        },
        {
          status: 400,
        }
      );
    }
  }

  const connection =
    await getOracleConnection();

  const uploaded:
    UploadedPhotoResponse[] = [];

  /*
    Used for cleanup if storage upload succeeds
    but Oracle insert/commit fails.
  */
  const storedObjects: Array<{
    publicId?: string;
    storageKey?: string;
  }> = [];

  try {
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
    // VERIFY VEHICLE BELONGS TO CURRENT TENANT
    // ---------------------------------------------------------

    const exists =
      await assertVehicleExistsForTenant(
        connection,
        vehicleId
      );

    if (!exists) {
      return NextResponse.json(
        {
          error:
            'Vehicle not found.',
        },
        {
          status: 404,
        }
      );
    }

    // ---------------------------------------------------------
    // GET TENANT ID FROM ORACLE SESSION CONTEXT
    // ---------------------------------------------------------

    const tenantId =
      await getCurrentTenantId(
        connection
      );

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Unable to determine tenant.',
        },
        {
          status: 400,
        }
      );
    }

    // ---------------------------------------------------------
    // COUNT CURRENT PHOTOS
    // ---------------------------------------------------------

    const existingCount =
      await getVehiclePhotoCount(
        connection,
        vehicleId
      );

    // ---------------------------------------------------------
    // UPLOAD EACH FILE
    // ---------------------------------------------------------

    for (
      let i = 0;
      i < files.length;
      i++
    ) {
      const file =
        files[i];

      const contentType =
        (
          file.type ||
          'image/jpeg'
        ).toLowerCase();

      const buffer =
        Buffer.from(
          await file.arrayBuffer()
        );

      const filename =
        file.name &&
        file.name.trim()
          ? file.name
          : `vehicle-${vehicleId}-${Date.now()}.jpg`;

      // -------------------------------------------------------
      // SEND IMAGE TO EXTERNAL STORAGE
      //
      // STORAGE_PROVIDER decides Cloudinary or OCI.
      // -------------------------------------------------------

      const stored =
        await uploadVehicleImage({
          buffer,
          contentType,
          tenantId,
          vehicleId,
          filename,
        });

      storedObjects.push({
        publicId:
          stored.publicId,

        storageKey:
          stored.storageKey,
      });

      const isPrimary =
        existingCount === 0 &&
        i === 0;

      const displayOrder =
        existingCount +
        i +
        1;

      // -------------------------------------------------------
      // DETERMINE STORAGE PROVIDER
      // -------------------------------------------------------

      const storageProvider =
        stored.publicId
          ? 'CLOUDINARY'
          : stored.storageKey
            ? 'OCI'
            : 'UNKNOWN';

      const storageObjectKey =
        stored.publicId ||
        stored.storageKey ||
        null;

      // -------------------------------------------------------
      // SAVE PHOTO METADATA IN ORACLE
      // -------------------------------------------------------

      await insertVehiclePhoto(
        connection,
        {
          vehicleId,

          imageUrl:
            stored.publicUrl,

          thumbnailUrl:
            stored.thumbnailUrl,

          storageProvider,

          storageObjectKey,

          displayOrder,

          primaryYn:
            isPrimary
              ? 'Y'
              : 'N',

          altText:
            `Vehicle ${vehicleId}`,

          photoType:
            'EXTERIOR',
        }
      );

      uploaded.push({
        imageUrl:
          stored.publicUrl,

        thumbnailUrl:
          stored.thumbnailUrl,

        primary:
          isPrimary,
      });
    }

    // ---------------------------------------------------------
    // COMMIT ORACLE PHOTO RECORDS
    // ---------------------------------------------------------

    await connection.commit();

    // ---------------------------------------------------------
    // REFRESH PAGES
    // ---------------------------------------------------------

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
      uploaded,
    });
  } catch (error) {
    // ---------------------------------------------------------
    // ROLLBACK DATABASE IF SOMETHING FAILED
    // ---------------------------------------------------------

    try {
      await connection.rollback();
    } catch {}

    console.error(
      '[vehicles/[id]/images] POST failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to upload vehicle images.',
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