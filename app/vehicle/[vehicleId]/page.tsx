import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPublicTenantByHost } from '@/lib/tenant';
import {
  getPublicVehicleByHostAndId,
  getPublicVehiclePhotosByHostAndId,
} from '@/lib/vehicles';
import VehiclePhotoGallery from '@/components/vehicle/VehiclePhotoGallery';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ vehicleId: string }>;
};

export default async function PublicVehiclePage({
  params,
}: PageProps) {
  const { vehicleId: rawId } = await params;
  const vehicleId = Number(rawId);

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    notFound();
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || 'localhost';

  let tenant;
  let vehicle;
  let photos;

  try {
    tenant = await getPublicTenantByHost(host);
    vehicle = await getPublicVehicleByHostAndId(host, vehicleId);
    photos = vehicle
      ? await getPublicVehiclePhotosByHostAndId(host, vehicleId)
      : [];
  } catch (error) {
    console.error('Public vehicle page failed:', error);
    return (
      <main style={simplePageStyle}>
        <h1>Vehicle unavailable</h1>
        <p>We could not load this vehicle right now.</p>
        <Link href="/inventory">Back to inventory</Link>
      </main>
    );
  }

  if (!tenant || !vehicle) {
    notFound();
  }

  const primary = tenant.PRIMARY_COLOR || '#0F172A';
  const secondary = tenant.SECONDARY_COLOR || '#16A34A';

  const vehicleName = [
    vehicle.YEAR,
    vehicle.MAKE,
    vehicle.MODEL,
    vehicle.TRIM,
  ]
    .filter(Boolean)
    .join(' ');

  const gallery =
    photos.length > 0
      ? photos
      : vehicle.PRIMARY_IMAGE_URL
        ? [
            {
              VEHICLE_PHOTO_ID: 0,
              IMAGE_URL: vehicle.PRIMARY_IMAGE_URL,
              THUMBNAIL_URL: vehicle.PRIMARY_IMAGE_URL,
              DISPLAY_ORDER: 1,
              PRIMARY_YN: 'Y',
              ALT_TEXT: vehicleName,
            },
          ]
        : [];

  const keyFactSpecs = [
    { label: 'Stock #', value: vehicle.STOCK_NUMBER },
    {
      label: 'Mileage',
      value:
        vehicle.MILEAGE !== null
          ? `${Number(vehicle.MILEAGE).toLocaleString()} miles`
          : null,
    },
    { label: 'Exterior', value: vehicle.EXTERIOR_COLOR },
    { label: 'Interior', value: vehicle.INTERIOR_COLOR },
  ];

  const detailFactSpecs = [
    { label: 'Transmission', value: vehicle.TRANSMISSION },
    { label: 'Engine', value: vehicle.ENGINE },
    { label: 'Fuel', value: vehicle.FUEL_TYPE },
    { label: 'Body', value: vehicle.BODY_STYLE },
    { label: 'Drive', value: vehicle.DRIVE_TYPE },
    { label: 'VIN', value: vehicle.VIN },
  ];

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <header
        style={{
          background: primary,
          color: '#ffffff',
          padding: '18px 28px',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            width: '100%',
            minWidth: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '22px',
            }}
          >
            {tenant.WEBSITE_TITLE || tenant.DEALER_NAME}
          </Link>

          <nav style={{ display: 'flex', gap: '18px' }}>
            <Link href="/inventory" style={headerLinkStyle}>
              Inventory
            </Link>
          </nav>
        </div>
      </header>

      <section style={{ padding: '40px 16px 70px', maxWidth: '100%', overflowX: 'hidden' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', minWidth: 0 }}>
          <Link
            href="/inventory"
            style={{
              color: secondary,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            ← Back to inventory
          </Link>

          <VehiclePhotoGallery
            photos={gallery.map((photo) => ({
              VEHICLE_PHOTO_ID: Number(photo.VEHICLE_PHOTO_ID) || 0,
              IMAGE_URL: String(photo.IMAGE_URL),
              THUMBNAIL_URL: photo.THUMBNAIL_URL
                ? String(photo.THUMBNAIL_URL)
                : null,
              PRIMARY_YN: String(photo.PRIMARY_YN || 'N'),
              ALT_TEXT: photo.ALT_TEXT ? String(photo.ALT_TEXT) : null,
            }))}
            vehicleName={vehicleName}
            accent={secondary}
            title={
              <>
                {vehicle.FEATURED_YN === 'Y' && (
                  <div
                    style={{
                      color: secondary,
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      marginBottom: '10px',
                    }}
                  >
                    FEATURED
                  </div>
                )}
                <h1
                  style={{
                    margin: '0 0 12px',
                    fontSize: 'clamp(24px, 5vw, 34px)',
                    color: '#0f172a',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {vehicleName || 'Vehicle'}
                </h1>
              </>
            }
            price={
              <div
                style={{
                  fontSize: 'clamp(24px, 5vw, 30px)',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}
              >
                {vehicle.ASKING_PRICE !== null
                  ? `$${Number(vehicle.ASKING_PRICE).toLocaleString()}`
                  : 'Call for Price'}
              </div>
            }
            status={null}
            keyFacts={
              <div>
                {keyFactSpecs.map((s) => (
                  <Spec key={s.label} label={s.label} value={s.value} />
                ))}
              </div>
            }
            actions={
              <div
                style={{
                  display: 'grid',
                  gap: '10px',
                  marginTop: '10px',
                }}
              >
                <a
                  href={`tel:${tenant.PHONE || ''}`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: secondary,
                    color: '#ffffff',
                    padding: '14px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    minHeight: 44,
                    boxSizing: 'border-box',
                  }}
                >
                  Call Dealer
                </a>
                <Link
                  href="/inventory"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: '#0f172a',
                    color: '#ffffff',
                    padding: '14px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    minHeight: 44,
                    boxSizing: 'border-box',
                  }}
                >
                  Browse More Inventory
                </Link>
              </div>
            }
            detailSpecs={
              <div style={{ marginTop: 8 }}>
                <h2 style={{ fontSize: 16, margin: '8px 0' }}>Details</h2>
                {detailFactSpecs.map((s) => (
                  <Spec key={s.label} label={s.label} value={s.value} />
                ))}
              </div>
            }
            description={
              vehicle.DESCRIPTION ? (
                <div style={{ marginTop: 8 }}>
                  <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>
                    Description
                  </h2>
                  <p
                    style={{
                      color: '#475569',
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {vehicle.DESCRIPTION}
                  </p>
                </div>
              ) : null
            }
          />
        </div>
      </section>
    </main>
  );
}

function Spec({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '9px 0',
        borderBottom: '1px solid #e2e8f0',
        fontSize: '14px',
        minWidth: 0,
      }}
    >
      <span
        style={{
          color: '#64748b',
          fontWeight: 700,
          flex: '0 0 auto',
          maxWidth: '40%',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: '#0f172a',
          textAlign: 'right',
          minWidth: 0,
          flex: '1 1 auto',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  );
}

const simplePageStyle: React.CSSProperties = {
  padding: '60px 24px',
  fontFamily: 'Arial, sans-serif',
};

const headerLinkStyle: React.CSSProperties = {
  color: '#ffffff',
  textDecoration: 'none',
  fontWeight: 600,
};
