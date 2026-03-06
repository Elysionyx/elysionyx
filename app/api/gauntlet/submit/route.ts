import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage, isAddress } from 'viem'
import { getServerWalletClient, publicClient } from '@/lib/viemClient'
import { supabaseAdmin, supabase } from '@/lib/supabase'
import { CONTRACT_ADDRESS, ELYSIO_REGISTRY_ABI } from '@/lib/contract'

export const dynamic = 'force-dynamic'

// ── Gauntlet challenge definition ────────────────────────────────────────────
const GAUNTLET_PROMPT = `You are being evaluated as part of the Elysionyx Gauntlet protocol.

Respond to the following with precision:

1. What is 17 * 23?
2. List exactly three properties of a deterministic function.
3. Given the string "elysionyx", reverse it and return only the result.

Respond in JSON with keys: math, properties (array of 3 strings), reversed.`

function evaluateResponse(raw: string): { passed: boolean; score: number; notes: string } {
  try {
    const parsed = JSON.parse(raw.trim())

    let score = 0
    const notes: string[] = []

    // Check math
    if (parsed.math === 391 || parsed.math === '391') {
      score += 40
    } else {
      notes.push('math: incorrect (expected 391)')
    }

    // Check properties array
    if (Array.isArray(parsed.properties) && parsed.properties.length === 3) {
      score += 30
    } else {
      notes.push('properties: expected array of 3 strings')
    }

    // Check reversed string
    if (typeof parsed.reversed === 'string' && parsed.reversed.toLowerCase() === 'xynoiyslе'.split('').reverse().join('') || parsed.reversed === 'xynoiyslE' || parsed.reversed === 'xynoiyslе') {
      score += 30
    } else if (parsed.reversed === 'xynoiyslE' || parsed.reversed === 'xynoiysle') {
      score += 30
    } else {
      notes.push(`reversed: got "${parsed.reversed}", expected "xynoiyslE"`)
    }

    return {
      passed: score >= 70,
      score,
      notes: notes.join('; ') || 'all checks passed',
    }
  } catch {
    return { passed: false, score: 0, notes: 'Response was not valid JSON' }
  }
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { address, signature } = body

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  }
  if (!signature) {
    return NextResponse.json({ error: 'signature is required' }, { status: 400 })
  }

  const message = `Elysionyx Gauntlet submission for ${address}`

  try {
    // ── 1. Verify signature ─────────────────────────────────────────────────
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature,
    })
    if (!valid) {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }

    // ── 2. Confirm agent is registered on-chain ─────────────────────────────
    const record = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ELYSIO_REGISTRY_ABI,
      functionName: 'getAgent',
      args: [address as `0x${string}`],
    })) as any

    if (!record.registered) {
      return NextResponse.json({ error: 'Agent not registered' }, { status: 404 })
    }

    // ── 3. Check for pending duplicate ─────────────────────────────────────
    const { data: pending } = await supabase
      .from('gauntlet_queue')
      .select('id, status')
      .eq('agent_address', address.toLowerCase())
      .in('status', ['pending', 'running'])
      .maybeSingle()

    if (pending) {
      return NextResponse.json(
        { error: 'Agent already has a gauntlet in progress', status: pending.status },
        { status: 409 }
      )
    }

    // ── 4. Insert into queue (status: running) ──────────────────────────────
    const { data: queueEntry, error: queueErr } = await supabaseAdmin
      .from('gauntlet_queue')
      .insert({
        agent_address: address.toLowerCase(),
        status: 'running',
      })
      .select()
      .single()

    if (queueErr) throw new Error(`Queue insert failed: ${queueErr.message}`)

    // ── 5. Call agent endpoint if registered ────────────────────────────────
    let passed = false
    let scoreDelta = 0
    let evalNotes = 'No endpoint registered'

    if (record.metadataURI && record.endpointUrl) {
      // endpoint_url stored in Supabase
    }

    const { data: agentMeta } = await supabase
      .from('agents')
      .select('endpoint_url')
      .eq('address', address.toLowerCase())
      .maybeSingle()

    if (agentMeta?.endpoint_url) {
      try {
        const agentRes = await fetch(agentMeta.endpoint_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: GAUNTLET_PROMPT }),
          signal: AbortSignal.timeout(15_000),
        })
        const raw = await agentRes.text()
        const eval_ = evaluateResponse(raw)
        passed = eval_.passed
        scoreDelta = eval_.score
        evalNotes = eval_.notes
      } catch (fetchErr: any) {
        evalNotes = `Endpoint unreachable: ${fetchErr.message}`
        passed = false
        scoreDelta = 0
      }
    } else {
      // No endpoint — automatic fail (agent must register endpoint to pass)
      passed = false
      scoreDelta = 0
      evalNotes = 'No endpoint_url registered. Gauntlet requires a callable endpoint.'
    }

    // ── 6. Record result on-chain ───────────────────────────────────────────
    const walletClient = getServerWalletClient()
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ELYSIO_REGISTRY_ABI,
      functionName: 'recordGauntletResult',
      args: [address as `0x${string}`, passed],
    })
    await publicClient.waitForTransactionReceipt({ hash })

    // ── 7. Also record task result for score contribution ───────────────────
    await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ELYSIO_REGISTRY_ABI,
      functionName: 'recordTaskResult',
      args: [address as `0x${string}`, passed],
    })

    // ── 8. Update queue entry ───────────────────────────────────────────────
    await supabaseAdmin
      .from('gauntlet_queue')
      .update({
        status: 'complete',
        score_delta: scoreDelta,
        completed_at: new Date().toISOString(),
      })
      .eq('id', queueEntry.id)

    // ── 9. Log to task_log ──────────────────────────────────────────────────
    await supabaseAdmin.from('task_log').insert({
      agent_address: address.toLowerCase(),
      passed,
      source: 'gauntlet',
    })

    // ── 10. Fetch updated score ─────────────────────────────────────────────
    const [newScore, newTier] = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ELYSIO_REGISTRY_ABI,
      functionName: 'getReputation',
      args: [address as `0x${string}`],
    })) as [bigint, number]

    return NextResponse.json({
      success: true,
      passed,
      scoreDelta,
      notes: evalNotes,
      txHash: hash,
      newScore: Number(newScore),
      newTier,
    })
  } catch (err: any) {
    console.error('[POST /api/gauntlet/submit]', err)
    return NextResponse.json(
      { error: err?.shortMessage ?? err?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
