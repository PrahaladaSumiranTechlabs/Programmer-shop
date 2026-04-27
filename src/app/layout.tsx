import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ProgrammerShop — Developer Tools',
  description: 'A growing toolkit for developers. Generate complex commands, explore utilities, and ship faster.',
  metadataBase: new URL('https://programmershop.com'),
  openGraph: {
    title: 'ProgrammerShop',
    description: 'Developer tools that save time every day.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
