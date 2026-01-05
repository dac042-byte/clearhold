'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background-rgb))] py-12 px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src="/favicon.ico" alt="Clearhold logo" className="w-14 h-14" />
            <h1 className="text-4xl font-semibold tracking-tight">Clearhold</h1>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight mb-3">
            Sign In
          </h2>
          <p className="text-[17px]" style={{ color: 'rgba(60, 60, 67, 0.6)' }}>
            Continue your journey toward clearer thinking
          </p>
        </div>
        <div className="card">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-2xl">
              <p className="text-[15px] font-semibold">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center pt-4">
            <Link
              href="/signup"
              className="text-[15px] font-semibold text-[#4DB8C4] hover:text-[#3A8F99] transition-colors"
            >
              Don't have an account? Sign Up
            </Link>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
