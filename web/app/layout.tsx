import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Syntax Sabotage',
  description: 'Multiplayer social deduction coding game — find the imposter before the code collapses.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-base">
        <div className="vignette" />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  )
}
