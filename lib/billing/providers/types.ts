export type CheckoutSessionInput = {
  tenantId: number;
  customerId: string | null;
  customerEmail: string | null;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

export type PortalSessionInput = {
  customerId: string;
  returnUrl: string;
};

export type BillingProvider = {
  name: 'stripe' | 'mock';
  createCustomer: (input: {
    tenantId: number;
    email: string | null;
  }) => Promise<{ customerId: string }>;
  createCheckoutSession: (
    input: CheckoutSessionInput
  ) => Promise<{ id: string; url: string }>;
  createPortalSession: (
    input: PortalSessionInput
  ) => Promise<{ url: string }>;
  verifyWebhook: (
    rawBody: string | Buffer,
    signature: string | null
  ) => Promise<{ ok: true; event: ProviderEvent } | { ok: false; reason: string }>;
};

export type ProviderEvent = {
  id: string;
  type: string;
  created: number;
  data: Record<string, unknown>;
};
