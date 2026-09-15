# DealerHub Billing V1 — Production Prerequisites

Do **not** enable live charges until every item is complete.

## Stripe account
- [ ] Stripe account verified (business details)
- [ ] Bank account linked for payouts
- [ ] Live mode enabled only after test-mode sign-off
- [ ] Restricted API keys with least privilege
- [ ] Webhook endpoint HTTPS URL registered
- [ ] Webhook signing secret stored in server env only
- [ ] Products / recurring Price IDs created ($19.99/mo or approved plan)
- [ ] Customer Portal configuration (payment method update, cancel policy)
- [ ] ACH Debit / payment method domains configured as needed
- [ ] Apple Pay / Google Pay / Link enabled in Stripe Dashboard if offered

## Application env (server-only — never NEXT_PUBLIC for secrets)
- [ ] `STRIPE_SECRET_KEY` (live)
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRICE_ID` (subscription price)
- [ ] `BILLING_SUCCESS_URL` / `BILLING_CANCEL_URL` (allowlisted origins)
- [ ] `DEALER_ADMIN_TENANT_ID` or email→tenant map for dealer sessions
- [ ] Platform admin credentials distinct from dealer admin

## Oracle
- [ ] Apply `sql/migrations/20260915_02_billing_v1.sql` in a controlled change window
- [ ] Verify unique `PROVIDER_EVENT_ID` constraint
- [ ] Confirm TENANTS.ACTIVE_YN is **not** used for delinquency

## Legal / consent
- [ ] Terms of service + billing terms published
- [ ] ACH authorization / mandate language approved
- [ ] Late fee terms approved **before** setting `LATE_FEE_ENABLED_YN=Y` (default OFF)
- [ ] Support contact for payment recovery

## Ops
- [ ] Webhook monitoring / Reliability incidents wired
- [ ] Runbook for PAST_DUE → GRACE → SUSPENDED → reactivation
- [ ] Chief QA pass on enforcement + webhook idempotency
