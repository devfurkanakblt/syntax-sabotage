import { createConfig, fallback, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { sepolia } from 'wagmi/chains'
import { monadTestnet } from './chains'

const chains = [monadTestnet, sepolia] as const

export const wagmiConfig = createConfig({
  chains,
  ssr: true,
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [monadTestnet.id]: fallback([
      http(process.env.NEXT_PUBLIC_MONAD_RPC_URL),
      http('https://testnet-rpc.monad.xyz'),
    ]),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  },
})

export const supportedChainIds = chains.map((chain) => chain.id)
