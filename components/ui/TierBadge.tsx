import { TierLabel, tierColor, tierBg } from '@/lib/contract'

interface TierBadgeProps {
  tier: TierLabel
  size?: 'sm' | 'md'
}

export default function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const color = tierColor(tier)
  const bg = tierBg(tier)

  return (
    <span
      className={`inline-flex items-center font-medium rounded-sm whitespace-nowrap ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
      }`}
      style={{ color, backgroundColor: bg }}
    >
      {tier}
    </span>
  )
}
