import type { Metadata } from 'next'
import './globals.css'
import Web3Providers from '../components/Web3Providers'

export const metadata: Metadata = {
  title: 'Syntax Sabotage',
  description: 'Multiplayer social deduction coding game — find the imposter before the code collapses.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-base">
        <div className="vignette" />
        <Web3Providers>
          <div className="relative z-10">
            {children}
          </div>
        </Web3Providers>
      </body>
    </html>
  )
}
