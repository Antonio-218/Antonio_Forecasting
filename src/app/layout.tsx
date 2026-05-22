import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Forecasting Platform',
  description: 'A simplified Polymarket-like forecasting platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
