'use client';

import AdminShell from '@/components/admin/AdminShell';
import { BusyIndicator, SuccessNotice, UploadProgress } from '@/components/admin/OperationStatus';
import { uploadWithProgress } from '@/lib/upload-with-progress';
import ConfirmModal from '@/components/admin/ConfirmModal';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type VehicleForm = {
  stockNumber: string;
  vin: string;
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
  titleStatus: string;
  vehicleStatus: string;
  description: string;
  askingPrice: string;
  minAcceptablePrice: string;
  cashPrice: string;
  financingPrice: string;
  public: boolean;
  featured: boolean;
};

type VehiclePhoto = {
  VEHICLE_PHOTO_ID: number;
  VEHICLE_ID: number;
  IMAGE_URL: string;
  THUMBNAIL_URL: string | null;
  STORAGE_PROVIDER?: string | null;
  STORAGE_OBJECT_KEY?: string | null;
  DISPLAY_ORDER: number;
  PRIMARY_YN: string;
  PHOTO_TYPE: string | null;
  ALT_TEXT: string | null;
};

const emptyForm: VehicleForm = {
  stockNumber: '',
  vin: '',
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
  titleStatus: '',
  vehicleStatus: 'AVAILABLE',
  description: '',
  askingPrice: '',
  minAcceptablePrice: '',
  cashPrice: '',
  financingPrice: '',
  public: true,
  featured: false,
};

export default function EditVehiclePage() {
  const params = useParams();
  const router = useRouter();

  const vehicleId = String(params.vehicleId || '');

  const [form, setForm] =
    useState<VehicleForm>(emptyForm);

  const [photos, setPhotos] =
    useState<VehiclePhoto[]>([]);

  const [newPhotos, setNewPhotos] =
    useState<File[]>([]);

  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const [pendingDeletePhotoId, setPendingDeletePhotoId] =
    useState<number | null>(null);

  useEffect(() => {
    loadPage();
  }, [vehicleId]);

  async function loadPage() {
    setLoading(true);
    setError('');

    try {
      await Promise.all([
        loadVehicle(),
        loadPhotos(),
      ]);
    } catch (err: any) {
      setError(
        err?.message ||
        'Unable to load vehicle.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadVehicle() {
    const response = await fetch(
      `/api/v1/vehicles/${vehicleId}`,
      {
        cache: 'no-store',
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        'Unable to load vehicle.'
      );
    }

    const v = result.vehicle;

    setForm({
      stockNumber:
        toText(v.STOCK_NUMBER),

      vin:
        toText(v.VIN),

      year:
        toText(v.YEAR),

      make:
        toText(v.MAKE),

      model:
        toText(v.MODEL),

      trim:
        toText(v.TRIM),

      mileage:
        toText(v.MILEAGE),

      exteriorColor:
        toText(v.EXTERIOR_COLOR),

      interiorColor:
        toText(v.INTERIOR_COLOR),

      transmission:
        toText(v.TRANSMISSION),

      engine:
        toText(v.ENGINE),

      fuelType:
        toText(v.FUEL_TYPE),

      bodyStyle:
        toText(v.BODY_STYLE),

      driveType:
        toText(v.DRIVE_TYPE),

      titleStatus:
        toText(v.TITLE_STATUS),

      vehicleStatus:
        toText(v.VEHICLE_STATUS) ||
        'AVAILABLE',

      description:
        toText(v.DESCRIPTION),

      askingPrice:
        toText(v.ASKING_PRICE),

      minAcceptablePrice:
        toText(v.MIN_ACCEPTABLE_PRICE),

      cashPrice:
        toText(v.CASH_PRICE),

      financingPrice:
        toText(v.FINANCING_PRICE),

      public:
        v.PUBLIC_YN === 'Y',

      featured:
        v.FEATURED_YN === 'Y',
    });
  }

  async function loadPhotos() {
    const response = await fetch(
      `/api/vehicles/${vehicleId}/images`,
      {
        cache: 'no-store',
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        'Unable to load photos.'
      );
    }

    setPhotos(
      result.photos || []
    );
  }

  function setField<
    K extends keyof VehicleForm
  >(
    field: K,
    value: VehicleForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function saveChanges(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(
        `/api/v1/vehicles/${vehicleId}`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(form),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          'Unable to update vehicle.'
        );
      }

      setMessage(
        'Vehicle updated successfully.'
      );

      router.refresh();
    } catch (err: any) {
      setError(
        err?.message ||
        'Unable to update vehicle.'
      );
    } finally {
      setSaving(false);
    }
  }

  function choosePhotos(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError('');

    const selected =
      Array.from(
        event.target.files || []
      );

    if (selected.length > 20) {
      setError(
        'Maximum 20 photos per upload.'
      );
      return;
    }

    for (const file of selected) {
      if (
        file.size >
        8 * 1024 * 1024
      ) {
        setError(
          `${file.name} is larger than 8 MB.`
        );
        return;
      }

      if (
        ![
          'image/jpeg',
          'image/png',
          'image/webp',
        ].includes(file.type)
      ) {
        setError(
          `${file.name}: only JPG, PNG and WebP are allowed.`
        );
        return;
      }
    }

    setNewPhotos(selected);
  }

  async function uploadPhotos() {
    if (
      newPhotos.length === 0
    ) {
      setError(
        'Choose at least one photo first.'
      );
      return;
    }

    setUploading(true);
    setMessage('');
    setError('');

    try {
      const data =
        new FormData();

      newPhotos.forEach(
        (photo) => {
          data.append(
            'photos',
            photo
          );
        }
      );

      const response = await uploadWithProgress(`/api/vehicles/${vehicleId}/images`, data, setUploadPercent);

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          'Photo upload failed.'
        );
      }

      setNewPhotos([]);

      setMessage(
        `${result.uploaded.length} photo(s) uploaded successfully.`
      );

      await loadPhotos();

      router.refresh();
    } catch (err: any) {
      setError(
        err?.message ||
        'Unable to upload photos.'
      );
    } finally {
      setUploading(false);
    }
  }

  async function setPrimaryPhoto(
    photoId: number
  ) {
    setMessage('');
    setError('');

    try {
      const response = await fetch(
        `/api/vehicles/${vehicleId}/images/${photoId}`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            action:
              'setPrimary',
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          'Unable to set primary photo.'
        );
      }

      setMessage(
        'Primary photo updated.'
      );

      await loadPhotos();

      router.refresh();
    } catch (err: any) {
      setError(
        err?.message ||
        'Unable to set primary photo.'
      );
    }
  }

  function deletePhoto(photoId: number) {
    setPendingDeletePhotoId(photoId);
  }

  async function confirmDeletePhoto() {
    const photoId = pendingDeletePhotoId;
    if (photoId == null) return;

    setPendingDeletePhotoId(null);
    setMessage('');
    setError('');

    try {
      const response = await fetch(
        `/api/vehicles/${vehicleId}/images/${photoId}`,
        {
          method: 'DELETE',
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          'Unable to delete photo.'
        );
      }

      setMessage(
        'Photo removed.'
      );

      await loadPhotos();

      router.refresh();
    } catch (err: any) {
      setError(
        err?.message ||
        'Unable to remove photo.'
      );
    }
  }

  if (loading) {
    return (
      <AdminShell title="Edit Vehicle" subtitle={`Vehicle #${vehicleId}`}>
        <div style={cardStyle}>
          <BusyIndicator label="Loading vehicle…" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Edit Vehicle" subtitle={`Vehicle #${vehicleId}`}>
      <div className="dh-form-page">
        {saving && <div className="adm-card"><BusyIndicator label="Saving vehicle changes…" /></div>}
        <div
          style={{
            marginBottom: '25px',
          }}
        >
          <div style={eyebrowStyle}>
            DealerHub Admin
          </div>

          <h1
            style={{
              marginBottom: '8px',
            }}
          >
            Edit Vehicle
          </h1>

          <div
            style={{
              color: '#64748b',
            }}
          >
            Vehicle #{vehicleId}
          </div>
        </div>

        {error && !form.vin ? (
          <div style={errorStyle}>
            {error}
          </div>
        ) : (
          <form
            onSubmit={saveChanges}
            style={cardStyle}
          >
            <h2>
              Vehicle Information
            </h2>

            <div style={gridStyle}>
              <Field
                label="Stock Number"
                value={
                  form.stockNumber
                }
                onChange={(v) =>
                  setField(
                    'stockNumber',
                    v
                  )
                }
              />

              <Field
                label="VIN"
                value={form.vin}
                onChange={(v) =>
                  setField(
                    'vin',
                    v.toUpperCase()
                  )
                }
              />

              <Field
                label="Year"
                type="number"
                value={form.year}
                onChange={(v) =>
                  setField(
                    'year',
                    v
                  )
                }
              />

              <Field
                label="Make"
                value={form.make}
                onChange={(v) =>
                  setField(
                    'make',
                    v
                  )
                }
              />

              <Field
                label="Model"
                value={form.model}
                onChange={(v) =>
                  setField(
                    'model',
                    v
                  )
                }
              />

              <Field
                label="Trim"
                value={form.trim}
                onChange={(v) =>
                  setField(
                    'trim',
                    v
                  )
                }
              />

              <Field
                label="Mileage"
                type="number"
                value={form.mileage}
                onChange={(v) =>
                  setField(
                    'mileage',
                    v
                  )
                }
              />

              <Field
                label="Exterior Color"
                value={
                  form.exteriorColor
                }
                onChange={(v) =>
                  setField(
                    'exteriorColor',
                    v
                  )
                }
              />

              <Field
                label="Interior Color"
                value={
                  form.interiorColor
                }
                onChange={(v) =>
                  setField(
                    'interiorColor',
                    v
                  )
                }
              />

              <Field
                label="Transmission"
                value={
                  form.transmission
                }
                onChange={(v) =>
                  setField(
                    'transmission',
                    v
                  )
                }
              />

              <Field
                label="Engine"
                value={form.engine}
                onChange={(v) =>
                  setField(
                    'engine',
                    v
                  )
                }
              />

              <Field
                label="Fuel Type"
                value={form.fuelType}
                onChange={(v) =>
                  setField(
                    'fuelType',
                    v
                  )
                }
              />

              <Field
                label="Body Style"
                value={form.bodyStyle}
                onChange={(v) =>
                  setField(
                    'bodyStyle',
                    v
                  )
                }
              />

              <Field
                label="Drive Type"
                value={form.driveType}
                onChange={(v) =>
                  setField(
                    'driveType',
                    v
                  )
                }
              />

              <Field
                label="Title Status"
                value={
                  form.titleStatus
                }
                onChange={(v) =>
                  setField(
                    'titleStatus',
                    v
                  )
                }
              />
            </div>

            <Divider />

            <h2>Pricing</h2>

            <div style={gridStyle}>
              <Field
                label="Asking Price"
                type="number"
                value={
                  form.askingPrice
                }
                onChange={(v) =>
                  setField(
                    'askingPrice',
                    v
                  )
                }
              />

              <Field
                label="Minimum Acceptable Price"
                type="number"
                value={
                  form.minAcceptablePrice
                }
                onChange={(v) =>
                  setField(
                    'minAcceptablePrice',
                    v
                  )
                }
              />

              <Field
                label="Cash Price"
                type="number"
                value={
                  form.cashPrice
                }
                onChange={(v) =>
                  setField(
                    'cashPrice',
                    v
                  )
                }
              />

              <Field
                label="Financing Price"
                type="number"
                value={
                  form.financingPrice
                }
                onChange={(v) =>
                  setField(
                    'financingPrice',
                    v
                  )
                }
              />
            </div>

            <Divider />

            <h2>Status</h2>

            <label style={labelStyle}>
              Vehicle Status

              <select
                value={
                  form.vehicleStatus
                }
                onChange={(e) =>
                  setField(
                    'vehicleStatus',
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="AVAILABLE">
                  Available
                </option>

                <option value="RESERVED">
                  Reserved
                </option>

                <option value="PENDING">
                  Pending
                </option>

                <option value="SOLD">
                  Sold
                </option>

                <option value="WHOLESALE">
                  Wholesale
                </option>

                <option value="HOLD">
                  Hold
                </option>

                <option value="ARCHIVED">
                  Archived
                </option>
              </select>
            </label>

            <div
              style={{
                display: 'flex',
                gap: '25px',
                marginTop: '20px',
                flexWrap: 'wrap',
              }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={
                    form.public
                  }
                  onChange={(e) =>
                    setField(
                      'public',
                      e.target.checked
                    )
                  }
                />{' '}
                Show on website
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={
                    form.featured
                  }
                  onChange={(e) =>
                    setField(
                      'featured',
                      e.target.checked
                    )
                  }
                />{' '}
                Featured vehicle
              </label>
            </div>

            <Divider />

            <h2>Description</h2>

            <textarea
              rows={6}
              value={
                form.description
              }
              onChange={(e) =>
                setField(
                  'description',
                  e.target.value
                )
              }
              style={{
                ...inputStyle,
                width: '100%',
                boxSizing:
                  'border-box',
                resize: 'vertical',
              }}
            />

            <Divider />

            <h2>Vehicle Photos</h2>

            {photos.length === 0 ? (
              <div
                style={{
                  color: '#64748b',
                  marginBottom:
                    '20px',
                }}
              >
                No photos uploaded yet.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: '18px',
                  marginBottom:
                    '25px',
                }}
              >
                {photos.map(
                  (photo) => (
                    <div
                      key={
                        photo.VEHICLE_PHOTO_ID
                      }
                      style={{
                        border:
                          photo.PRIMARY_YN ===
                          'Y'
                            ? '2px solid #16a34a'
                            : '1px solid #cbd5e1',
                        borderRadius:
                          '10px',
                        overflow:
                          'hidden',
                        background:
                          '#ffffff',
                      }}
                    >
                      <img
                        src={
                          photo.THUMBNAIL_URL ||
                          photo.IMAGE_URL
                        }
                        alt={
                          photo.ALT_TEXT ||
                          'Vehicle photo'
                        }
                        style={{
                          width:
                            '100%',
                          height:
                            '145px',
                          objectFit:
                            'cover',
                          display:
                            'block',
                        }}
                      />

                      <div
                        style={{
                          padding:
                            '12px',
                        }}
                      >
                        {photo.PRIMARY_YN ===
                        'Y' ? (
                          <div
                            style={{
                              color:
                                '#16a34a',
                              fontWeight:
                                700,
                              fontSize:
                                '12px',
                              marginBottom:
                                '8px',
                            }}
                          >
                            PRIMARY PHOTO
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setPrimaryPhoto(
                                photo.VEHICLE_PHOTO_ID
                              )
                            }
                            style={
                              smallDarkButton
                            }
                          >
                            Make Primary
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            deletePhoto(
                              photo.VEHICLE_PHOTO_ID
                            )
                          }
                          style={
                            smallDeleteButton
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            <div
              style={
                uploadBoxStyle
              }
            >
              <strong>
                Add More Photos
              </strong>

              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp"
                onChange={
                  choosePhotos
                }
              />

              <div
                style={{
                  fontSize:
                    '13px',
                  color:
                    '#64748b',
                }}
              >
                JPG, PNG or WebP.
                Maximum 20 photos per
                upload, 8 MB each.
              </div>

              {newPhotos.length >
                0 && (
                <div
                  style={{
                    color:
                      '#16a34a',
                    fontWeight:
                      700,
                  }}
                >
                  {
                    newPhotos.length
                  }{' '}
                  photo(s) selected
                </div>
              )}

              <button
                type="button"
                disabled={
                  uploading ||
                  newPhotos.length ===
                    0
                }
                onClick={
                  uploadPhotos
                }
                style={{
                  ...uploadButton,
                  opacity:
                    uploading ||
                    newPhotos.length ===
                      0
                      ? 0.6
                      : 1,
                }}
              >
                {uploading ? <BusyIndicator label="Uploading…" /> : 'Upload Photos'}
              </button>
            </div>

            {uploading && <UploadProgress percent={uploadPercent} count={newPhotos.length} />}
            {message && (
              <div
                style={
                  successStyle
                }
              >
                <SuccessNotice message={message} />
              </div>
            )}

            {error && (
              <div
                style={errorStyle}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop:
                  '28px',
                flexWrap:
                  'wrap',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/inventory'
                  )
                }
                style={
                  cancelButton
                }
              >
                Back to Inventory
              </button>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...saveButton,
                  opacity:
                    saving
                      ? 0.65
                      : 1,
                }}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Vehicle Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    
      <ConfirmModal
        open={pendingDeletePhotoId != null}
        title="Remove Photo?"
        message="This permanently removes the photo from this vehicle. This cannot be undone."
        confirmLabel="Remove Photo"
        cancelLabel="Cancel"
        onCancel={() => setPendingDeletePhotoId(null)}
        onConfirm={() => { void confirmDeletePhoto(); }}
      />
    </AdminShell>
  );
}

function toText(input: any) {
  if (
    input === null ||
    input === undefined
  ) {
    return '';
  }

  return String(input);
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
}) {
  return (
    <label
      style={labelStyle}
    >
      {label}

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        style={inputStyle}
      />
    </label>
  );
}

function Divider() {
  return (
    <hr
      style={{
        border: 0,
        borderTop:
          '1px solid #e2e8f0',
        margin:
          '30px 0',
      }}
    />
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f1f5f9',
  padding: '40px 20px',
  fontFamily:
    'Arial, sans-serif',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1050px',
  margin: '0 auto',
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border:
    '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '30px',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '18px',
};

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: '6px',
  fontSize: '13px',
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  padding: '11px 12px',
  border:
    '1px solid #cbd5e1',
  borderRadius: '7px',
  fontSize: '15px',
  background: '#ffffff',
};

const eyebrowStyle: React.CSSProperties = {
  color: '#16a34a',
  fontSize: '13px',
  fontWeight: 700,
  textTransform:
    'uppercase',
  letterSpacing: '1px',
};

const successStyle: React.CSSProperties = {
  marginTop: '20px',
  padding: '14px',
  background: '#ecfdf5',
  border:
    '1px solid #bbf7d0',
  borderRadius: '7px',
};

const errorStyle: React.CSSProperties = {
  marginTop: '20px',
  padding: '14px',
  background: '#fef2f2',
  border:
    '1px solid #fecaca',
  borderRadius: '7px',
};

const uploadBoxStyle: React.CSSProperties = {
  display: 'grid',
  gap: '12px',
  background: '#f8fafc',
  border:
    '1px dashed #94a3b8',
  borderRadius: '10px',
  padding: '20px',
};

const uploadButton: React.CSSProperties = {
  padding: '11px 18px',
  border: 0,
  borderRadius: '7px',
  background: '#16a34a',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer',
};

const smallDarkButton: React.CSSProperties = {
  width: '100%',
  marginBottom: '8px',
  padding: '8px',
  border: 0,
  borderRadius: '6px',
  background: '#0f172a',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer',
};

const smallDeleteButton: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  border:
    '1px solid #fecaca',
  borderRadius: '6px',
  background: '#ffffff',
  color: '#b91c1c',
  fontWeight: 700,
  cursor: 'pointer',
};

const saveButton: React.CSSProperties = {
  padding: '13px 25px',
  border: 0,
  borderRadius: '7px',
  background: '#16a34a',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer',
};

const cancelButton: React.CSSProperties = {
  padding: '13px 25px',
  border:
    '1px solid #cbd5e1',
  borderRadius: '7px',
  background: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer',
};