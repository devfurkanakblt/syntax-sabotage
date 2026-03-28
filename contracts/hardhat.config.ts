import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import * as dotenv from 'dotenv'

dotenv.config()

function normalizePrivateKey(raw?: string): string {
  const key = (raw ?? '').trim()
  if (!key) return ''
  if (key.startsWith('0x')) return key
  return `0x${key}`
}

const deployerPrivateKey = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY)
const deployerAccounts = /^0x[a-fA-F0-9]{64}$/.test(deployerPrivateKey) ? [deployerPrivateKey] : []

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.26',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'cancun',
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || '',
      chainId: 11155111,
      accounts: deployerAccounts,
    },
    monad: {
      url: process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
      chainId: 10143,
      accounts: deployerAccounts,
    },
  },
}

export default config
