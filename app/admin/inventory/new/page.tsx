'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { BusyIndicator, SuccessNotice, UploadProgress } from '@/components/admin/OperationStatus';
import { uploadWithProgress } from '@/lib/upload-with-progress';
import QuickAddPanel from '@/components/admin/QuickAddPanel';
import type { QuickAddFormSnapshot } from '@/lib/quick-add';

type FormState = {
  vin: string;
  stockNumber: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  mileage: string;
  exteriorColor: string;
  interiorColor: string;
  transmission: string;
  engine: string;
  fuelType: string;
  bodyStyle: string;
  driveType: string;
  askingPrice: string;
  cashPrice: string;
  financingPrice: string;
  description: string;
  featured: boolean;
  vehicleStatus: string;
  public: boolean;
};

const initialForm: FormState = {
  vin: '',
  stockNumber: '',
  year: '',
  make: '',
  model: '',
  trim: '',
  mileage: '',
  exteriorColor: '',
  interiorColor: '',
  transmission: '',
  engine: '',
  fuelType: '',
  bodyStyle: '',
  driveType: '',
  askingPrice: '',
  cashPrice: '',
  financingPrice: '',
  description: '',
  featured: false,
  vehicleStatus: 'AVAILABLE',
  public: true,
};

export default function AddVehiclePage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [decodedSnapshot, setDecodedSnapshot] =
    useState<QuickAddFormSnapshot>({});
  const [photos, setPhotos] = useState<File[]>([]);

  const [decoding, setDecoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [vinLocked, setVinLocked] = useState(false);
  const [lastSuccessfulDecodeVin, setLastSuccessfulDecodeVin] =
    useState('');
  const [draftResetKey, setDraftResetKey] = useState(0);
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const decodeSeqRef = useRef(0);
  const lastAutoAttemptVinRef = useRef('');
  const decodeInFlightRef = useRef(false);
  const [duplicateHit, setDuplicateHit] = useState<{
    id: number;
    stockNumber: string;
    year: string;
    make: string;
    model: string;
    trim: string;
  } | null>(null);
  const [checkingVin, setCheckingVin] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function setField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  const decodeVin = useCallback(async (rawVin?: string, opts?: { force?: boolean }) => {
    setMessage('');
    setError('');

    const vin = String(rawVin ?? form.vin).trim().toUpperCase();
    const force = !!opts?.force;

    if (vin.length !== 17) {
      setError('Enter a valid 17-character VIN.');
      return;
    }

    if (!force && vin === lastSuccessfulDecodeVin && vinLocked) {
      return;
    }

    if (decodeInFlightRef.current && !force) {
      return;
    }

    // Early tenant-safe duplicate check before decode/create path
    setCheckingVin(true);
    try {
      const lookupRes = await fetch(
        `/api/v1/vehicles/by-vin?vin=${encodeURIComponent(vin)}`,
        { method: 'GET', cache: 'no-store' }
      );
      const lookup = await lookupRes.json().catch(() => ({}));
      if (!lookupRes.ok) {
        throw new Error(lookup.error || 'Unable to check VIN in inventory.');
      }
      if (lookup.exists && lookup.vehicle?.id) {
        setDuplicateHit({
          id: Number(lookup.vehicle.id),
          stockNumber: String(lookup.vehicle.stockNumber || ''),
          year: String(lookup.vehicle.year || ''),
          make: String(lookup.vehicle.make || ''),
          model: String(lookup.vehicle.model || ''),
          trim: String(lookup.vehicle.trim || ''),
        });
        setVinLocked(false);
        setLastSuccessfulDecodeVin('');
        setDecodedSnapshot({});
        lastAutoAttemptVinRef.current = vin;
        setMessage('');
        setError('');
        return;
      }
      setDuplicateHit(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to check VIN in inventory.');
      lastAutoAttemptVinRef.current = vin;
      return;
    } finally {
      setCheckingVin(false);
    }

    const seq = ++decodeSeqRef.current;
    decodeInFlightRef.current = true;
    setDecoding(true);

    try {
      const response = await fetch('/api/v1/vin/decode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vin }),
      });

      const data = await response.json();

      if (seq !== decodeSeqRef.current) return;

      if (!response.ok) {
        throw new Error(
          data.error || 'VIN decode failed.'
        );
      }

      const vehicle = data.vehicle;

      const nextDecoded: QuickAddFormSnapshot = {
        year: vehicle.year?.toString() || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        trim: vehicle.trim || '',
        engine: vehicle.engine || '',
        transmission: vehicle.transmission || '',
        fuelType: vehicle.fuelType || '',
        bodyStyle: vehicle.bodyStyle || '',
        driveType: vehicle.driveType || '',
      };

      setDecodedSnapshot(nextDecoded);
      setLastSuccessfulDecodeVin(vin);
      setVinLocked(true);
      setHighlightedFields([]);
      setDuplicateHit(null);
      lastAutoAttemptVinRef.current = vin;

      setForm((previous) => ({
        ...previous,
        vin,
        year: String(nextDecoded.year ?? ''),
        make: String(nextDecoded.make ?? ''),
        model: String(nextDecoded.model ?? ''),
        trim: String(nextDecoded.trim ?? ''),
        engine: String(nextDecoded.engine ?? ''),
        transmission: String(nextDecoded.transmission ?? ''),
        fuelType: String(nextDecoded.fuelType ?? ''),
        bodyStyle: String(nextDecoded.bodyStyle ?? ''),
        driveType: String(nextDecoded.driveType ?? ''),
      }));

      setMessage(
        'VIN decoded successfully. Review the information below.'
      );
    } catch (err: any) {
      if (seq !== decodeSeqRef.current) return;
      setVinLocked(false);
      setLastSuccessfulDecodeVin('');
      setDecodedSnapshot({});
      lastAutoAttemptVinRef.current = vin;
      setError(
        err?.message || 'Unable to decode VIN.'
      );
    } finally {
      if (seq === decodeSeqRef.current) {
        decodeInFlightRef.current = false;
        setDecoding(false);
      }
    }
  }, [form.vin, lastSuccessfulDecodeVin, vinLocked]);

  function changeVin() {
    decodeSeqRef.current += 1;
    decodeInFlightRef.current = false;
    lastAutoAttemptVinRef.current = '';
    setVinLocked(false);
    setLastSuccessfulDecodeVin('');
    setDecodedSnapshot({});
    setDuplicateHit(null);
    setHighlightedFields([]);
    setDraftResetKey((k) => k + 1);
    setMessage('');
    setError('');
    setForm((previous) => ({
      ...previous,
      vin: '',
      year: '',
      make: '',
      model: '',
      trim: '',
      engine: '',
      transmission: '',
      fuelType: '',
      bodyStyle: '',
      driveType: '',
    }));
  }

  function onVinInputChange(value: string) {
    const next = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
    if (vinLocked) return;
    // New digits after a failed attempt → allow auto-decode again
    if (next !== lastAutoAttemptVinRef.current) {
      lastAutoAttemptVinRef.current = '';
    }
    setField('vin', next);
    setHighlightedFields([]);
  }

  useEffect(() => {
    if (vinLocked || decoding || saving || checkingVin || duplicateHit) return;
    if (decodeInFlightRef.current) return;
    const vin = form.vin.trim().toUpperCase();
    if (vin.length !== 17) return;
    if (vin === lastSuccessfulDecodeVin) return;
    // Prevent stuck/flicker: do not auto-retry same VIN after failure
    if (vin === lastAutoAttemptVinRef.current) return;

    const t = window.setTimeout(() => {
      if (decodeInFlightRef.current) return;
      lastAutoAttemptVinRef.current = vin;
      void decodeVin(vin);
    }, 350);

    return () => window.clearTimeout(t);
  }, [form.vin, vinLocked, decoding, saving, checkingVin, duplicateHit, lastSuccessfulDecodeVin, decodeVin]);

  useEffect(() => {
    if (highlightedFields.length === 0) return;
    const first = highlightedFields[0];
    const el = document.querySelector(`[data-field="${first}"]`);
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const t = window.setTimeout(() => setHighlightedFields([]), 4000);
    return () => window.clearTimeout(t);
  }, [highlightedFields]);

  function choosePhotos(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError('');

    const selected = Array.from(
      event.target.files || []
    );

    if (selected.length > 20) {
      setError(
        'Maximum 20 photos per vehicle.'
      );

      event.target.value = '';
      return;
    }

    for (const file of selected) {
      if (file.size > 8 * 1024 * 1024) {
        setError(
          `${file.name} is larger than 8 MB.`
        );

        event.target.value = '';
        return;
      }
    }

    setPhotos(selected);
  }

  async function saveVehicle(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (duplicateHit) {
      setError(
        'VEHICLE ALREADY EXISTS IN YOUR INVENTORY. Use VIEW VEHICLE, EDIT VEHICLE, or CHANGE VIN.'
      );
      setMessage('');
      return;
    }

    setMessage('');
    setError('');
    setSaving(true);

    try {
      /*
        STEP 1
        Save vehicle to Oracle.
      */

      setMessage('Saving vehicle...');

      const vehicleResponse = await fetch(
        '/api/v1/vehicles',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify(form),
        }
      );

      const vehicleResult =
        await vehicleResponse.json();

      if (!vehicleResponse.ok) {
        throw new Error(
          vehicleResult.error ||
          'Vehicle save failed.'
        );
      }

      const vehicleId =
        vehicleResult.vehicleId;

      if (!vehicleId) {
        throw new Error(
          'Vehicle saved but no vehicle ID was returned.'
        );
      }

      /*
        STEP 2
        Upload selected photos.
      */

      if (photos.length > 0) {
        setPhotoUploading(true);
        setUploadPercent(null);
        setMessage(
          `Vehicle saved. Uploading ${photos.length} photo(s)...`
        );

        const photoData =
          new FormData();

        photoData.append(
          'vehicleId',
          String(vehicleId)
        );

        photos.forEach((photo) => {
          photoData.append(
            'photos',
            photo
          );
        });

        const photoResponse =
          await uploadWithProgress(`/api/vehicles/${vehicleId}/images`, photoData, setUploadPercent);

        const photoResult =
          await photoResponse.json();

        if (!photoResponse.ok) {
          throw new Error(
            `Vehicle saved successfully, but photo upload failed: ${
              photoResult.error ||
              'Unknown photo error'
            }`
          );
        }
      }

      /*
        STEP 3
        Done.
      */

      setMessage(
        `Vehicle ${vehicleId} added successfully.`
      );

      setTimeout(() => {
        router.push('/inventory');
        router.refresh();
      }, 700);
    } catch (err: any) {
      setError(
        err?.message ||
        'Unable to add vehicle.'
      );
    } finally {
      setPhotoUploading(false);
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Add Vehicle" subtitle="Decode, price, and prepare your next listing">
      <div className="dh-form-page">
        {(decoding || checkingVin) && <div className="adm-card"><BusyIndicator label={checkingVin ? 'Checking your inventory for this VIN…' : 'Decoding vehicle details…'} /></div>}
        {saving && <div className="adm-card">{photoUploading ? <UploadProgress percent={uploadPercent} count={photos.length} /> : <BusyIndicator label="Saving your vehicle…" />}</div>}
        <form
          onSubmit={saveVehicle}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '30px',
          }}
        >
          {/* VIN */}

          <SectionTitle>
            1. VIN Decode
          </SectionTitle>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <input
              value={form.vin}
              maxLength={17}
              placeholder="17-character VIN"
              disabled={vinLocked || decoding || saving}
              onChange={(event) => onVinInputChange(event.target.value)}
              style={{
                ...inputStyle,
                flex: 1,
                minWidth: 'min(250px, 100%)',
                background: vinLocked ? '#f1f5f9' : '#fff',
              }}
            />

            {vinLocked ? (
              <>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>✓ VIN locked</span>
                <button
                  type="button"
                  disabled={saving || decoding}
                  onClick={changeVin}
                  style={{
                    ...darkButton,
                    background: '#fff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  Change VIN
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={decoding || saving || checkingVin || form.vin.trim().length !== 17}
                onClick={() => { lastAutoAttemptVinRef.current = ''; void decodeVin(undefined, { force: true }); }}
                style={darkButton}
              >
                {checkingVin
                  ? 'Checking...'
                  : decoding
                    ? 'Decoding...'
                    : error
                      ? 'Retry Decode'
                      : 'Decode VIN'}
              </button>
            )}
          </div>

          {vinLocked ? (
            <div
              style={{
                marginTop: 16,
                padding: '14px 16px',
                borderRadius: 10,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
              }}
            >
              <div style={{ fontWeight: 800, color: '#065f46', marginBottom: 6 }}>
                Decoded from VIN
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {[form.year, form.make, form.model, form.trim]
                  .filter(Boolean)
                  .join(' ') || 'Vehicle'}
              </div>
              <div style={{ marginTop: 6, color: '#334155', fontSize: 14 }}>
                {[form.engine, form.transmission, form.driveType, form.fuelType]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          ) : null}


          {checkingVin ? (
            <p style={{ marginTop: 12, color: '#64748b', fontWeight: 600 }}>
              Checking inventory for this VIN…
            </p>
          ) : null}

          {duplicateHit ? (
            <div
              style={{
                marginTop: 16,
                padding: '16px 18px',
                borderRadius: 10,
                background: '#fef2f2',
                border: '1px solid #fecaca',
              }}
            >
              <div style={{ fontWeight: 800, color: '#991b1b', marginBottom: 8 }}>
                VEHICLE ALREADY EXISTS IN YOUR INVENTORY
              </div>
              <div style={{ color: '#0f172a', fontWeight: 700, marginBottom: 6 }}>
                {[duplicateHit.year, duplicateHit.make, duplicateHit.model, duplicateHit.trim]
                  .filter(Boolean)
                  .join(' ') || 'Existing vehicle'}
              </div>
              {duplicateHit.stockNumber ? (
                <div style={{ color: '#475569', marginBottom: 12 }}>
                  Stock #{duplicateHit.stockNumber}
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a
                  href={`/vehicle/${duplicateHit.id}`}
                  style={{
                    ...darkButton,
                    display: 'inline-flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                  }}
                >
                  VIEW VEHICLE
                </a>
                <a
                  href={`/admin/inventory/${duplicateHit.id}/edit`}
                  style={{
                    ...darkButton,
                    display: 'inline-flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    background: '#334155',
                  }}
                >
                  EDIT VEHICLE
                </a>
                <button
                  type="button"
                  onClick={changeVin}
                  style={{
                    ...darkButton,
                    background: '#fff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  CHANGE VIN
                </button>
              </div>
            </div>
          ) : null}

          <QuickAddPanel
            form={form}
            decodedSnapshot={decodedSnapshot}
            decodeSucceeded={vinLocked && !!lastSuccessfulDecodeVin && !duplicateHit}
            disabled={saving || decoding || checkingVin || !!duplicateHit}
            draftResetKey={draftResetKey}
            onApply={(patch) => {
              const keys = Object.keys(patch);
              setForm((previous) => ({
                ...previous,
                ...patch,
              }));
              setHighlightedFields(keys);
              setMessage(
                'Quick Add applied to the form. Nothing saved yet — click Add Vehicle to create.'
              );
            }}
          />

          <Divider />

          {/* VEHICLE */}

          <SectionTitle>
            2. Vehicle Information
          </SectionTitle>

          <div style={gridStyle}>
            <Field
              label="Stock Number"
              fieldKey="stockNumber"
              highlighted={highlightedFields.includes('stockNumber')}
              value={form.stockNumber}
              onChange={(value) =>
                setField(
                  'stockNumber',
                  value
                )
              }
            />

            <Field
              label="Year"
              fieldKey="year"
              highlighted={highlightedFields.includes('year')}
              type="number"
              value={form.year}
              onChange={(value) =>
                setField('year', value)
              }
            />

            <Field
              label="Make"
              fieldKey="make"
              highlighted={highlightedFields.includes('make')}
              value={form.make}
              onChange={(value) =>
                setField('make', value)
              }
            />

            <Field
              label="Model"
              fieldKey="model"
              highlighted={highlightedFields.includes('model')}
              value={form.model}
              onChange={(value) =>
                setField('model', value)
              }
            />

            <Field
              label="Trim"
              fieldKey="trim"
              highlighted={highlightedFields.includes('trim')}
              value={form.trim}
              onChange={(value) =>
                setField('trim', value)
              }
            />

            <Field
              label="Mileage"
              fieldKey="mileage"
              highlighted={highlightedFields.includes('mileage')}
              type="number"
              value={form.mileage}
              onChange={(value) =>
                setField('mileage', value)
              }
            />

            <Field
              label="Exterior Color"
              fieldKey="exteriorColor"
              highlighted={highlightedFields.includes('exteriorColor')}
              value={form.exteriorColor}
              onChange={(value) =>
                setField(
                  'exteriorColor',
                  value
                )
              }
            />

            <Field
              label="Interior Color"
              fieldKey="interiorColor"
              highlighted={highlightedFields.includes('interiorColor')}
              value={form.interiorColor}
              onChange={(value) =>
                setField(
                  'interiorColor',
                  value
                )
              }
            />

            <Field
              label="Transmission"
              fieldKey="transmission"
              highlighted={highlightedFields.includes('transmission')}
              value={form.transmission}
              onChange={(value) =>
                setField(
                  'transmission',
                  value
                )
              }
            />

            <Field
              label="Engine"
              fieldKey="engine"
              highlighted={highlightedFields.includes('engine')}
              value={form.engine}
              onChange={(value) =>
                setField('engine', value)
              }
            />

            <Field
              label="Fuel Type"
              fieldKey="fuelType"
              highlighted={highlightedFields.includes('fuelType')}
              value={form.fuelType}
              onChange={(value) =>
                setField(
                  'fuelType',
                  value
                )
              }
            />

            <Field
              label="Body Style"
              fieldKey="bodyStyle"
              highlighted={highlightedFields.includes('bodyStyle')}
              value={form.bodyStyle}
              onChange={(value) =>
                setField(
                  'bodyStyle',
                  value
                )
              }
            />

            <Field
              label="Drive Type"
              fieldKey="driveType"
              highlighted={highlightedFields.includes('driveType')}
              value={form.driveType}
              onChange={(value) =>
                setField(
                  'driveType',
                  value
                )
              }
            />
          </div>

          <Divider />

          {/* PRICE */}

          <SectionTitle>
            3. Pricing
          </SectionTitle>

          <div style={gridStyle}>
            <Field
              label="Asking Price"
              fieldKey="askingPrice"
              highlighted={highlightedFields.includes('askingPrice')}
              type="number"
              value={form.askingPrice}
              onChange={(value) =>
                setField(
                  'askingPrice',
                  value
                )
              }
            />

            <Field
              label="Cash Price"
              fieldKey="cashPrice"
              highlighted={highlightedFields.includes('cashPrice')}
              type="number"
              value={form.cashPrice}
              onChange={(value) =>
                setField(
                  'cashPrice',
                  value
                )
              }
            />

            <Field
              label="Financing Price"
              fieldKey="financingPrice"
              highlighted={highlightedFields.includes('financingPrice')}
              type="number"
              value={form.financingPrice}
              onChange={(value) =>
                setField(
                  'financingPrice',
                  value
                )
              }
            />
          </div>

          <Divider />

          {/* PHOTOS */}

          <SectionTitle>
            4. Vehicle Photos
          </SectionTitle>

          <div
            style={{
              background: '#f8fafc',
              border: '1px dashed #94a3b8',
              borderRadius: '10px',
              padding: '24px',
            }}
          >
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              disabled={saving}
              onChange={choosePhotos}
            />

            <p
              style={{
                color: '#64748b',
                fontSize: '13px',
                marginBottom: 0,
              }}
            >
              Up to 20 photos. JPG, PNG or WebP. Maximum 8 MB each.
            </p>

            {photos.length > 0 && (
              <div
                style={{
                  marginTop: '15px',
                  fontWeight: 700,
                  color: '#16a34a',
                }}
              >
                {photos.length} photo(s) selected
              </div>
            )}
          </div>

          <Divider />

          {/* DESCRIPTION */}

          <SectionTitle>
            5. Description
          </SectionTitle>

          <textarea
            rows={5}
            value={form.description}
            disabled={saving}
            onChange={(event) =>
              setField(
                'description',
                event.target.value
              )
            }
            style={{
              ...inputStyle,
              width: '100%',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />

          <label
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              marginTop: '18px',
            }}
          >
            <input
              type="checkbox"
              checked={form.featured}
              disabled={saving}
              onChange={(event) =>
                setField(
                  'featured',
                  event.target.checked
                )
              }
            />

            Featured vehicle
          </label>

          <label
            style={{
              display: 'block',
              marginTop: '18px',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            Status
            <select
              value={form.vehicleStatus}
              disabled={saving}
              onChange={(event) =>
                setField('vehicleStatus', event.target.value)
              }
              style={{
                display: 'block',
                width: '100%',
                marginTop: '8px',
                padding: '10px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
              }}
            >
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
              <option value="PENDING">Pending</option>
              <option value="SOLD">Sold</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="HOLD">Hold</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>

          <label
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              marginTop: '18px',
            }}
          >
            <input
              type="checkbox"
              checked={form.public}
              disabled={saving}
              onChange={(event) =>
                setField('public', event.target.checked)
              }
            />
            Show on website
          </label>

          {/* STATUS */}

          {message && !error && (
            <div
              style={{
                marginTop: '25px',
                padding: '14px',
                background: '#ecfdf5',
                border: '1px solid #bbf7d0',
                borderRadius: '7px',
              }}
            >
              {saving ? <span role="status">{message}</span> : <SuccessNotice message={message} />}
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: '25px',
                padding: '14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '7px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !!duplicateHit || checkingVin}
            style={{
              width: '100%',
              marginTop: '28px',
              padding: '16px',
              border: 0,
              borderRadius: '8px',
              background: duplicateHit ? '#94a3b8' : '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '17px',
              cursor: saving || duplicateHit || checkingVin
                ? 'not-allowed'
                : 'pointer',
              opacity: saving || duplicateHit || checkingVin
                ? 0.65
                : 1,
            }}
          >
            {saving
              ? 'Adding Vehicle...'
              : duplicateHit
                ? 'Add Vehicle blocked — VIN already in inventory'
                : 'Add Vehicle to Inventory'}
          </button>
        </form>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  fieldKey,
  highlighted,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  fieldKey?: string;
  highlighted?: boolean;
}) {
  return (
    <label data-field={fieldKey || undefined}>
      <div
        style={{
          marginBottom: '6px',
          fontSize: '13px',
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={{
          ...inputStyle,
          width: '100%',
          boxSizing: 'border-box',
          outline: highlighted ? '3px solid #22c55e' : undefined,
          background: highlighted ? '#f0fdf4' : undefined,
          transition: 'outline 0.2s, background 0.2s',
        }}
      />
    </label>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h2
      style={{
        fontSize: '20px',
        margin: '0 0 18px',
      }}
    >
      {children}
    </h2>
  );
}

function Divider() {
  return (
    <hr
      style={{
        border: 0,
        borderTop: '1px solid #e2e8f0',
        margin: '30px 0',
      }}
    />
  );
}

const inputStyle: React.CSSProperties = {
  padding: '11px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: '7px',
  fontSize: '15px',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(min(210px, 100%), 1fr))',
  gap: '18px',
};

const darkButton: React.CSSProperties = {
  padding: '11px 22px',
  border: 0,
  borderRadius: '7px',
  background: '#0f172a',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer',
};