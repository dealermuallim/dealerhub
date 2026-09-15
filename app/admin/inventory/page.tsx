import Link from 'next/link';
import { headers } from 'next/headers';

import AdminShell from '@/components/admin/AdminShell';
import SectionCard from '@/components/admin/SectionCard';
import AdminButton from '@/components/admin/AdminButton';
import StatusBadge from '@/components/admin/StatusBadge';
import { money, vinLast4 } from '@/components/admin/demo-data';
import { getAdminVehiclesByHost } from '@/lib/vehicles';
import { attentionReasons, inventoryAge } from '@/lib/dealer-metrics';
import VehicleActions from '@/components/admin/VehicleActions';

export const dynamic = 'force-dynamic';

function statusKind(
  status: string
): 'AVAILABLE' | 'SOLD' | 'ARCHIVED' | 'FEATURED' | 'ACTIVE' | 'INACTIVE' {
  const s = (status || '').toUpperCase();
  if (s === 'AVAILABLE' || s === 'SOLD' || s === 'ARCHIVED') return s;
  return 'INACTIVE';
}

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || 'localhost';

  let vehicles: Awaited<ReturnType<typeof getAdminVehiclesByHost>> = [];
  let loadError = '';
  try {
    vehicles = await getAdminVehiclesByHost(host);
  } catch {
    loadError = 'Unable to load inventory for this host tenant.';
  }
  const now = new Date();
  const requestedFilter = (await searchParams).filter || 'all';
  const filters = [
    { key: 'all', label: 'All vehicles', matches: () => true },
    { key: 'available', label: 'Available', matches: (v: typeof vehicles[number]) => v.VEHICLE_STATUS === 'AVAILABLE' },
    { key: 'sold', label: 'Sold', matches: (v: typeof vehicles[number]) => v.VEHICLE_STATUS === 'SOLD' },
    { key: 'attention', label: 'Needs attention', matches: (v: typeof vehicles[number]) => attentionReasons(v, now).length > 0 },
    { key: 'photos', label: 'Missing photos', matches: (v: typeof vehicles[number]) => v.VEHICLE_STATUS === 'AVAILABLE' && Number(v.PHOTO_COUNT) === 0 },
    { key: 'hidden', label: 'Hidden', matches: (v: typeof vehicles[number]) => v.VEHICLE_STATUS === 'AVAILABLE' && v.PUBLIC_YN !== 'Y' },
    { key: 'aging', label: '60+ days', matches: (v: typeof vehicles[number]) => v.VEHICLE_STATUS === 'AVAILABLE' && (inventoryAge(v, now) ?? -1) >= 60 },
  ];
  const selectedFilter = filters.find((f) => f.key === requestedFilter) || filters[0];
  const filteredVehicles = vehicles.filter(selectedFilter.matches);

  return (
    <AdminShell
      title="Inventory"
      subtitle="Your vehicles, ready for their next move"
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <AdminButton href="/admin/inventory/new">Add Vehicle</AdminButton>
        <AdminButton href="/admin/inventory/photos" variant="secondary">
          Manage Photos
        </AdminButton>
      </div>

      <nav className="dh-filter-nav" aria-label="Inventory filters">{filters.map((filter) => <Link key={filter.key} href={`/admin/inventory?filter=${filter.key}`} className={selectedFilter.key === filter.key ? 'active' : ''} aria-current={selectedFilter.key === filter.key ? 'page' : undefined}>{filter.label} <span>{loadError ? '—' : vehicles.filter(filter.matches).length}</span></Link>)}</nav>
      <SectionCard title={`${selectedFilter.label}${loadError ? '' : ` · ${filteredVehicles.length}`}`}>
        {loadError ? (
          <p className="adm-muted" style={{ color: '#b91c1c', margin: 0 }}>
            {loadError}
          </p>
        ) : filteredVehicles.length === 0 ? (
          <p className="adm-muted" style={{ margin: 0 }}>
            {vehicles.length === 0 ? 'No vehicles for this dealership yet. Add the first vehicle to get started.' : 'No vehicles match this filter. You’re all caught up here.'}
          </p>
        ) : (
          <div className="adm-table-wrap dh-inventory-table">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>ID</th>
                  <th>Vehicle</th>
                  <th>Stock #</th>
                  <th>VIN</th>
                  <th>Mileage</th>
                  <th>Asking</th>
                  <th>Status</th>
                  <th>Attention / age</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v) => {
                  const title = [v.YEAR, v.MAKE, v.MODEL].filter(Boolean).join(' ');
                  return (
                    <tr key={v.VEHICLE_ID}>
                      <td data-label="Photo">
                        <div
                          style={{
                            width: 56,
                            height: 40,
                            borderRadius: 6,
                            background: '#e2e8f0',
                            overflow: 'hidden',
                          }}
                        >
                          {v.PRIMARY_IMAGE_URL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={v.PRIMARY_IMAGE_URL}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td data-label="ID">{v.VEHICLE_ID}</td>
                      <td data-label="Vehicle">
                        <strong>{title || 'Vehicle'}</strong>
                        <div className="adm-muted" style={{ fontSize: 12 }}>
                          {v.TRIM || '—'}
                        </div>
                      </td>
                      <td data-label="Stock #">{v.STOCK_NUMBER || '—'}</td>
                      <td data-label="VIN">{v.VIN ? `…${vinLast4(v.VIN)}` : '—'}</td>
                      <td data-label="Mileage">
                        {v.MILEAGE != null ? v.MILEAGE.toLocaleString() : '—'}
                      </td>
                      <td data-label="Asking">
                        {v.ASKING_PRICE != null ? money(Number(v.ASKING_PRICE)) : '—'}
                      </td>
                      <td data-label="Status">
                        <StatusBadge kind={statusKind(v.VEHICLE_STATUS)} />
                      </td>
                      <td data-label="Attention / age">
                        <div className="dh-reason-list">{attentionReasons(v, now).map((reason) => <span key={reason}>{reason}</span>)}</div>
                        <span className="dh-fine">{inventoryAge(v, now) == null ? 'Entry date unavailable' : `${inventoryAge(v, now)} days since entry`}</span>
                        {v.FEATURED_YN === 'Y' && <StatusBadge kind="FEATURED" />}
                      </td>
                      <td data-label="Actions" className="adm-actions-cell">
                        <VehicleActions vehicle={v} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </AdminShell>
  );
}
