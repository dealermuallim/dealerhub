import { requireAdminSession } from '@/lib/admin-auth';
import { findAdminVehicleByVinForHost } from '@/lib/vehicles';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function normalizeHost(host: string) {
  return host.split(':')[0].toLowerCase();
}

/**
 * Admin-only, Host/VPD-scoped VIN existence check.
 * Other-tenant VINs appear as exists:false — never identify or describe them.
 */
export async function GET(req: Request) {
  const adminSession = await requireAdminSession(req);
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const vin = String(url.searchParams.get('vin') || '')
    .trim()
    .toUpperCase();

  if (vin.length !== 17) {
    return NextResponse.json(
      { error: 'VIN must be exactly 17 characters.' },
      { status: 400 }
    );
  }

  const requestHeaders = await headers();
  const host = normalizeHost(requestHeaders.get('host') || 'localhost');

  const hit = await findAdminVehicleByVinForHost(host, vin);

  if (!hit) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    vehicle: {
      id: Number(hit.VEHICLE_ID),
      stockNumber: hit.STOCK_NUMBER || '',
      year: hit.YEAR != null ? String(hit.YEAR) : '',
      make: hit.MAKE || '',
      model: hit.MODEL || '',
      trim: hit.TRIM || '',
    },
  });
}
