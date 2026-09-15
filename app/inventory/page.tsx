import Link from 'next/link';
import { headers } from 'next/headers';
import { getPublicTenantByHost } from '@/lib/tenant';
import { getPublicVehiclesByHost } from '@/lib/vehicles';
import RefreshOnShow from './refresh-on-show';
import WebsiteUnavailable from '@/components/public/WebsiteUnavailable';
import { isUnresolvedPublicHostError } from '@/lib/incidents';

export const dynamic = 'force-dynamic';

type InventorySearchParams = {
  make?: string | string[];
  model?: string | string[];
  q?: string | string[];
  maxPrice?: string | string[];
};

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return (v[0] || '').trim();
  return (v || '').trim();
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<InventorySearchParams>;
}) {
  const requestHeaders = await headers();
  const sp = await searchParams;

  const host =
    requestHeaders.get('host') ||
    'localhost';

  const make = one(sp.make);
  const model = one(sp.model);
  const q = one(sp.q);
  const maxPriceRaw = one(sp.maxPrice);
  const maxPriceNum = maxPriceRaw ? Number(maxPriceRaw) : NaN;
  const maxPrice =
    Number.isFinite(maxPriceNum) && maxPriceNum > 0
      ? maxPriceNum
      : undefined;

  let tenant;
  let vehicles;

  try {
    tenant = await getPublicTenantByHost(host);
    if (!tenant) {
      return <WebsiteUnavailable />;
    }
    vehicles = await getPublicVehiclesByHost(host, {
      make: make || undefined,
      model: model || undefined,
      q: q || undefined,
      maxPrice,
    });
  } catch (error) {
    console.error('Inventory load failed:', error);
    if (isUnresolvedPublicHostError(error)) {
      return <WebsiteUnavailable />;
    }
    return (
      <main style={simplePageStyle}>
        <h1>Inventory unavailable</h1>
        <p>
          We could not load this dealership inventory.
        </p>
      </main>
    );
  }

  const primary =
    tenant.PRIMARY_COLOR || '#0F172A';

  const secondary =
    tenant.SECONDARY_COLOR || '#16A34A';

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* HEADER */}

      <header
        style={{
          background: primary,
          color: '#ffffff',
          padding: '18px 28px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
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
            {tenant.WEBSITE_TITLE ||
              tenant.DEALER_NAME}
          </Link>

          <nav
            style={{
              display: 'flex',
              gap: '18px',
              alignItems: 'center',
            }}
          >
            <Link
              href="/"
              style={headerLinkStyle}
            >
              Home
            </Link>

            <Link
              href="/inventory"
              style={{
                ...headerLinkStyle,
                fontWeight: 700,
              }}
            >
              Inventory
            </Link>

            <Link
              href="/admin/inventory/new"
              style={{
                color: '#ffffff',
                textDecoration: 'none',
                background: secondary,
                padding: '9px 14px',
                borderRadius: '6px',
                fontWeight: 700,
              }}
            >
              Add Vehicle
            </Link>
          </nav>
        </div>
      </header>

      {/* TITLE */}

      <section
        style={{
          padding: '55px 28px 30px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              color: secondary,
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '13px',
              letterSpacing: '1.5px',
            }}
          >
            Current Inventory
          </div>

          <h1
            style={{
              fontSize: '40px',
              margin: '10px 0',
              color: '#0f172a',
            }}
          >
            Vehicles For Sale
          </h1>

          <p
            style={{
              color: '#64748b',
              margin: 0,
            }}
          >
            {vehicles.length} vehicle
            {vehicles.length === 1 ? '' : 's'} available
          </p>
        </div>
      </section>

      {/* VEHICLE GRID */}

      <section
        style={{
          padding: '20px 28px 70px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {vehicles.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '50px',
                textAlign: 'center',
              }}
            >
              <h2>No vehicles available yet</h2>

              <p
                style={{
                  color: '#64748b',
                }}
              >
                Add your first vehicle from DealerHub Admin.
              </p>

              <Link
                href="/admin/inventory/new"
                style={{
                  display: 'inline-block',
                  marginTop: '15px',
                  background: secondary,
                  color: '#ffffff',
                  padding: '12px 20px',
                  borderRadius: '7px',
                  textDecoration: 'none',
                  fontWeight: 700,
                }}
              >
                Add Vehicle
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                alignItems: 'stretch',
              }}
            >
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.VEHICLE_ID}
                  vehicle={vehicle}
                  secondary={secondary}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}

      <footer
        style={{
          background: primary,
          color: '#ffffff',
          padding: '30px',
          textAlign: 'center',
        }}
      >
        {tenant.DEALER_NAME}
      </footer>
    </main>
  );
}

function VehicleCard({
  vehicle,
  secondary,
}: {
  vehicle: {
    VEHICLE_ID: number;
    STOCK_NUMBER: string;
    VIN: string;
    YEAR: number | null;
    MAKE: string | null;
    MODEL: string | null;
    TRIM: string | null;
    MILEAGE: number | null;
    EXTERIOR_COLOR: string | null;
    ASKING_PRICE: number | null;
    FEATURED_YN: string;
    PRIMARY_IMAGE_URL: string | null;
  };

  secondary: string;
}) {
  const vehicleName = [
    vehicle.YEAR,
    vehicle.MAKE,
    vehicle.MODEL,
    vehicle.TRIM,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow:
          '0 2px 8px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '420px',
      }}
    >
      {vehicle.PRIMARY_IMAGE_URL ? (
        <img
          src={vehicle.PRIMARY_IMAGE_URL}
          alt={vehicleName || 'Vehicle'}
          style={{
            width: '100%',
            height: '210px',
            objectFit: 'cover',
            display: 'block',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            height: '210px',
            background: '#e2e8f0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#64748b',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          Photo Coming Soon
        </div>
      )}

      <div
        style={{
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            color: secondary,
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '8px',
            minHeight: '16px',
          }}
        >
          {vehicle.FEATURED_YN === 'Y' ? 'FEATURED' : '\u00a0'}
        </div>

        <h2
          style={{
            fontSize: '21px',
            margin: '0 0 12px',
            color: '#0f172a',
            minHeight: '52px',
            lineHeight: 1.25,
          }}
        >
          {vehicleName || 'Vehicle'}
        </h2>

        <div style={{ minHeight: '72px' }}>
          <p
            style={{
              color: '#64748b',
              margin: '0 0 6px',
              fontSize: '13px',
              minHeight: '18px',
            }}
          >
            {vehicle.STOCK_NUMBER
              ? `Stock #${vehicle.STOCK_NUMBER}`
              : '\u00a0'}
          </p>

          <p
            style={{
              color: '#64748b',
              margin: '0 0 8px',
              minHeight: '20px',
            }}
          >
            {vehicle.MILEAGE !== null
              ? `${vehicle.MILEAGE.toLocaleString()} miles`
              : '\u00a0'}
          </p>

          <p
            style={{
              color: '#64748b',
              margin: '0 0 15px',
              minHeight: '20px',
            }}
          >
            {vehicle.EXTERIOR_COLOR || '\u00a0'}
          </p>
        </div>

        <div
          style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '18px',
            minHeight: '30px',
          }}
        >
          {vehicle.ASKING_PRICE !== null
            ? `$${vehicle.ASKING_PRICE.toLocaleString()}`
            : 'Call for Price'}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <Link
            href={`/vehicle/${vehicle.VEHICLE_ID}`}
            style={{
              display: 'block',
              textAlign: 'center',
              background: secondary,
              color: '#ffffff',
              padding: '12px 14px',
              borderRadius: '7px',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            View Vehicle
          </Link>
        </div>
      </div>
    </article>
  );
}

const simplePageStyle: React.CSSProperties = {
  padding: '60px 24px',
  fontFamily: 'Arial, sans-serif',
};

const headerLinkStyle: React.CSSProperties = {
  color: '#ffffff',
  textDecoration: 'none',
};