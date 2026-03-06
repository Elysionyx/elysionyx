import { NextRequest, NextResponse } from 'next/server'
import { publicClient } from '@/lib/viemClient'
import { supabase } from '@/lib/supabase'
import { CONTRACT_ADDRESS, ELYSIO_REGISTRY_ABI, tierFromNumber } from '@/lib/contract'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PAGE_SIZE = 25

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const tierFilter = searchParams.get('tier') // '0' | '1' | '2' | null

  try {
    // 1. Get all registered agent addresses from contract events
    // Use a recent block range to stay within RPC provider limits (10k blocks max)
    const latestBlock = await publicClient.getBlockNumber()
    const fromBlock = latestBlock > BigInt(10000) ? latestBlock - BigInt(10000) : BigInt(0)

    const logs = await publicClient.getLogs({
      address: CONTRACT_ADDRESS,
      event: {
        type: 'event',
        name: 'AgentRegistered',
        inputs: [
          { indexed: true, name: 'agent', type: 'address' },
          { indexed: false, name: 'timestamp', type: 'uint256' },
        ],
      },
      fromBlock,
      toBlock: 'latest',
    })

    const addresses = logs.map((l) => (l.args as any).agent as string)
    if (addresses.length === 0) {
      return NextResponse.json({ agents: [], total: 0, page, pageSize: PAGE_SIZE })
    }

    // 2. Fetch reputation for each agent (batched via Promise.all)
    const reputations = await Promise.all(
      addresses.map(async (addr) => {
        const [score, tier] = (await publicClient.readContract({
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
          tier,
          tierLabel: tierFromNumber(tier),
          tasksCompleted: Number(record.tasksCompleted),
          tasksFailed: Number(record.tasksFailed),
          gauntletsPassed: Number(record.gauntletsPassed),
          registeredAt: Number(record.registeredAt),
        }
      })
    )

    // 3. Fetch off-chain tags & hire status from Supabase
    const lowerAddresses = addresses.map((a) => a.toLowerCase())
    const { data: metadata } = await supabase
      .from('agents')
      .select('address, tags, available_for_hire, description')
      .in('address', lowerAddresses)

    const metaMap: Record<string, any> = {}
    ;(metadata ?? []).forEach((m) => {
      metaMap[m.address] = m
    })

    // 4. Merge, filter, sort
    let agents = reputations.map((r) => ({
      ...r,
      tags: metaMap[r.address.toLowerCase()]?.tags ?? [],
      availableForHire: metaMap[r.address.toLowerCase()]?.available_for_hire ?? false,
      description: metaMap[r.address.toLowerCase()]?.description ?? null,
    }))

    if (tierFilter !== null) {
      agents = agents.filter((a) => String(a.tier) === tierFilter)
    }

    agents.sort((a, b) => b.score - a.score)

    const total = agents.length
    const start = (page - 1) * PAGE_SIZE
    const paginated = agents.slice(start, start + PAGE_SIZE)

    return NextResponse.json({
      agents: paginated,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    })
  } catch (err: any) {
    console.error('[GET /api/pantheon]', err)
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
