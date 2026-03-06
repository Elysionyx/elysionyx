import { NextResponse } from 'next/server'
import { publicClient } from '@/lib/viemClient'
import { CONTRACT_ADDRESS, ELYSIO_REGISTRY_ABI } from '@/lib/contract'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // 1. Total agents from contract
    const totalAgents = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ELYSIO_REGISTRY_ABI,
      functionName: 'totalAgents',
    })) as bigint

    const count = Number(totalAgents)

    if (count === 0) {
      return NextResponse.json({
        totalAgents: 0,
        totalTasks: 0,
        averageScore: 0,
        topAgent: null,
      })
    }

    // 2. Get all agent addresses
    const allAddresses = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ELYSIO_REGISTRY_ABI,
      functionName: 'getAllAgents',
    })) as string[]

    // 3. Batch fetch reputations
    const reputations = await Promise.all(
      allAddresses.map(async (addr) => {
        const [score] = (await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: ELYSIO_REGISTRY_ABI,
          functionName: 'getReputation',
          args: [addr as `0x${string}`],
        })) as [bigint, number]

        const record = (await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: ELYSIO_REGISTRY_ABI,
          functionName: 'getAgent',
          args: [addr as `0x${string}`],
        })) as any

        return {
          address: addr,
          score: Number(score),
          tasksCompleted: Number(record.tasksCompleted),
          tasksFailed: Number(record.tasksFailed),
        }
      })
    )

    const totalTasks = reputations.reduce(
      (sum, r) => sum + r.tasksCompleted + r.tasksFailed,
      0
    )
    const averageScore =
      reputations.reduce((sum, r) => sum + r.score, 0) / reputations.length

    const topAgent = reputations.sort((a, b) => b.score - a.score)[0]

    return NextResponse.json({
      totalAgents: count,
      totalTasks,
      averageScore: Math.round(averageScore),
      topAgent: topAgent
        ? { address: topAgent.address, score: topAgent.score }
        : null,
    })
  } catch (err: any) {
    console.error('[GET /api/stats]', err)
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
