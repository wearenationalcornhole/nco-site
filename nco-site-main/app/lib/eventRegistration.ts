import type { EventRecord } from '@/app/lib/publicEvents'

export type EventRegistrationMode = 'free' | 'paid'

export type EventRegistrationConfig = {
  mode: EventRegistrationMode
  amountUsd?: number
  description?: string
}

type EventRegistrationOverrides = Record<string, EventRegistrationConfig>

// Configure paid registration per event slug or id here.
// Keep this map empty until a specific event is approved for paid checkout.
const EVENT_REGISTRATION_OVERRIDES: EventRegistrationOverrides = {}

function lookupRegistrationConfig(event: { id: string; slug: string | null }) {
  if (event.slug && EVENT_REGISTRATION_OVERRIDES[event.slug]) {
    return EVENT_REGISTRATION_OVERRIDES[event.slug]
  }
  return EVENT_REGISTRATION_OVERRIDES[event.id] ?? null
}

export function getEventRegistrationConfig(event: { id: string; slug: string | null }) {
  const configured = lookupRegistrationConfig(event)
  if (!configured) {
    return {
      mode: 'free' as const,
      currency: 'usd' as const,
      amountLabel: 'Free online',
      buttonLabel: 'Register Free',
      description: 'Free online registration is active now. Paid registration can be enabled per event later.',
      checkoutEnabled: false,
    }
  }

  const amountUsd = configured.amountUsd ?? 0
  const isPaid = configured.mode === 'paid' && amountUsd > 0
  const amountLabel = isPaid
    ? `$${amountUsd.toFixed(2)} via Stripe Checkout`
    : 'Free online'

  return {
    mode: isPaid ? 'paid' as const : 'free' as const,
    currency: 'usd' as const,
    amountUsd,
    amountLabel,
    buttonLabel: isPaid ? `Pay & Register • $${amountUsd.toFixed(2)}` : 'Register Free',
    description:
      configured.description ??
      (isPaid
        ? 'Paid registration uses secure Stripe Checkout. Your registration is confirmed after successful payment.'
        : 'Free online registration is active now.'),
    checkoutEnabled: isPaid,
  }
}

export function getEventRegistrationConfigByRecord(event: EventRecord) {
  return getEventRegistrationConfig({ id: event.id, slug: event.slug })
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null
}

export function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY ?? null
}
