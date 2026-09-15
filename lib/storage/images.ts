import { createHash } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';

export type StorageProvider = 'cloudinary' | 'oracle_object_storage';

export type UploadVehicleImageParams = {
  buffer: Buffer;
  contentType: string;
  tenantId: number | string;
  vehicleId: number | string;
  filename: string;
};

export type UploadVehicleImageResult = {
  publicUrl: string;
  thumbnailUrl: string;
  publicId?: string;
  storageKey?: string;
};

function getStorageProvider(): StorageProvider {
  const raw = (process.env.STORAGE_PROVIDER || 'cloudinary').trim().toLowerCase();
  if (raw === 'oracle_object_storage') return 'oracle_object_storage';
  return 'cloudinary';
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || 'image';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.length > 0 ? cleaned : 'image';
}

function ensureUniqueFilename(filename: string): string {
  const safe = sanitizeFilename(filename);
  const dot = safe.lastIndexOf('.');
  const stamp = Date.now().toString(36);
  const rand = createHash('sha1').update(`${safe}-${stamp}-${Math.random()}`).digest('hex').slice(0, 8);
  if (dot <= 0) return `${safe}-${stamp}-${rand}`;
  const name = safe.slice(0, dot);
  const ext = safe.slice(dot);
  return `${name}-${stamp}-${rand}${ext}`;
}

let cloudinaryConfigured = false;

function configureCloudinary(): void {
  if (cloudinaryConfigured) return;
  cloudinary.config({
    cloud_name: requireEnv('CLOUDINARY_CLOUD_NAME'),
    api_key: requireEnv('CLOUDINARY_API_KEY'),
    api_secret: requireEnv('CLOUDINARY_API_SECRET'),
    secure: true,
  });
  cloudinaryConfigured = true;
}

async function uploadToCloudinary(
  params: UploadVehicleImageParams
): Promise<UploadVehicleImageResult> {
  configureCloudinary();

  const folder = `dealerhub/tenant-${params.tenantId}/vehicles/${params.vehicleId}`;
  const publicIdBase = sanitizeFilename(params.filename).replace(/\.[^.]+$/, '') || 'image';

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    eager?: Array<{ secure_url?: string }>;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${publicIdBase}-${Date.now().toString(36)}`,
        resource_type: 'image',
        overwrite: false,
        fetch_format: 'auto',
        quality: 'auto',
        eager: [
          {
            width: 400,
            height: 300,
            crop: 'fill',
            fetch_format: 'auto',
            quality: 'auto',
          },
        ],
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error || new Error('Cloudinary upload failed'));
          return;
        }
        resolve(uploadResult as {
          secure_url: string;
          public_id: string;
          eager?: Array<{ secure_url?: string }>;
        });
      }
    );
    stream.end(params.buffer);
  });

  const thumbnailUrl =
    result.eager?.[0]?.secure_url ||
    cloudinary.url(result.public_id, {
      width: 400,
      height: 300,
      crop: 'fill',
      fetch_format: 'auto',
      quality: 'auto',
      secure: true,
    });

  return {
    publicUrl: result.secure_url,
    thumbnailUrl,
    publicId: result.public_id,
  };
}

function getOciS3Client(): { client: S3Client; bucket: string; publicBaseUrl: string } {
  const endpoint = requireEnv('OCI_S3_ENDPOINT');
  const region = process.env.OCI_S3_REGION?.trim() || 'us-ashburn-1';
  const accessKeyId = requireEnv('OCI_S3_ACCESS_KEY');
  const secretAccessKey = requireEnv('OCI_S3_SECRET_KEY');
  const bucket = requireEnv('OCI_S3_BUCKET');
  const publicBaseUrl = requireEnv('OCI_S3_PUBLIC_BASE_URL').replace(/\/+$/, '');

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucket, publicBaseUrl };
}

async function uploadToOracleObjectStorage(
  params: UploadVehicleImageParams
): Promise<UploadVehicleImageResult> {
  const { client, bucket, publicBaseUrl } = getOciS3Client();
  const uniqueName = ensureUniqueFilename(params.filename);
  const key = `tenant-${params.tenantId}/vehicles/${params.vehicleId}/${uniqueName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType,
    })
  );

  const publicUrl = `${publicBaseUrl}/${key}`;

  return {
    publicUrl,
    thumbnailUrl: publicUrl,
    storageKey: key,
  };
}

export async function uploadVehicleImage(
  params: UploadVehicleImageParams
): Promise<UploadVehicleImageResult> {
  if (!params.buffer || params.buffer.length === 0) {
    throw new Error('Image buffer is empty');
  }

  const provider = getStorageProvider();
  if (provider === 'oracle_object_storage') {
    return uploadToOracleObjectStorage(params);
  }
  return uploadToCloudinary(params);
}

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  if (!publicId) return;
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

export async function deleteOracleObjectStorageImage(storageKey: string): Promise<void> {
  if (!storageKey) return;
  const { client, bucket } = getOciS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    })
  );
}

export async function deleteUploadedVehicleImage(options: {
  publicId?: string;
  storageKey?: string;
}): Promise<void> {
  const provider = getStorageProvider();
  if (provider === 'cloudinary' && options.publicId) {
    await deleteCloudinaryImage(options.publicId);
    return;
  }
  if (provider === 'oracle_object_storage' && options.storageKey) {
    await deleteOracleObjectStorageImage(options.storageKey);
  }
}
