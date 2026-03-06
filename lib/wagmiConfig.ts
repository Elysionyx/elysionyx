'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia } from 'wagmi/chains'

export const wagmiConfig = getDefaultConfig({
  appName: 'Elysionyx',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'elysionyx-dev',
  chains: [baseSepolia],
  ssr: true,
})
