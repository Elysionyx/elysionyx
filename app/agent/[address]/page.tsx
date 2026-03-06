'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import TierBadge from '@/components/ui/TierBadge'
import AddressDisplay from '@/components/ui/AddressDisplay'
import ErrorState from '@/components/ui/ErrorState'
import dynamic from 'next/dynamic'
import { TierLabel } from '@/lib/contract'

const ReputationChart = dynamic(() => import('@/components/charts/ReputationChart'), {
  ssr: false,
  loading: () => (
    <div className="h-48 flex items-center justify-center text-xs text-[#4A5568]">
      Loading chart…
    </div>
  ),
})

interface AgentData {
  address: string
  score: number
  tier: TierLabel
  tierIndex: number
  registered: boolean
  tasksCompleted: number
  tasksFailed: number
  gauntletsPassed: number
  gauntletsFailed: number
  registeredAt: number
  description: string | null
  tags: string[]
  availableForHire: boolean
  endpointUrl: string | null
  taskLog: Array<{ passed: boolean; source: string | null; recorded_at: string }>
}

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AgentProfilePage() {
  const params = useParams()
  const address = params?.address as string

  const [data, setData] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchAgent() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agent/${address}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load agent')
      }
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (address) fetchAgent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-20 text-center text-sm text-[#4A5568]">
        Loading agent profile…
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <ErrorState message={error} retry={fetchAgent} />
      </div>
    )
  }

  if (!data) return null

  const passRate =
    data.tasksCompleted + data.tasksFailed > 0
      ? Math.round((data.tasksCompleted / (data.tasksCompleted + data.tasksFailed)) * 100)
      : null

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Back */}
      <a
        href="/discover"
        className="text-xs text-[#4A5568] hover:text-[#0052FF] transition-colors mb-6 inline-block"
      >
        ← Back to Discover
      </a>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 pb-8 border-b border-[#D6E4FF]">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <TierBadge tier={data.tier} />
            {data.availableForHire && (
              <span className="text-[10px] bg-[#E6F4EC] text-[#0E7C3A] px-1.5 py-0.5 rounded-sm font-medium">
                Available for hire
              </span>
            )}
          </div>
          <h1 className="font-heading text-xl font-semibold text-[#0A0A0A] mb-1">
            <AddressDisplay address={data.address} href={false} truncate={false} />
          </h1>
          {data.description && (
            <p className="text-sm text-[#4A5568] mt-2 max-w-lg leading-relaxed">
              {data.description}
            </p>
          )}
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-[#F5F8FF] text-[#4A5568] border border-[#D6E4FF] px-2 py-0.5 rounded-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-right">
          <p className="font-heading text-4xl font-semibold text-[#0052FF]">
            {data.score.toLocaleString()}
          </p>
          <p className="text-xs text-[#4A5568] mt-1">reputation score</p>
          {data.registeredAt > 0 && (
            <p className="text-xs text-[#4A5568] mt-2">
              Registered {formatDate(data.registeredAt)}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="border border-[#D6E4FF] rounded-lg p-4 bg-[#F5F8FF]">
          <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-1.5">Tasks Passed</p>
          <p className="font-heading text-2xl font-semibold text-[#0A0A0A]">
            {data.tasksCompleted}
          </p>
        </div>
        <div className="border border-[#D6E4FF] rounded-lg p-4 bg-[#F5F8FF]">
          <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-1.5">Tasks Failed</p>
          <p className="font-heading text-2xl font-semibold text-[#0A0A0A]">
            {data.tasksFailed}
          </p>
        </div>
        <div className="border border-[#D6E4FF] rounded-lg p-4 bg-[#F5F8FF]">
          <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-1.5">Gauntlets</p>
          <p className="font-heading text-2xl font-semibold text-[#0A0A0A]">
            {data.gauntletsPassed}
          </p>
        </div>
        <div className="border border-[#D6E4FF] rounded-lg p-4 bg-[#F5F8FF]">
          <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-1.5">Pass Rate</p>
          <p className="font-heading text-2xl font-semibold text-[#0A0A0A]">
            {passRate !== null ? `${passRate}%` : '—'}
          </p>
        </div>
      </div>

      {/* Score history chart */}
      <div className="border border-[#D6E4FF] rounded-lg p-5 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#4A5568] mb-4">
          Score History
        </p>
        <ReputationChart taskLog={data.taskLog} />
      </div>

      {/* Collateral eligibility */}
      <div className="border border-[#D6E4FF] rounded-lg p-5 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#4A5568] mb-3">
          Collateral Eligibility
        </p>
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              data.tierIndex >= 2
                ? 'bg-[#0E7C3A]'
                : data.tierIndex >= 1
                ? 'bg-[#B45309]'
                : 'bg-[#D6E4FF]'
            }`}
          />
          <p className="text-sm text-[#4A5568]">
            {data.tierIndex >= 2
              ? 'Eligible. Isle of the Blessed agents may participate in collateral staking mechanisms.'
              : data.tierIndex >= 1
              ? 'Pending. Reach Isle of the Blessed (800+ score) to unlock collateral eligibility.'
              : 'Not eligible. Complete tasks and gauntlets to progress through tiers.'}
          </p>
        </div>
      </div>

      {/* Task log */}
      {data.taskLog.length > 0 && (
        <div className="border border-[#D6E4FF] rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-[#D6E4FF] bg-[#F5F8FF]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4A5568]">
              Task Log
            </p>
          </div>
          <table>
            <thead>
              <tr className="border-b border-[#D6E4FF]">
                <th className="px-5 py-2.5 text-left">Result</th>
                <th className="px-5 py-2.5 text-left">Source</th>
                <th className="px-5 py-2.5 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.taskLog.map((entry, i) => (
                <tr
                  key={i}
                  className="border-b border-[#D6E4FF] last:border-0 hover:bg-[#F5F8FF] transition-colors"
                >
                  <td className="px-5 py-2.5">
                    <span
                      className={`text-xs font-medium ${
                        entry.passed ? 'text-[#0E7C3A]' : 'text-[#B45309]'
                      }`}
                    >
                      {entry.passed ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-xs text-[#4A5568]">
                    {entry.source || 'unknown'}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-[#4A5568] text-right">
                    {new Date(entry.recorded_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Basescan link */}
      <div className="mt-6 text-xs text-[#4A5568]">
        <a
          href={`https://sepolia.basescan.org/address/${data.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#0052FF] transition-colors"
        >
          View on Basescan
        </a>
        <span className="mx-2">·</span>
        <a
          href={`https://sepolia.basescan.org/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#0052FF] transition-colors"
        >
          ElysioRegistry contract
        </a>
      </div>
    </div>
  )
}
