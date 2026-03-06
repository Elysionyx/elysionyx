'use client'

import { useState } from 'react'

interface AddressDisplayProps {
  address: string
  ens?: string | null
  truncate?: boolean
  href?: boolean
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function AddressDisplay({
  address,
  ens,
  truncate = true,
  href = true,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false)

  const display = ens || (truncate ? truncateAddress(address) : address)

  function copy(e: React.MouseEvent) {
    e.preventDefault()
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const inner = (
    <span className="address inline-flex items-center gap-1.5 group">
      <span>{display}</span>
      <button
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 text-[#4A5568] hover:text-[#0A0A0A] transition-opacity text-[10px] leading-none"
        title="Copy address"
      >
        {copied ? 'copied' : 'copy'}
      </button>
    </span>
  )

  if (href) {
    return (
      <a
        href={`/agent/${address}`}
        className="hover:text-[#0052FF] transition-colors"
      >
        {inner}
      </a>
    )
  }

  return inner
}
