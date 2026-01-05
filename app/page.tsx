'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Step = 'input' | 'classify' | 'distortions' | 'evidence' | 'result'
type Classification = 'Fact' | 'Thought' | 'Prediction' | null
type EvidenceChoice = 'Yes' | 'No' | 'Unclear' | null

const DISTORTIONS = [
  'Catastrophizing',
  'Mind reading',
  'All-or-nothing',
  'Emotional reasoning',
  'Should statements',
  'Fortune telling',
  'Personalization',
  'Overgeneralization',
]

interface AIResponse {
  type: string
  distortions: string[]
  assumptions_vs_facts: string
  grounded_reframe: string
}

export default function Home() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  )
}

function HomePage() {
  const { user, profile, signOut } = useAuth()
  const [step, setStep] = useState<Step>('input')
  const [thought, setThought] = useState('')
  const [classification, setClassification] = useState<Classification>(null)
  const [selectedDistortions, setSelectedDistortions] = useState<string[]>([])
  const [evidenceChoice, setEvidenceChoice] = useState<EvidenceChoice>(null)
  const [aiResponse, setAIResponse] = useState<AIResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usageToday, setUsageToday] = useState(0)
  const [showLimitModal, setShowLimitModal] = useState(false)

  useEffect(() => {
    fetchUsageToday()
  }, [user])

  const fetchUsageToday = async () => {
    if (!user) return

    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('daily_usage')
      .select('usage_count')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .single()

    if (!error && data) {
      setUsageToday(data.usage_count)
    } else {
      setUsageToday(0)
    }
  }

  const toggleDistortion = (distortion: string) => {
    if (selectedDistortions.includes(distortion)) {
      setSelectedDistortions(selectedDistortions.filter((d) => d !== distortion))
    } else if (selectedDistortions.length < 2) {
      setSelectedDistortions([...selectedDistortions, distortion])
    }
  }

  const handleInputSubmit = () => {
    if (thought.trim().length < 10) {
      setError('Please enter a more detailed thought (at least 10 characters)')
      return
    }
    setError('')
    setStep('classify')
  }

  const handleClassification = (type: Classification) => {
    setClassification(type)
    setStep('distortions')
  }

  const handleDistortionsSubmit = () => {
    if (selectedDistortions.length === 0) {
      setError('Please select at least 1 cognitive distortion')
      return
    }
    setError('')
    setStep('evidence')
  }

  const handleEvidenceSubmit = async (choice: EvidenceChoice) => {
    setEvidenceChoice(choice)

    // Check usage limits
    const isSubscribed = profile?.subscription_status === 'active'
    if (!isSubscribed && usageToday >= 5) {
      setShowLimitModal(true)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Get auth session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          thought,
          classification,
          chosen_distortions: selectedDistortions,
          evidence_choice: choice,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process thought')
      }

      setAIResponse(data)
      setStep('result')
      await fetchUsageToday() // Refresh usage count
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetFlow = () => {
    setStep('input')
    setThought('')
    setClassification(null)
    setSelectedDistortions([])
    setEvidenceChoice(null)
    setAIResponse(null)
    setError('')
  }

  const getRemainingUses = () => {
    const isSubscribed = profile?.subscription_status === 'active'
    if (isSubscribed) return 'Unlimited'
    return Math.max(0, 5 - usageToday)
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--background-rgb))]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img
                src="/favicon.ico"
                alt="Clearhold logo"
                className="w-8 h-8"
              />
              <h1 className="text-2xl font-semibold tracking-tight">Clearhold</h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-sm">
                {profile?.subscription_status === 'active' ? (
                  <span className="text-[#4DB8C4] font-semibold">Pro</span>
                ) : (
                  <span className="text-gray-500">
                    {getRemainingUses()}/5
                  </span>
                )}
              </div>
              {profile?.subscription_status !== 'active' && (
                <Link
                  href="/subscribe"
                  className="text-sm bg-[#4DB8C4] text-white px-4 py-2 rounded-full hover:bg-[#3A8F99] transition-colors font-semibold"
                >
                  Upgrade
                </Link>
              )}
              <button
                onClick={signOut}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 min-h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="w-full">
        {/* Input Step */}
        {step === 'input' && (
          <div className="card-glass">
            <h2 className="text-3xl font-semibold mb-2 tracking-tight">What thought is looping?</h2>
            <p className="text-xs mb-6" style={{ color: 'rgba(142, 142, 147, 1)' }}>
              Crisis support:{' '}
              <a href="tel:988" className="text-[#4DB8C4] hover:text-[#3A8F99] font-semibold">
                988
              </a>
            </p>
            <p className="text-[17px] mb-8" style={{ color: 'rgba(60, 60, 67, 0.6)' }}>
              Enter the thought you'd like to examine with clarity
            </p>
            <textarea
              className="input min-h-[140px] resize-none"
              placeholder="E.g., 'Everyone at work thinks I'm incompetent'"
              value={thought}
              onChange={(e) => setThought(e.target.value)}
            />
            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
            <button
              onClick={handleInputSubmit}
              className="btn btn-primary w-full mt-6"
            >
              Continue
            </button>
          </div>
        )}

        {/* Classification Step */}
        {step === 'classify' && (
          <div className="card">
            <h2 className="text-3xl font-semibold mb-2 tracking-tight">What type is this?</h2>
            <p className="text-[15px] mb-8" style={{ color: 'rgba(60, 60, 67, 0.6)' }}>Choose the category that best fits</p>
            <div className="space-y-3">
              {(['Fact', 'Thought', 'Prediction'] as Classification[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleClassification(type)}
                  className="w-full p-5 bg-white border border-black/6 rounded-2xl hover:bg-[#E0F7F9]/30 hover:border-[#4DB8C4]/30 text-left transition-all duration-200 active:scale-[0.99]"
                  style={{ boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)' }}
                >
                  <div className="font-semibold text-[17px] mb-1.5">{type}</div>
                  <div className="text-[15px]" style={{ color: 'rgba(60, 60, 67, 0.6)' }}>
                    {type === 'Fact' && 'Something objectively verifiable'}
                    {type === 'Thought' && 'An interpretation or belief'}
                    {type === 'Prediction' && 'A forecast about the future'}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('input')}
              className="btn btn-secondary w-full mt-6"
            >
              Back
            </button>
          </div>
        )}

        {/* Distortions Step */}
        {step === 'distortions' && (
          <div className="card">
            <h2 className="text-3xl font-semibold mb-2 tracking-tight">Select distortions</h2>
            <p className="text-[15px] mb-8" style={{ color: 'rgba(60, 60, 67, 0.6)' }}>Choose 1-2 that might apply</p>
            <div className="grid grid-cols-2 gap-3">
              {DISTORTIONS.map((distortion) => (
                <button
                  key={distortion}
                  onClick={() => toggleDistortion(distortion)}
                  disabled={
                    selectedDistortions.length >= 2 &&
                    !selectedDistortions.includes(distortion)
                  }
                  className={`p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.98] ${
                    selectedDistortions.includes(distortion)
                      ? 'bg-[#4DB8C4] text-white font-semibold'
                      : 'bg-white border border-black/6 hover:bg-[#E0F7F9]/30 hover:border-[#4DB8C4]/30'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={!selectedDistortions.includes(distortion) ? { boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)' } : {}}
                >
                  <div className="text-[15px] font-semibold">{distortion}</div>
                </button>
              ))}
            </div>
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('classify')}
                className="btn btn-secondary flex-1"
              >
                Back
              </button>
              <button
                onClick={handleDistortionsSubmit}
                className="btn btn-primary flex-1"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Evidence Step */}
        {step === 'evidence' && (
          <div className="card">
            <h2 className="text-3xl font-semibold mb-2 tracking-tight">Evidence check</h2>
            <p className="text-[17px] mb-8" style={{ color: 'rgba(60, 60, 67, 0.6)' }}>
              Is there direct evidence this is objectively true?
            </p>
            <div className="space-y-3">
              {(['Yes', 'No', 'Unclear'] as EvidenceChoice[]).map((choice) => (
                <button
                  key={choice}
                  onClick={() => handleEvidenceSubmit(choice)}
                  disabled={loading}
                  className="w-full p-5 bg-white border border-black/6 rounded-2xl hover:bg-[#E0F7F9]/30 hover:border-[#4DB8C4]/30 text-left transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                  style={{ boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)' }}
                >
                  <div className="font-semibold text-[17px]">{choice}</div>
                </button>
              ))}
            </div>
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            {loading && (
              <div className="text-center mt-6" style={{ color: 'rgba(60, 60, 67, 0.6)' }}>
                Processing your reflection...
              </div>
            )}
            <button
              onClick={() => setStep('distortions')}
              disabled={loading}
              className="btn btn-secondary w-full mt-6"
            >
              Back
            </button>
          </div>
        )}

        {/* Result Step */}
        {step === 'result' && aiResponse && (
          <div className="space-y-6">
            {/* Main Results Grid - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-semibold text-[17px] mb-3">What this is</h3>
                <p className="text-[17px] leading-relaxed" style={{ color: 'rgba(60, 60, 67, 0.85)' }}>{aiResponse.type}</p>
              </div>

              <div className="card">
                <h3 className="font-semibold text-[17px] mb-3">Likely distortions</h3>
                <ul className="space-y-2">
                  {aiResponse.distortions.map((distortion, idx) => (
                    <li key={idx} className="text-[17px] leading-relaxed flex items-start gap-2" style={{ color: 'rgba(60, 60, 67, 0.85)' }}>
                      <span className="text-[#4DB8C4] mt-0.5">•</span>
                      <span>{distortion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card">
                <h3 className="font-semibold text-[17px] mb-3">Assumptions vs facts</h3>
                <p className="text-[17px] leading-relaxed whitespace-pre-line" style={{ color: 'rgba(60, 60, 67, 0.85)' }}>
                  {aiResponse.assumptions_vs_facts}
                </p>
              </div>

              <div className="card">
                <h3 className="font-semibold text-[17px] mb-3">Grounded reframe</h3>
                <p className="text-[17px] leading-relaxed" style={{ color: 'rgba(60, 60, 67, 0.85)' }}>{aiResponse.grounded_reframe}</p>
              </div>
            </div>

            {/* Bottom Section - Crisis Support and Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Crisis Support */}
              <div className="md:col-span-2 card bg-yellow-50/50 border-yellow-200/50">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="w-6 h-6 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] mb-4 leading-relaxed" style={{ color: 'rgba(60, 60, 67, 0.85)' }}>
                      If you're experiencing thoughts of self-harm, <strong>please reach out for support</strong>. You deserve care and help.
                    </p>
                    <a
                      href="tel:988"
                      className="inline-flex items-center gap-2 text-[#4DB8C4] hover:text-[#3A8F99] font-semibold text-[17px]"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>988 - Crisis Lifeline</span>
                    </a>
                    <p className="text-xs mt-2" style={{ color: 'rgba(142, 142, 147, 1)' }}>Available 24/7 • Free & confidential</p>
                  </div>
                </div>
              </div>

              {/* Disclaimer and Button */}
              <div className="flex flex-col gap-4">
                <div className="card flex-1 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.02)' }}>
                  <p className="text-xs italic text-center" style={{ color: 'rgba(142, 142, 147, 1)' }}>
                    Not medical advice. Not for diagnosis or treatment.
                  </p>
                </div>
                <button onClick={resetFlow} className="btn btn-primary w-full">
                  Examine another thought
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Usage Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 transform animate-slideUp" style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }}>
            <h3 className="text-2xl font-semibold mb-3 tracking-tight">Daily limit reached</h3>
            <p className="text-[17px] mb-8 leading-relaxed" style={{ color: 'rgba(60, 60, 67, 0.85)' }}>
              You've used your 5 free sessions for today. Subscribe for $1/month to
              get unlimited access and continue your journey toward clearer thinking.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLimitModal(false)}
                className="btn btn-secondary flex-1"
              >
                Not Now
              </button>
              <Link href="/subscribe" className="btn btn-primary flex-1 text-center">
                Upgrade
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
