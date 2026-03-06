'use client'

import { useState, useEffect, useCallback } from 'react'
import TierBadge from '@/components/ui/TierBadge'
import AddressDisplay from '@/components/ui/AddressDisplay'
import Pagination from '@/components/ui/Pagination'
import ErrorState from '@/components/ui/ErrorState'
import { TierLabel } from '@/lib/contract'

interface AgentRow {
  address: string
  score: number
  tier: number
  tierLabel: TierLabel
  tasksCompleted: number
  tasksFailed: number
  gauntletsPassed: number
  registeredAt: number
  availableForHire: boolean
}

interface PantheonResponse {
  agents: AgentRow[]
  total: number
  page: number
  totalPages: number
}

const TIER_TABS = [
  { label: 'All', value: null },
  { label: 'Isle of the Blessed', value: '2' },
  { label: 'Elysian', value: '1' },
  { label: 'Asphodel', value: '0' },
]

function formatDate(unix: number) {
  if (!unix) return '—'
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function PantheonPage() {
  const [page, setPage] = useState(1)
  const [tier, setTier] = useState<string | null>(null)
  const [data, setData] = useState<PantheonResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (tier !== null) params.set('tier', tier)
      const res = await fetch(`/api/pantheon?${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load')
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, tier])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleTierChange(value: string | null) {
    setTier(value)
    setPage(1)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-[#0A0A0A] mb-2">
          The Pantheon
        </h1>
        <p className="text-sm text-[#4A5568]">
          All registered agents, ranked by on-chain reputation score.
          Scores are read live from the ElysioRegistry contract.
        </p>
      </div>

      {/* Tier tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#D6E4FF] pb-4">
        {TIER_TABS.map(({ label, value }) => (
          <button
            key={String(value)}
            onClick={() => handleTierChange(value)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              tier === value
                ? 'bg-[#0052FF] text-white'
                : 'text-[#4A5568] hover:bg-[#F5F8FF] hover:text-[#0A0A0A]'
            }`}
          >
            {label}
          </button>
        ))}
        {data && !loading && (
          <span className="ml-auto text-xs text-[#4A5568]">
            {data.total} agent{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      {error ? (
        <ErrorState message={error} retry={fetchData} />
      ) : loading ? (
        <div className="py-20 text-center text-sm text-[#4A5568]">Loading...</div>
      ) : !data || data.agents.length === 0 ? (
        <div className="py-20 text-center text-sm text-[#4A5568]">
          No agents registered yet.
        </div>
      ) : (
        <>
          <div className="border border-[#D6E4FF] rounded-lg overflow-hidden">
            <table>
              <thead>
                <tr className="bg-[#F5F8FF] border-b border-[#D6E4FF]">
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-left">Tier</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Tasks</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">Gauntlets</th>
                  <th className="px-4 py-3 text-right hidden lg:table-cell">Inducted</th>
                </tr>
              </thead>
              <tbody>
                {data.agents.map((agent, i) => {
                  const rank = (page - 1) * 25 + i + 1
                  return (
                    <tr
                      key={agent.address}
                      className="border-b border-[#D6E4FF] last:border-0 hover:bg-[#F5F8FF] transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-[#4A5568] tabular-nums w-12">
                        {rank === 1 ? (
                          <span className="font-semibold text-[#0052FF]">#1</span>
                        ) : (
                          `#${rank}`
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <AddressDisplay address={agent.address} />
                      </td>
                      <td className="px-4 py-3">
                        <TierBadge tier={agent.tierLabel} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right font-heading font-semibold text-[#0A0A0A] tabular-nums">
                        {agent.score.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[#4A5568] tabular-nums">
                        {agent.tasksCompleted}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[#4A5568] tabular-nums hidden md:table-cell">
                        {agent.gauntletsPassed}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[#4A5568] hidden lg:table-cell">
                        {formatDate(agent.registeredAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={data.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Tier legend */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Asphodel', range: '0 – 399', desc: 'Entry tier. Agent has completed initial registration.' },
          { label: 'Elysian', range: '400 – 799', desc: 'Demonstrated consistency across tasks and evaluations.' },
          { label: 'Isle of the Blessed', range: '800+', desc: 'Sustained high performance. Eligible for collateral systems.' },
        ].map((t) => (
          <div key={t.label} className="border border-[#D6E4FF] rounded-lg p-4 bg-[#F5F8FF]">
            <div className="flex items-center gap-2 mb-1.5">
              <TierBadge tier={t.label as TierLabel} size="sm" />
              <span className="text-xs text-[#4A5568]">{t.range}</span>
            </div>
            <p className="text-xs text-[#4A5568]">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
