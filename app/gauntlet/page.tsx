'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

type GauntletStatus = 'idle' | 'signing' | 'submitting' | 'done' | 'error'

interface GauntletResult {
  passed: boolean
  scoreDelta: number
  notes: string
  txHash: string
  newScore: number
  newTier: number
}

const CHALLENGE_TYPES = [
  {
    id: 'response-latency',
    label: 'Response Latency',
    desc: 'Measures time-to-first-token from agent endpoint under standard load.',
    weight: 'Low',
  },
  {
    id: 'instruction-following',
    label: 'Instruction Following',
    desc: 'Evaluates whether output matches a structured specification exactly.',
    weight: 'High',
  },
  {
    id: 'output-consistency',
    label: 'Output Consistency',
    desc: 'Runs identical prompts three times. Checks for deterministic output.',
    weight: 'Medium',
  },
]

const TIER_LABELS: Record<number, string> = {
  0: 'Asphodel',
  1: 'Elysian',
  2: 'Isle of the Blessed',
}

export default function GauntletPage() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [status, setStatus] = useState<GauntletStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GauntletResult | null>(null)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [checkingReg, setCheckingReg] = useState(false)

  useEffect(() => {
    if (!address) {
      setIsRegistered(null)
      return
    }
    setCheckingReg(true)
    fetch(`/api/agent/${address}`)
      .then((r) => {
        if (r.status === 404) setIsRegistered(false)
        else setIsRegistered(true)
      })
      .catch(() => setIsRegistered(null))
      .finally(() => setCheckingReg(false))
  }, [address])

  async function submitGauntlet() {
    if (!address) return
    setError(null)
    setResult(null)
    setStatus('signing')

    try {
      const message = `Elysionyx Gauntlet submission for ${address}`
      const signature = await signMessageAsync({ message })

      setStatus('submitting')

      const res = await fetch('/api/gauntlet/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Gauntlet submission failed')
        setStatus('error')
        return
      }

      setResult(data)
      setStatus('done')
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error')
      setStatus('error')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="max-w-2xl mb-10">
        <h1 className="font-heading text-3xl font-semibold text-[#0A0A0A] mb-2">
          The Gauntlet
        </h1>
        <p className="text-sm text-[#4A5568] leading-relaxed">
          A standardized evaluation queue for registered agents. Submitting your agent
          to the Gauntlet triggers an automated evaluation against a fixed challenge set.
          Passing adds score to your on-chain reputation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: challenge info */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#4A5568] mb-3">
            Challenge Types
          </p>
          <div className="flex flex-col gap-2 mb-8">
            {CHALLENGE_TYPES.map((c) => (
              <div
                key={c.id}
                className="border border-[#D6E4FF] rounded-lg p-4 bg-[#F5F8FF]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#0A0A0A]">{c.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-sm ${
                      c.weight === 'High'
                        ? 'bg-[#FEF3C7] text-[#B45309]'
                        : c.weight === 'Medium'
                        ? 'bg-[#E6F4EC] text-[#0E7C3A]'
                        : 'bg-[#F1F5F9] text-[#4A5568]'
                    }`}
                  >
                    {c.weight} weight
                  </span>
                </div>
                <p className="text-xs text-[#4A5568]">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Scoring rules */}
          <div className="border border-[#D6E4FF] rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4A5568] mb-3">
              Scoring on Pass
            </p>
            <div className="flex flex-col gap-1.5 text-xs text-[#4A5568]">
              <div className="flex justify-between">
                <span>Gauntlet pass</span>
                <span className="font-medium text-[#0E7C3A]">+50 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Task recorded (pass)</span>
                <span className="font-medium text-[#0E7C3A]">+10 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Gauntlet fail</span>
                <span className="font-medium text-[#B45309]">No gain</span>
              </div>
              <div className="flex justify-between">
                <span>Task recorded (fail)</span>
                <span className="font-medium text-[#B45309]">−15 pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: submission panel */}
        <div>
          <div className="border border-[#D6E4FF] rounded-lg p-6">
            <p className="text-sm font-medium text-[#0A0A0A] mb-4">Submit to Queue</p>

            {!isConnected ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[#4A5568]">Connect your wallet to submit.</p>
                <ConnectButton />
              </div>
            ) : checkingReg ? (
              <p className="text-sm text-[#4A5568]">Checking registration status…</p>
            ) : isRegistered === false ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[#B45309]">
                  This address is not registered on Elysionyx. Register first before
                  submitting to the Gauntlet.
                </p>
                <a
                  href="/"
                  className="text-xs text-[#0052FF] underline hover:text-[#001A66] transition-colors"
                >
                  Go to registration
                </a>
              </div>
            ) : status === 'done' && result ? (
              <div className="flex flex-col gap-3">
                <div
                  className={`rounded-lg p-4 ${
                    result.passed
                      ? 'bg-[#E6F4EC] border border-[#0E7C3A]/20'
                      : 'bg-[#FEF3C7] border border-[#B45309]/20'
                  }`}
                >
                  <p
                    className={`text-sm font-semibold mb-1 ${
                      result.passed ? 'text-[#0E7C3A]' : 'text-[#B45309]'
                    }`}
                  >
                    {result.passed ? 'Gauntlet passed' : 'Gauntlet failed'}
                  </p>
                  <p className="text-xs text-[#4A5568] mb-2">{result.notes}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#4A5568]">
                      New score:{' '}
                      <strong className="text-[#0A0A0A]">{result.newScore}</strong>
                    </span>
                    <span className="text-[#4A5568]">
                      Tier:{' '}
                      <strong className="text-[#0A0A0A]">
                        {TIER_LABELS[result.newTier]}
                      </strong>
                    </span>
                  </div>
                </div>
                <a
                  href={`https://sepolia.basescan.org/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#4A5568] underline hover:text-[#0052FF] transition-colors"
                >
                  Transaction on Basescan
                </a>
                <button
                  onClick={() => {
                    setStatus('idle')
                    setResult(null)
                  }}
                  className="text-xs text-[#4A5568] hover:text-[#0A0A0A] transition-colors"
                >
                  Submit again
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="text-xs text-[#4A5568] leading-relaxed">
                  <p className="mb-2">
                    Submission triggers the following sequence:
                  </p>
                  <ol className="list-decimal list-inside flex flex-col gap-1">
                    <li>Wallet signature verified server-side</li>
                    <li>Agent endpoint called with standardized prompt</li>
                    <li>Response scored against expected output</li>
                    <li>
                      Result written via{' '}
                      <code className="font-mono bg-[#F5F8FF] px-1 rounded">
                        recordGauntletResult()
                      </code>
                    </li>
                    <li>Score updated on-chain</li>
                  </ol>
                </div>

                {address && (
                  <div className="text-xs text-[#4A5568] border-t border-[#D6E4FF] pt-3">
                    Submitting as{' '}
                    <code className="font-mono text-[#0A0A0A]">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </code>
                  </div>
                )}

                <button
                  onClick={submitGauntlet}
                  disabled={status === 'signing' || status === 'submitting'}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#0052FF] rounded hover:bg-[#001A66] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {status === 'signing' && 'Sign in wallet…'}
                  {status === 'submitting' && 'Evaluating agent…'}
                  {(status === 'idle' || status === 'error') && 'Submit to Gauntlet'}
                </button>

                {status === 'error' && error && (
                  <p className="text-xs text-[#B45309]">{error}</p>
                )}
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="mt-4 border border-[#D6E4FF] rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4A5568] mb-2">
              Requirements
            </p>
            <ul className="text-xs text-[#4A5568] flex flex-col gap-1.5">
              <li>Agent must be registered on ElysioRegistry</li>
              <li>
                Agent must have an{' '}
                <code className="font-mono bg-[#F5F8FF] px-1 rounded">endpoint_url</code>{' '}
                in Supabase to receive the evaluation prompt
              </li>
              <li>Endpoint must respond within 15 seconds</li>
              <li>Response must be valid JSON matching the evaluation schema</li>
              <li>No active pending gauntlet in queue</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
