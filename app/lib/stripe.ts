import Stripe from 'stripe'
import { getStripeSecretKey } from '@/app/lib/eventRegistration'

let stripeClient: Stripe | null = null

export function getStripeClient() {
  const secretKey = getStripeSecretKey()
  if (!secretKey) return null

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey)
  }

  return stripeClient
}
