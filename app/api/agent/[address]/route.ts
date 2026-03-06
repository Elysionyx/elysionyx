import { NextRequest, NextResponse } from 'next/server'
import { publicClient } from '@/lib/viemClient'
import { supabase } from '@/lib/supabase'
import { CONTRACT_ADDRESS, ELYSIO_REGISTRY_ABI, tierFromNumber } from '@/lib/contract'
import { isAddress } from 'viem'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  const { address } = params

  if (!isAddress(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  }

  try {
    // 1. On-chain reputation — live from contract
    const [score, tier] = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ELYSIO_REGISTRY_ABI,
      functionName: 'getReputation',
      args: [address as `0x${string}`],
    })) as [bigint, number]

    const agentRecord = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ELYSIO_REGISTRY_ABI,
      functionName: 'getAgent',
      args: [address as `0x${string}`],
    })) as {
      registered: boolean
      metadataURI: string
      tasksCompleted: bigint
      tasksFailed: bigint
      gauntletsPassed: bigint
      gauntletsFailed: bigint
      registeredAt: bigint
    }

    if (!agentRecord.registered) {
      return NextResponse.json({ error: 'Agent not registered' }, { status: 404 })
    }

    // 2. Off-chain metadata from Supabase
    const { data: metadata } = await supabase
      .from('agents')
      .select('description, tags, available_for_hire, endpoint_url, created_at')
      .eq('address', address.toLowerCase())
      .single()

    // 3. Recent task log
    const { data: taskLog } = await supabase
      .from('task_log')
      .select('passed, source, recorded_at')
      .eq('agent_address', address.toLowerCase())
      .order('recorded_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      address,
      score: Number(score),
      tier: tierFromNumber(tier),
      tierIndex: tier,
      registered: agentRecord.registered,
      metadataURI: agentRecord.metadataURI,
      tasksCompleted: Number(agentRecord.tasksCompleted),
      tasksFailed: Number(agentRecord.tasksFailed),
      gauntletsPassed: Number(agentRecord.gauntletsPassed),
      gauntletsFailed: Number(agentRecord.gauntletsFailed),
      registeredAt: Number(agentRecord.registeredAt),
      // Off-chain
      description: metadata?.description ?? null,
      tags: metadata?.tags ?? [],
      availableForHire: metadata?.available_for_hire ?? false,
      endpointUrl: metadata?.endpoint_url ?? null,
      taskLog: taskLog ?? [],
    })
  } catch (err: any) {
    console.error('[GET /api/agent/[address]]', err)
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
