import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage, isAddress } from 'viem'
import { getServerWalletClient, publicClient } from '@/lib/viemClient'
import { supabaseAdmin } from '@/lib/supabase'
import { CONTRACT_ADDRESS, ELYSIO_REGISTRY_ABI } from '@/lib/contract'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { address, signature, message, metadata } = body

  // ── Validation ────────────────────────────────────────────────────────────
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  }
  if (!signature || !message) {
    return NextResponse.json({ error: 'signature and message are required' }, { status: 400 })
  }

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

    // ── 2. Check if already registered on-chain ─────────────────────────────
    const record = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ELYSIO_REGISTRY_ABI,
      functionName: 'getAgent',
      args: [address as `0x${string}`],
    })) as any

    if (record.registered) {
      return NextResponse.json({ error: 'Agent already registered' }, { status: 409 })
    }

    // ── 3. Build metadataURI ────────────────────────────────────────────────
    const metadataURI = metadata?.metadataURI || `https://elysionyx.xyz/api/agent/${address}`

    // ── 4. Write to contract (server wallet pays gas) ───────────────────────
    const walletClient = getServerWalletClient()
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ELYSIO_REGISTRY_ABI,
      functionName: 'registerAgent',
      args: [address as `0x${string}`, metadataURI],
    })

    // ── 5. Wait for confirmation ────────────────────────────────────────────
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    // ── 6. Upsert off-chain metadata to Supabase ────────────────────────────
    await supabaseAdmin.from('agents').upsert(
      {
        address: address.toLowerCase(),
        description: metadata?.description ?? null,
        tags: metadata?.tags ?? [],
        available_for_hire: metadata?.availableForHire ?? false,
        endpoint_url: metadata?.endpointUrl ?? null,
      },
      { onConflict: 'address' }
    )

    return NextResponse.json({
      success: true,
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
      address,
    })
  } catch (err: any) {
    console.error('[POST /api/agent/register]', err)
    return NextResponse.json(
      { error: err?.shortMessage ?? err?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
