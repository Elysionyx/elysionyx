import { createPublicClient, createWalletClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || 'https://sepolia.base.org'

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpcUrl),
})

export function getServerWalletClient() {
  const privateKey = process.env.SERVER_PRIVATE_KEY
  if (!privateKey) throw new Error('SERVER_PRIVATE_KEY is not set')

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  })
}

export { baseSepolia }
