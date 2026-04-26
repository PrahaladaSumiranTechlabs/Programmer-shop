import type { Metadata } from 'next'
import Script from 'next/script'
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

const GA_ID = 'G-0DM6ZQEFYK'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
