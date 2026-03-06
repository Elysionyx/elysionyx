'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const NAV_LINKS = [
  { href: '/pantheon', label: 'Pantheon' },
  { href: '/gauntlet', label: 'Gauntlet' },
  { href: '/discover', label: 'Discover' },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#D6E4FF]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo + Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/logo.jpg"
            alt="Elysionyx"
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
          <span className="font-heading font-semibold text-base text-[#0A0A0A] tracking-tight">
            Elysionyx
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? 'text-[#0052FF] bg-[#EBF0FF]'
                    : 'text-[#4A5568] hover:text-[#0A0A0A] hover:bg-[#F5F8FF]'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Wallet connect */}
        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus="address"
        />
      </div>
    </header>
  )
}
