import { createMockBillingProvider } from './providers/mock';
import { createStripeBillingProvider } from './providers/stripe';
import type { BillingProvider } from './providers/types';

export function getBillingProvider(): BillingProvider {
  if (process.env.STRIPE_SECRET_KEY && process.env.BILLING_PROVIDER !== 'mock') {
    try {
      return createStripeBillingProvider();
    } catch {
      return createMockBillingProvider();
    }
  }
  return createMockBillingProvider();
}

export function billingProviderMode(): 'stripe' | 'mock' {
  return getBillingProvider().name;
}
