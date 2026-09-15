import { sanitizeErrorText } from '@/lib/incidents/sanitize';

const EXTRA = [
  /sk_live_[A-Za-z0-9]+/gi,
  /sk_test_[A-Za-z0-9]+/gi,
  /whsec_[A-Za-z0-9]+/gi,
  /cus_[A-Za-z0-9]+/gi,
  /sub_[A-Za-z0-9]+/gi,
  /pi_[A-Za-z0-9]+/gi,
];

export function sanitizeBillingText(input: unknown): string {
  let text = sanitizeErrorText(input);
  for (const re of EXTRA) {
    text = text.replace(re, '[REDACTED]');
  }
  return text;
}
