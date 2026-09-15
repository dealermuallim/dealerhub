import { processBillingWebhook } from '@/lib/billing/webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Stripe (or mock) webhooks — signature on raw body; browser success never activates. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get('stripe-signature') ||
    request.headers.get('x-dealerhub-webhook-signature');

  const result = await processBillingWebhook({
    rawBody,
    signature,
  });
  return Response.json(result.body, { status: result.status });
}
