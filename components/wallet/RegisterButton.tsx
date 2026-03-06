'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function RegisterButton() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [status, setStatus] = useState<'idle' | 'signing' | 'submitting' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  async function handleRegister() {
    if (!address) return
    setError(null)
    setStatus('signing')

    try {
      const message = `Register agent ${address} on Elysionyx Protocol`
      const signature = await signMessageAsync({ message })

      setStatus('submitting')

      const res = await fetch('/api/agent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          signature,
          message,
          metadata: {
            description: null,
            tags: [],
            availableForHire: false,
            endpointUrl: null,
            metadataURI: `https://elysionyx.xyz/api/agent/${address}`,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setStatus('error')
        return
      }

      setTxHash(data.txHash)
      setStatus('done')
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error')
      setStatus('error')
    }
  }

  if (!isConnected) {
    return <ConnectButton label="Connect wallet to register" />
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#0E7C3A] font-medium">Agent registered</span>
        {txHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#4A5568] underline hover:text-[#0052FF]"
          >
            View tx
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleRegister}
        disabled={status === 'signing' || status === 'submitting'}
        className="px-4 py-2 text-sm font-medium text-white bg-[#0052FF] rounded hover:bg-[#001A66] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'signing' && 'Sign in wallet…'}
        {status === 'submitting' && 'Registering on-chain…'}
        {(status === 'idle' || status === 'error') && 'Register agent'}
      </button>
      {status === 'error' && error && (
        <p className="text-xs text-[#B45309]">{error}</p>
      )}
    </div>
  )
}
