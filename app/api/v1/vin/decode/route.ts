import { requireAdminSession } from '@/lib/admin-auth';
import { denyIfDealerBillingBlocked } from '@/lib/billing/http-guard';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const billingBlock = await denyIfDealerBillingBlocked(req, new URL(req.url).pathname);
  if (billingBlock) return billingBlock;

  const adminSession = await requireAdminSession(req);
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const vin = String(body.vin || '')
      .trim()
      .toUpperCase();

    if (vin.length !== 17) {
      return NextResponse.json(
        { error: 'VIN must be exactly 17 characters.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.DECODETHIS_API_KEY;

    if (!apiKey) {
      throw new Error(
        'DECODETHIS_API_KEY is missing from .env.local'
      );
    }

    const url =
      `https://decodethis.com/api/v1/vins/` +
      `${encodeURIComponent(vin)}/decode?detail=standard`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const raw = await response.json();

    if (!response.ok || !raw?.success) {
      return NextResponse.json(
        {
          error:
            raw?.error ||
            `DecodeThis request failed with HTTP ${response.status}`,
        },
        { status: response.status || 400 }
      );
    }

    const data = raw.data;

    if (!data) {
      return NextResponse.json(
        { error: 'DecodeThis returned no vehicle data.' },
        { status: 404 }
      );
    }

    const features: Array<{
      category: string;
      name: string;
      value: string;
    }> = [];

    if (data.categorized_specifications) {
      for (const [
        categoryName,
        items,
      ] of Object.entries(
        data.categorized_specifications
      )) {
        if (Array.isArray(items)) {
          for (const item of items as any[]) {
            features.push({
              category: categoryName,
              name:
                String(
                  item?.category || ''
                ),
              value:
                String(
                  item?.value || ''
                ),
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,

      vehicle: {
        vin: data.vin || vin,

        year:
          data.year !== undefined &&
          data.year !== null
            ? Number(data.year)
            : null,

        make:
          data.make || '',

        model:
          data.model || '',

        trim:
          data.trim || '',

        bodyStyle:
          data.body_style || '',

        engine:
          data.engine || '',

        transmission:
          data.transmission || '',

        driveType:
          data.drive_type || '',

        fuelType:
          data.fuel_type || '',

        doors:
          data.doors ?? null,

        country:
          data.country || '',

        manufacturer:
          data.manufacturer || '',
      },

      features,

      meta: {
        cached: raw.cached ?? false,
        timestamp: raw.timestamp ?? null,
        dataSource:
          data.data_source || null,
      },
    });
  } catch (error: any) {
    console.error(
      'DecodeThis VIN API error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to decode VIN.',
      },
      { status: 500 }
    );
  }
}