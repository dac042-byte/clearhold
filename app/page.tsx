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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.ico"
              alt="Clearhold logo"
              className="w-8 h-8"
            />
            <h1 className="text-2xl font-bold text-gray-900">Clearhold</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {profile?.subscription_status === 'active' ? (
                <span className="text-green-600 font-medium">Pro Member</span>
              ) : (
                <span>
                  Daily uses: <span className="font-medium">{getRemainingUses()}/5</span>
                </span>
              )}
            </div>
            {profile?.subscription_status !== 'active' && (
              <Link
                href="/subscribe"
                className="text-sm bg-sky-600 text-white px-3 py-1.5 rounded-lg hover:bg-sky-700"
              >
                Upgrade
              </Link>
            )}
            <button
              onClick={signOut}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Input Step */}
        {step === 'input' && (
          <div className="card max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">What thought is looping?</h2>
            <p className="text-gray-600 mb-6">
              Enter the thought you'd like to examine with clarity
            </p>
            <textarea
              className="input min-h-[120px] resize-none"
              placeholder="E.g., 'Everyone at work thinks I'm incompetent' or 'I'll never find a relationship'"
              value={thought}
              onChange={(e) => setThought(e.target.value)}
            />
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            <button
              onClick={handleInputSubmit}
              className="btn btn-primary w-full mt-4"
            >
              Continue
            </button>
          </div>
        )}

        {/* Classification Step */}
        {step === 'classify' && (
          <div className="card max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Step A: What type is this?</h2>
            <p className="text-gray-600 mb-6">Choose the category that best fits</p>
            <div className="space-y-3">
              {(['Fact', 'Thought', 'Prediction'] as Classification[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleClassification(type)}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-sky-500 hover:bg-sky-50 text-left transition-colors"
                >
                  <div className="font-medium">{type}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {type === 'Fact' && 'Something objectively verifiable'}
                    {type === 'Thought' && 'An interpretation or belief'}
                    {type === 'Prediction' && 'A forecast about the future'}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('input')}
              className="btn btn-secondary w-full mt-4"
            >
              Back
            </button>
          </div>
        )}

        {/* Distortions Step */}
        {step === 'distortions' && (
          <div className="card max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Step B: Select distortions</h2>
            <p className="text-gray-600 mb-6">Choose 1-2 that might apply</p>
            <div className="grid grid-cols-2 gap-3">
              {DISTORTIONS.map((distortion) => (
                <button
                  key={distortion}
                  onClick={() => toggleDistortion(distortion)}
                  disabled={
                    selectedDistortions.length >= 2 &&
                    !selectedDistortions.includes(distortion)
                  }
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${
                    selectedDistortions.includes(distortion)
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-medium text-sm">{distortion}</div>
                </button>
              ))}
            </div>
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            <div className="flex gap-3 mt-6">
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
          <div className="card max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Step C: Evidence check</h2>
            <p className="text-gray-600 mb-6">
              Is there direct evidence this is objectively true?
            </p>
            <div className="space-y-3">
              {(['Yes', 'No', 'Unclear'] as EvidenceChoice[]).map((choice) => (
                <button
                  key={choice}
                  onClick={() => handleEvidenceSubmit(choice)}
                  disabled={loading}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-sky-500 hover:bg-sky-50 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="font-medium">{choice}</div>
                </button>
              ))}
            </div>
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            {loading && (
              <div className="text-center mt-4 text-gray-600">
                Processing your reflection...
              </div>
            )}
            <button
              onClick={() => setStep('distortions')}
              disabled={loading}
              className="btn btn-secondary w-full mt-4"
            >
              Back
            </button>
          </div>
        )}

        {/* Result Step */}
        {step === 'result' && aiResponse && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-2">What this is</h3>
              <p className="text-gray-700">{aiResponse.type}</p>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-2">Likely distortions</h3>
              <ul className="list-disc list-inside space-y-1">
                {aiResponse.distortions.map((distortion, idx) => (
                  <li key={idx} className="text-gray-700">
                    {distortion}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-2">Assumptions vs facts</h3>
              <p className="text-gray-700 whitespace-pre-line">
                {aiResponse.assumptions_vs_facts}
              </p>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-2">Grounded reframe</h3>
              <p className="text-gray-700">{aiResponse.grounded_reframe}</p>
            </div>

            <div className="card bg-gray-50">
              <p className="text-xs text-gray-600 italic">
                Not medical advice. Not for diagnosis or treatment.
              </p>
            </div>

            <button onClick={resetFlow} className="btn btn-primary w-full">
              Examine another thought
            </button>
          </div>
        )}
      </main>

      {/* Usage Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Daily limit reached</h3>
            <p className="text-gray-700 mb-6">
              You've used your 5 free sessions for today. Subscribe for just $1/month to
              get unlimited daily access and continue your journey toward clearer thinking.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLimitModal(false)}
                className="btn btn-secondary flex-1"
              >
                Maybe later
              </button>
              <Link href="/subscribe" className="btn btn-primary flex-1 text-center">
                Subscribe now
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
