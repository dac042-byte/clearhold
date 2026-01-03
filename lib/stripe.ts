import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID || ''
