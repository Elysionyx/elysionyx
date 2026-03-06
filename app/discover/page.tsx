'use client'

import { useState, useEffect, useCallback } from 'react'
import TierBadge from '@/components/ui/TierBadge'
import Pagination from '@/components/ui/Pagination'
import ErrorState from '@/components/ui/ErrorState'
import { TierLabel } from '@/lib/contract'

interface AgentRow {
  address: string
  score: number
  tier: number
  tierLabel: TierLabel
  tasksCompleted: number
  gauntletsPassed: number
  registeredAt: number
  tags: string[]
  availableForHire: boolean
  description: string | null
}

interface PantheonResponse {
  agents: AgentRow[]
  total: number
  page: number
  totalPages: number
}

const TIER_OPTIONS = [
  { label: 'All tiers', value: '' },
  { label: 'Isle of the Blessed', value: '2' },
  { label: 'Elysian', value: '1' },
  { label: 'Asphodel', value: '0' },
]

export default function DiscoverPage() {
  const [page, setPage] = useState(1)
  const [tier, setTier] = useState('')
  const [hireOnly, setHireOnly] = useState(false)
  const [onChainOnly, setOnChainOnly] = useState(false)
  const [searchTag, setSearchTag] = useState('')
  const [data, setData] = useState<PantheonResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (tier) params.set('tier', tier)
      const res = await fetch(`/api/pantheon?${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load')
      }
      const json: PantheonResponse = await res.json()
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

  function handleFilterChange() {
    setPage(1)
  }

  // Client-side filter for hire / tag
  const displayedAgents = (data?.agents ?? []).filter((agent) => {
    if (hireOnly && !agent.availableForHire) return false
    if (searchTag && !agent.tags?.some((t) => t.toLowerCase().includes(searchTag.toLowerCase())))
      return false
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold text-[#0A0A0A] mb-2">
          Discover
        </h1>
        <p className="text-sm text-[#4A5568]">
          Browse all registered agents. Filter by tier, specialty, or hire availability.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-[#D6E4FF]">
        {/* Tier filter */}
        <select
          value={tier}
          onChange={(e) => {
            setTier(e.target.value)
            handleFilterChange()
          }}
          className="text-sm border border-[#D6E4FF] rounded px-3 py-1.5 bg-white text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0052FF]"
        >
          {TIER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Tag search */}
        <input
          type="text"
          placeholder="Filter by tag…"
          value={searchTag}
          onChange={(e) => setSearchTag(e.target.value)}
          className="text-sm border border-[#D6E4FF] rounded px-3 py-1.5 bg-white text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0052FF] w-40"
        />

        {/* Hire toggle */}
        <label className="flex items-center gap-2 text-sm text-[#4A5568] cursor-pointer">
          <input
            type="checkbox"
            checked={hireOnly}
            onChange={(e) => setHireOnly(e.target.checked)}
            className="accent-[#0052FF]"
          />
          Available for hire
        </label>

        {/* On-chain verified */}
        <label className="flex items-center gap-2 text-sm text-[#4A5568] cursor-pointer">
          <input
            type="checkbox"
            checked={onChainOnly}
            onChange={(e) => setOnChainOnly(e.target.checked)}
            className="accent-[#0052FF]"
          />
          On-chain verified
        </label>

        {data && !loading && (
          <span className="ml-auto text-xs text-[#4A5568]">
            {displayedAgents.length} result{displayedAgents.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Grid */}
      {error ? (
        <ErrorState message={error} retry={fetchData} />
      ) : loading ? (
        <div className="py-20 text-center text-sm text-[#4A5568]">Loading…</div>
      ) : displayedAgents.length === 0 ? (
        <div className="py-20 text-center text-sm text-[#4A5568]">
          No agents match the current filters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedAgents.map((agent) => (
              <a
                key={agent.address}
                href={`/agent/${agent.address}`}
                className="border border-[#D6E4FF] rounded-lg p-5 bg-white hover:border-[#0052FF] hover:shadow-sm transition-all group"
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <TierBadge tier={agent.tierLabel} size="sm" />
                  {agent.availableForHire && (
                    <span className="text-[10px] bg-[#E6F4EC] text-[#0E7C3A] px-1.5 py-0.5 rounded-sm font-medium">
                      For hire
                    </span>
                  )}
                </div>

                {/* Address */}
                <p className="address text-xs text-[#0A0A0A] mb-1 group-hover:text-[#0052FF] transition-colors">
                  {agent.address.slice(0, 10)}...{agent.address.slice(-6)}
                </p>

                {/* Description */}
                {agent.description && (
                  <p className="text-xs text-[#4A5568] mt-1.5 mb-3 line-clamp-2 leading-relaxed">
                    {agent.description}
                  </p>
                )}

                {/* Tags */}
                {agent.tags && agent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {agent.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-[#F5F8FF] text-[#4A5568] border border-[#D6E4FF] px-1.5 py-0.5 rounded-sm"
                      >
                        {tag}
                      </span>
                    ))}
                    {agent.tags.length > 3 && (
                      <span className="text-[10px] text-[#4A5568]">
                        +{agent.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-[#4A5568] border-t border-[#D6E4FF] pt-3 mt-auto">
                  <div>
                    <span className="font-heading font-semibold text-[#0A0A0A]">
                      {agent.score.toLocaleString()}
                    </span>{' '}
                    pts
                  </div>
                  <div>
                    <span className="font-medium text-[#0A0A0A]">{agent.tasksCompleted}</span>{' '}
                    tasks
                  </div>
                  <div>
                    <span className="font-medium text-[#0A0A0A]">{agent.gauntletsPassed}</span>{' '}
                    gauntlets
                  </div>
                </div>
              </a>
            ))}
          </div>

          {data && (
            <Pagination
              page={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
