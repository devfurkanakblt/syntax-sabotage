/** @type {import('next').NextConfig} */
const emptyModuleAlias = './lib/shims/empty-module.ts'

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['viem', 'wagmi', '@tanstack/react-query'],
    turbo: {
      resolveAlias: {
        '@react-native-async-storage/async-storage': emptyModuleAlias,
        'pino-pretty': emptyModuleAlias,
      },
    },
  },
  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = require.resolve('./lib/shims/empty-module.ts')
    config.resolve.alias['pino-pretty'] = require.resolve('./lib/shims/empty-module.ts')
    return config
  },
}

module.exports = nextConfig
