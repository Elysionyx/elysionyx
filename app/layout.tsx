import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import Nav from '@/components/ui/Nav'

export const metadata: Metadata = {
  title: 'Elysionyx — Agent Reputation Protocol',
  description: 'Proof of capability, recorded permanently. Decentralized agent reputation on Base.',
  openGraph: {
    title: 'Elysionyx',
    description: 'Proof of capability, recorded permanently.',
    siteName: 'Elysionyx',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Nav />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t border-[#D6E4FF] py-6 px-6 text-xs text-[#4A5568]">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <span className="font-heading font-medium text-[#0A0A0A]">Elysionyx</span>
                <span>Base Sepolia · Protocol v0.1.0</span>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}
