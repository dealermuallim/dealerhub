import { createHmac, randomUUID } from 'crypto';

import type { BillingProvider, ProviderEvent } from './types';

function mockSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_dealerhub';
}

export function createMockBillingProvider(): BillingProvider {
  return {
    name: 'mock',
    async createCustomer({ tenantId }) {
      return { customerId: `cus_mock_${tenantId}` };
    },
    async createCheckoutSession(input) {
      const id = `cs_mock_${randomUUID()}`;
      const url = `${input.successUrl}${input.successUrl.includes('?') ? '&' : '?'}session_id=${id}&mock=1`;
      return { id, url };
    },
    async createPortalSession(input) {
      return {
        url: `${input.returnUrl}${input.returnUrl.includes('?') ? '&' : '?'}portal=mock`,
      };
    },
    async verifyWebhook(rawBody, signature) {
      if (!signature) {
        return { ok: false, reason: 'STRIPE_WEBHOOK_SIGNATURE_FAILURE' };
      }
      const payload = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const expected = createHmac('sha256', mockSecret()).update(payload).digest('hex');
      const provided = signature.replace(/^mock=/, '').replace(/^t=\d+,v1=/, '');
      if (provided !== expected && signature !== `mock=${expected}`) {
        // also accept signature === expected raw hex
        if (signature !== expected) {
          return { ok: false, reason: 'STRIPE_WEBHOOK_SIGNATURE_FAILURE' };
        }
      }
      try {
        const event = JSON.parse(payload) as ProviderEvent;
        if (!event?.id || !event?.type) {
          return { ok: false, reason: 'STRIPE_WEBHOOK_SIGNATURE_FAILURE' };
        }
        return { ok: true, event };
      } catch {
        return { ok: false, reason: 'STRIPE_WEBHOOK_SIGNATURE_FAILURE' };
      }
    },
  };
}

export function signMockWebhook(payload: string): string {
  const expected = createHmac('sha256', mockSecret()).update(payload).digest('hex');
  return `mock=${expected}`;
}
