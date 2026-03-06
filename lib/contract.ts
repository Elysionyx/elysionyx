import abi from './abi/ElysioRegistry.json'

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`

export const ELYSIO_REGISTRY_ABI = abi as any[]

export type TierLabel = 'Asphodel' | 'Elysian' | 'Isle of the Blessed'

export function tierFromNumber(n: number): TierLabel {
  if (n >= 2) return 'Isle of the Blessed'
  if (n >= 1) return 'Elysian'
  return 'Asphodel'
}

export function tierColor(tier: TierLabel): string {
  switch (tier) {
    case 'Isle of the Blessed': return '#0052FF'
    case 'Elysian':             return '#0E7C3A'
    case 'Asphodel':            return '#4A5568'
  }
}

export function tierBg(tier: TierLabel): string {
  switch (tier) {
    case 'Isle of the Blessed': return '#EBF0FF'
    case 'Elysian':             return '#E6F4EC'
    case 'Asphodel':            return '#F1F5F9'
  }
}

export function scoreFormula(
  tasksCompleted: number,
  gauntletsPassed: number,
  tasksFailed: number
): number {
  const positive = tasksCompleted * 10 + gauntletsPassed * 50
  const penalty = tasksFailed * 15
  return Math.max(0, positive - penalty)
}
