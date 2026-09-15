import oracledb, {
  Connection,
  Result,
} from 'oracledb';

export type VehiclePhoto = {
  VEHICLE_PHOTO_ID: number;
  TENANT_ID?: number;
  VEHICLE_ID: number;

  IMAGE_URL: string;
  THUMBNAIL_URL: string | null;

  STORAGE_PROVIDER: string | null;
  STORAGE_OBJECT_KEY: string | null;

  DISPLAY_ORDER: number;
  PRIMARY_YN: string;
  PHOTO_TYPE: string;
  ALT_TEXT: string | null;
};

export type InsertVehiclePhotoParams = {
  vehicleId: number;

  imageUrl: string;
  thumbnailUrl: string;

  storageProvider: string;
  storageObjectKey: string | null;

  displayOrder: number;
  primaryYn: 'Y' | 'N';

  altText?: string | null;
  photoType?: string;
};

/* ============================================================
   VERIFY VEHICLE EXISTS FOR CURRENT TENANT

   Oracle VPD automatically filters VEHICLES.
   ============================================================ */

export async function assertVehicleExistsForTenant(
  connection: Connection,
  vehicleId: number
): Promise<boolean> {
  const result: Result<{ CNT: number }> =
    await connection.execute(
      `
      SELECT COUNT(*) AS CNT
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

  const count =
    Number(
      result.rows?.[0]?.CNT ?? 0
    );

  return count === 1;
}

/* ============================================================
   GET TENANT ID FROM ORACLE SESSION CONTEXT
   ============================================================ */

export async function getCurrentTenantId(
  connection: Connection
): Promise<number> {
  const result =
    await connection.execute(
      `
      SELECT
        TO_NUMBER(
          SYS_CONTEXT(
            'DEALERHUB_CTX',
            'TENANT_ID'
          )
        ) AS TENANT_ID
      FROM DUAL
      `,
      {},
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );

  const row =
    result.rows?.[0] as
      | { TENANT_ID?: number }
      | undefined;

  return Number(
    row?.TENANT_ID ?? 0
  );
}

/* ============================================================
   COUNT PHOTOS FOR VEHICLE
   ============================================================ */

export async function getVehiclePhotoCount(
  connection: Connection,
  vehicleId: number
): Promise<number> {
  const result: Result<{ CNT: number }> =
    await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM VEHICLE_PHOTOS
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

  return Number(
    result.rows?.[0]?.CNT ?? 0
  );
}

/* ============================================================
   LIST VEHICLE PHOTOS

   Oracle VPD protects VEHICLE_PHOTOS.
   ============================================================ */

export async function listVehiclePhotos(
  connection: Connection,
  vehicleId: number
): Promise<VehiclePhoto[]> {
  const result: Result<VehiclePhoto> =
    await connection.execute(
      `
      SELECT
        VEHICLE_PHOTO_ID,
        TENANT_ID,
        VEHICLE_ID,

        IMAGE_URL,
        THUMBNAIL_URL,

        STORAGE_PROVIDER,
        STORAGE_OBJECT_KEY,

        DISPLAY_ORDER,
        PRIMARY_YN,
        PHOTO_TYPE,
        ALT_TEXT

      FROM VEHICLE_PHOTOS

      WHERE VEHICLE_ID = :vehicleId

      ORDER BY
        CASE
          WHEN PRIMARY_YN = 'Y'
          THEN 0
          ELSE 1
        END,
        DISPLAY_ORDER,
        VEHICLE_PHOTO_ID
      `,
      {
        vehicleId,
      },
      {
        outFormat:
          oracledb.OUT_FORMAT_OBJECT,
      }
    );

  return result.rows ?? [];
}

/* ============================================================
   INSERT PHOTO METADATA

   Browser never sends TENANT_ID.

   TENANT_ID = 0 is replaced by our Oracle tenant trigger.
   ============================================================ */

export async function insertVehiclePhoto(
  connection: Connection,
  params: InsertVehiclePhotoParams
): Promise<void> {
  await connection.execute(
    `
    INSERT INTO VEHICLE_PHOTOS
    (
      TENANT_ID,
      VEHICLE_ID,

      IMAGE_URL,
      THUMBNAIL_URL,

      STORAGE_PROVIDER,
      STORAGE_OBJECT_KEY,

      DISPLAY_ORDER,
      PRIMARY_YN,
      PHOTO_TYPE,
      ALT_TEXT
    )
    VALUES
    (
      0,
      :vehicleId,

      :imageUrl,
      :thumbnailUrl,

      :storageProvider,
      :storageObjectKey,

      :displayOrder,
      :primaryYn,
      :photoType,
      :altText
    )
    `,
    {
      vehicleId:
        params.vehicleId,

      imageUrl:
        params.imageUrl,

      thumbnailUrl:
        params.thumbnailUrl,

      storageProvider:
        params.storageProvider,

      storageObjectKey:
        params.storageObjectKey,

      displayOrder:
        params.displayOrder,

      primaryYn:
        params.primaryYn,

      photoType:
        params.photoType ||
        'EXTERIOR',

      altText:
        params.altText ?? null,
    }
  );
}