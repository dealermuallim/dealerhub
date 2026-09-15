'use client';

import AdminShell from '@/components/admin/AdminShell';
import { BusyIndicator, SuccessNotice, UploadProgress } from '@/components/admin/OperationStatus';
import { uploadWithProgress } from '@/lib/upload-with-progress';
import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type VehicleSummary = {
  VEHICLE_ID: number;
  YEAR: number | null;
  MAKE: string | null;
  MODEL: string | null;
  STOCK_NUMBER: string | null;
};

function VehiclePhotosPage() {
  const searchParams = useSearchParams();
  const linkedId = (searchParams.get('vehicleId') || '').trim();
  const deepLinked = Boolean(linkedId);

  const [vehicleId, setVehicleId] = useState(linkedId);
  const [vehicle, setVehicle] = useState<VehicleSummary | null>(null);
  const [photoCount, setPhotoCount] = useState<number | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    if (linkedId && linkedId !== vehicleId) {
      setVehicleId(linkedId);
    }
  }, [linkedId, vehicleId]);

  useEffect(() => {
    const id = vehicleId.trim();
    if (!id) {
      setVehicle(null);
      setPhotoCount(null);
      return;
    }

    let cancelled = false;
    setLoadingMeta(true);

    (async () => {
      try {
        const [vRes, pRes] = await Promise.all([
          fetch(`/api/v1/vehicles/${id}`),
          fetch(`/api/vehicles/${id}/images`),
        ]);
        if (cancelled) return;

        if (vRes.ok) {
          const vJson = await vRes.json();
          const v = vJson.vehicle;
          setVehicle(
            v
              ? {
                  VEHICLE_ID: Number(v.VEHICLE_ID),
                  YEAR: v.YEAR ?? null,
                  MAKE: v.MAKE ?? null,
                  MODEL: v.MODEL ?? null,
                  STOCK_NUMBER: v.STOCK_NUMBER ?? null,
                }
              : null
          );
        } else {
          setVehicle(null);
        }

        if (pRes.ok) {
          const pJson = await pRes.json();
          const list = pJson.photos || pJson || [];
          setPhotoCount(Array.isArray(list) ? list.length : 0);
        } else {
          setPhotoCount(null);
        }
      } catch {
        if (!cancelled) {
          setVehicle(null);
          setPhotoCount(null);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  async function uploadPhotos(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return;
    setSuccess(false);

    if (!vehicleId) {
      setMessage('Enter vehicle ID.');
      return;
    }

    if (!files || files.length === 0) {
      setMessage('Choose photos.');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const data = new FormData();
      data.append('vehicleId', vehicleId);
      Array.from(files).forEach((file) => {
        data.append('photos', file);
      });

      const response = await uploadWithProgress(`/api/vehicles/${vehicleId}/images`, data, setUploadPercent);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setMessage(`${result.uploaded.length} photo(s) uploaded successfully.`);
      setSuccess(true);
      setFiles(null);
      if (fileInput.current) fileInput.current.value = '';

      const pRes = await fetch(`/api/vehicles/${vehicleId}/images`);
      if (pRes.ok) {
        const pJson = await pRes.json();
        const list = pJson.photos || pJson || [];
        setPhotoCount(Array.isArray(list) ? list.length : 0);
      }
    } catch (error: any) {
      setMessage(error?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  const titleName = vehicle
    ? [vehicle.YEAR, vehicle.MAKE, vehicle.MODEL].filter(Boolean).join(' ')
    : null;

  return (
    <AdminShell title="Vehicle Photos" subtitle="Great photos help your vehicles stand out">
      <section className="adm-card dh-form-page">
      <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <Link href="/admin/inventory" style={{ color: '#0f172a', fontWeight: 600 }}>
          ← Back to Inventory
        </Link>
        {vehicleId ? (
          <Link
            href={`/admin/inventory/${vehicleId}/edit`}
            style={{ color: '#16a34a', fontWeight: 700 }}
          >
            Edit Vehicle
          </Link>
        ) : null}
      </div>

      <h1 style={{ margin: '0 0 8px' }}>Vehicle Photos</h1>

      {loadingMeta ? (
        <BusyIndicator label="Loading vehicle…" />
      ) : titleName ? (
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            {titleName}
          </div>
          <div style={{ color: '#64748b', marginTop: 4 }}>
            {vehicle?.STOCK_NUMBER ? `Stock #${vehicle.STOCK_NUMBER}` : 'Stock # —'}
          </div>
        </div>
      ) : deepLinked ? (
        <p style={{ color: '#b45309' }}>Could not load vehicle {linkedId}.</p>
      ) : (
        <p style={{ color: '#64748b' }}>Select a vehicle to manage photos.</p>
      )}

      {vehicleId && photoCount === 0 ? (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '18px',
            color: '#475569',
          }}
        >
          No photos uploaded yet
        </div>
      ) : null}

      <form
        onSubmit={uploadPhotos}
        style={{
          display: 'grid',
          gap: '18px',
        }}
      >
        {!deepLinked ? (
          <label>
            <div>Vehicle ID</div>
            <input
              disabled={uploading}
              type="number"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
              }}
            />
          </label>
        ) : null}

        <label>
          <div>Photos</div>
          <input
            ref={fileInput}
            disabled={uploading}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            style={{
              width: '100%',
              padding: '10px',
            }}
          />
        </label>

        <button
          type="submit"
          disabled={uploading || !vehicleId || !files?.length}
          style={{
            padding: '12px 16px',
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: uploading ? 'wait' : 'pointer',
          }}
        >
          {uploading ? <BusyIndicator label="Uploading…" /> : 'Upload Photos'}
        </button>
      </form>

      {uploading && <UploadProgress percent={uploadPercent} count={files?.length || 0} />}
      {message && (success ? <SuccessNotice message={message} /> : <p role="alert" style={{ color: '#b91c1c' }}>{message}</p>)}
      </section>
    </AdminShell>
  );
}
export default function VehiclePhotosPageGate() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: '700px', margin: '50px auto', padding: '25px', fontFamily: 'Arial, sans-serif' }}>
          Loading…
        </main>
      }
    >
      <VehiclePhotosPage />
    </Suspense>
  );
}