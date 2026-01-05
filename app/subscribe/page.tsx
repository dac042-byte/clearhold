'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function Subscribe() {
  return (
    <ProtectedRoute>
      <SubscribePage />
    </ProtectedRoute>
  )
}

function SubscribePage() {
  const { user, profile, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const canceled = searchParams.get('canceled')

  const handleSubscribe = async () => {
    setLoading(true)
    setError('')

    try {
      // Get auth token
      const {
        data: { session },
      } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      console.error('Subscribe error:', err)
      setError(err.message || 'Failed to start checkout')
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setLoading(true)
    setError('')

    try {
      // Create a billing portal session
      const {
        data: { session },
      } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      if (!session) {
        setError('Not authenticated')
        return
      }

      // You would need to create another API route for this
      // For now, just show a message
      setError('Please contact support to manage your subscription')
    } catch (err: any) {
      setError(err.message || 'Failed to access subscription management')
    } finally {
      setLoading(false)
    }
  }

  const isSubscribed = profile?.subscription_status === 'active'

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div
            onClick={() => router.push('/')}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img
              src="/favicon.ico"
              alt="Clearhold logo"
              className="w-8 h-8"
            />
            <h1 className="text-2xl font-semibold tracking-tight">
              Clearhold
            </h1>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {canceled && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-gray-800 px-6 py-4 rounded-2xl">
            <p className="text-[15px] font-semibold">Checkout was canceled. You can try again anytime.</p>
          </div>
        )}

        <div className="card">
          {isSubscribed ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold mb-3 tracking-tight">You're a Pro member</h2>
              <p className="text-[17px] mb-8" style={{ color: 'rgba(60, 60, 67, 0.6)' }}>
                You have unlimited access to thought interrogations
              </p>
              <button
                onClick={() => router.push('/')}
                className="btn btn-primary"
              >
                Return to Home
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <h2 className="text-3xl font-semibold mb-3 tracking-tight">Upgrade to Pro</h2>
                <p className="text-[17px]" style={{ color: 'rgba(60, 60, 67, 0.6)' }}>
                  Get unlimited access to thought interrogations
                </p>
              </div>

              <div className="bg-white border border-black/6 rounded-3xl p-8 mb-6" style={{ boxShadow: '0 2px 16px rgba(0, 0, 0, 0.06)' }}>
                <div className="flex items-baseline justify-center mb-4">
                  <span className="text-5xl font-bold">$1</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Unlimited daily thought interrogations
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Access to reflection history
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Support ongoing development
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Cancel anytime
                  </li>
                </ul>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="btn btn-primary w-full text-lg py-3"
                >
                  {loading ? 'Processing...' : 'Subscribe now'}
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => router.push('/')}
                  className="text-[#4DB8C4] hover:text-[#3A8F99] text-[15px] font-semibold transition-colors"
                >
                  Continue with Free (5 per day)
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
